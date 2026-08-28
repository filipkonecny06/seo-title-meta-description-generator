/** Owns serializable generator workspace state without DOM or network effects. */
(function attachGeneratorState(root, factory) {
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
  /** @typedef {import("../../contracts/generation").GenerationResult} GenerationResult */

  class GeneratorState {
    constructor() {
      this.config = null;
      this.titles = [];
      this.metas = [];
      this.summary = null;
      this.scoreBreakdownLabels = {};
      this.schemaHeadlineSuggestions = [];
      this.lengthFallback = null;
      this.selectedTitleId = null;
      this.selectedMetaId = null;
      this.generationHistoryId = null;
      this.compareTitleIds = [];
      this.device = "desktop";
    }

    clearResults() {
      this.config = null;
      this.titles = [];
      this.metas = [];
      this.summary = null;
      this.scoreBreakdownLabels = {};
      this.schemaHeadlineSuggestions = [];
      this.lengthFallback = null;
      this.selectedTitleId = null;
      this.selectedMetaId = null;
      this.generationHistoryId = null;
      this.compareTitleIds = [];
    }

    /** @param {GenerationResult} data */
    applyGeneration(data) {
      this.config = data.config;
      this.titles = data.titles || [];
      this.metas = data.metas || [];
      this.summary = data.summary || null;
      this.scoreBreakdownLabels = data.scoreBreakdownLabels || {};
      this.schemaHeadlineSuggestions = data.schemaHeadlineSuggestions || [];
      this.lengthFallback = data.lengthFallback || null;
      this.selectedTitleId = this.titles[0]?.id || null;
      this.selectedMetaId = this.metas[0]?.id || null;
      this.generationHistoryId = null;
      this.compareTitleIds = [];
    }

    selectedTitle() {
      return (
        this.titles.find((item) => item.id === this.selectedTitleId) || null
      );
    }

    selectedMeta() {
      return this.metas.find((item) => item.id === this.selectedMetaId) || null;
    }

    /** Keeps comparison state to the two most recently selected titles. */
    toggleComparison(id) {
      if (this.compareTitleIds.includes(id)) {
        this.compareTitleIds = this.compareTitleIds.filter(
          (entry) => entry !== id,
        );
        return;
      }
      this.compareTitleIds = [...this.compareTitleIds, id].slice(-2);
    }
  }

  return { GeneratorState };
});
