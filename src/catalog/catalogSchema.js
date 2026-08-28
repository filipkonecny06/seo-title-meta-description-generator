/** Defines and loads the version-controlled template catalog contract. */
const fs = require("node:fs");
const path = require("node:path");
const { z } = require("zod");

const INTENTS = [
  "informational",
  "commercial",
  "transactional",
  "navigational",
];
const TITLE_STYLES = ["list", "how-to", "question", "comparison", "guide"];
const META_STYLES = ["educational", "decision-support", "action-oriented"];
const POWER_WORD_CATEGORIES = ["clarity", "action", "format", "evaluation"];

// A closed placeholder vocabulary turns template typos into startup failures.
const allowedPlaceholders = new Set([
  "Audience",
  "AudienceTitle",
  "Competitor",
  "IntentAction",
  "IntentActionGerundTitle",
  "IntentActionTitle",
  "IntentHook",
  "IntentTopic",
  "IntentTopicTitle",
  "Location",
  "LocationTitle",
  "Number",
  "PrimaryKeyword",
  "TopicAngle",
  "TopicAngleTitle",
  "ToneModifier",
  "ToneModifierTitle",
  "ToneCue",
  "ToneCueTitle",
  "Year",
]);

const formulaSchema = z.string().trim().min(12).max(500);
const titleTemplateSchema = z
  .object({
    formula: formulaSchema,
  })
  .strict();
const metaTemplateSchema = z
  .object({
    formula: formulaSchema,
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
      .object(
        Object.fromEntries(
          POWER_WORD_CATEGORIES.map((category) => [
            category,
            z.array(powerWordSchema).length(10),
          ]),
        ),
      )
      .strict(),
  })
  .strict()
  .superRefine((catalog, context) => {
    // Cross-entry rules protect generation quality beyond individual field types.
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
      ...Object.entries(catalog.titleTemplates).flatMap(([style, templates]) =>
        templates.map((template) => ({ kind: "title", style, ...template })),
      ),
      ...Object.entries(catalog.metaTemplates).flatMap(([style, templates]) =>
        templates.map((template) => ({ kind: "meta", style, ...template })),
      ),
    ];
    const seenFormulas = new Set();
    formulas.forEach(({ formula, kind, style }) => {
      const normalizedFormula = formula.toLocaleLowerCase("en-US");
      if (seenFormulas.has(normalizedFormula)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate template formula: ${formula}`,
        });
      }
      seenFormulas.add(normalizedFormula);

      if (!formula.includes("{PrimaryKeyword}")) {
        context.addIssue({
          code: "custom",
          message: `Template must include {PrimaryKeyword}: ${formula}`,
        });
      }
      const requiresCompetitor =
        (kind === "title" && style === "comparison") ||
        (kind === "meta" && style === "decision-support");
      if (requiresCompetitor && !formula.includes("{Competitor}")) {
        context.addIssue({
          code: "custom",
          message: `Every ${style} ${kind} template must include {Competitor}: ${formula}`,
        });
      }
      const intentPlaceholders =
        kind === "title"
          ? [
              "{IntentActionGerundTitle}",
              "{IntentActionTitle}",
              "{IntentTopicTitle}",
            ]
          : ["{IntentAction}", "{IntentActionTitle}", "{IntentTopic}"];
      if (
        !intentPlaceholders.some((placeholder) => formula.includes(placeholder))
      ) {
        context.addIssue({
          code: "custom",
          message: `Every ${kind} template must include an intent placeholder: ${formula}`,
        });
      }
      if (kind === "meta" && !formula.includes("{IntentTopic}")) {
        context.addIssue({
          code: "custom",
          message: `Every meta template must include {IntentTopic}: ${formula}`,
        });
      }
      if (
        kind === "meta" &&
        !["{IntentAction}", "{IntentActionTitle}"].some((placeholder) =>
          formula.includes(placeholder),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: `Every meta template must include an intent action: ${formula}`,
        });
      }
      const requiredTonePlaceholder =
        kind === "title" ? "{ToneCueTitle}" : "{ToneCue}";
      if (!formula.includes(requiredTonePlaceholder)) {
        context.addIssue({
          code: "custom",
          message: `Every ${kind} template must include ${requiredTonePlaceholder}: ${formula}`,
        });
      }
      for (const match of formula.matchAll(/\{([A-Za-z0-9_]+)\}/g)) {
        if (!allowedPlaceholders.has(match[1])) {
          context.addIssue({
            code: "custom",
            message: `Unknown placeholder {${match[1]}} in: ${formula}`,
          });
        }
      }
      const remainingBraces = formula.replace(/\{[A-Za-z0-9_]+\}/g, "");
      if (/[{}]/.test(remainingBraces)) {
        context.addIssue({
          code: "custom",
          message: `Malformed placeholder in: ${formula}`,
        });
      }
    });
  });

const defaultCatalogPath = path.join(__dirname, "catalog.json");

/**
 * Reads and validates the complete catalog before it enters the domain layer.
 * Synchronous I/O is intentional because this runs once during startup or CLI use.
 *
 * @param {string} catalogPath JSON catalog path.
 * @returns {object} Validated catalog data.
 * @throws {Error|import("zod").ZodError} For unreadable, malformed, or invalid catalogs.
 */
const loadCatalog = (catalogPath = defaultCatalogPath) => {
  const content = fs.readFileSync(catalogPath, "utf8");
  return catalogSchema.parse(JSON.parse(content));
};

module.exports = {
  INTENTS,
  META_STYLES,
  POWER_WORD_CATEGORIES,
  TITLE_STYLES,
  catalogSchema,
  defaultCatalogPath,
  loadCatalog,
};
