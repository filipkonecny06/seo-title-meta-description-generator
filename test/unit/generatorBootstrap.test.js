const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { csvEscape } = require("../../src/public/js/csv");
const { bootstrapGenerator } = require("../../src/public/js/generator");

describe("generator browser bootstrap", () => {
  it("wires the browser entrypoint through injected platform boundaries", () => {
    const page = { dataset: { authenticated: "true" } };
    const csrfMeta = { getAttribute: () => "csrf-token" };
    const document = {
      querySelector: (selector) =>
        selector === "[data-generator-page]" ? page : csrfMeta,
    };
    const created = {};
    class FakeApiClient {
      constructor(options) {
        created.apiOptions = options;
      }
    }
    class FakeView {
      constructor(receivedDocument) {
        created.viewDocument = receivedDocument;
      }
    }
    class FakeExporter {
      constructor(options) {
        created.exportOptions = options;
      }
    }
    class FakeController {
      constructor(options) {
        created.controllerOptions = options;
      }

      connect() {
        created.connected = true;
      }
    }
    const browserWindow = {
      AbortController: class {},
      Blob: class {},
      URL: {},
      fetch: async () => undefined,
      OrbitCsv: { csvEscape },
      OrbitGeneratorModules: {
        GeneratorApiClient: FakeApiClient,
        GeneratorController: FakeController,
        GeneratorView: FakeView,
        SnippetExporter: FakeExporter,
      },
      showToast() {},
    };
    const navigator = { clipboard: {} };
    const controller = bootstrapGenerator({
      window: browserWindow,
      document,
      navigator,
      AbortControllerImplementation: browserWindow.AbortController,
      clock: () => 123,
    });

    assert.ok(controller instanceof FakeController);
    assert.equal(created.connected, true);
    assert.equal(created.apiOptions.csrfToken, "csrf-token");
    assert.equal(created.viewDocument, document);
    assert.equal(created.controllerOptions.isAuthenticated, true);
    assert.equal(created.controllerOptions.clipboard, navigator.clipboard);
    assert.ok(
      created.controllerOptions.createAbortController() instanceof
        browserWindow.AbortController,
    );
    assert.equal(
      bootstrapGenerator({
        window: {},
        document: { querySelector: () => null },
        navigator: {},
      }),
      null,
    );
  });
});
