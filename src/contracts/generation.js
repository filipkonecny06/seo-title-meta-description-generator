/**
 * Shared server/browser data contracts for generated snippets.
 *
 * Browser modules reference these typedefs through JSDoc imports. Runtime
 * presentation metadata is included in API responses so clients do not need to
 * duplicate score labels or infer badge levels from display copy.
 */

const SCORE_BREAKDOWN_LABELS = Object.freeze({
  baseline: "Baseline",
  number: "Number",
  year: "Current year",
  powerWords: "Matched terms",
  optimalLength: "Optimal scoring length",
  keywordFirst: "Keyword first",
  intentSignal: "Intent signal",
});

const SCORE_BADGES = Object.freeze([
  Object.freeze({ minimum: 90, level: "high", label: "High alignment" }),
  Object.freeze({
    minimum: 75,
    level: "medium",
    label: "Moderate alignment",
  }),
  Object.freeze({ minimum: 60, level: "partial", label: "Partial alignment" }),
  Object.freeze({ minimum: 0, level: "review", label: "Review" }),
]);

/**
 * @typedef {"high"|"medium"|"partial"|"review"} ScoreBadgeLevel
 */

/**
 * @typedef {object} ScoreBadge
 * @property {number} minimum
 * @property {ScoreBadgeLevel} level
 * @property {string} label
 */

/**
 * @typedef {object} ScoreBreakdown
 * @property {number} baseline
 * @property {number} number
 * @property {number} year
 * @property {number} powerWords
 * @property {number} optimalLength
 * @property {number} keywordFirst
 * @property {number} intentSignal
 */

/**
 * @typedef {object} OptimizationScoreResult
 * @property {number} score
 * @property {string} badge
 * @property {ScoreBadgeLevel} badgeLevel
 * @property {ScoreBreakdown} breakdown
 * @property {string[]} matchedPowerWords
 */

/**
 * @typedef {object} GenerationConfig
 * @property {string} primaryKeyword
 * @property {string[]} secondaryKeywords
 * @property {string} audience
 * @property {string} location
 * @property {boolean} includeYear
 * @property {string} intent
 * @property {string} tone
 * @property {string} titleStyle
 * @property {string} metaStyle
 * @property {"short"|"medium"|"long"} length
 * @property {boolean} bulkMode
 */

/**
 * @typedef {object} GeneratedSnippet
 * @property {string} id
 * @property {string} text
 * @property {number} charCount
 * @property {number} pixelWidth
 * @property {number} optimizationScore
 * @property {string} badge
 * @property {ScoreBadgeLevel} badgeLevel
 * @property {ScoreBreakdown} scoreBreakdown
 * @property {string[]} matchedPowerWords
 * @property {boolean} truncated
 * @property {boolean} outsideCharacterTarget
 * @property {string} templateId
 * @property {string} templateStyle
 * @property {string|null} [schemaHeadline]
 */

/**
 * @typedef {object} GenerationResult
 * @property {GenerationConfig} config
 * @property {GeneratedSnippet[]} titles
 * @property {GeneratedSnippet[]} metas
 * @property {Object<string, string>} scoreBreakdownLabels
 * @property {string[]} schemaHeadlineSuggestions
 * @property {{reason: string, titles: boolean, metas: boolean}|null} lengthFallback
 * @property {{titleCount: number, metaCount: number, avgTitleScore: number, avgMetaScore: number}} summary
 */

/**
 * @typedef {object} SerpPreviewResult
 * @property {"desktop"|"mobile"} device
 * @property {string} url
 * @property {string} titleHtml
 * @property {string} metaHtml
 * @property {number} titlePixels
 * @property {number} metaPixels
 * @property {number} titleLimit
 * @property {number} metaLimit
 * @property {number} titleProgress
 * @property {number} metaProgress
 * @property {boolean} titleTruncated
 * @property {boolean} metaTruncated
 */

/**
 * @param {number} score Bounded optimization score.
 * @returns {ScoreBadge} Stable presentation metadata.
 */
const resolveScoreBadge = (score) =>
  SCORE_BADGES.find((badge) => score >= badge.minimum) || SCORE_BADGES.at(-1);

module.exports = {
  SCORE_BADGES,
  SCORE_BREAKDOWN_LABELS,
  resolveScoreBadge,
};
