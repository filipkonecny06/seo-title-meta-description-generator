/** Adapts validated catalog JSON to the read-only interface used by services. */
const { loadCatalog } = require("../catalog/catalogSchema");

/**
 * Owns template lookup and identifiers that are deterministic for the loaded
 * catalog version; inserting or reordering formulas can change later IDs.
 */
class JsonTemplateCatalogRepository {
  constructor({ catalog, catalogPath } = {}) {
    this.catalog = catalog || loadCatalog(catalogPath);
  }

  /** Returns title-template records for one supported intent and style. */
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

  /** Returns meta-template records for one supported style. */
  getMetaTemplates(style) {
    return (this.catalog.metaTemplates[style] || []).map((template, index) => ({
      id: `${style}:${index + 1}`,
      style,
      ...template,
    }));
  }

  /** Flattens and deterministically ranks weighted scoring terms. */
  getPowerWords() {
    // Stable tie-breaking keeps identical inputs repeatable across executions.
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

  /** Returns counts and supported options suitable for the public API. */
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
