/** Selects diverse, deterministic snippets that best fit a length profile. */
const { normalizeWhitespace } = require("./snippetText");

/** Returns a candidate's character distance from the accepted length band. */
const candidateDistance = (text, profile) => {
  if (text.length < profile.min) return profile.min - text.length;
  if (text.length > profile.max) return text.length - profile.max;
  return 0;
};

const rankCandidates = (candidates, profile) => {
  const midpoint = (profile.min + profile.max) / 2;
  return candidates.sort((first, second) => {
    const distanceDifference =
      candidateDistance(first.text, profile) -
      candidateDistance(second.text, profile);
    if (distanceDifference) return distanceDifference;

    const midpointDifference =
      Math.abs(first.text.length - midpoint) -
      Math.abs(second.text.length - midpoint);
    if (midpointDifference) return midpointDifference;

    // Lexical tie-breaking avoids relying on engine or insertion-order accidents.
    return first.text.localeCompare(second.text, "en-US");
  });
};

const roundRobinCandidates = (groups) => {
  const candidates = [];
  for (let round = 0; ; round += 1) {
    let addedInRound = false;
    for (const group of groups) {
      if (group[round]) {
        candidates.push(group[round]);
        addedInRound = true;
      }
    }
    if (!addedInRound) return candidates;
  }
};

const rankTemplateCandidates = (candidates, profile) => {
  const candidatesByAlternate = new Map();
  for (const candidate of candidates) {
    const key = candidate.alternateKey || "default";
    const group = candidatesByAlternate.get(key) || [];
    group.push(candidate);
    candidatesByAlternate.set(key, group);
  }
  const rankedAlternates = [...candidatesByAlternate.values()].map((group) =>
    rankCandidates(group, profile),
  );
  return roundRobinCandidates(rankedAlternates);
};

/**
 * Deduplicates rendered text, prefers the requested band, and interleaves
 * templates so one prolific formula cannot dominate the returned set.
 *
 * @param {Array<object>} candidates Rendered candidate records.
 * @param {number} count Required number of results.
 * @param {{min: number, max: number}} profile Character-length target.
 * @returns {Array<object>} Exactly `count` ranked candidates.
 * @throws {Error} When the pool cannot supply enough distinct snippets.
 */
const selectCandidates = (candidates, count, profile) => {
  const unique = new Map();
  for (const candidate of candidates) {
    const text = normalizeWhitespace(candidate.text);
    const key = text.toLocaleLowerCase("en-US");
    if (text && !unique.has(key)) unique.set(key, { ...candidate, text });
  }

  if (unique.size < count) {
    throw new Error(
      `The selected template set produced ${unique.size} distinct snippets; ${count} are required.`,
    );
  }

  const allCandidates = [...unique.values()];
  const inBand = allCandidates.filter(
    (candidate) => candidateDistance(candidate.text, profile) === 0,
  );
  const atOrAboveMinimum = allCandidates.filter(
    (candidate) => candidate.text.length >= profile.min,
  );
  const eligible =
    inBand.length >= count
      ? inBand
      : atOrAboveMinimum.length >= count
        ? atOrAboveMinimum
        : allCandidates;
  const candidatesByTemplate = new Map();
  for (const candidate of eligible) {
    const templateId = candidate.template?.id || "unassigned-template";
    const group = candidatesByTemplate.get(templateId) || [];
    group.push(candidate);
    candidatesByTemplate.set(templateId, group);
  }
  const rankedGroups = [...candidatesByTemplate.values()].map((group) =>
    rankTemplateCandidates(group, profile),
  );
  return roundRobinCandidates(rankedGroups).slice(0, count);
};

module.exports = { candidateDistance, selectCandidates };
