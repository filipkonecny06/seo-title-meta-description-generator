const fs = require("node:fs");
const path = require("node:path");
const { z } = require("zod");

const INTENTS = [
  "informational",
  "commercial",
  "transactional",
  "navigational",
];
const TITLE_STYLES = ["list", "how-to", "question", "comparison", "best/top"];
const META_STYLES = ["educational", "sales-focused", "benefit-driven"];

const allowedPlaceholders = new Set([
  "Audience",
  "Benefit",
  "Benefit1",
  "Benefit2",
  "Competitor",
  "IntentHook",
  "Location",
  "Number",
  "PrimaryKeyword",
  "SecondaryKeywords",
  "ToneModifier",
  "Urgency",
  "Year",
]);

const formulaSchema = z.string().trim().min(12).max(500);
const titleTemplateSchema = z
  .object({
    formula: formulaSchema,
    powerWordBoostScore: z.number().int().min(0).max(100),
  })
  .strict();
const metaTemplateSchema = z
  .object({
    formula: formulaSchema,
    benefitWeight: z.number().int().min(0).max(100),
    urgencyWeight: z.number().int().min(0).max(100),
  })
  .strict();
const powerWordSchema = z
  .object({
    word: z.string().trim().min(2).max(80),
    weight: z.number().int().min(1).max(5),
  })
  .strict();

const catalogSchema = z
  .object({
    version: z.number().int().positive(),
    intents: z.array(z.enum(INTENTS)).length(INTENTS.length),
    titleTemplates: z
      .object(
        Object.fromEntries(
          TITLE_STYLES.map((style) => [
            style,
            z.array(titleTemplateSchema).min(3).max(30),
          ]),
        ),
      )
      .strict(),
    metaTemplates: z
      .object(
        Object.fromEntries(
          META_STYLES.map((style) => [
            style,
            z.array(metaTemplateSchema).min(3).max(30),
          ]),
        ),
      )
      .strict(),
    powerWords: z
      .object({
        emotion: z.array(powerWordSchema).min(1),
        urgency: z.array(powerWordSchema).min(1),
        authority: z.array(powerWordSchema).min(1),
        trust: z.array(powerWordSchema).min(1),
      })
      .strict(),
  })
  .strict()
  .superRefine((catalog, context) => {
    if (new Set(catalog.intents).size !== INTENTS.length) {
      context.addIssue({
        code: "custom",
        message: "Every supported intent must appear exactly once.",
      });
    }
    const seenWords = new Set();
    Object.values(catalog.powerWords)
      .flat()
      .forEach(({ word }) => {
        const normalized = word.toLowerCase();
        if (seenWords.has(normalized)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate power word: ${word}`,
          });
        }
        seenWords.add(normalized);
      });

    const formulas = [
      ...Object.values(catalog.titleTemplates).flat(),
      ...Object.values(catalog.metaTemplates).flat(),
    ];
    formulas.forEach(({ formula }) => {
      for (const match of formula.matchAll(/\{([A-Za-z0-9_]+)\}/g)) {
        if (!allowedPlaceholders.has(match[1])) {
          context.addIssue({
            code: "custom",
            message: `Unknown placeholder {${match[1]}} in: ${formula}`,
          });
        }
      }
    });
  });

const defaultCatalogPath = path.join(__dirname, "catalog.json");

const loadCatalog = (catalogPath = defaultCatalogPath) => {
  const content = fs.readFileSync(catalogPath, "utf8");
  return catalogSchema.parse(JSON.parse(content));
};

module.exports = {
  INTENTS,
  META_STYLES,
  TITLE_STYLES,
  catalogSchema,
  defaultCatalogPath,
  loadCatalog,
};
