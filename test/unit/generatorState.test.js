const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { GeneratorState } = require("../../src/public/js/generatorState");
const { generatedData, title } = require("../../test-support/browserFixtures");

describe("GeneratorState", () => {
  it("owns result selection, comparison, and reset transitions", () => {
    const state = new GeneratorState();
    state.applyGeneration(generatedData);
    assert.equal(state.selectedTitleId, "title-1");
    assert.equal(state.selectedMetaId, "meta-1");
    assert.equal(state.scoreBreakdownLabels.intentSignal, "Intent signal");
    assert.equal(state.selectedTitle(), title);
    state.toggleComparison("title-1");
    state.toggleComparison("title-2");
    state.toggleComparison("title-3");
    assert.deepEqual(state.compareTitleIds, ["title-2", "title-3"]);
    state.toggleComparison("title-2");
    assert.deepEqual(state.compareTitleIds, ["title-3"]);
    state.clearResults();
    assert.equal(state.selectedTitle(), null);
    assert.equal(state.selectedMeta(), null);

    state.applyGeneration({});
    assert.deepEqual(state.titles, []);
    assert.deepEqual(state.metas, []);
    assert.deepEqual(state.schemaHeadlineSuggestions, []);
    assert.deepEqual(state.scoreBreakdownLabels, {});
    assert.equal(state.summary, null);
    assert.equal(state.lengthFallback, null);
  });
});
