(function attachGeneratorExport(root, factory) {
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
  const hasOutput = (state) =>
    state.titles.length > 0 || state.metas.length > 0;

  const buildTextExport = (state) => {
    const lines = [
      "SEO Title + Meta Export",
      `Keyword: ${state.config?.primaryKeyword || ""}`,
      "",
      "Titles",
    ];
    state.titles.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${item.text} (Score ${item.optimizationScore})`,
      );
    });
    lines.push("", "Meta Descriptions");
    state.metas.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${item.text} (Score ${item.optimizationScore})`,
      );
    });
    return lines.join("\n");
  };

  const buildCsvExport = (state, csvEscape) => {
    const rows = [
      [
        "type",
        "text",
        "charCount",
        "estimatedPixelWidth",
        "optimizationScore",
        "badge",
      ],
    ];
    const appendRows = (type, items) => {
      items.forEach((item) => {
        rows.push([
          type,
          item.text,
          item.charCount,
          item.pixelWidth,
          item.optimizationScore,
          item.badge,
        ]);
      });
    };
    appendRows("title", state.titles);
    appendRows("meta", state.metas);
    return rows
      .map((row) => row.map((field) => csvEscape(field)).join(","))
      .join("\n");
  };

  class SnippetExporter {
    constructor({ document, urlApi, BlobImplementation, csvEscape, clock }) {
      this.document = document;
      this.urlApi = urlApi;
      this.BlobImplementation = BlobImplementation;
      this.csvEscape = csvEscape;
      this.clock = clock;
    }

    download(content, type, extension) {
      const blob = new this.BlobImplementation([content], { type });
      const link = this.document.createElement("a");
      link.href = this.urlApi.createObjectURL(blob);
      link.download = `seo-snippets-${this.clock()}.${extension}`;
      link.click();
      this.urlApi.revokeObjectURL(link.href);
    }

    downloadText(state) {
      this.download(buildTextExport(state), "text/plain;charset=utf-8", "txt");
    }

    downloadCsv(state) {
      this.download(
        buildCsvExport(state, this.csvEscape),
        "text/csv;charset=utf-8",
        "csv",
      );
    }
  }

  return { SnippetExporter, buildCsvExport, buildTextExport, hasOutput };
});
