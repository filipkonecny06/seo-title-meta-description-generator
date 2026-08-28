const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const { csrfSync } = require("csrf-sync");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const session = require("express-session");
const { ApiController } = require("./controllers/apiController");
const { AuthController } = require("./controllers/authController");
const { PageController } = require("./controllers/pageController");
const {
  createErrorHandler,
  notFoundHandler,
} = require("./middleware/errorHandler");
const { createRequestLogger } = require("./middleware/requestLogger");
const {
  JsonTemplateCatalogRepository,
} = require("./repositories/catalogRepository");
const { createApiRouter } = require("./routes/apiRoutes");
const { createAuthRouter } = require("./routes/authRoutes");
const { createPageRouter } = require("./routes/pageRoutes");
const { SnippetGenerator } = require("./services/generatorService");
const { OptimizationScorer } = require("./services/scoringService");
const { SerpPreviewBuilder } = require("./services/serpService");

const assertApplicationConfig = (config) => {
  if (!config?.session?.secret || config.session.secret.length < 32) {
    throw new Error("A session secret of at least 32 characters is required.");
  }
};

const createApp = ({
  config,
  models,
  sessionStore,
  catalogRepository = new JsonTemplateCatalogRepository(),
  logger = console,
} = {}) => {
  assertApplicationConfig(config);
  if (!models) throw new TypeError("createApp requires a model registry.");
  if (!sessionStore) throw new TypeError("createApp requires a session store.");

  const app = express();
  const previewBuilder = new SerpPreviewBuilder();
  const snippetGenerator = new SnippetGenerator({
    catalogRepository,
    scorer: new OptimizationScorer(),
    previewBuilder,
  });
  const apiController = new ApiController({
    models,
    snippetGenerator,
    previewBuilder,
    catalogRepository,
  });
  const authController = new AuthController({
    User: models.User,
    sessionCookieName: config.session.name,
  });
  const pageController = new PageController({ models });

  app.disable("x-powered-by");
  if (config.trustProxy !== false) app.set("trust proxy", config.trustProxy);
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    res.locals.csrfToken = "";
    res.locals.currentPath = req.path;
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'"],
          styleSrcAttr: ["'none'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.env === "production" ? [] : null,
        },
      },
      crossOriginResourcePolicy: { policy: "same-origin" },
    }),
  );
  if (config.logging) app.use(createRequestLogger(logger));
  app.use(
    express.static(path.join(__dirname, "public"), {
      maxAge: 0,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      },
    }),
  );
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(
    express.urlencoded({ extended: false, limit: "32kb", parameterLimit: 50 }),
  );
  app.use(express.json({ limit: "64kb", strict: true }));

  app.get("/health/live", (req, res) => res.json({ status: "ok" }));
  app.get("/health/ready", async (req, res) => {
    try {
      await models.sequelize.authenticate();
      return res.json({ status: "ready" });
    } catch {
      return res.status(503).json({ status: "unavailable" });
    }
  });

  app.use(
    session({
      name: config.session.name,
      secret: config.session.secret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.session.secure,
        maxAge: config.session.maxAge,
      },
    }),
  );

  app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.flash = req.session.flash || null;
    if (req.session.flash) delete req.session.flash;
    next();
  });

  const { csrfSynchronisedProtection, generateToken } = csrfSync({
    getTokenFromRequest: (req) =>
      req.is("application/x-www-form-urlencoded")
        ? req.body._csrf
        : req.get("x-csrf-token"),
  });
  app.use(csrfSynchronisedProtection);
  app.use((req, res, next) => {
    res.locals.csrfToken = generateToken(req);
    next();
  });

  const apiRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.apiMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many requests. Please slow down and try again shortly.",
    },
  });
  const authRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.authMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_req, res) =>
      res.statusCode < 400 && res.getHeader("location") === "/generator",
    handler: (req, res) =>
      res.status(429).render("error", {
        title: "Too Many Attempts",
        status: 429,
        message: "Too many authentication attempts. Please wait and try again.",
      }),
  });

  app.use("/", createPageRouter(pageController));
  app.use("/", createAuthRouter(authController, authRateLimiter));
  app.use("/api", apiRateLimiter, createApiRouter(apiController));
  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger }));
  return app;
};

module.exports = { assertApplicationConfig, createApp };
