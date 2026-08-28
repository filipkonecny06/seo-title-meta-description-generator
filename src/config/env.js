/** Validates environment variables and maps them to application configuration. */
const { z } = require("zod");
const { parseEnvironmentBoolean } = require("./environmentBoolean");

const booleanFromEnvironment = (name) =>
  z.any().transform((value, context) => {
    try {
      return parseEnvironmentBoolean(value, { name });
    } catch (error) {
      context.addIssue({ code: "custom", message: error.message });
      return z.NEVER;
    }
  });

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    APP_BASE_URL: z.string().url().default("http://localhost:3000"),
    SESSION_SECRET: z
      .string()
      .min(32, "SESSION_SECRET must contain at least 32 characters.")
      .refine((value) => !/replace|change|secret/i.test(value), {
        message: "SESSION_SECRET must not use an example or placeholder value.",
      }),
    TRUST_PROXY: z.string().default("false"),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(180),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    DB_HOST: z.string().trim().min(1),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
    DB_NAME: z.string().trim().min(1),
    DB_USER: z.string().trim().min(1),
    DB_PASSWORD: z.string().default(""),
    DB_SSL: booleanFromEnvironment("DB_SSL").default(false),
    DB_SSL_REJECT_UNAUTHORIZED: booleanFromEnvironment(
      "DB_SSL_REJECT_UNAUTHORIZED",
    ).default(true),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DB_POOL_MIN: z.coerce.number().int().min(0).max(100).default(0),
  })
  .passthrough();

/**
 * Preserves Express's supported proxy formats while normalizing common boolean
 * and numeric environment values.
 */
const parseTrustProxy = (value) => {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || !normalized) return false;
  if (normalized === "true") return true;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return value;
};

/**
 * Parses an environment-like object and returns the only configuration shape
 * consumed by the application.
 *
 * @param {NodeJS.ProcessEnv|object} source Environment variables to validate.
 * @returns {object} Validated runtime configuration.
 * @throws {import("zod").ZodError} When required configuration is invalid.
 */
const loadEnvironment = (source = process.env) => {
  const parsed = environmentSchema.parse(source);
  return {
    env: parsed.NODE_ENV,
    port: parsed.PORT,
    baseUrl: parsed.APP_BASE_URL,
    trustProxy: parseTrustProxy(parsed.TRUST_PROXY),
    logging: parsed.NODE_ENV !== "test",
    rateLimit: {
      windowMs: parsed.RATE_LIMIT_WINDOW_MS,
      apiMax: parsed.RATE_LIMIT_MAX,
      authMax: parsed.AUTH_RATE_LIMIT_MAX,
    },
    session: {
      name: "orbit.sid",
      secret: parsed.SESSION_SECRET,
      secure: parsed.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
    database: {
      host: parsed.DB_HOST,
      port: parsed.DB_PORT,
      name: parsed.DB_NAME,
      user: parsed.DB_USER,
      password: parsed.DB_PASSWORD,
      ssl: parsed.DB_SSL,
      rejectUnauthorized: parsed.DB_SSL_REJECT_UNAUTHORIZED,
      pool: { max: parsed.DB_POOL_MAX, min: parsed.DB_POOL_MIN },
    },
  };
};

module.exports = {
  booleanFromEnvironment,
  environmentSchema,
  loadEnvironment,
  parseTrustProxy,
};
