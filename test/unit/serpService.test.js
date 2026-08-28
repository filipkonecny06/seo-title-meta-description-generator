const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  SerpPreviewBuilder,
  buildPreview,
  estimatePixelWidth,
  getPixelLimits,
} = require("../../src/services/serpService");

describe("SerpPreviewBuilder", () => {
  const builder = new SerpPreviewBuilder();

  it("escapes untrusted HTML while keeping the URL as plain text data", () => {
    const preview = builder.build({
      title: "<img src=x onerror=alert(1)> SEO",
      meta: "<script>alert(1)</script>",
      primaryKeyword: "SEO",
      url: "https://example.com/?q=<unsafe>&mode=review",
      device: "desktop",
    });
    assert.ok(!preview.titleHtml.includes("<img"));
    assert.ok(preview.titleHtml.includes("<strong>SEO</strong>"));
    assert.ok(preview.metaHtml.includes("&lt;script&gt;"));
    assert.equal(preview.url, "https://example.com/?q=<unsafe>&mode=review");
  });

  it("highlights raw text once without matching tags or escaped entities", () => {
    const preview = builder.build({
      title: "A stronger <SEO> review",
      meta: "SEO & metadata",
      primaryKeyword: "strong",
      secondaryKeywords: ["stronger", "tr", "lt", "SEO"],
    });

    assert.equal(
      preview.titleHtml,
      "A <strong>stronger</strong> &lt;<strong>SEO</strong>&gt; review",
    );
    assert.equal(preview.metaHtml, "<strong>SEO</strong> &amp; metadata");
    assert.doesNotMatch(preview.titleHtml, /<s<strong>|<strong>lt</);
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
    assert.ok(Math.abs(estimatePixelWidth("WWW", "title") - 35.4) < 0.001);
    assert.deepEqual(getPixelLimits("mobile"), {
      title: 430,
      meta: 680,
    });
    assert.equal(buildPreview({ title: "SEO" }).device, "desktop");
  });
});
