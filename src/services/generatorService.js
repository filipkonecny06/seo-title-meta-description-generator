const { OptimizationScorer } = require("./scoringService");
const { SerpPreviewBuilder } = require("./serpService");

const DEFAULT_BENEFITS = [
  "higher organic traffic",
  "better click-through potential",
  "faster ranking momentum",
  "stronger search visibility",
  "clearer search messaging",
  "more qualified leads",
  "better conversion intent",
  "stronger brand authority",
];
const DEFAULT_URGENCY = [
  "before your competitors do",
  "while demand is rising",
  "before rankings shift again",
  "without wasting ad spend",
  "in less time",
];
const DEFAULT_COMPETITORS = [
  "top alternatives",
  "leading options",
  "other providers",
  "market leaders",
];
const DEFAULT_NUMBERS = [5, 7, 9, 10, 12, 15, 21];
const TONE_MODIFIERS = {
  neutral: ["practical", "clear", "reliable"],
  authoritative: ["expert-backed", "data-driven", "proven"],
  urgent: ["time-sensitive", "high-impact", "fast-acting"],
  friendly: ["easy", "simple", "approachable"],
};
const INTENT_HOOKS = {
  informational: [
    "complete guide",
    "step-by-step framework",
    "practical tutorial",
  ],
  commercial: [
    "side-by-side comparison",
    "in-depth review",
    "feature breakdown",
  ],
  transactional: ["best deal", "pricing insights", "ready-to-buy checklist"],
  navigational: ["official resource", "direct access", "trusted destination"],
};
const LENGTH_PROFILES = {
  short: { title: { min: 42, max: 52 }, meta: { min: 110, max: 135 } },
  medium: { title: { min: 50, max: 60 }, meta: { min: 135, max: 155 } },
  "max ctr": { title: { min: 54, max: 60 }, meta: { min: 145, max: 160 } },
};
const KNOWN_TERMS = new Map([
  ["ai", "AI"],
  ["api", "API"],
  ["b2b", "B2B"],
  ["b2c", "B2C"],
  ["cms", "CMS"],
  ["ctr", "CTR"],
  ["html", "HTML"],
  ["saas", "SaaS"],
  ["seo", "SEO"],
  ["ui", "UI"],
  ["url", "URL"],
  ["ux", "UX"],
]);

const safeString = (value) => String(value ?? "").trim();

const titleCaseToken = (token) => {
  const known = KNOWN_TERMS.get(token.toLowerCase());
  if (known) return known;
  if (/[a-z][A-Z]|[A-Z].*[A-Z]/.test(token)) return token;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
};

const titleCase = (value) =>
  safeString(value).split(/\s+/).filter(Boolean).map(titleCaseToken).join(" ");

const normalizeLengthPreference = (value) => {
  const normalized = safeString(value).toLowerCase().replace("-", " ");
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

const hashString = (input) => {
  let hash = 0;
  for (const character of safeString(input)) {
    hash = (hash << 5) - hash + character.codePointAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickFrom = (list, seed) =>
  Array.isArray(list) && list.length ? list[seed % list.length] : "";

const normalizeWhitespace = (value) =>
  safeString(value)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\b(?:in|for)\s+(?=[,.!?;:]|$)/gi, "")
    .replace(/\s+([|–—-])\s*$/g, "")
    .trim();

const removeEmptyYearClause = (formula, year) => {
  if (year) return formula;
  return formula
    .replace(/\s+(?:in|for)\s+\{Year\}/gi, "")
    .replace(/\s*\(\s*\{Year\}\s*\)/g, "")
    .replace(/\s*[,|–—-]\s*\{Year\}/g, "")
    .replace(/\{Year\}/g, "");
};

const applyTemplate = (formula, context) =>
  normalizeWhitespace(
    removeEmptyYearClause(safeString(formula), context.Year).replace(
      /\{([A-Za-z0-9_]+)\}/g,
      (match, key) =>
        Object.hasOwn(context, key) ? safeString(context[key]) : "",
    ),
  );

const trimTrailingPunctuation = (value) =>
  value.replace(/[\s,;:|/–—-]+$/g, "").trim();

const squeezeTextToLimit = (text, maxChars) => {
  const value = normalizeWhitespace(text);
  if (value.length <= maxChars) return value;
  const slice = value.slice(0, maxChars + 1);
  const lastSpace = slice.lastIndexOf(" ");
  const boundary =
    lastSpace >= Math.floor(maxChars * 0.6) ? lastSpace : maxChars;
  return trimTrailingPunctuation(slice.slice(0, boundary));
};

const padTextToMinimum = (text, minChars, maxChars, suffixes) => {
  let candidate = text;
  for (const suffix of suffixes) {
    if (candidate.length >= minChars) break;
    const expanded = `${candidate} ${suffix}`.trim();
    if (expanded.length <= maxChars) candidate = expanded;
  }
  return candidate;
};

const enforceLengthProfile = (text, lengthPreference, type, seed) => {
  const profile =
    LENGTH_PROFILES[normalizeLengthPreference(lengthPreference)][type];
  const suffixes =
    type === "title"
      ? [
          pickFrom(["Guide", "Tips", "Framework", "Blueprint"], seed),
          "Practical Guide",
        ]
      : [
          pickFrom(
            [
              "Start improving your search presence today.",
              "Built for clearer, stronger search messaging.",
              "Use the practical next steps to get started.",
            ],
            seed,
          ),
        ];
  const padded = padTextToMinimum(
    normalizeWhitespace(text),
    profile.min,
    profile.max,
    suffixes,
  );
  return squeezeTextToLimit(padded, profile.max);
};

const ensureUniqueWithinLimit = (text, seen, maxChars, fallbackToken) => {
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const suffix =
      iteration === 0 ? "" : ` · ${fallbackToken}-${iteration + 1}`;
    const candidate = `${squeezeTextToLimit(text, maxChars - suffix.length)}${suffix}`;
    const key = candidate.toLocaleLowerCase("en-US");
    if (!seen.has(key)) {
      seen.add(key);
      return candidate;
    }
  }
  throw new Error(
    "Unable to produce a unique snippet within the configured length.",
  );
};

class SnippetGenerator {
  constructor({ catalogRepository, scorer, previewBuilder, clock } = {}) {
    if (!catalogRepository)
      throw new TypeError("SnippetGenerator requires a catalog repository.");
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
    if (!metaTemplates.length)
      throw new Error(`No meta templates exist for ${config.metaStyle}.`);

    const currentYear = String(this.clock().getFullYear());
    const baseSeed = hashString(JSON.stringify({ ...config, currentYear }));
    const titleProfile = LENGTH_PROFILES[config.length].title;
    const metaProfile = LENGTH_PROFILES[config.length].meta;
    const titlePixelLimit = this.previewBuilder.getPixelLimits("desktop").title;
    const metaPixelLimit = this.previewBuilder.getPixelLimits("desktop").meta;
    const seenTitles = new Set();
    const seenMetas = new Set();

    const titles = Array.from(
      { length: config.bulkMode ? 20 : 10 },
      (_, index) => {
        const seed = baseSeed + index * 13;
        const template = titleTemplates[index % titleTemplates.length];
        const context = this.buildContext(config, seed, currentYear);
        const rendered = applyTemplate(template.formula, context);
        const lengthSafe = enforceLengthProfile(
          rendered,
          config.length,
          "title",
          seed,
        );
        const text = ensureUniqueWithinLimit(
          lengthSafe,
          seenTitles,
          titleProfile.max,
          context.Number,
        );
        const scored = this.scorer.score(text, {
          contentType: "title",
          intent: config.intent,
          powerWords,
          primaryKeyword: titleCase(config.primaryKeyword),
        });
        const pixelWidth = Math.round(
          this.previewBuilder.estimatePixelWidth(text, "title"),
        );
        return {
          id: `title-${index + 1}`,
          text,
          charCount: text.length,
          pixelWidth,
          optimizationScore: scored.score,
          badge: scored.badge,
          scoreBreakdown: scored.breakdown,
          matchedPowerWords: scored.matchedPowerWords,
          schemaHeadline: squeezeTextToLimit(text, 110),
          truncated: pixelWidth > titlePixelLimit,
          templateStyle: template.style,
        };
      },
    );

    const metas = Array.from({ length: 5 }, (_, index) => {
      const seed = baseSeed + index * 17;
      const template = metaTemplates[index % metaTemplates.length];
      const context = this.buildContext(config, seed, currentYear);
      const rendered = applyTemplate(template.formula, context);
      const lengthSafe = enforceLengthProfile(
        rendered,
        config.length,
        "meta",
        seed,
      );
      const text = ensureUniqueWithinLimit(
        lengthSafe,
        seenMetas,
        metaProfile.max,
        context.Number,
      );
      const scored = this.scorer.score(text, {
        contentType: "meta",
        intent: config.intent,
        powerWords,
        primaryKeyword: titleCase(config.primaryKeyword),
      });
      const pixelWidth = Math.round(
        this.previewBuilder.estimatePixelWidth(text, "meta"),
      );
      return {
        id: `meta-${index + 1}`,
        text,
        charCount: text.length,
        pixelWidth,
        optimizationScore: scored.score,
        badge: scored.badge,
        scoreBreakdown: scored.breakdown,
        matchedPowerWords: scored.matchedPowerWords,
        truncated: pixelWidth > metaPixelLimit,
      };
    });

    const scoreAverage = (items) =>
      Math.round(
        items.reduce((total, item) => total + item.optimizationScore, 0) /
          Math.max(1, items.length),
      );
    const bestTitle = [...titles].sort(
      (first, second) => second.optimizationScore - first.optimizationScore,
    )[0];

    return {
      config,
      titles,
      metas,
      schemaHeadlineSuggestions: titles
        .slice(0, 3)
        .map((item) => item.schemaHeadline),
      summary: {
        titleCount: titles.length,
        metaCount: metas.length,
        avgTitleScore: scoreAverage(titles),
        avgMetaScore: scoreAverage(metas),
        bestTitle,
      },
    };
  }

  buildContext(config, seed, currentYear) {
    return {
      PrimaryKeyword: titleCase(config.primaryKeyword),
      Benefit: pickFrom(DEFAULT_BENEFITS, seed),
      Benefit1: pickFrom(DEFAULT_BENEFITS, seed + 1),
      Benefit2: pickFrom(DEFAULT_BENEFITS, seed + 3),
      Year: config.includeYear ? currentYear : "",
      Audience: config.audience || "marketers",
      Location: config.location || "your market",
      Number: String(pickFrom(DEFAULT_NUMBERS, seed + 4)),
      Competitor:
        config.secondaryKeywords[0] || pickFrom(DEFAULT_COMPETITORS, seed + 5),
      SecondaryKeywords: config.secondaryKeywords.join(", "),
      IntentHook: pickFrom(
        INTENT_HOOKS[config.intent] || INTENT_HOOKS.informational,
        seed + 6,
      ),
      Urgency: pickFrom(DEFAULT_URGENCY, seed + 7),
      ToneModifier: pickFrom(
        TONE_MODIFIERS[config.tone] || TONE_MODIFIERS.neutral,
        seed + 8,
      ),
    };
  }
}

const generateSnippets = async (input, repositories) => {
  if (repositories?.catalogRepository) {
    return new SnippetGenerator({
      catalogRepository: repositories.catalogRepository,
    }).generate(input);
  }
  throw new TypeError("generateSnippets now requires a catalogRepository.");
};

module.exports = {
  LENGTH_PROFILES,
  SnippetGenerator,
  applyTemplate,
  ensureUniqueWithinLimit,
  generateSnippets,
  normalizeInput,
  titleCase,
};
