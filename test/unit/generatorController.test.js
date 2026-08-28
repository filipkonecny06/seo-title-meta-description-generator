const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  GeneratorController,
  GeneratorState,
} = require("../../src/public/js/generatorController");
const { generatedData, title } = require("../../test-support/browserFixtures");

describe("GeneratorController", () => {
  it("keeps selection and comparison transitions in a dedicated state object", () => {
    const state = new GeneratorState();
    state.applyGeneration(generatedData);
    assert.equal(state.selectedTitleId, "title-1");
    assert.equal(state.selectedMetaId, "meta-1");
    assert.equal(state.selectedTitle(), title);
    state.toggleComparison("title-1");
    state.toggleComparison("title-2");
    state.toggleComparison("title-3");
    assert.deepEqual(state.compareTitleIds, ["title-2", "title-3"]);
    state.toggleComparison("title-2");
    assert.deepEqual(state.compareTitleIds, ["title-3"]);
    state.clearResults();
    assert.equal(state.selectedTitle(), null);
    assert.equal(state.selectedMeta(), null);
  });

  it("connects every browser event to its controller boundary", async () => {
    const view = {
      bind(handlers) {
        this.handlers = handlers;
      },
      render() {},
    };
    const controller = new GeneratorController({
      api: {},
      view,
      exporter: {},
      clipboard: {},
      toast: () => undefined,
      isAuthenticated: false,
      createAbortController: () => ({ signal: {}, abort() {} }),
    });
    const calls = [];
    controller.generate = async (options) => calls.push(["generate", options]);
    controller.saveGeneration = async () => calls.push(["save"]);
    controller.downloadText = () => calls.push(["text"]);
    controller.downloadCsv = () => calls.push(["csv"]);
    controller.handleResultAction = (event, type) =>
      calls.push(["action", event, type]);
    controller.setDevice = (device) => calls.push(["device", device]);
    controller.refreshPreview = async () => calls.push(["preview"]);
    controller.handleConfigurationChange = () => calls.push(["changed"]);
    controller.connect();

    await view.handlers.generate();
    await view.handlers.saveGeneration();
    view.handlers.downloadText();
    view.handlers.downloadCsv();
    view.handlers.resultAction("event", "title");
    view.handlers.device("mobile");
    await view.handlers.refreshPreview();
    view.handlers.configurationChanged();
    assert.deepEqual(calls, [
      ["generate", { notify: true }],
      ["save"],
      ["text"],
      ["csv"],
      ["action", "event", "title"],
      ["device", "mobile"],
      ["preview"],
      ["changed"],
    ]);
  });

  it("deduplicates concurrent history and favorite persistence", async () => {
    let resolveSave;
    const calls = { save: 0, favorite: 0 };
    const busyStates = [];
    const api = {
      saveGeneration: () => {
        calls.save += 1;
        return new Promise((resolve) => {
          resolveSave = resolve;
        });
      },
      saveFavorite: async () => {
        calls.favorite += 1;
        return { message: "Favorite saved." };
      },
    };
    const controller = new GeneratorController({
      api,
      view: {
        setPersistenceBusy: (busy) => busyStates.push(busy),
      },
      exporter: {},
      clipboard: {},
      toast: () => undefined,
      isAuthenticated: true,
      createAbortController: () => ({ signal: {}, abort() {} }),
    });
    controller.state.applyGeneration(generatedData);

    const first = controller.saveFavorite(title, "title");
    const second = controller.saveFavorite(title, "title");
    assert.equal(calls.save, 1);
    resolveSave({ generationHistoryId: 42 });
    await Promise.all([first, second]);

    assert.equal(calls.save, 1);
    assert.equal(calls.favorite, 1);
    assert.ok(busyStates.includes(true));
    assert.equal(busyStates.at(-1), false);
  });

  it("coordinates generation, preview, save, and favorite requests", async () => {
    const calls = { preview: [], save: [], favorite: [] };
    const api = {
      generate: async () => ({ data: generatedData }),
      preview: async (payload) => {
        calls.preview.push(payload);
        return {
          data: {
            titlePixels: 100,
            titleLimit: 580,
            metaPixels: 200,
            metaLimit: 920,
            titleProgress: 20,
            metaProgress: 30,
          },
        };
      },
      saveGeneration: async (payload) => {
        calls.save.push(payload);
        return { generationHistoryId: 42 };
      },
      saveFavorite: async (payload) => {
        calls.favorite.push(payload);
        return { message: "Favorite saved." };
      },
    };
    const view = {
      handlers: null,
      renders: 0,
      loading: [],
      status: "",
      bind(handlers) {
        this.handlers = handlers;
      },
      render() {
        this.renders += 1;
      },
      isValid: () => true,
      getPayload: () => ({ primaryKeyword: "SEO review" }),
      getPageUrl: () => "",
      updatePreview: () => undefined,
      setLoading(value) {
        this.loading.push(value);
      },
      setStatus(value) {
        this.status = value;
      },
      setDevice: () => undefined,
      getAction: () => null,
    };
    const toasts = [];
    const controller = new GeneratorController({
      api,
      view,
      exporter: {},
      clipboard: { writeText: async () => undefined },
      toast: (...args) => toasts.push(args),
      isAuthenticated: true,
      createAbortController: () => ({ signal: {}, abort() {} }),
    });

    controller.connect();
    await controller.generate({ notify: true });
    assert.deepEqual(view.loading, [true, false]);
    assert.match(view.status, /1 titles and 1 meta descriptions/);
    assert.equal(calls.preview[0].url, "https://www.example.com/seo-review");
    assert.equal(toasts[0][0], "Variations generated.");

    assert.equal(await controller.saveGeneration(), 42);
    assert.equal(await controller.saveGeneration(), 42);
    assert.equal(calls.save.length, 1);
    await controller.saveFavorite(title, "title");
    assert.deepEqual(calls.favorite[0], {
      generationHistoryId: 42,
      type: "title",
      itemId: "title-1",
    });
  });

  it("invalidates pending generation when the form changes", async () => {
    let resolveGeneration;
    const abortControllers = [];
    const loading = [];
    const view = {
      bind(handlers) {
        this.handlers = handlers;
      },
      render() {},
      isValid: () => true,
      getPayload: () => ({ primaryKeyword: "new brief" }),
      setLoading: (value) => loading.push(value),
      setStatus() {},
    };
    const controller = new GeneratorController({
      api: {
        generate: () =>
          new Promise((resolve) => {
            resolveGeneration = resolve;
          }),
      },
      view,
      exporter: {},
      clipboard: {},
      toast: () => undefined,
      isAuthenticated: true,
      createAbortController: () => {
        const abortController = {
          signal: {},
          aborted: false,
          abort() {
            this.aborted = true;
          },
        };
        abortControllers.push(abortController);
        return abortController;
      },
    });
    controller.state.applyGeneration({
      ...generatedData,
      config: { primaryKeyword: "existing brief" },
    });
    controller.connect();

    const generation = controller.generate();
    assert.equal(controller.generationPending, true);
    view.handlers.configurationChanged();
    assert.equal(abortControllers[0].aborted, true);
    assert.equal(controller.generationPending, false);
    assert.deepEqual(loading, [true, false]);

    resolveGeneration({
      data: {
        ...generatedData,
        config: { primaryKeyword: "stale brief" },
      },
    });
    await generation;
    assert.equal(controller.state.config.primaryKeyword, "existing brief");
  });

  it("handles invalid briefs and current generation failures explicitly", async () => {
    let valid = false;
    let payload = { primaryKeyword: "brief" };
    let failure = new Error("Generation unavailable.");
    const loading = [];
    const statuses = [];
    const toasts = [];
    const view = {
      isValid: () => valid,
      getPayload: () => payload,
      render() {},
      setLoading: (value) => loading.push(value),
      setStatus: (value) => statuses.push(value),
    };
    const controller = new GeneratorController({
      api: { generate: async () => Promise.reject(failure) },
      view,
      exporter: {},
      clipboard: {},
      toast: (...args) => toasts.push(args),
      isAuthenticated: false,
      createAbortController: () => ({ signal: {}, abort() {} }),
    });

    await controller.generate();
    assert.deepEqual(loading, []);
    valid = true;
    payload = { primaryKeyword: "" };
    await controller.generate();
    assert.equal(controller.state.titles.length, 0);

    payload = { primaryKeyword: "brief" };
    await controller.generate();
    assert.match(statuses.at(-1), /Generation failed/);
    assert.equal(toasts.at(-1)[1], "error");
    assert.deepEqual(loading, [true, false]);

    failure = new Error("Request aborted.");
    failure.name = "AbortError";
    const toastCount = toasts.length;
    await controller.generate();
    assert.equal(toasts.length, toastCount);
  });

  it("keeps late generation and preview responses from replacing newer state", async () => {
    const generationRequests = [];
    const previewRequests = [];
    const updates = [];
    const abortControllers = [];
    let payload = { primaryKeyword: "first brief" };
    const api = {
      generate: (requestPayload) =>
        new Promise((resolve, reject) => {
          generationRequests.push({ requestPayload, resolve, reject });
        }),
      preview: (requestPayload) =>
        new Promise((resolve) => {
          previewRequests.push({ requestPayload, resolve });
        }),
      saveGeneration: async () => ({ generationHistoryId: 91 }),
    };
    const view = {
      render() {},
      isValid: () => true,
      getPayload: () => payload,
      getPageUrl: () => "",
      setLoading() {},
      setStatus() {},
      updatePreview: (preview) => updates.push(preview.url),
    };
    const toasts = [];
    const controller = new GeneratorController({
      api,
      view,
      exporter: {},
      clipboard: {},
      toast: (...args) => toasts.push(args),
      isAuthenticated: true,
      createAbortController: () => {
        const abortController = {
          signal: {},
          aborted: false,
          abort() {
            this.aborted = true;
          },
        };
        abortControllers.push(abortController);
        return abortController;
      },
    });

    const first = controller.generate();
    payload = { primaryKeyword: "second brief" };
    const second = controller.generate();
    assert.equal(await controller.saveGeneration(), null);
    assert.match(toasts.at(-1)[0], /Wait for generation/);

    generationRequests[1].resolve({
      data: {
        ...generatedData,
        config: { ...generatedData.config, primaryKeyword: "second brief" },
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(previewRequests.length, 1);
    previewRequests[0].resolve({ data: { url: "second-preview" } });
    await second;

    generationRequests[0].resolve({
      data: {
        ...generatedData,
        config: { ...generatedData.config, primaryKeyword: "first brief" },
      },
    });
    await first;
    assert.equal(controller.state.config.primaryKeyword, "second brief");
    assert.deepEqual(updates, ["second-preview"]);
    assert.ok(abortControllers.some(({ aborted }) => aborted));
    assert.equal(await controller.saveGeneration(), 91);

    const stalePreview = controller.refreshPreview();
    controller.state.device = "mobile";
    const currentPreview = controller.refreshPreview();
    previewRequests[2].resolve({ data: { url: "current-preview" } });
    await currentPreview;
    previewRequests[1].resolve({ data: { url: "stale-preview" } });
    await stalePreview;
    assert.deepEqual(updates, ["second-preview", "current-preview"]);

    payload = { primaryKeyword: "third brief" };
    const third = controller.generate();
    payload = { primaryKeyword: "fourth brief" };
    const fourth = controller.generate();
    generationRequests[3].resolve({
      data: {
        ...generatedData,
        config: { ...generatedData.config, primaryKeyword: "fourth brief" },
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    previewRequests[3].resolve({ data: { url: "fourth-preview" } });
    await fourth;
    const toastCount = toasts.length;
    generationRequests[2].reject(new Error("stale generation failed"));
    await third;
    assert.equal(toasts.length, toastCount);
    assert.equal(controller.state.config.primaryKeyword, "fourth brief");
  });

  it("handles browser actions and unavailable operations without leaking errors", async () => {
    const calls = [];
    const toasts = [];
    const view = {
      render: () => calls.push("render"),
      getAction: (event) => event,
      setDevice: (device) => calls.push(`device:${device}`),
      setPersistenceBusy: (busy) => calls.push(`busy:${busy}`),
    };
    const controller = new GeneratorController({
      api: {},
      view,
      exporter: {
        downloadText: () => calls.push("text"),
        downloadCsv: () => calls.push("csv"),
      },
      clipboard: {
        writeText: async () => {
          throw new Error("Clipboard unavailable.");
        },
      },
      toast: (...args) => toasts.push(args),
      isAuthenticated: true,
      createAbortController: () => ({ signal: {}, abort() {} }),
    });
    controller.state.applyGeneration({
      ...generatedData,
      titles: [title, { ...title, id: "title-2", text: "Second title" }],
    });
    controller.refreshPreview = async () => calls.push("preview");
    controller.copyToClipboard = async (value) => calls.push(`copy:${value}`);
    controller.saveFavorite = async (item, type) =>
      calls.push(`favorite:${type}:${item.id}`);

    controller.handleResultAction({ action: "select", id: "title-2" }, "title");
    controller.handleResultAction({ action: "select", id: "meta-1" }, "meta");
    controller.handleResultAction({ action: "copy", id: "title-1" }, "title");
    controller.handleResultAction({ action: "favorite", id: "meta-1" }, "meta");
    controller.handleResultAction(
      { action: "compare", id: "title-1" },
      "title",
    );
    controller.handleResultAction(null, "title");
    controller.handleResultAction({ action: "copy", id: "missing" }, "title");
    controller.setDevice("mobile");
    controller.downloadText();
    controller.downloadCsv();

    assert.ok(calls.includes("copy:SEO <Review> & Checklist"));
    assert.ok(calls.includes("favorite:meta:meta-1"));
    assert.ok(calls.includes("device:mobile"));
    assert.ok(calls.includes("text"));
    assert.ok(calls.includes("csv"));

    const clipboardController = new GeneratorController({
      api: {},
      view: { setPersistenceBusy() {} },
      exporter: {},
      clipboard: undefined,
      toast: (...args) => toasts.push(args),
      isAuthenticated: false,
      createAbortController: () => ({ signal: {}, abort() {} }),
    });
    await clipboardController.copyToClipboard("copy");
    await clipboardController.saveFavorite(title, "title");
    assert.equal(await clipboardController.saveGeneration(), null);
    clipboardController.downloadText();
    clipboardController.downloadCsv();
    assert.ok(toasts.some(([message]) => /Clipboard failed/.test(message)));
    assert.ok(toasts.some(([message]) => /Login required/.test(message)));
    assert.ok(toasts.some(([message]) => /Nothing to download/.test(message)));
    assert.ok(toasts.some(([message]) => /Nothing to export/.test(message)));
  });
});
