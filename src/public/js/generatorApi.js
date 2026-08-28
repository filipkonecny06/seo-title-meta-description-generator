(function attachGeneratorApi(root, factory) {
  const exported = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = exported;
    return;
  }
  root.OrbitGeneratorModules = {
    ...(root.OrbitGeneratorModules || {}),
    ...exported,
  };
})(typeof globalThis === "object" ? globalThis : this, () => {
  class GeneratorApiClient {
    constructor({ csrfToken, fetchImplementation }) {
      this.csrfToken = csrfToken;
      this.fetchImplementation = fetchImplementation;
    }

    async post(path, payload, { signal } = {}) {
      const response = await this.fetchImplementation(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken,
        },
        body: JSON.stringify(payload),
        signal,
      });
      let body;
      try {
        body = await response.json();
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        if (response.ok) {
          throw new Error("Server returned invalid JSON.", { cause: error });
        }
        body = {};
      }
      if (!response.ok) throw new Error(body.error || "Request failed.");
      return body;
    }

    generate(payload, signal) {
      return this.post("/api/generate", payload, { signal });
    }

    preview(payload, signal) {
      return this.post("/api/preview", payload, { signal });
    }

    saveGeneration(payload) {
      return this.post("/api/save", payload);
    }

    saveFavorite(payload) {
      return this.post("/api/favorites", payload);
    }
  }

  return { GeneratorApiClient };
});
