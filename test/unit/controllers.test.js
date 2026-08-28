const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { ApiController } = require("../../src/controllers/apiController");
const { AuthController } = require("../../src/controllers/authController");
const { PageController } = require("../../src/controllers/pageController");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  view: null,
  redirectPath: null,
  clearedCookie: null,
  status(value) {
    this.statusCode = value;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
  render(view, value) {
    this.view = { view, value };
    return this;
  },
  redirect(value) {
    this.redirectPath = value;
    return this;
  },
  clearCookie(name, options) {
    this.clearedCookie = { name, options };
    return this;
  },
});

const generation = {
  config: { primaryKeyword: "SEO", titleStyle: "list" },
  titles: [
    {
      id: "title-1",
      text: "SEO Review Checklist for Small Teams",
      optimizationScore: 70,
      badge: "Partial alignment",
    },
  ],
  metas: [
    {
      id: "meta-1",
      text: "Review SEO criteria and examples before updating the page.",
      optimizationScore: 72,
      badge: "Partial alignment",
    },
  ],
};

describe("controllers", () => {
  it("coordinates generation, preview, catalog, and history responses", async () => {
    const snippetGenerator = {
      generate: async () => generation,
    };
    const previewBuilder = {
      build: (input) => ({ device: input.device, title: input.title }),
    };
    const catalogRepository = {
      getSummary: () => ({ version: 2, titleFormulaCount: 20 }),
    };
    const models = {
      GenerationHistory: {
        findAll: async () => [{ id: 4 }],
      },
    };
    const controller = new ApiController({
      models,
      snippetGenerator,
      previewBuilder,
      catalogRepository,
    });

    const generateResponse = createResponse();
    await controller.generate(
      { body: { primaryKeyword: "SEO" } },
      generateResponse,
    );
    assert.equal(generateResponse.body.data, generation);

    const previewResponse = createResponse();
    controller.preview(
      { body: { title: "SEO title", device: "mobile" } },
      previewResponse,
    );
    assert.deepEqual(previewResponse.body.data, {
      device: "mobile",
      title: "SEO title",
    });

    const templateResponse = createResponse();
    controller.templates({}, templateResponse);
    assert.deepEqual(templateResponse.body.data, {
      version: 2,
      titleFormulaCount: 20,
    });

    const historyResponse = createResponse();
    await controller.history({ session: { userId: 7 } }, historyResponse);
    assert.deepEqual(historyResponse.body.data, [{ id: 4 }]);
  });

  it("persists only server-derived selections", async () => {
    let stored;
    const controller = new ApiController({
      models: {
        GenerationHistory: {
          create: async (values) => {
            stored = values;
            return { id: 12 };
          },
        },
      },
      snippetGenerator: { generate: async () => generation },
      previewBuilder: {},
      catalogRepository: {},
    });
    const response = createResponse();
    await controller.save(
      {
        body: {
          config: { primaryKeyword: "SEO" },
          selectedTitleId: "title-1",
          selectedMetaId: "meta-1",
        },
        session: { userId: 7 },
      },
      response,
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.generationHistoryId, 12);
    assert.equal(stored.userId, 7);
    assert.equal(stored.selectedTitle, generation.titles[0].text);
    assert.equal(stored.selectedMeta, generation.metas[0].text);
  });

  it("renders pages and retrieves both history collections", async () => {
    const pageController = new PageController({
      models: {
        GenerationHistory: { findAll: async () => [{ id: 1 }] },
        FavoriteSnippet: { findAll: async () => [{ id: 2 }] },
      },
    });
    const response = createResponse();
    pageController.renderLanding({}, response);
    assert.equal(response.view.view, "landing");

    pageController.renderGenerator({}, response);
    assert.equal(response.view.view, "generator");

    pageController.renderLogin({ session: { userId: 7 } }, response);
    assert.equal(response.redirectPath, "/generator");

    pageController.renderRegister({ session: {} }, response);
    assert.equal(response.view.view, "register");

    await pageController.renderHistory({ session: { userId: 7 } }, response);
    assert.deepEqual(response.view.value.historyRows, [{ id: 1 }]);
    assert.deepEqual(response.view.value.favoriteRows, [{ id: 2 }]);
  });

  it("handles invalid authentication input and a clean logout", async () => {
    const controller = new AuthController({
      User: { findOne: async () => null },
      sessionCookieName: "orbit.sid",
    });
    const invalidRequest = { body: {}, session: {} };
    const invalidResponse = createResponse();
    await controller.login(invalidRequest, invalidResponse, assert.fail);
    assert.equal(invalidResponse.redirectPath, "/login");
    assert.equal(invalidRequest.session.flash.type, "warning");

    const logoutRequest = {
      session: {
        destroy: (callback) => callback(),
      },
    };
    const logoutResponse = createResponse();
    await controller.logout(logoutRequest, logoutResponse, assert.fail);
    assert.equal(logoutResponse.redirectPath, "/");
    assert.deepEqual(logoutResponse.clearedCookie, {
      name: "orbit.sid",
      options: { httpOnly: true, sameSite: "lax" },
    });
  });

  it("registers a user, rotates the session, and handles duplicate accounts", async () => {
    let createdValues;
    const User = {
      findOne: async () => null,
      create: async (values) => {
        createdValues = values;
        return { id: 9, name: values.name, email: values.email };
      },
    };
    const controller = new AuthController({
      User,
      sessionCookieName: "orbit.sid",
    });
    const sessionCalls = [];
    const request = {
      body: {
        name: "Ada Lovelace",
        email: "ADA@example.com",
        password: "correct horse battery staple",
      },
      session: {
        regenerate(callback) {
          sessionCalls.push("regenerate");
          callback();
        },
        save(callback) {
          sessionCalls.push("save");
          callback();
        },
      },
    };
    const response = createResponse();
    await controller.register(request, response, assert.fail);

    assert.equal(response.redirectPath, "/generator");
    assert.deepEqual(sessionCalls, ["regenerate", "save"]);
    assert.equal(createdValues.email, "ada@example.com");
    assert.notEqual(createdValues.passwordHash, request.body.password);
    assert.deepEqual(request.session.user, {
      id: 9,
      name: "Ada Lovelace",
      email: "ada@example.com",
    });

    User.findOne = async () => ({ id: 9 });
    const duplicateRequest = {
      body: request.body,
      session: {},
    };
    const duplicateResponse = createResponse();
    await controller.register(duplicateRequest, duplicateResponse, assert.fail);
    assert.equal(duplicateResponse.redirectPath, "/register");
    assert.match(duplicateRequest.session.flash.message, /already exists/);
  });

  it("handles registration and session failures through controlled paths", async () => {
    const uniqueError = new Error("duplicate");
    uniqueError.name = "SequelizeUniqueConstraintError";
    const controller = new AuthController({
      User: {
        findOne: async () => null,
        create: async () => {
          throw uniqueError;
        },
      },
      sessionCookieName: "orbit.sid",
    });
    const body = {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "correct horse battery staple",
    };
    const uniqueRequest = { body, session: {} };
    const uniqueResponse = createResponse();
    await controller.register(uniqueRequest, uniqueResponse, assert.fail);
    assert.equal(uniqueResponse.redirectPath, "/register");

    const unexpected = new Error("database unavailable");
    controller.User.create = async () => {
      throw unexpected;
    };
    let forwarded;
    await controller.register(
      { body, session: {} },
      createResponse(),
      (error) => {
        forwarded = error;
      },
    );
    assert.equal(forwarded, unexpected);

    const sessionFailure = new Error("session unavailable");
    controller.User.create = async (values) => ({
      id: 10,
      name: values.name,
      email: values.email,
    });
    const failedSessionRequest = {
      body,
      session: {
        regenerate: (callback) => callback(sessionFailure),
      },
    };
    await controller.register(
      failedSessionRequest,
      createResponse(),
      (error) => {
        forwarded = error;
      },
    );
    assert.equal(forwarded, sessionFailure);
  });

  it("handles valid, invalid, and failed login and logout operations", async () => {
    const user = {
      id: 7,
      name: "Ada",
      email: "ada@example.com",
      validatePassword: async (password) => password === "valid-password",
    };
    let foundUser = user;
    const scopedUser = {
      findOne: async () => foundUser,
    };
    const controller = new AuthController({
      User: { scope: () => scopedUser },
      sessionCookieName: "orbit.sid",
    });
    const createRequest = (password) => ({
      body: { email: "ada@example.com", password },
      session: {
        regenerate: (callback) => callback(),
        save: (callback) => callback(),
      },
    });

    const rejectedRequest = createRequest("wrong-password");
    const rejectedResponse = createResponse();
    await controller.login(rejectedRequest, rejectedResponse, assert.fail);
    assert.equal(rejectedResponse.redirectPath, "/login");

    const acceptedRequest = createRequest("valid-password");
    const acceptedResponse = createResponse();
    await controller.login(acceptedRequest, acceptedResponse, assert.fail);
    assert.equal(acceptedResponse.redirectPath, "/generator");
    assert.equal(acceptedRequest.session.userId, 7);

    foundUser = null;
    const missingResponse = createResponse();
    await controller.login(
      createRequest("valid-password"),
      missingResponse,
      assert.fail,
    );
    assert.equal(missingResponse.redirectPath, "/login");

    const lookupFailure = new Error("lookup failed");
    scopedUser.findOne = async () => {
      throw lookupFailure;
    };
    let forwarded;
    await controller.login(
      createRequest("valid-password"),
      createResponse(),
      (error) => {
        forwarded = error;
      },
    );
    assert.equal(forwarded, lookupFailure);

    const logoutFailure = new Error("destroy failed");
    await controller.logout(
      {
        session: {
          destroy: (callback) => callback(logoutFailure),
        },
      },
      createResponse(),
      (error) => {
        forwarded = error;
      },
    );
    assert.equal(forwarded, logoutFailure);
  });
});
