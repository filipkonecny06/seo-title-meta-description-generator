const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  badgeClass,
  escapeHtml,
  slugify,
} = require("../../src/public/js/generatorUtilities");

describe("browser generator utilities", () => {
  it("normalizes display helpers and escapes untrusted copy", () => {
    assert.equal(
      escapeHtml('<script type="x">&</script>'),
      "&lt;script type=&quot;x&quot;&gt;&amp;&lt;/script&gt;",
    );
    assert.equal(slugify("  SEO & CMS Review  "), "seo-cms-review");
    assert.equal(badgeClass("High alignment"), "badge-high");
    assert.equal(badgeClass("unknown"), "badge-review");
  });
});
