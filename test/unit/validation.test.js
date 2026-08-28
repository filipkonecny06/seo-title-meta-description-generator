const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { loadEnvironment } = require("../../src/config/env");
const { loadCatalog } = require("../../src/catalog/catalogSchema");
const {
  JsonTemplateCatalogRepository,
} = require("../../src/repositories/catalogRepository");
const {
  generationInputSchema,
  previewInputSchema,
  registerSchema,
} = require("../../src/validation/schemas");
const { neutralizeSpreadsheetFormula } = require("../../src/public/js/csv");

describe("configuration and input validation", () => {
  it("loads and summarizes the version-controlled catalog", () => {
    const catalog = loadCatalog();
    const summary = new JsonTemplateCatalogRepository({ catalog }).getSummary();
    assert.deepEqual(summary, {
      version: 1,
      titleCount: 80,
      metaCount: 15,
      powerWordCount: 40,
      titleIntentSummary: [
        { intent: "informational", count: 20 },
        { intent: "commercial", count: 20 },
        { intent: "transactional", count: 20 },
        { intent: "navigational", count: 20 },
      ],
    });
  });

  it("rejects unknown generation fields and non-http preview URLs", () => {
    assert.equal(
      generationInputSchema.safeParse({
        primaryKeyword: "SEO",
        unexpected: true,
      }).success,
      false,
    );
    assert.equal(
      previewInputSchema.safeParse({ url: "javascript:alert(1)" }).success,
      false,
    );
  });

  it("enforces the bcrypt byte boundary and a strong runtime secret", () => {
    assert.equal(
      registerSchema.safeParse({
        name: "Test User",
        email: "test@example.com",
        password: "ø".repeat(40),
      }).success,
      false,
    );
    assert.throws(() =>
      loadEnvironment({
        SESSION_SECRET: "replace_with_a_long_random_secret",
        DB_HOST: "localhost",
        DB_NAME: "test",
        DB_USER: "test",
      }),
    );
  });

  it("neutralizes spreadsheet formula prefixes in CSV fields", () => {
    assert.equal(
      neutralizeSpreadsheetFormula('=HYPERLINK("https://bad")'),
      '\'=HYPERLINK("https://bad")',
    );
    assert.equal(neutralizeSpreadsheetFormula("@SUM(A1:A2)"), "'@SUM(A1:A2)");
    assert.equal(neutralizeSpreadsheetFormula("Safe title"), "Safe title");
  });
});
