const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { loadEnvironment } = require("../../src/config/env");
const {
  catalogSchema,
  loadCatalog,
} = require("../../src/catalog/catalogSchema");
const {
  JsonTemplateCatalogRepository,
} = require("../../src/repositories/catalogRepository");
const {
  generationInputSchema,
  loginSchema,
  previewInputSchema,
  registerSchema,
} = require("../../src/validation/schemas");
const { neutralizeSpreadsheetFormula } = require("../../src/public/js/csv");

describe("configuration and input validation", () => {
  it("loads and summarizes the version-controlled catalog", () => {
    const catalog = loadCatalog();
    const summary = new JsonTemplateCatalogRepository({ catalog }).getSummary();
    assert.deepEqual(summary, {
      version: 3,
      titleFormulaCount: 20,
      metaFormulaCount: 15,
      powerWordCount: 40,
      supportedIntents: [
        "informational",
        "commercial",
        "transactional",
        "navigational",
      ],
      titleStyles: ["list", "how-to", "question", "comparison", "guide"],
      metaStyles: ["educational", "decision-support", "action-oriented"],
    });
    const words = new JsonTemplateCatalogRepository({
      catalog,
    }).getPowerWords();
    assert.deepEqual(
      words,
      [...words].sort(
        (first, second) =>
          second.weight - first.weight ||
          first.word.localeCompare(second.word, "en-US"),
      ),
    );
  });

  it("rejects duplicate, malformed, and unknown catalog formulas", () => {
    const catalog = structuredClone(loadCatalog());
    catalog.titleTemplates.list[1].formula =
      catalog.titleTemplates.list[0].formula;
    catalog.titleTemplates.guide[0].formula =
      "A formula with {UnknownField} and a malformed {placeholder";
    catalog.metaTemplates.educational[0].formula =
      "A complete {PrimaryKeyword} description without semantic context.";
    catalog.titleTemplates.comparison[0].formula =
      "{Number} {ToneCueTitle} {IntentTopicTitle} for {PrimaryKeyword}";
    catalog.metaTemplates["decision-support"][0].formula =
      "Use {IntentTopic} to {IntentAction} {PrimaryKeyword} in a {ToneCue} review.";
    const result = catalogSchema.safeParse(catalog);
    assert.equal(result.success, false);
    const messages = result.error.issues.map((issue) => issue.message);
    assert.ok(
      messages.some((message) => message.includes("Duplicate template")),
    );
    assert.ok(messages.some((message) => message.includes("PrimaryKeyword")));
    assert.ok(
      messages.some((message) => message.includes("Unknown placeholder")),
    );
    assert.ok(
      messages.some((message) => message.includes("Malformed placeholder")),
    );
    assert.ok(
      messages.some((message) => message.includes("intent placeholder")),
    );
    assert.ok(messages.some((message) => message.includes("{ToneCue}")));
    assert.equal(
      messages.filter((message) => message.includes("{Competitor}")).length,
      2,
    );
  });

  it("normalizes the retired length label for saved requests", () => {
    const result = generationInputSchema.parse({
      primaryKeyword: "SEO",
      secondaryKeywords: "CMS, analytics",
      length: "max ctr",
    });
    assert.equal(result.length, "long");
    assert.deepEqual(result.secondaryKeywords, ["CMS", "analytics"]);
    assert.deepEqual(
      generationInputSchema.parse(result).secondaryKeywords,
      result.secondaryKeywords,
    );
  });

  it("applies the same secondary-keyword limits to strings and arrays", () => {
    const elevenKeywords = Array.from(
      { length: 11 },
      (_, index) => `option-${index + 1}`,
    );
    assert.equal(
      generationInputSchema.safeParse({
        primaryKeyword: "SEO",
        secondaryKeywords: elevenKeywords.join(","),
      }).success,
      false,
    );
    assert.equal(
      generationInputSchema.safeParse({
        primaryKeyword: "SEO",
        secondaryKeywords: elevenKeywords,
      }).success,
      false,
    );
    assert.equal(
      previewInputSchema.safeParse({
        secondaryKeywords: ["x".repeat(101)],
      }).success,
      false,
    );
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
    assert.equal(
      loginSchema.safeParse({
        email: "test@example.com",
        password: "😀".repeat(40),
      }).success,
      false,
    );
    assert.equal(
      loginSchema.safeParse({
        email: "test@example.com",
        password: "correct-password",
      }).success,
      true,
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

  it("rejects misspelled database TLS booleans in runtime and CLI config", () => {
    const validEnvironment = {
      SESSION_SECRET: "unit-test-runtime-key-8f3c2a91b7d64e50",
      DB_HOST: "localhost",
      DB_NAME: "test",
      DB_USER: "test",
      DB_SSL: "yes",
      DB_SSL_REJECT_UNAUTHORIZED: "off",
    };
    const loaded = loadEnvironment(validEnvironment);
    assert.equal(loaded.database.ssl, true);
    assert.equal(loaded.database.rejectUnauthorized, false);
    assert.throws(
      () => loadEnvironment({ ...validEnvironment, DB_SSL: "ture" }),
      /DB_SSL/,
    );
    assert.throws(
      () =>
        loadEnvironment({
          ...validEnvironment,
          DB_SSL_REJECT_UNAUTHORIZED: "fasle",
        }),
      /DB_SSL_REJECT_UNAUTHORIZED/,
    );

    const cliPath = require.resolve("../../src/config/sequelize-cli.cjs");
    const previous = {
      DB_SSL: process.env.DB_SSL,
      DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
    };
    try {
      process.env.DB_SSL = "ture";
      process.env.DB_SSL_REJECT_UNAUTHORIZED = "true";
      delete require.cache[cliPath];
      assert.throws(() => require(cliPath), /DB_SSL/);

      process.env.DB_SSL = "true";
      process.env.DB_SSL_REJECT_UNAUTHORIZED = "fasle";
      delete require.cache[cliPath];
      assert.throws(() => require(cliPath), /DB_SSL_REJECT_UNAUTHORIZED/);
    } finally {
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
      delete require.cache[cliPath];
    }
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
