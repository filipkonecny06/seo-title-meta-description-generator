const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { SerpPreviewBuilder } = require("../../src/services/serpService");

describe("SerpPreviewBuilder", () => {
  const builder = new SerpPreviewBuilder();

  it("escapes untrusted HTML before highlighting keywords", () => {
    const preview = builder.build({
      title: "<img src=x onerror=alert(1)> SEO",
      meta: "<script>alert(1)</script>",
      primaryKeyword: "SEO",
      url: "https://example.com/?q=<unsafe>",
      device: "desktop",
    });
    assert.ok(!preview.titleHtml.includes("<img"));
    assert.ok(preview.titleHtml.includes("<strong>SEO</strong>"));
    assert.ok(preview.metaHtml.includes("&lt;script&gt;"));
    assert.ok(preview.url.includes("&lt;unsafe&gt;"));
  });

  it("uses the requested device limits and clamps progress", () => {
    const preview = builder.build({
      title: "W".repeat(100),
      meta: "",
      device: "mobile",
    });
    assert.equal(preview.titleLimit, 430);
    assert.equal(preview.titleProgress, 100);
    assert.equal(preview.titleTruncated, true);
  });
});
