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

    const selectedTitleCandidates = selectCandidates(
      titleCandidates,
      titleCount,
      titleProfile,
    );
    const selectedMetaCandidates = selectCandidates(
      metaCandidates,
      5,
      metaProfile,
    );
    const titleFallback = selectedTitleCandidates.some(
      (candidate) => candidateDistance(candidate.text, titleProfile) > 0,
    );
    const metaFallback = selectedMetaCandidates.some(
      (candidate) => candidateDistance(candidate.text, metaProfile) > 0,
    );
    const hasUnderlengthFallback =
      selectedTitleCandidates.some(
        (candidate) => candidate.text.length < titleProfile.min,
      ) ||
      selectedMetaCandidates.some(
        (candidate) => candidate.text.length < metaProfile.min,
      );
    if (hasUnderlengthFallback) {
      throw new Error(
        "The catalog could not satisfy the selected character band's minimum without incomplete padding.",
      );
    }
    if ((titleFallback || metaFallback) && isNormalInput(config)) {
      throw new Error(
        "The catalog could not satisfy the selected character band for an input inside the documented normal range.",
      );
    }

    const titles = selectedTitleCandidates.map((candidate, index) => {
      const scored = this.scorer.score(candidate.text, {
        contentType: "title",
        intent: config.intent,
        powerWords,
        primaryKeyword: titleCase(config.primaryKeyword),
      });
      const pixelWidth = Math.round(
        this.previewBuilder.estimatePixelWidth(candidate.text, "title"),
      );
      return {
        id: `title-${index + 1}`,
        text: candidate.text,
        charCount: candidate.text.length,
        pixelWidth,
        optimizationScore: scored.score,
        badge: scored.badge,
        scoreBreakdown: scored.breakdown,
        matchedPowerWords: scored.matchedPowerWords,
        schemaHeadline: candidate.text.length <= 110 ? candidate.text : null,
        truncated: pixelWidth > titlePixelLimit,
        outsideCharacterTarget:
          candidate.text.length < titleProfile.min ||
          candidate.text.length > titleProfile.max,
        templateId: candidate.template.id,
        templateStyle: candidate.template.style,
      };
    });

    const metas = selectedMetaCandidates.map((candidate, index) => {
      const scored = this.scorer.score(candidate.text, {
        contentType: "meta",
        intent: config.intent,
        powerWords,
        primaryKeyword: titleCase(config.primaryKeyword),
      });
      const pixelWidth = Math.round(
        this.previewBuilder.estimatePixelWidth(candidate.text, "meta"),
      );
      return {
        id: `meta-${index + 1}`,
        text: candidate.text,
        charCount: candidate.text.length,
        pixelWidth,
        optimizationScore: scored.score,
        badge: scored.badge,
        scoreBreakdown: scored.breakdown,
        matchedPowerWords: scored.matchedPowerWords,
        truncated: pixelWidth > metaPixelLimit,
        outsideCharacterTarget:
          candidate.text.length < metaProfile.min ||
          candidate.text.length > metaProfile.max,
        templateId: candidate.template.id,
        templateStyle: candidate.template.style,
      };
    });

    const scoreAverage = (items) =>
      Math.round(
        items.reduce((total, item) => total + item.optimizationScore, 0) /
          Math.max(1, items.length),
      );

    return {
      config,
      titles,
      metas,
      schemaHeadlineSuggestions: titles
        .map((item) => item.schemaHeadline)
        .filter(Boolean)
        .slice(0, 3),
      lengthFallback:
        titleFallback || metaFallback
          ? {
              reason:
                "User-supplied text is too long for every complete candidate to fit the selected character band.",
              titles: titleFallback,
              metas: metaFallback,
            }
          : null,
      summary: {
        titleCount: titles.length,
        metaCount: metas.length,
        avgTitleScore: scoreAverage(titles),
        avgMetaScore: scoreAverage(metas),
      },
    };
  }

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
