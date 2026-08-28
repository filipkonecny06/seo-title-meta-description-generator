const { z } = require("zod");
const {
  INTENTS,
  META_STYLES,
  TITLE_STYLES,
} = require("../catalog/catalogSchema");

const checkboxSchema = z.preprocess(
  (value) =>
    value === true ||
    value === 1 ||
    ["true", "1", "on"].includes(String(value || "")),
  z.boolean(),
);
const optionalText = (maximum) => z.string().trim().max(maximum).default("");
const secondaryKeywordsSchema = z
  .union([
    z.string().trim().max(500),
    z.array(z.string().trim().min(1).max(100)).max(10),
  ])
  .default("");

const generationInputSchema = z
  .object({
    primaryKeyword: z.string().trim().min(1).max(180),
    secondaryKeywords: secondaryKeywordsSchema,
    audience: optionalText(120),
    location: optionalText(120),
    includeYear: checkboxSchema.default(false),
    intent: z.enum(INTENTS).default("informational"),
    tone: z
      .enum(["neutral", "authoritative", "urgent", "friendly"])
      .default("neutral"),
    titleStyle: z.enum(TITLE_STYLES).default("list"),
    metaStyle: z.enum(META_STYLES).default("educational"),
    length: z.enum(["short", "medium", "max ctr"]).default("medium"),
    bulkMode: checkboxSchema.default(false),
  })
  .strict();

const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "Only HTTP and HTTPS preview URLs are supported.",
  });

const previewInputSchema = z
  .object({
    title: z.string().trim().max(255).default(""),
    meta: z.string().trim().max(500).default(""),
    url: httpUrlSchema.optional(),
    primaryKeyword: z.string().trim().max(180).default(""),
    secondaryKeywords: secondaryKeywordsSchema,
    device: z.enum(["desktop", "mobile"]).default("desktop"),
  })
  .strict();

const saveGenerationSchema = z
  .object({
    config: generationInputSchema,
    selectedTitleId: z
      .string()
      .regex(/^title-\d+$/)
      .nullable()
      .optional(),
    selectedMetaId: z
      .string()
      .regex(/^meta-\d+$/)
      .nullable()
      .optional(),
  })
  .strict();

const favoriteSchema = z
  .object({
    generationHistoryId: z.coerce.number().int().positive(),
    type: z.enum(["title", "meta"]),
    itemId: z.string().regex(/^(?:title|meta)-\d+$/),
  })
  .strict();

const passwordSchema = z
  .string()
  .min(10)
  .max(72)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
    message: "Password must be no more than 72 UTF-8 bytes.",
  });
const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(180),
    password: passwordSchema,
    _csrf: z.string().optional(),
  })
  .strict();
const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(180),
    password: z.string().min(1).max(72),
    _csrf: z.string().optional(),
  })
  .strict();

module.exports = {
  favoriteSchema,
  generationInputSchema,
  loginSchema,
  previewInputSchema,
  registerSchema,
  saveGenerationSchema,
};
