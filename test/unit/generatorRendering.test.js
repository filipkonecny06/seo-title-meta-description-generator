const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  renderComparison,
  renderMetaCard,
  renderScoreDetails,
  renderTitleCard,
} = require("../../src/public/js/generatorRendering");
const {
  generatedData,
  meta,
  title,
} = require("../../test-support/browserFixtures");

describe("generator result rendering", () => {
  it("renders escaped cards, stable badge levels, and an explainable comparison", () => {
    const state = {
      titles: [title, { ...title, id: "title-2", text: "Second title" }],
      selectedTitleId: "title-1",
      selectedMetaId: "meta-1",
      compareTitleIds: ["title-1", "title-2"],
      scoreBreakdownLabels: generatedData.scoreBreakdownLabels,
    };
    const titleHtml = renderTitleCard(title, 0, state);
    assert.match(titleHtml, /result-card active/);
    assert.match(titleHtml, /badge-medium/);
    assert.match(titleHtml, /SEO &lt;Review&gt; &amp; Checklist/);
    assert.match(titleHtml, /Within selected character band/);
    assert.match(titleHtml, /Score breakdown/);
    assert.match(titleHtml, /Intent signal/);
    assert.match(titleHtml, /clear, &lt;review&gt;/);
    assert.match(
      renderScoreDetails(title, state.scoreBreakdownLabels),
      /Matched terms/,
    );

    const metaHtml = renderMetaCard(meta, 0, state);
    assert.match(metaHtml, /badge-partial/);
    assert.match(metaHtml, /Potential truncation/);
    assert.match(metaHtml, /Outside selected character band/);

    const comparison = renderComparison(state);
    assert.match(comparison, /Higher heuristic score/);
    assert.match(comparison, /SEO &lt;Review&gt; &amp; Checklist/);
    assert.equal(
      renderComparison({ titles: [title], compareTitleIds: [] }),
      "",
    );
  });

  it("renders a safe empty score state", () => {
    assert.match(
      renderScoreDetails({ matchedPowerWords: [] }),
      /Scored signals/,
    );
  });
});
