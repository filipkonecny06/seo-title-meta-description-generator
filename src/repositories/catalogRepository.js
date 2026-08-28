const { loadCatalog } = require("../catalog/catalogSchema");

class TemplateCatalogRepository {
  getTitleTemplates() {
    throw new Error(
      "TemplateCatalogRepository#getTitleTemplates must be implemented.",
    );
  }

  getMetaTemplates() {
    throw new Error(
      "TemplateCatalogRepository#getMetaTemplates must be implemented.",
    );
  }

  getPowerWords() {
    throw new Error(
      "TemplateCatalogRepository#getPowerWords must be implemented.",
    );
  }

  getSummary() {
    throw new Error(
      "TemplateCatalogRepository#getSummary must be implemented.",
    );
  }
}

class JsonTemplateCatalogRepository extends TemplateCatalogRepository {
  constructor({ catalog, catalogPath } = {}) {
    super();
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
          second.weight - first.weight || first.word.localeCompare(second.word),
      );
  }

  getSummary() {
    const titleCountPerIntent = Object.values(
      this.catalog.titleTemplates,
    ).flat().length;
    const metaCount = Object.values(this.catalog.metaTemplates).flat().length;
    const powerWordCount = Object.values(this.catalog.powerWords).flat().length;

    return {
      version: this.catalog.version,
      titleCount: titleCountPerIntent * this.catalog.intents.length,
      metaCount,
      powerWordCount,
      titleIntentSummary: this.catalog.intents.map((intent) => ({
        intent,
        count: titleCountPerIntent,
      })),
    };
  }

  getCatalog() {
    return this.catalog;
  }
}

module.exports = {
  JsonTemplateCatalogRepository,
  TemplateCatalogRepository,
};
