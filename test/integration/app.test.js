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
} = {}) => ({
  sequelize: { authenticate: async () => undefined },
  User: {
    findOne: async () => user,
    create: async (values) => ({ id: 7, ...values }),
  },
  GenerationHistory: {
    create: async (values) => {
      onCreateHistory?.(values);
      return { id: 42, ...values };
    },
    findOne: async () => history,
    findAll: async () => [],
  },
  FavoriteTitle: {
    create: async (values) => ({ id: 9, ...values }),
    findAll: async () => [],
  },
});

const createHarness = (options = {}) => {
  const models = createModelDoubles(options);
  const app = createApp({
    config: testConfig,
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
  });

  it("applies strict input validation and preserves the selected title style", async () => {
    const { app } = createHarness();
    const agent = request.agent(app);
    const { response: page, token } = await getCsrfToken(agent);
    const csp = page.headers["content-security-policy"];
    assert.ok(csp.includes("script-src 'self' 'nonce-"));
    assert.ok(!csp.includes("'unsafe-inline'"));

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

  it("keeps readiness failure terse and exposes a separate liveness check", async () => {
    const { app, models } = createHarness();
    await request(app).get("/health/live").expect(200, { status: "ok" });
    models.sequelize.authenticate = async () => {
      throw new Error("database credentials must not leak");
    };
    await request(app)
      .get("/health/ready")
      .expect(503, { status: "unavailable" });
  });
});
