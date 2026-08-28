/** Builds the stable API DTO returned by the generation service. */

/** @typedef {import("../contracts/generation").GeneratedSnippet} GeneratedSnippet */
/** @typedef {import("../contracts/generation").GenerationResult} GenerationResult */
const { SCORE_BREAKDOWN_LABELS } = require("../contracts/generation");
const { titleCase } = require("./snippetText");

const scoreAverage = (items) =>
  Math.round(
    items.reduce((total, item) => total + item.optimizationScore, 0) /
      Math.max(1, items.length),
  );

/**
 * Adds score, width, catalog, and target-band metadata to one selected candidate.
 *
 * @param {object} options
 * @param {object} options.candidate Selected rendered candidate.
 * @param {number} options.index Zero-based result position.
 * @param {"title"|"meta"} options.type Snippet kind.
 * @param {import("../contracts/generation").GenerationConfig} options.config
 * @param {Array<object>} options.powerWords Weighted catalog terms.
 * @param {{min: number, max: number}} options.profile Character-length target.
 * @param {number} options.pixelLimit Desktop width limit.
 * @param {object} options.scorer Optimization scorer.
 * @param {object} options.previewBuilder Width estimator.
 * @returns {GeneratedSnippet}
 */
const buildSnippetResult = ({
  candidate,
  index,
  type,
  config,
  powerWords,
  profile,
  pixelLimit,
  scorer,
  previewBuilder,
}) => {
  const scored = scorer.score(candidate.text, {
    contentType: type,
    intent: config.intent,
    powerWords,
    primaryKeyword: titleCase(config.primaryKeyword),
  });
  const pixelWidth = Math.round(
    previewBuilder.estimatePixelWidth(candidate.text, type),
  );
  return {
    id: `${type}-${index + 1}`,
    text: candidate.text,
    charCount: candidate.text.length,
    pixelWidth,
    optimizationScore: scored.score,
    badge: scored.badge,
    badgeLevel: scored.badgeLevel,
    scoreBreakdown: scored.breakdown,
    matchedPowerWords: scored.matchedPowerWords,
    truncated: pixelWidth > pixelLimit,
    outsideCharacterTarget:
      candidate.text.length < profile.min ||
      candidate.text.length > profile.max,
    templateId: candidate.template.id,
    templateStyle: candidate.template.style,
    ...(type === "title"
      ? {
          schemaHeadline: candidate.text.length <= 110 ? candidate.text : null,
        }
      : {}),
  };
};

/** Decorates a complete selected set with the same response policy. */
const buildSnippetResults = ({ candidates, ...options }) =>
  candidates.map((candidate, index) =>
    buildSnippetResult({ candidate, index, ...options }),
  );

/**
 * @param {object} options
 * @param {import("../contracts/generation").GenerationConfig} options.config
 * @param {GeneratedSnippet[]} options.titles
 * @param {GeneratedSnippet[]} options.metas
 * @param {boolean} options.titleFallback
 * @param {boolean} options.metaFallback
 * @returns {GenerationResult}
 */
const buildGenerationResult = ({
  config,
  titles,
  metas,
  titleFallback,
  metaFallback,
}) => ({
  config,
  titles,
  metas,
  scoreBreakdownLabels: SCORE_BREAKDOWN_LABELS,
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
});

module.exports = {
  buildGenerationResult,
  buildSnippetResults,
};
