const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  JsonTemplateCatalogRepository,
} = require("../../src/repositories/catalogRepository");
const {
  LENGTH_PROFILES,
  NORMAL_INPUT_LIMITS,
  SnippetGenerator,
  applyTemplate,
  isNormalInput,
  normalizeInput,
  selectCandidates,
  titleCase,
} = require("../../src/services/generatorService");

const repository = new JsonTemplateCatalogRepository();
const fixedClock = () => new Date("2026-06-15T12:00:00.000Z");
const createGenerator = (clock = fixedClock) =>
  new SnippetGenerator({ catalogRepository: repository, clock });
const baseInput = {
  primaryKeyword: "project management",
  secondaryKeywords: "Asana, Monday",
  audience: "small teams",
  location: "Prague",
  includeYear: false,
  intent: "informational",
  tone: "neutral",
  titleStyle: "list",
  metaStyle: "educational",
  length: "medium",
  bulkMode: true,
};
const titleStyles = ["list", "how-to", "question", "comparison", "guide"];
const metaStyles = ["educational", "decision-support", "action-oriented"];
const intents = [
  "informational",
  "commercial",
  "transactional",
  "navigational",
];
const tones = ["neutral", "authoritative", "urgent", "friendly"];
const intentMarkers = {
  informational: ["learn", "key facts"],
  commercial: ["compare", "comparing", "options"],
  transactional: ["choose", "choosing", "next steps"],
  navigational: ["find", "key pages"],
};
const intentActions = {
  informational: ["learn", "learning"],
  commercial: ["compare", "comparing"],
  transactional: ["choose", "choosing"],
  navigational: ["find", "finding"],
};
const intentTopics = {
  informational: "key facts",
  commercial: "options",
  transactional: "next steps",
  navigational: "key pages",
};
const toneMarkers = {
  neutral: "clear",
  authoritative: "formal",
  urgent: "quick",
  friendly: "simple",
};
const normalInputCorpus = [
  {
    name: "short fields",
    primaryKeyword: "SEO",
    audience: "teams",
    location: "EU",
    secondaryKeywords: "CMS",
  },
  {
    name: "typical fields",
    primaryKeyword: "project management",
    audience: "small teams",
    location: "Prague",
    secondaryKeywords: "Asana, Monday",
  },
  {
    name: "normal-range boundaries",
    primaryKeyword: "local bakery website",
    audience: "small ecommerce operations teams",
    location: "Greater London metropolitan area",
    secondaryKeywords: "business intelligence reporting platform",
    comparisonSecondaryKeywords: "Option B",
  },
];
const unsupportedClaims =
  /\b(?:best|top|proven|trusted|official|expert-backed|data-driven|qualified leads|ranking momentum|conversion intent)\b/i;
const artificialSuffix = /\s(?:·|#)\s*\d+(?:-\d+)?$/;
const trailingFragment = /\b(?:a|an|the|for|to|with|of|and|or|in|on|by|from)$/i;
const awkwardIntentPhrase =
  /\b(?:key facts|options|next steps|key pages)\s+(?:points|compared)\b/i;

const assertCleanOutput = (result) => {
  assert.equal(result.titles.length, result.config.bulkMode ? 20 : 10);
  assert.equal(result.metas.length, 5);
  for (const items of [result.titles, result.metas]) {
    assert.equal(
      new Set(items.map((item) => item.text.toLocaleLowerCase("en-US"))).size,
      items.length,
    );
    for (const item of items) {
      assert.equal(item.text, item.text.trim());
      assert.doesNotMatch(item.text, /\s{2,}/);
      assert.doesNotMatch(item.text, /[{}]/);
      assert.doesNotMatch(item.text, unsupportedClaims);
      assert.doesNotMatch(item.text, artificialSuffix);
      assert.doesNotMatch(item.text, trailingFragment);
      assert.doesNotMatch(item.text, awkwardIntentPhrase);
      assert.equal(item.charCount, item.text.length);
    }
  }
  assert.ok(result.metas.every((item) => /[.!?]$/.test(item.text)));
};

const assertFormulaDiversity = (result) => {
  const titleCounts = new Map();
  for (const title of result.titles) {
    assert.match(
      title.templateId,
      new RegExp(`:${result.config.titleStyle}:\\d+$`),
    );
    titleCounts.set(
      title.templateId,
      (titleCounts.get(title.templateId) || 0) + 1,
    );
  }
  const context = JSON.stringify(result.config);
  assert.equal(titleCounts.size, 4, context);
  assert.equal(
    new Set(result.titles.slice(0, 4).map((item) => item.templateId)).size,
    4,
    context,
  );
  const titleDistribution = [...titleCounts.values()];
  assert.ok(
    Math.max(...titleDistribution) - Math.min(...titleDistribution) <= 1,
    `${context} ${JSON.stringify(Object.fromEntries(titleCounts))}`,
  );

  assert.equal(
    new Set(result.metas.map((item) => item.templateId)).size,
    5,
    context,
  );
};

const assertSemanticContext = (result) => {
  const intentSignals = intentMarkers[result.config.intent];
  const toneSignal = toneMarkers[result.config.tone];
  for (const item of [...result.titles, ...result.metas]) {
    const text = item.text.toLocaleLowerCase("en-US");
    assert.ok(
      intentSignals.some((signal) => text.includes(signal)),
      `Expected ${result.config.intent} context in: ${item.text}`,
    );
    assert.ok(
      text.includes(toneSignal),
      `Expected ${result.config.tone} tone cue in: ${item.text}`,
    );
  }
  for (const meta of result.metas) {
    const text = meta.text.toLocaleLowerCase("en-US");
    assert.ok(
      intentActions[result.config.intent].some((action) =>
        text.includes(action),
      ),
      `Expected an intent action in: ${meta.text}`,
    );
    assert.ok(
      text.includes(intentTopics[result.config.intent]),
      `Expected an intent topic in: ${meta.text}`,
    );
  }
};

const assertComparisonTargets = (result) => {
  const targets = result.config.secondaryKeywords.map((keyword) =>
    keyword.toLocaleLowerCase("en-US"),
  );
  if (!targets.length) return;
  const includesTarget = (item) => {
    const text = item.text.toLocaleLowerCase("en-US");
    return targets.some((target) => text.includes(target));
  };
  if (result.config.titleStyle === "comparison") {
    assert.ok(result.titles.every(includesTarget));
  }
  if (result.config.metaStyle === "decision-support") {
    assert.ok(result.metas.every(includesTarget));
  }
};

describe("SnippetGenerator", () => {
  it("covers every style and length profile with complete in-band copy", async () => {
    for (const length of Object.keys(LENGTH_PROFILES)) {
      for (const titleStyle of titleStyles) {
        for (const metaStyle of metaStyles) {
          const result = await createGenerator().generate({
            ...baseInput,
            length,
            titleStyle,
            metaStyle,
          });
          assertCleanOutput(result);
          assertFormulaDiversity(result);
          assertSemanticContext(result);
          assertComparisonTargets(result);
          assert.ok(
            result.titles.every(
              (item) =>
                item.charCount >= LENGTH_PROFILES[length].title.min &&
                item.charCount <= LENGTH_PROFILES[length].title.max &&
                item.templateStyle === titleStyle &&
                !item.outsideCharacterTarget,
            ),
          );
          assert.ok(
            result.metas.every(
              (item) =>
                item.charCount >= LENGTH_PROFILES[length].meta.min &&
                item.charCount <= LENGTH_PROFILES[length].meta.max &&
                item.templateStyle === metaStyle &&
                !item.outsideCharacterTarget,
            ),
          );
        }
      }
    }
  });

  it("keeps the normal-input corpus semantic and in band across all core controls", async () => {
    let combinationIndex = 0;
    for (const corpusEntry of normalInputCorpus) {
      const normalizedCorpusEntry = normalizeInput(corpusEntry);
      assert.equal(
        isNormalInput(normalizedCorpusEntry),
        true,
        corpusEntry.name,
      );
      for (const length of Object.keys(LENGTH_PROFILES)) {
        for (const titleStyle of titleStyles) {
          for (const metaStyle of metaStyles) {
            for (const intent of intents) {
              for (const tone of tones) {
                const includeYear = combinationIndex % 2 === 0;
                const bulkMode = combinationIndex % 3 === 0;
                combinationIndex += 1;
                const result = await createGenerator().generate({
                  ...baseInput,
                  ...corpusEntry,
                  secondaryKeywords:
                    titleStyle === "comparison" ||
                    metaStyle === "decision-support"
                      ? corpusEntry.comparisonSecondaryKeywords ||
                        corpusEntry.secondaryKeywords
                      : corpusEntry.secondaryKeywords,
                  includeYear,
                  bulkMode,
                  length,
                  titleStyle,
                  metaStyle,
                  intent,
                  tone,
                });
                assertCleanOutput(result);
                assertFormulaDiversity(result);
                assertSemanticContext(result);
                assertComparisonTargets(result);
                assert.equal(result.lengthFallback, null, corpusEntry.name);
                assert.ok(
                  result.titles.every(
                    (item) =>
                      item.charCount >= LENGTH_PROFILES[length].title.min &&
                      item.charCount <= LENGTH_PROFILES[length].title.max &&
                      !item.outsideCharacterTarget,
                  ),
                  corpusEntry.name,
                );
                assert.ok(
                  result.metas.every(
                    (item) =>
                      item.charCount >= LENGTH_PROFILES[length].meta.min &&
                      item.charCount <= LENGTH_PROFILES[length].meta.max &&
                      !item.outsideCharacterTarget,
                  ),
                  corpusEntry.name,
                );
                const allText = JSON.stringify([
                  ...result.titles,
                  ...result.metas,
                ]);
                if (includeYear) assert.match(allText, /2026/);
                else assert.doesNotMatch(allText, /2026/);
              }
            }
          }
        }
      }
    }
    assert.equal(combinationIndex, 2160);
  });

  it("defines the normal-input boundary for every user-supplied text field", () => {
    const boundary = normalInputCorpus.at(-1);
    assert.equal(
      boundary.primaryKeyword.length,
      NORMAL_INPUT_LIMITS.primaryKeyword,
    );
    assert.equal(boundary.audience.length, NORMAL_INPUT_LIMITS.audience);
    assert.equal(boundary.location.length, NORMAL_INPUT_LIMITS.location);
    assert.equal(
      boundary.secondaryKeywords.length,
      NORMAL_INPUT_LIMITS.secondaryKeyword,
    );
    assert.equal(isNormalInput(normalizeInput(boundary)), true);

    const comparisonBoundary = normalizeInput({
      ...boundary,
      secondaryKeywords: boundary.comparisonSecondaryKeywords,
      titleStyle: "comparison",
      length: "short",
    });
    assert.equal(
      comparisonBoundary.primaryKeyword.length +
        comparisonBoundary.secondaryKeywords[0].length,
      NORMAL_INPUT_LIMITS.comparisonTitleCombined.short,
    );
    assert.equal(isNormalInput(comparisonBoundary), true);
    assert.equal(
      isNormalInput({
        ...comparisonBoundary,
        secondaryKeywords: [`${comparisonBoundary.secondaryKeywords[0]}x`],
      }),
      false,
    );

    for (const field of ["primaryKeyword", "audience", "location"]) {
      assert.equal(
        isNormalInput(
          normalizeInput({
            ...boundary,
            [field]: `${boundary[field]}x`,
          }),
        ),
        false,
        field,
      );
    }
    assert.equal(
      isNormalInput(
        normalizeInput({
          ...boundary,
          secondaryKeywords: `${boundary.secondaryKeywords}x`,
        }),
      ),
      false,
      "secondaryKeywords",
    );
  });

  it("uses an explicit fallback only for input that cannot fit complete copy", async () => {
    const result = await createGenerator().generate({
      ...baseInput,
      primaryKeyword:
        "international enterprise resource planning implementation strategy",
      length: "short",
      bulkMode: false,
    });
    assertCleanOutput(result);
    assert.match(
      result.lengthFallback.reason,
      /User-supplied text is too long/,
    );
    assert.equal(result.lengthFallback.titles, true);
    assert.ok(result.titles.some((item) => item.outsideCharacterTarget));
  });

  it("prefers complete overflow candidates to under-length fallback", () => {
    const selected = selectCandidates(
      [
        { text: "aaaaaaaaa", template: { id: "template-a" } },
        {
          text: "aaaaaaaaaaaaaaaaaaaaa",
          template: { id: "template-a" },
        },
        {
          text: "bbbbbbbbbbbbbbbbbbbbb",
          template: { id: "template-b" },
        },
      ],
      2,
      { min: 10, max: 20 },
    );

    assert.deepEqual(
      selected.map((candidate) => candidate.text.length),
      [21, 21],
    );
  });

  it("is independent of the clock when the year is disabled", async () => {
    const first = await createGenerator(
      () => new Date("2025-01-01T00:00:00.000Z"),
    ).generate(baseInput);
    const second = await createGenerator(
      () => new Date("2034-01-01T00:00:00.000Z"),
    ).generate(baseInput);
    assert.deepEqual(first, second);
    assert.doesNotMatch(JSON.stringify(first), /\b(?:2025|2034)\b/);
  });

  it("is repeatable when the year is enabled and the clock is fixed", async () => {
    const input = { ...baseInput, includeYear: true };
    const first = await createGenerator().generate(input);
    const second = await createGenerator().generate(input);
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

  it("keeps tone cues from changing the meaning of the primary keyword", async () => {
    const result = await createGenerator().generate({
      ...baseInput,
      primaryKeyword: "SEO tools",
      intent: "navigational",
      tone: "urgent",
      titleStyle: "question",
      length: "short",
      bulkMode: false,
    });

    assert.ok(
      result.titles.every((title) => !title.text.startsWith("Quick SEO Tools")),
    );
  });

  it("balances supplied alternatives across comparison formulas", async () => {
    const result = await createGenerator().generate({
      ...baseInput,
      primaryKeyword: "local bakery website",
      secondaryKeywords: "Squarespace, Wix",
      intent: "commercial",
      tone: "friendly",
      titleStyle: "comparison",
      metaStyle: "decision-support",
      length: "medium",
      bulkMode: false,
    });

    assertCleanOutput(result);
    assertFormulaDiversity(result);
    assertSemanticContext(result);
    assertComparisonTargets(result);
    for (const alternative of ["Squarespace", "Wix"]) {
      assert.ok(
        result.titles.some((title) => title.text.includes(alternative)),
      );
      assert.ok(result.metas.some((meta) => meta.text.includes(alternative)));
    }
  });

  it("keeps every decision-support formula in band at the normal alternative limit", async () => {
    const boundary = normalInputCorpus.at(-1);
    const result = await createGenerator().generate({
      ...baseInput,
      ...boundary,
      intent: "transactional",
      tone: "authoritative",
      titleStyle: "list",
      metaStyle: "decision-support",
      length: "short",
      includeYear: true,
    });

    assert.equal(isNormalInput(result.config), true);
    assert.equal(result.lengthFallback, null);
    assert.equal(new Set(result.metas.map((meta) => meta.templateId)).size, 5);
    assertComparisonTargets(result);
    assert.ok(
      result.metas.every(
        (meta) =>
          meta.charCount >= LENGTH_PROFILES.short.meta.min &&
          meta.charCount <= LENGTH_PROFILES.short.meta.max,
      ),
    );
  });

  it("removes an optional year with its dangling preposition", () => {
    assert.equal(
      applyTemplate("How to Review {PrimaryKeyword} in {Year}.", {
        PrimaryKeyword: "SEO",
        Year: "",
      }),
      "How to Review SEO.",
    );
  });

  it("fails clearly when a catalog cannot provide enough distinct copy", () => {
    assert.throws(
      () =>
        selectCandidates(
          [{ text: "Same complete title" }, { text: "same complete title" }],
          2,
          LENGTH_PROFILES.medium.title,
        ),
      /produced 1 distinct snippets; 2 are required/,
    );
  });
});
