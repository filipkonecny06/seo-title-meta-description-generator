const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { describe, it } = require("node:test");
const {
  requireApiAuth,
  requirePageAuth,
} = require("../../src/middleware/auth");
const {
  createErrorHandler,
  notFoundHandler,
} = require("../../src/middleware/errorHandler");
const { createRequestLogger } = require("../../src/middleware/requestLogger");

const createResponse = () => ({
  headersSent: false,
  statusCode: 200,
  body: null,
  view: null,
  redirectPath: null,
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
});

describe("request middleware", () => {
  it("enforces page and API authentication without hiding valid sessions", () => {
    const pageRequest = { session: {} };
    const pageResponse = createResponse();
    requirePageAuth(pageRequest, pageResponse, assert.fail);
    assert.equal(pageResponse.redirectPath, "/login");
    assert.match(pageRequest.session.flash.message, /log in/);

    let nextCalls = 0;
    requirePageAuth(
      { session: { userId: 7 } },
      createResponse(),
      () => nextCalls++,
    );
    assert.equal(nextCalls, 1);

    const apiResponse = createResponse();
    requireApiAuth({ session: {} }, apiResponse, assert.fail);
    assert.equal(apiResponse.statusCode, 401);
    assert.deepEqual(apiResponse.body, {
      error: "Authentication required.",
    });

    requireApiAuth(
      { session: { userId: 7 } },
      createResponse(),
      () => nextCalls++,
    );
    assert.equal(nextCalls, 2);
  });

  it("records one structured log when a response finishes", () => {
    const response = new EventEmitter();
    response.statusCode = 204;
    const entries = [];
    let nextCalls = 0;
    createRequestLogger({ info: (entry) => entries.push(entry) })(
      { method: "POST", path: "/api/generate" },
      response,
      () => nextCalls++,
    );
    response.emit("finish");

    assert.equal(nextCalls, 1);
    assert.equal(entries.length, 1);
    const entry = JSON.parse(entries[0]);
    assert.deepEqual(
      {
        type: entry.type,
        method: entry.method,
        path: entry.path,
        status: entry.status,
      },
      {
        type: "http_request",
        method: "POST",
        path: "/api/generate",
        status: 204,
      },
    );
    assert.equal(typeof entry.durationMs, "number");
    assert.ok(entry.durationMs >= 0);
  });

  it("forwards missing routes and masks internal errors by response type", () => {
    let missing;
    notFoundHandler({}, {}, (error) => {
      missing = error;
    });
    assert.equal(missing.status, 404);

    const logs = [];
    const handler = createErrorHandler({
      logger: { error: (...args) => logs.push(args) },
    });
    const apiResponse = createResponse();
    handler(
      new Error("database password leaked"),
      {
        method: "GET",
        path: "/api/private",
        accepts: () => "json",
      },
      apiResponse,
      assert.fail,
    );
    assert.equal(apiResponse.statusCode, 500);
    assert.deepEqual(apiResponse.body, { error: "Internal server error." });
    assert.equal(logs.length, 1);

    const pageResponse = createResponse();
    const expected = new Error("Not allowed.");
    expected.status = 403;
    handler(
      expected,
      {
        method: "GET",
        path: "/private",
        accepts: () => "html",
      },
      pageResponse,
      assert.fail,
    );
    assert.equal(pageResponse.view.view, "error");
    assert.equal(pageResponse.view.value.status, 403);
    assert.equal(pageResponse.view.value.message, "Not allowed.");

    const sentResponse = createResponse();
    sentResponse.headersSent = true;
    let forwarded;
    handler(
      expected,
      { method: "GET", path: "/", accepts: () => "html" },
      sentResponse,
      (error) => {
        forwarded = error;
      },
    );
    assert.equal(forwarded, expected);
  });
});
