const { loadCatalog } = require("../catalog/catalogSchema");

class JsonTemplateCatalogRepository {
  constructor({ catalog, catalogPath } = {}) {
    this.catalog = catalog || loadCatalog(catalogPath);
  }

  getTitleTemplates(intent, style) {
    if (!this.catalog.intents.includes(intent)) {
      return [];
    }

    return (this.catalog.titleTemplates[style] || []).map(
      (template, index) => ({
        id: `${intent}:${style}:${index + 1}`,
        intent,
        style,
        ...template,
      }),
    );
  }

  getMetaTemplates(style) {
    return (this.catalog.metaTemplates[style] || []).map((template, index) => ({
      id: `${style}:${index + 1}`,
      style,
      ...template,
    }));
  }

  getPowerWords() {
    return Object.entries(this.catalog.powerWords)
      .flatMap(([category, entries]) =>
        entries.map((entry) => ({ category, ...entry })),
      )
      .sort(
        (first, second) =>
          second.weight - first.weight ||
          first.word.localeCompare(second.word, "en-US"),
      );
  }

  getSummary() {
    const titleFormulaCount = Object.values(this.catalog.titleTemplates).flat()
      .length;
    const metaCount = Object.values(this.catalog.metaTemplates).flat().length;
    const powerWordCount = Object.values(this.catalog.powerWords).flat().length;

    return {
      version: this.catalog.version,
      titleFormulaCount,
      metaFormulaCount: metaCount,
      powerWordCount,
      supportedIntents: [...this.catalog.intents],
      titleStyles: Object.keys(this.catalog.titleTemplates),
      metaStyles: Object.keys(this.catalog.metaTemplates),
    };
  }
}

module.exports = { JsonTemplateCatalogRepository };
