/** Composes browser-side generator dependencies and starts them on the workspace page. */
(function attachGeneratorBootstrap(root, factory) {
  const exported = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = exported;
    return;
  }
  root.OrbitGeneratorModules = {
    ...(root.OrbitGeneratorModules || {}),
    ...exported,
  };
  exported.bootstrapGenerator({
    window: root,
    document: root.document,
    navigator: root.navigator,
    AbortControllerImplementation: root.AbortController,
  });
})(typeof globalThis === "object" ? globalThis : this, () => {
  /**
   * Creates and connects the generator controller when the page marker exists.
   * Platform dependencies are injectable so bootstrap behavior is testable in Node.
   */
  const bootstrapGenerator = ({
    window,
    document,
    navigator,
    AbortControllerImplementation,
    clock = Date.now,
  }) => {
    const page = document.querySelector("[data-generator-page]");
    if (!page) return null;

    const {
      GeneratorApiClient,
      GeneratorController,
      GeneratorView,
      SnippetExporter,
    } = window.OrbitGeneratorModules;
    const csrfToken =
      document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content") || "";
    // The server-issued token is captured once and sent with every state-changing request.
    const api = new GeneratorApiClient({
      csrfToken,
      fetchImplementation: window.fetch.bind(window),
    });
    const view = new GeneratorView(document);
    const exporter = new SnippetExporter({
      document,
      urlApi: window.URL,
      BlobImplementation: window.Blob,
      csvEscape: window.OrbitCsv.csvEscape,
      clock,
    });
    const controller = new GeneratorController({
      api,
      view,
      exporter,
      clipboard: navigator.clipboard,
      toast: window.showToast,
      isAuthenticated: page.dataset.authenticated === "true",
      createAbortController: () => new AbortControllerImplementation(),
    });
    controller.connect();
    return controller;
  };

  return { bootstrapGenerator };
});
