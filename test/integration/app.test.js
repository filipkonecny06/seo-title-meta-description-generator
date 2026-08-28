const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const session = require("express-session");
const request = require("supertest");
const { createApp } = require("../../src/app");

const testConfig = {
  env: "test",
  baseUrl: "http://localhost:3000",
  trustProxy: false,
  logging: false,
  rateLimit: { windowMs: 60000, apiMax: 1000, authMax: 100 },
  session: {
    name: "orbit.test.sid",
    secret: "test-only-session-secret-that-is-long-enough",
    secure: false,
    maxAge: 60000,
  },
};

const createModelDoubles = ({
  history = null,
  user = null,
  onCreateHistory,
  onFindOrCreateFavorite,
} = {}) => {
  const favoriteRecords = new Map();
  const User = {
    findOne: async () => user,
    create: async (values) => ({ id: 7, ...values }),
  };
  User.scope = () => User;
  return {
    sequelize: { authenticate: async () => undefined },
    User,
    GenerationHistory: {
      create: async (values) => {
        onCreateHistory?.(values);
        return { id: 42, ...values };
      },
      findOne: async () => history,
      findAll: async () => [],
    },
    FavoriteSnippet: {
      findOrCreate: async ({ where, defaults }) => {
        onFindOrCreateFavorite?.({ where, defaults });
        const key = JSON.stringify(where);
        if (favoriteRecords.has(key)) {
          return [favoriteRecords.get(key), false];
        }
        const row = { id: favoriteRecords.size + 9, ...defaults };
        favoriteRecords.set(key, row);
        return [row, true];
      },
      findAll: async () => [],
    },
  };
};

const createHarness = (options = {}) => {
  const { config: configOverrides = {}, ...modelOptions } = options;
  const models = createModelDoubles(modelOptions);
  const app = createApp({
    config: {
      ...testConfig,
      ...configOverrides,
      rateLimit: {
        ...testConfig.rateLimit,
        ...configOverrides.rateLimit,
      },
      session: { ...testConfig.session, ...configOverrides.session },
    },
    models,
    sessionStore: new session.MemoryStore(),
    logger: { info() {}, error() {} },
  });
  return { app, models };
};

const readCsrfToken = (html) => {
  const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
  assert.ok(match, "Expected a CSRF token meta tag.");
  return match[1];
};

const getCsrfToken = async (agent, path = "/generator") => {
  const response = await agent.get(path).expect(200);
  return { response, token: readCsrfToken(response.text) };
};

const login = async (agent, user) => {
  const { response: initial, token } = await getCsrfToken(agent, "/login");
  const loginResponse = await agent
    .post("/login")
    .type("form")
    .send({ email: user.email, password: "a-valid-password", _csrf: token })
    .expect(302);
  return { initial, loginResponse };
};

describe("application security boundaries", () => {
  it("prevents caching dynamic responses without overriding static assets", async () => {
    const user = {
      id: 7,
      name: "Ada",
      email: "ada@example.com",
      validatePassword: async () => true,
    };
    const { app } = createHarness({ user });
    const agent = request.agent(app);

    const loginPage = await agent.get("/login").expect(200);
    assert.equal(loginPage.headers["cache-control"], "no-store");
    assert.ok(readCsrfToken(loginPage.text));

    const { loginResponse } = await login(agent, user);
    assert.equal(loginResponse.headers["cache-control"], "no-store");
    const historyPage = await agent.get("/history").expect(200);
    assert.equal(historyPage.headers["cache-control"], "no-store");

    const templates = await agent.get("/api/templates").expect(200);
    assert.equal(templates.headers["cache-control"], "no-store");

    const staticAsset = await agent.get("/css/styles.css").expect(200);
    assert.equal(
      staticAsset.headers["cache-control"],
      "public, max-age=0, must-revalidate",
    );
    assert.ok(staticAsset.headers.etag);
    await agent
      .get("/css/styles.css")
      .set("If-None-Match", staticAsset.headers.etag)
      .expect(304);
  });

  it("rejects unsafe requests without a session-bound CSRF token", async () => {
    const { app } = createHarness();
    const response = await request(app)
      .post("/api/generate")
      .send({ primaryKeyword: "SEO" })
      .expect(403);
    assert.equal(
      response.body.error,
      "Invalid CSRF token. Refresh and try again.",
    );
    assert.equal(response.headers["cache-control"], "no-store");
  });

  it("applies strict input validation and preserves the selected title style", async () => {
    const { app } = createHarness();
    const agent = request.agent(app);
    const { response: page, token } = await getCsrfToken(agent);
    const csp = page.headers["content-security-policy"];
    assert.ok(csp.includes("script-src 'self' 'nonce-"));
    assert.ok(!csp.includes("'unsafe-inline'"));
    const browserModules = [
      "/js/generatorUtilities.js",
      "/js/generatorApi.js",
      "/js/generatorExport.js",
      "/js/generatorView.js",
      "/js/generatorController.js",
      "/js/generator.js",
    ];
    let previousScriptIndex = -1;
    for (const script of browserModules) {
      const scriptIndex = page.text.indexOf(`src="${script}"`);
      assert.ok(
        scriptIndex > previousScriptIndex,
        `${script} must load in order`,
      );
      previousScriptIndex = scriptIndex;
    }

    const invalid = await agent
      .post("/api/generate")
      .set("X-CSRF-Token", token)
      .send({ primaryKeyword: "SEO", unexpected: true })
      .expect(400);
    assert.equal(invalid.body.error, "Request validation failed.");

    const generated = await agent
      .post("/api/generate")
      .set("X-CSRF-Token", token)
      .send({ primaryKeyword: "SEO tools", titleStyle: "how-to" })
      .expect(200);
    assert.ok(
      generated.body.data.titles.every(
        (title) => title.templateStyle === "how-to",
      ),
    );
  });

  it("rotates the session identifier after successful authentication", async () => {
    const user = {
      id: 7,
      name: "Ada",
      email: "ada@example.com",
      validatePassword: async () => true,
    };
    const { app } = createHarness({ user });
    const agent = request.agent(app);
    const { initial, loginResponse } = await login(agent, user);
    const initialCookie = initial.headers["set-cookie"][0].split(";")[0];
    const rotatedCookie = loginResponse.headers["set-cookie"][0].split(";")[0];
    assert.notEqual(initialCookie, rotatedCookie);
    assert.equal(loginResponse.headers.location, "/generator");
  });

  it("counts failed login redirects and eventually returns 429", async () => {
    const { app } = createHarness({
      config: { rateLimit: { authMax: 2 } },
    });
    const agent = request.agent(app);
    const { token } = await getCsrfToken(agent, "/login");
    const invalidCredentials = {
      email: "missing@example.com",
      password: "valid-length-password",
      _csrf: token,
    };

    await agent
      .post("/login")
      .type("form")
      .send(invalidCredentials)
      .expect(302);
    await agent
      .post("/login")
      .type("form")
      .send(invalidCredentials)
      .expect(302);
    const limited = await agent
      .post("/login")
      .type("form")
      .send(invalidCredentials)
      .expect(429);
    assert.match(limited.text, /Too many authentication attempts/);
  });

  it("derives saved output on the server and rejects client-supplied result arrays", async () => {
    let createdPayload;
    const user = {
      id: 7,
      name: "Ada",
      email: "ada@example.com",
      validatePassword: async () => true,
    };
    const { app } = createHarness({
      user,
      onCreateHistory: (values) => {
        createdPayload = values;
      },
    });
    const agent = request.agent(app);
    await login(agent, user);
    const { token } = await getCsrfToken(agent);

    await agent
      .post("/api/save")
      .set("X-CSRF-Token", token)
      .send({ config: { primaryKeyword: "SEO" }, titles: [{ text: "forged" }] })
      .expect(400);

    const saved = await agent
      .post("/api/save")
      .set("X-CSRF-Token", token)
      .send({ config: { primaryKeyword: "SEO", titleStyle: "comparison" } })
      .expect(201);
    assert.equal(saved.body.generationHistoryId, 42);
    assert.equal(createdPayload.userId, 7);
    assert.equal(createdPayload.titles.length, 10);
    assert.ok(
      createdPayload.titles.every(
        (title) => title.templateStyle === "comparison",
      ),
    );
  });

  it("checks generation ownership before creating a favorite", async () => {
    const user = {
      id: 7,
      name: "Ada",
      email: "ada@example.com",
      validatePassword: async () => true,
    };
    const { app } = createHarness({ user, history: null });
    const agent = request.agent(app);
    await login(agent, user);
    const { token } = await getCsrfToken(agent);

    const response = await agent
      .post("/api/favorites")
      .set("X-CSRF-Token", token)
      .send({ generationHistoryId: 999, type: "title", itemId: "title-1" })
      .expect(404);
    assert.equal(response.body.error, "Saved generation not found.");
  });

  it("uses snippet identity to make repeated favorite requests idempotent", async () => {
    const favoritePayloads = [];
    const user = {
      id: 7,
      name: "Ada",
      email: "ada@example.com",
      validatePassword: async () => true,
    };
    const history = {
      id: 42,
      userId: 7,
      titles: [
        {
          id: "title-1",
          text: "Project Management Guide for Small Teams",
          optimizationScore: 78,
          badge: "Moderate alignment",
        },
      ],
      metas: [],
      selectedTitle: null,
      selectedMeta: null,
    };
    const { app } = createHarness({
      user,
      history,
      onFindOrCreateFavorite: (payload) => favoritePayloads.push(payload),
    });
    const agent = request.agent(app);
    await login(agent, user);
    const { token } = await getCsrfToken(agent);
    const requestBody = {
      generationHistoryId: 42,
      type: "title",
      itemId: "title-1",
    };

    const created = await agent
      .post("/api/favorites")
      .set("X-CSRF-Token", token)
      .send(requestBody)
      .expect(201);
    const repeated = await agent
      .post("/api/favorites")
      .set("X-CSRF-Token", token)
      .send(requestBody)
      .expect(200);

    assert.equal(created.body.message, "Favorite saved.");
    assert.equal(repeated.body.message, "Favorite already saved.");
    assert.equal(created.body.favoriteId, repeated.body.favoriteId);
    assert.deepEqual(favoritePayloads[0].where, {
      userId: 7,
      generationHistoryId: 42,
      kind: "title",
      itemKey: "title-1",
    });
  });

  it("keeps readiness failure terse and exposes a separate liveness check", async () => {
    const { app, models } = createHarness();
    const live = await request(app)
      .get("/health/live")
      .expect(200, { status: "ok" });
    assert.equal(live.headers["cache-control"], "no-store");
    models.sequelize.authenticate = async () => {
      throw new Error("database credentials must not leak");
    };
    const ready = await request(app)
      .get("/health/ready")
      .expect(503, { status: "unavailable" });
    assert.equal(ready.headers["cache-control"], "no-store");
  });
});
