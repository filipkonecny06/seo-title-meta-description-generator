const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { GeneratorState } = require("../../src/public/js/generatorState");
const { GeneratorView } = require("../../src/public/js/generatorView");
const {
  FakeElement,
  createViewDocument,
  generatedData,
  title,
} = require("../../test-support/browserFixtures");

describe("GeneratorView", () => {
  it("keeps DOM reads, rendering, and event binding inside GeneratorView", () => {
    const { document, elements } = createViewDocument();
    const view = new GeneratorView(document);
    assert.equal(view.isValid(), true);
    assert.equal(view.getPayload().primaryKeyword, "SEO review");
    assert.equal(view.getPayload().includeYear, true);
    assert.equal(view.getPageUrl(), "https://example.com/page");
    assert.deepEqual(
      view.getAction({
        target: {
          closest: () => ({ dataset: { action: "copy", id: "title-1" } }),
        },
      }),
      { action: "copy", id: "title-1" },
    );
    assert.equal(view.getAction({ target: {} }), null);

    const calls = [];
    view.bind({
      generate: () => calls.push("generate"),
      configurationChanged: () => calls.push("changed"),
      saveGeneration: () => calls.push("save"),
      downloadText: () => calls.push("text"),
      downloadCsv: () => calls.push("csv"),
      resultAction: (event, type) => calls.push(type),
      device: (device) => calls.push(device),
      refreshPreview: () => calls.push("preview"),
    });
    elements["generator-form"].emit("submit", { preventDefault() {} });
    elements["generator-form"].emit("input");
    elements["save-generation-btn"].emit("click");
    elements["download-btn"].emit("click");
    elements["export-btn"].emit("click");
    elements["title-results"].emit("click");
    elements["meta-results"].emit("click");
    elements["desktop-toggle"].emit("click");
    elements["mobile-toggle"].emit("click");
    elements["generator-form"].pageUrl.emit("change");
    assert.deepEqual(calls, [
      "generate",
      "changed",
      "save",
      "text",
      "csv",
      "title",
      "meta",
      "desktop",
      "mobile",
      "preview",
    ]);

    const state = new GeneratorState();
    state.applyGeneration({
      ...generatedData,
      titles: [title, { ...title, id: "title-2", text: "Second title" }],
    });
    state.compareTitleIds = ["title-1", "title-2"];
    view.render(state);
    assert.match(elements["title-results"].innerHTML, /Title 1/);
    assert.match(elements["summary-badges"].innerHTML, /Avg Title Score/);
    assert.match(
      elements["schema-suggestions"].innerHTML,
      /SEO &lt;Review&gt;/,
    );
    assert.equal(
      elements["compare-panel"].classList.values.has("hidden"),
      false,
    );
    state.lengthFallback = { reason: "Input <too long> for the band." };
    view.render(state);
    assert.match(
      elements["summary-badges"].innerHTML,
      /Input &lt;too long&gt; for the band/,
    );

    view.updatePreview(
      {
        url: "https://example.com/page",
        titleHtml: "<strong>SEO</strong> title",
        metaHtml: "<strong>SEO</strong> meta",
        titlePixels: 500,
        titleLimit: 580,
        metaPixels: 950,
        metaLimit: 920,
        titleProgress: 86,
        metaProgress: 100,
        titleTruncated: false,
        metaTruncated: true,
      },
      { device: "mobile" },
    );
    assert.equal(
      elements["preview-url"].textContent,
      "https://example.com/page",
    );
    assert.equal(elements["meta-progress"].classList.values.has("warn"), true);
    assert.match(elements["meta-warning"].textContent, /may truncate/);
    assert.equal(elements["serp-card"].classList.values.has("mobile"), true);

    view.setLoading(true);
    assert.equal(elements["generate-btn"].disabled, true);
    assert.equal(elements["save-generation-btn"].disabled, true);
    view.setLoading(false);
    const titleFavorite = new FakeElement();
    const metaFavorite = new FakeElement();
    elements["title-results"].favoriteButtons = [titleFavorite];
    elements["meta-results"].favoriteButtons = [metaFavorite];
    view.setPersistenceBusy(true);
    assert.equal(elements["save-generation-btn"].disabled, true);
    assert.equal(titleFavorite.disabled, true);
    assert.equal(metaFavorite.disabled, true);
    view.setPersistenceBusy(false);
    assert.equal(elements["save-generation-btn"].disabled, false);
    view.setDevice("mobile");
    assert.equal(elements["mobile-toggle"].attributes["aria-pressed"], "true");
    view.setStatus("Ready for review.");
    assert.equal(elements["generator-status"].textContent, "Ready for review.");
  });
});
