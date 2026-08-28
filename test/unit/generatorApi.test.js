const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { GeneratorApiClient } = require("../../src/public/js/generatorApi");

describe("GeneratorApiClient", () => {
  it("sends JSON with the CSRF token and surfaces API failures", async () => {
    const requests = [];
    const client = new GeneratorApiClient({
      csrfToken: "csrf-value",
      fetchImplementation: async (path, options) => {
        requests.push({ path, options });
        return { ok: true, json: async () => ({ data: { ok: true } }) };
      },
    });
    const signal = { name: "signal" };
    const response = await client.generate({ primaryKeyword: "SEO" }, signal);
    assert.deepEqual(response, { data: { ok: true } });
    assert.equal(requests[0].path, "/api/generate");
    assert.equal(requests[0].options.headers["X-CSRF-Token"], "csrf-value");
    assert.equal(requests[0].options.signal, signal);
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      primaryKeyword: "SEO",
    });
    await client.saveGeneration({ config: { primaryKeyword: "SEO" } });
    await client.saveFavorite({
      generationHistoryId: 1,
      type: "title",
      itemId: "title-1",
    });
    assert.equal(requests[1].path, "/api/save");
    assert.equal(requests[2].path, "/api/favorites");

    const failingClient = new GeneratorApiClient({
      csrfToken: "csrf-value",
      fetchImplementation: async () => ({
        ok: false,
        json: async () => ({ error: "Request rejected." }),
      }),
    });
    await assert.rejects(
      () => failingClient.preview({ title: "SEO" }),
      /Request rejected/,
    );

    const abortError = new Error("Request aborted.");
    abortError.name = "AbortError";
    const abortedClient = new GeneratorApiClient({
      csrfToken: "csrf-value",
      fetchImplementation: async () => ({
        ok: true,
        json: async () => {
          throw abortError;
        },
      }),
    });
    await assert.rejects(
      () => abortedClient.preview({ title: "SEO" }),
      (error) => error === abortError,
    );

    const parseError = new SyntaxError("Unexpected response body.");
    const invalidJsonClient = new GeneratorApiClient({
      csrfToken: "csrf-value",
      fetchImplementation: async () => ({
        ok: true,
        json: async () => {
          throw parseError;
        },
      }),
    });
    await assert.rejects(
      () => invalidJsonClient.generate({ primaryKeyword: "SEO" }),
      (error) =>
        error.message === "Server returned invalid JSON." &&
        error.cause === parseError,
    );

    const invalidFailureBody = new GeneratorApiClient({
      csrfToken: "csrf-value",
      fetchImplementation: async () => ({
        ok: false,
        json: async () => {
          throw new SyntaxError("Not JSON.");
        },
      }),
    });
    await assert.rejects(
      () => invalidFailureBody.generate({ primaryKeyword: "SEO" }),
      /Request failed/,
    );
  });
});
