const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { csvEscape } = require("../../src/public/js/csv");
const {
  SnippetExporter,
  buildCsvExport,
  buildTextExport,
  hasOutput,
} = require("../../src/public/js/generatorExport");
const {
  generatedData,
  meta,
  title,
} = require("../../test-support/browserFixtures");

describe("SnippetExporter", () => {
  it("builds stable text and spreadsheet-safe CSV exports", () => {
    const state = {
      config: generatedData.config,
      titles: [title],
      metas: [meta],
    };
    assert.equal(hasOutput(state), true);
    assert.match(buildTextExport(state), /1\. SEO <Review> & Checklist/);
    const csv = buildCsvExport(
      { ...state, titles: [{ ...title, text: "=SUM(A1:A2)" }] },
      csvEscape,
    );
    assert.match(csv, /^"type","text","charCount"/);
    assert.match(csv, /"'=SUM\(A1:A2\)"/);
    assert.equal(hasOutput({ titles: [], metas: [] }), false);
  });

  it("downloads text and CSV through an injected browser boundary", () => {
    const links = [];
    const revoked = [];
    class FakeBlob {
      constructor(parts, options) {
        this.parts = parts;
        this.options = options;
      }
    }
    const exporter = new SnippetExporter({
      document: {
        createElement: () => {
          const link = {
            click() {
              this.clicked = true;
            },
          };
          links.push(link);
          return link;
        },
      },
      urlApi: {
        createObjectURL: (blob) => `blob:${blob.options.type}`,
        revokeObjectURL: (url) => revoked.push(url),
      },
      BlobImplementation: FakeBlob,
      csvEscape,
      clock: () => 1234,
    });
    const state = {
      config: generatedData.config,
      titles: [title],
      metas: [meta],
    };
    exporter.downloadText(state);
    exporter.downloadCsv(state);
    assert.deepEqual(
      links.map((link) => link.download),
      ["seo-snippets-1234.txt", "seo-snippets-1234.csv"],
    );
    assert.ok(links.every((link) => link.clicked));
    assert.equal(revoked.length, 2);
  });
});
