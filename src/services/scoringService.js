const INTENT_SIGNAL_MAP = {
  informational: ["how", "guide", "tips", "learn", "tutorial"],
  commercial: ["best", "top", "review", "compare", "versus", "vs"],
  transactional: ["buy", "pricing", "deal", "book", "order"],
  navigational: ["official", "login", "near me", "website", "dashboard"],
};

const OPTIMAL_LENGTHS = {
  title: { min: 50, max: 60 },
  meta: { min: 140, max: 160 },
};

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const phrasePattern = (phrase, { startsWith = false } = {}) => {
  const escaped = escapeRegExp(phrase.trim()).replace(/\s+/g, "\\s+");
  const prefix = startsWith ? "^" : "(^|[^\\p{L}\\p{N}])";
  return new RegExp(`${prefix}${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu");
};

const hasNumber = (text) => /\b\d+\b/.test(text);
const hasYear = (text) => /\b(?:19|20)\d{2}\b/.test(text);

const findPowerWords = (text, powerWords) => {
  if (!Array.isArray(powerWords)) {
    return [];
  }

  return powerWords.filter((entry) => {
    const word = String(entry.word || entry).trim();
    return word && phrasePattern(word).test(text);
  });
};

const hasIntentSignal = (text, intent) =>
  (INTENT_SIGNAL_MAP[intent] || []).some((signal) =>
    phrasePattern(signal).test(text),
  );

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

const resolveBadge = (score) => {
  if (score >= 90) return "Elite";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  return "Developing";
};

class OptimizationScorer {
  score(text, options = {}) {
    const normalizedText = String(text || "").trim();
    const primaryKeyword = String(options.primaryKeyword || "").trim();
    const intent = String(options.intent || "")
      .toLowerCase()
      .trim();
    const contentType = options.contentType === "meta" ? "meta" : "title";
    const optimalLength = OPTIMAL_LENGTHS[contentType];
    const matchedPowerWords = findPowerWords(
      normalizedText,
      options.powerWords || [],
    );

    const breakdown = {
      baseline: 20,
      number: hasNumber(normalizedText) ? 10 : 0,
      year: hasYear(normalizedText) ? 8 : 0,
      powerWords: Math.min(
        20,
        matchedPowerWords.reduce((total, entry) => {
          const weight = Number(entry.weight || 1);
          return total + Math.max(1, Math.min(5, weight)) * 2;
        }, 0),
      ),
      optimalLength:
        normalizedText.length >= optimalLength.min &&
        normalizedText.length <= optimalLength.max
          ? 15
          : 0,
      keywordFirst:
        primaryKeyword &&
        phrasePattern(primaryKeyword, { startsWith: true }).test(normalizedText)
          ? 10
          : 0,
      intentSignal: intent && hasIntentSignal(normalizedText, intent) ? 10 : 0,
    };

    const score = clampScore(
      Object.values(breakdown).reduce((total, value) => total + value, 0),
    );

    return {
      score,
      badge: resolveBadge(score),
      breakdown,
      matchedPowerWords: matchedPowerWords.map((entry) =>
        String(entry.word || entry),
      ),
    };
  }
}

const calculateOptimizationScore = (text, options) =>
  new OptimizationScorer().score(text, options);

module.exports = {
  OptimizationScorer,
  calculateOptimizationScore,
  hasIntentSignal,
  resolveBadge,
};
