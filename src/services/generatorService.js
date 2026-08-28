/** Coordinates deterministic template expansion, selection, scoring, and preview metadata. */
/** @typedef {import("../contracts/generation").GenerationConfig} GenerationConfig */
/** @typedef {import("../contracts/generation").GenerationResult} GenerationResult */
const { candidateDistance, selectCandidates } = require("./candidateSelection");
const {
  DEFAULT_COMPETITORS,
  DEFAULT_NUMBERS,
  INTENT_CONTEXT,
  INTENT_HOOKS,
  LENGTH_PROFILES,
  META_CONCEPTS,
  META_CONTINUATIONS,
  NORMAL_INPUT_LIMITS,
  TITLE_EXTENSIONS,
  TONE_CUES,
  TOPIC_ANGLES,
} = require("./generatorRules");
const { OptimizationScorer } = require("./scoringService");
const { SerpPreviewBuilder } = require("./serpService");
const {
  buildGenerationResult,
  buildSnippetResults,
} = require("./generationResult");
const { applyTemplate, safeString, titleCase } = require("./snippetText");

const normalizeLengthPreference = (value) => {
  const input = safeString(value).toLowerCase().replace("-", " ");
  const normalized = input === "max ctr" ? "long" : input;
  return Object.hasOwn(LENGTH_PROFILES, normalized) ? normalized : "medium";
};

const normalizeBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["true", "1", "on"].includes(safeString(value).toLowerCase());

const splitKeywords = (value) => {
  const entries = Array.isArray(value) ? value : safeString(value).split(",");
  return entries.map(safeString).filter(Boolean);
};

/**
 * Converts supported form and JSON representations into one domain input shape.
 *
 * @returns {GenerationConfig}
 */
const normalizeInput = (input = {}) => ({
  primaryKeyword: safeString(input.primaryKeyword),
  secondaryKeywords: splitKeywords(input.secondaryKeywords),
  audience: safeString(input.audience),
  location: safeString(input.location),
  includeYear: normalizeBoolean(input.includeYear),
  intent: safeString(input.intent).toLowerCase() || "informational",
  tone: safeString(input.tone).toLowerCase() || "neutral",
  titleStyle: safeString(input.titleStyle).toLowerCase() || "list",
  metaStyle: safeString(input.metaStyle).toLowerCase() || "educational",
  length: normalizeLengthPreference(input.length),
  bulkMode: normalizeBoolean(input.bulkMode),
});

/** Reports whether the brief falls within the catalog's guaranteed length range. */
const isNormalInput = (config) => {
  const targets = config.secondaryKeywords.length
    ? config.secondaryKeywords
    : DEFAULT_COMPETITORS;
  const longestTargetLength = Math.max(
    ...targets.map((target) => target.length),
  );
  const comparisonTitleFits =
    config.titleStyle !== "comparison" ||
    config.primaryKeyword.length + longestTargetLength <=
      NORMAL_INPUT_LIMITS.comparisonTitleCombined[config.length];
  return (
    config.primaryKeyword.length <= NORMAL_INPUT_LIMITS.primaryKeyword &&
    config.audience.length <= NORMAL_INPUT_LIMITS.audience &&
    config.location.length <= NORMAL_INPUT_LIMITS.location &&
    config.secondaryKeywords.every(
      (keyword) => keyword.length <= NORMAL_INPUT_LIMITS.secondaryKeyword,
    ) &&
    comparisonTitleFits
  );
};

// This small, stable hash is a repeatability seed; it is not used for security.
const hashString = (input) => {
  let hash = 0;
  for (const character of safeString(input)) {
    hash = (hash << 5) - hash + character.codePointAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickFrom = (list, seed) =>
  Array.isArray(list) && list.length ? list[Math.abs(seed) % list.length] : "";

const buildTextVariants = (text, type) => {
  if (type === "title") {
    const existingTerms = new Set(
      text
        .toLowerCase()
        .match(
          /\b(?:guide|review|overview|checklist|steps|examples|criteria|planning)\b/g,
        ) || [],
    );
    const extensions = TITLE_EXTENSIONS.filter((extension) => {
      const terms =
        extension
          .toLowerCase()
          .match(
            /\b(?:guide|review|overview|checklist|steps|examples|criteria|planning)\b/g,
          ) || [];
      return terms.every((term) => !existingTerms.has(term));
    });
    return [text, ...extensions.map((extension) => `${text} ${extension}`)];
  }

  const normalizedText = text.toLocaleLowerCase("en-US");
  const continuations = META_CONTINUATIONS.filter((continuation) => {
    const normalizedContinuation = continuation.toLocaleLowerCase("en-US");
    return META_CONCEPTS.every(
      (concept) =>
        !normalizedText.includes(concept) ||
        !normalizedContinuation.includes(concept),
    );
  });
  const variants = [text];
  for (const continuation of continuations) {
    variants.push(`${text} ${continuation}`);
  }
  const combinableContinuations = continuations.slice(0, 5);
  for (let first = 0; first < combinableContinuations.length; first += 1) {
    for (
      let second = first + 1;
      second < combinableContinuations.length;
      second += 1
    ) {
      variants.push(
        `${text} ${combinableContinuations[first]} ${combinableContinuations[second]}`,
      );
    }
  }
  return variants;
};

/**
 * Selects the requested title/meta counts and enforces the documented fallback
 * policy before candidates are decorated for the API response.
 */
const selectAndValidateCandidates = ({
  titleCandidates,
  metaCandidates,
  titleCount,
  titleProfile,
  metaProfile,
  normalInput,
}) => {
  const titles = selectCandidates(titleCandidates, titleCount, titleProfile);
  const metas = selectCandidates(metaCandidates, 5, metaProfile);
  const titleFallback = titles.some(
    (candidate) => candidateDistance(candidate.text, titleProfile) > 0,
  );
  const metaFallback = metas.some(
    (candidate) => candidateDistance(candidate.text, metaProfile) > 0,
  );
  const fallsBelowMinimum = (candidates, profile) =>
    candidates.some((candidate) => candidate.text.length < profile.min);
  const hasUnderlengthFallback =
    fallsBelowMinimum(titles, titleProfile) ||
    fallsBelowMinimum(metas, metaProfile);

  if (hasUnderlengthFallback) {
    // Padding with empty prose would satisfy length numerically but produce poor drafts.
    throw new Error(
      "The catalog could not satisfy the selected character band's minimum without incomplete padding.",
    );
  }
  if ((titleFallback || metaFallback) && normalInput) {
    // A normal-range miss indicates a catalog regression rather than difficult user input.
    throw new Error(
      "The catalog could not satisfy the selected character band for an input inside the documented normal range.",
    );
  }

  return { titles, metas, titleFallback, metaFallback };
};

/** Generates inspectable title and meta candidates from a validated catalog. */
class SnippetGenerator {
  constructor({ catalogRepository, scorer, previewBuilder, clock } = {}) {
    if (!catalogRepository) {
      throw new TypeError("SnippetGenerator requires a catalog repository.");
    }
    this.catalogRepository = catalogRepository;
    this.scorer = scorer || new OptimizationScorer();
    this.previewBuilder = previewBuilder || new SerpPreviewBuilder();
    this.clock = clock || (() => new Date());
  }

  /**
   * Produces a repeatable result set while the catalog and, when included, the
   * effective year remain unchanged.
   *
   * @param {object} input Validated or validation-compatible generation input.
   * @returns {Promise<GenerationResult>} Generated snippets, scoring details, and summary.
   * @throws {Error} If the keyword or matching templates are missing, too few
   * distinct candidates can be built, a result falls below the target minimum,
   * or a normal-range brief produces an out-of-band result.
   */
  async generate(input) {
    const config = normalizeInput(input);
    if (!config.primaryKeyword) throw new Error("Primary keyword is required.");

    const titleTemplates = this.catalogRepository.getTitleTemplates(
      config.intent,
      config.titleStyle,
    );
    const metaTemplates = this.catalogRepository.getMetaTemplates(
      config.metaStyle,
    );
    const powerWords = this.catalogRepository.getPowerWords();
    if (!titleTemplates.length) {
      throw new Error(
        `No title templates exist for ${config.intent}/${config.titleStyle}.`,
      );
    }
    if (!metaTemplates.length) {
      throw new Error(`No meta templates exist for ${config.metaStyle}.`);
    }

    const currentYear = String(this.clock().getFullYear());
    const seedInput = config.includeYear
      ? { ...config, currentYear }
      : { ...config };
    // The year changes rendered text and selection only when the user requests it.
    const baseSeed = hashString(JSON.stringify(seedInput));
    const titleCount = config.bulkMode ? 20 : 10;
    const titleProfile = LENGTH_PROFILES[config.length].title;
    const metaProfile = LENGTH_PROFILES[config.length].meta;
    const titlePixelLimit = this.previewBuilder.getPixelLimits("desktop").title;
    const metaPixelLimit = this.previewBuilder.getPixelLimits("desktop").meta;
    const titleCandidates = this.buildCandidatePool({
      type: "title",
      config,
      templates: titleTemplates,
      baseSeed,
      currentYear,
      count: titleCount,
    });
    const metaCandidates = this.buildCandidatePool({
      type: "meta",
      config,
      templates: metaTemplates,
      baseSeed: baseSeed + 503,
      currentYear,
      count: 5,
    });

    const selected = selectAndValidateCandidates({
      titleCandidates,
      metaCandidates,
      titleCount,
      titleProfile,
      metaProfile,
      normalInput: isNormalInput(config),
    });
    const decorateOptions = {
      config,
      powerWords,
      scorer: this.scorer,
      previewBuilder: this.previewBuilder,
    };
    const titles = buildSnippetResults({
      ...decorateOptions,
      candidates: selected.titles,
      type: "title",
      profile: titleProfile,
      pixelLimit: titlePixelLimit,
    });
    const metas = buildSnippetResults({
      ...decorateOptions,
      candidates: selected.metas,
      type: "meta",
      profile: metaProfile,
      pixelLimit: metaPixelLimit,
    });

    return buildGenerationResult({
      config,
      titles,
      metas,
      titleFallback: selected.titleFallback,
      metaFallback: selected.metaFallback,
    });
  }

  /** Builds an intentionally oversized pool so selection can balance length and variety. */
  buildCandidatePool({
    type,
    config,
    templates,
    baseSeed,
    currentYear,
    count,
  }) {
    const candidates = [];
    const variationsPerTemplate =
      type === "title"
        ? Math.max(14, Math.ceil(count / templates.length) + 4)
        : 5;
    const attempts = templates.length * variationsPerTemplate;
    for (let index = 0; index < attempts; index += 1) {
      const templateIndex = index % templates.length;
      const variation = Math.floor(index / templates.length);
      const seed = baseSeed + variation * 17 + templateIndex * 101;
      const template = templates[templateIndex];
      const context = this.buildContext(config, seed, currentYear);
      const rendered = applyTemplate(template.formula, context);
      const alternateKey = template.formula.includes("{Competitor}")
        ? context.Competitor
        : null;
      for (const text of buildTextVariants(rendered, type)) {
        candidates.push({ text, template, alternateKey });
      }
    }
    return candidates;
  }

  /** Maps one deterministic seed to all placeholders required by a template. */
  buildContext(config, seed, currentYear) {
    const topicAngle = pickFrom(TOPIC_ANGLES, seed + 1);
    const toneCue = TONE_CUES[config.tone] || TONE_CUES.neutral;
    const intentContext =
      INTENT_CONTEXT[config.intent] || INTENT_CONTEXT.informational;
    return {
      PrimaryKeyword: titleCase(config.primaryKeyword),
      TopicAngle: topicAngle,
      TopicAngleTitle: titleCase(topicAngle),
      Year: config.includeYear ? currentYear : "",
      Audience: config.audience || "your team",
      AudienceTitle: titleCase(config.audience || "your team"),
      Location: config.location || "your area",
      LocationTitle: titleCase(config.location || "your area"),
      Number: String(pickFrom(DEFAULT_NUMBERS, seed + 2)),
      Competitor: titleCase(
        pickFrom(config.secondaryKeywords, seed + 3) ||
          pickFrom(DEFAULT_COMPETITORS, seed + 3),
      ),
      IntentHook: pickFrom(
        INTENT_HOOKS[config.intent] || INTENT_HOOKS.informational,
        seed + 4,
      ),
      IntentAction: intentContext.action,
      IntentActionGerundTitle: titleCase(intentContext.actionGerund),
      IntentActionTitle: titleCase(intentContext.action),
      IntentTopic: intentContext.topic,
      IntentTopicTitle: titleCase(intentContext.topic),
      ToneCue: toneCue,
      ToneCueTitle: titleCase(toneCue),
      ToneModifier: toneCue,
      ToneModifierTitle: titleCase(toneCue),
    };
  }
}

module.exports = {
  LENGTH_PROFILES,
  NORMAL_INPUT_LIMITS,
  SnippetGenerator,
  applyTemplate,
  isNormalInput,
  normalizeInput,
  selectCandidates,
  titleCase,
};
