const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  JsonTemplateCatalogRepository,
} = require("../../src/repositories/catalogRepository");
const {
  SnippetGenerator,
  applyTemplate,
  ensureUniqueWithinLimit,
  titleCase,
} = require("../../src/services/generatorService");

const repository = new JsonTemplateCatalogRepository();
const fixedClock = () => new Date("2026-06-15T12:00:00.000Z");
const createGenerator = () =>
  new SnippetGenerator({ catalogRepository: repository, clock: fixedClock });
const baseInput = {
  primaryKeyword: "project management software",
  secondaryKeywords: "asana, monday",
  audience: "startups",
  location: "Prague",
  includeYear: true,
  intent: "informational",
  tone: "authoritative",
  titleStyle: "list",
  metaStyle: "educational",
  length: "medium",
  bulkMode: false,
};

describe("SnippetGenerator", () => {
  it("uses only the explicitly selected title style", async () => {
    for (const titleStyle of [
      "list",
      "how-to",
      "question",
      "comparison",
      "best/top",
    ]) {
      const result = await createGenerator().generate({
        ...baseInput,
        titleStyle,
      });
      assert.equal(result.titles.length, 10);
      assert.ok(
        result.titles.every((title) => title.templateStyle === titleStyle),
      );
    }
  });

  it("is repeatable with an injected clock", async () => {
    const first = await createGenerator().generate(baseInput);
    const second = await createGenerator().generate(baseInput);
    assert.deepEqual(first, second);
  });

  it("preserves known acronyms and existing brand casing", async () => {
    assert.equal(
      titleCase("iPhone seo for B2B SaaS"),
      "iPhone SEO For B2B SaaS",
    );
    const result = await createGenerator().generate({
      ...baseInput,
      primaryKeyword: "iPhone SEO",
    });
    assert.ok(
      result.titles.every((title) => title.text.includes("iPhone SEO")),
    );
  });

  it("removes an optional year with its dangling preposition", () => {
    assert.equal(
      applyTemplate("How to Improve {PrimaryKeyword} in {Year}.", {
        PrimaryKeyword: "SEO",
        Year: "",
      }),
      "How to Improve SEO.",
    );
  });

  it("keeps bulk output unique and within the chosen length limits", async () => {
    const result = await createGenerator().generate({
      ...baseInput,
      bulkMode: true,
    });
    assert.equal(
      new Set(result.titles.map((title) => title.text.toLowerCase())).size,
      20,
    );
    assert.ok(result.titles.every((title) => title.charCount <= 60));
    assert.ok(result.metas.every((meta) => meta.charCount <= 155));
  });

  it("enforces uniqueness without appending beyond the limit", () => {
    const seen = new Set(["a useful seo title"]);
    const unique = ensureUniqueWithinLimit("A Useful SEO Title", seen, 24, "7");
    assert.ok(unique.length <= 24);
    assert.notEqual(unique.toLowerCase(), "a useful seo title");
  });
});
