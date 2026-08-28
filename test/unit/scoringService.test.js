const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  OptimizationScorer,
  hasIntentSignal,
} = require("../../src/services/scoringService");

describe("OptimizationScorer", () => {
  const scorer = new OptimizationScorer();

  it("matches intent signals on word boundaries rather than substrings", () => {
    assert.equal(hasIntentSignal("Somehow this works", "informational"), false);
    assert.equal(hasIntentSignal("How this works", "informational"), true);
    assert.equal(hasIntentSignal("Desktop software", "commercial"), false);
    assert.equal(hasIntentSignal("Top software", "commercial"), true);
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
