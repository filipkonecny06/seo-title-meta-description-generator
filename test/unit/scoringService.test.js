const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  OptimizationScorer,
  hasIntentSignal,
} = require("../../src/services/scoringService");
const {
  SCORE_BREAKDOWN_LABELS,
  resolveScoreBadge,
} = require("../../src/contracts/generation");

describe("OptimizationScorer", () => {
  const scorer = new OptimizationScorer();

  it("matches intent signals on word boundaries rather than substrings", () => {
    assert.equal(hasIntentSignal("Somehow this works", "informational"), false);
    assert.equal(hasIntentSignal("How this works", "informational"), true);
    assert.equal(hasIntentSignal("Desktop software", "commercial"), false);
    assert.equal(hasIntentSignal("Compare software", "commercial"), true);
  });

  it("uses catalog weights in the power-word contribution", () => {
    const light = scorer.score("A reliable SEO guide for modern teams today", {
      powerWords: [{ word: "reliable", weight: 1 }],
    });
    const strong = scorer.score("A reliable SEO guide for modern teams today", {
      powerWords: [{ word: "reliable", weight: 5 }],
    });
    assert.equal(strong.score - light.score, 8);
    assert.equal(light.breakdown.powerWords, 2);
    assert.equal(strong.breakdown.powerWords, 10);
    assert.equal(SCORE_BREAKDOWN_LABELS.powerWords, "Matched terms");
  });

  it("returns stable machine-readable badge levels separately from labels", () => {
    assert.deepEqual(resolveScoreBadge(90), {
      minimum: 90,
      level: "high",
      label: "High alignment",
    });
    assert.equal(resolveScoreBadge(75).level, "medium");
    assert.equal(resolveScoreBadge(60).level, "partial");
    assert.equal(resolveScoreBadge(0).level, "review");
  });

  it("uses content-specific optimal lengths", () => {
    const meta = scorer.score("x".repeat(145), { contentType: "meta" });
    const title = scorer.score("x".repeat(55), { contentType: "title" });
    assert.equal(meta.breakdown.optimalLength, 15);
    assert.equal(title.breakdown.optimalLength, 15);
  });

  it("requires the complete primary keyword at the start", () => {
    assert.equal(
      scorer.score("SEO Guide for Teams", { primaryKeyword: "SEO" }).breakdown
        .keywordFirst,
      10,
    );
    assert.equal(
      scorer.score("Seoul Guide for Teams", { primaryKeyword: "SEO" }).breakdown
        .keywordFirst,
      0,
    );
  });
});
