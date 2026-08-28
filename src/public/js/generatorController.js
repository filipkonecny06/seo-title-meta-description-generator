(function attachGeneratorController(root, factory) {
  const dependencies =
    typeof module === "object" && module.exports
      ? {
          ...require("./generatorUtilities"),
          ...require("./generatorExport"),
        }
      : root.OrbitGeneratorModules;
  const exported = factory(dependencies);
  if (typeof module === "object" && module.exports) {
    module.exports = exported;
    return;
  }
  root.OrbitGeneratorModules = {
    ...(root.OrbitGeneratorModules || {}),
    ...exported,
  };
})(
  typeof globalThis === "object" ? globalThis : this,
  ({ hasOutput, slugify }) => {
    class GeneratorState {
      constructor() {
        this.config = null;
        this.titles = [];
        this.metas = [];
        this.summary = null;
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
        this.schemaHeadlineSuggestions = [];
        this.lengthFallback = null;
        this.selectedTitleId = null;
        this.selectedMetaId = null;
        this.generationHistoryId = null;
        this.compareTitleIds = [];
      }

      applyGeneration(data) {
        this.config = data.config;
        this.titles = data.titles || [];
        this.metas = data.metas || [];
        this.summary = data.summary || null;
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
        return (
          this.metas.find((item) => item.id === this.selectedMetaId) || null
        );
      }

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

    class GeneratorController {
      constructor({
        api,
        view,
        exporter,
        clipboard,
        toast,
        isAuthenticated,
        createAbortController,
      }) {
        this.api = api;
        this.view = view;
        this.exporter = exporter;
        this.clipboard = clipboard;
        this.toast = toast;
        this.isAuthenticated = isAuthenticated;
        this.createAbortController = createAbortController;
        this.state = new GeneratorState();
        this.generationController = null;
        this.previewController = null;
        this.generationSequence = 0;
        this.previewSequence = 0;
        this.generationPending = false;
        this.savePromises = new Map();
        this.favoritePromises = new Map();
      }

      connect() {
        this.view.bind({
          generate: () => this.generate({ notify: true }),
          saveGeneration: () => this.saveGeneration(),
          downloadText: () => this.downloadText(),
          downloadCsv: () => this.downloadCsv(),
          resultAction: (event, type) => this.handleResultAction(event, type),
          device: (device) => this.setDevice(device),
          refreshPreview: () => this.refreshPreview(),
          configurationChanged: () => this.handleConfigurationChange(),
        });
        this.view.render(this.state);
      }

      async generate({ notify = false } = {}) {
        const replacedPendingRequest = this.generationPending;
        this.invalidateGenerationRequest();
        this.invalidatePreviewRequest();
        if (!this.view.isValid()) {
          if (replacedPendingRequest) this.view.setLoading(false);
          return;
        }
        const payload = this.view.getPayload();
        if (!payload.primaryKeyword) {
          this.state.clearResults();
          this.view.render(this.state);
          if (replacedPendingRequest) this.view.setLoading(false);
          return;
        }

        this.generationController = this.createAbortController();
        const requestSequence = this.generationSequence;
        this.generationPending = true;
        this.view.setLoading(true);

        try {
          const response = await this.api.generate(
            payload,
            this.generationController.signal,
          );
          if (requestSequence !== this.generationSequence) return;
          this.state.applyGeneration(response.data);
          this.view.render(this.state);
          await this.refreshPreview();
          if (requestSequence !== this.generationSequence) return;
          if (notify) this.toast("Variations generated.", "success");
          this.view.setStatus(
            `${this.state.titles.length} titles and ${this.state.metas.length} meta descriptions generated.`,
          );
        } catch (error) {
          if (requestSequence !== this.generationSequence) return;
          if (error.name === "AbortError") return;
          this.toast(error.message, "error");
          this.view.setStatus(`Generation failed: ${error.message}`);
        } finally {
          if (requestSequence === this.generationSequence) {
            this.generationPending = false;
            this.generationController = null;
            this.view.setLoading(false);
          }
        }
      }

      invalidateGenerationRequest() {
        this.generationController?.abort();
        this.generationController = null;
        this.generationPending = false;
        this.generationSequence += 1;
      }

      invalidatePreviewRequest() {
        this.previewController?.abort();
        this.previewController = null;
        this.previewSequence += 1;
      }

      handleConfigurationChange() {
        if (!this.generationPending) return;
        this.invalidateGenerationRequest();
        this.invalidatePreviewRequest();
        this.view.setLoading(false);
      }

      async refreshPreview() {
        this.invalidatePreviewRequest();
        const title = this.state.selectedTitle();
        const meta = this.state.selectedMeta();
        if (!title || !meta || !this.state.config) return;

        const configuredUrl = this.view.getPageUrl();
        const payload = {
          title: title.text,
          meta: meta.text,
          primaryKeyword: this.state.config.primaryKeyword,
          secondaryKeywords: this.state.config.secondaryKeywords,
          url:
            configuredUrl ||
            `https://www.example.com/${slugify(this.state.config.primaryKeyword)}`,
          device: this.state.device,
        };

        this.previewController = this.createAbortController();
        const requestSequence = this.previewSequence;
        try {
          const response = await this.api.preview(
            payload,
            this.previewController.signal,
          );
          if (requestSequence !== this.previewSequence) return;
          this.view.updatePreview(response.data, this.state);
        } catch (error) {
          if (
            error.name !== "AbortError" &&
            requestSequence === this.previewSequence
          ) {
            this.toast(error.message, "error");
          }
        } finally {
          if (requestSequence === this.previewSequence) {
            this.previewController = null;
          }
        }
      }

      async saveGeneration({ notify = true } = {}) {
        if (!this.isAuthenticated) {
          this.toast("Login required to save generation.", "warning");
          return null;
        }
        if (this.generationPending) {
          this.toast("Wait for generation to finish before saving.", "warning");
          return null;
        }
        if (!hasOutput(this.state) || !this.state.config) {
          this.toast("Generate snippets first.", "warning");
          return null;
        }
        if (this.state.generationHistoryId) {
          return this.state.generationHistoryId;
        }

        const generationKey = this.generationSequence;
        let savePromise = this.savePromises.get(generationKey);
        const ownsRequest = !savePromise;
        if (!savePromise) {
          const payload = {
            config: this.state.config,
            selectedTitleId: this.state.selectedTitleId,
            selectedMetaId: this.state.selectedMetaId,
          };
          savePromise = this.api.saveGeneration(payload).then((response) => {
            if (generationKey === this.generationSequence) {
              this.state.generationHistoryId = response.generationHistoryId;
            }
            return response.generationHistoryId;
          });
          this.savePromises.set(generationKey, savePromise);
          this.updatePersistenceBusy();
        }

        try {
          const generationHistoryId = await savePromise;
          if (ownsRequest && notify) this.toast("Generation saved.", "success");
          return generationHistoryId;
        } catch (error) {
          if (ownsRequest) this.toast(error.message, "error");
          return null;
        } finally {
          if (
            ownsRequest &&
            this.savePromises.get(generationKey) === savePromise
          ) {
            this.savePromises.delete(generationKey);
            this.updatePersistenceBusy();
          }
        }
      }

      saveFavorite(item, type) {
        if (!this.isAuthenticated) {
          this.toast("Login required to save favorites.", "warning");
          return Promise.resolve();
        }
        const favoriteKey = `${this.generationSequence}:${type}:${item.id}`;
        const existing = this.favoritePromises.get(favoriteKey);
        if (existing) return existing;

        const operation = (async () => {
          try {
            const generationHistoryId = await this.saveGeneration({
              notify: false,
            });
            if (!generationHistoryId) return;
            const response = await this.api.saveFavorite({
              generationHistoryId,
              type,
              itemId: item.id,
            });
            this.toast(response.message, "success");
          } catch (error) {
            this.toast(error.message, "error");
          } finally {
            this.favoritePromises.delete(favoriteKey);
            this.updatePersistenceBusy();
          }
        })();
        this.favoritePromises.set(favoriteKey, operation);
        this.updatePersistenceBusy();
        return operation;
      }

      updatePersistenceBusy() {
        this.view.setPersistenceBusy?.(
          this.savePromises.size > 0 || this.favoritePromises.size > 0,
        );
      }

      async copyToClipboard(value) {
        try {
          await this.clipboard.writeText(value);
          this.toast("Copied to clipboard.", "success");
        } catch {
          this.toast("Clipboard failed. Copy manually.", "warning");
        }
      }

      downloadText() {
        if (!this.assertOutputAvailable("download")) return;
        this.exporter.downloadText(this.state);
      }

      downloadCsv() {
        if (!this.assertOutputAvailable("export")) return;
        this.exporter.downloadCsv(this.state);
      }

      assertOutputAvailable(action) {
        if (hasOutput(this.state)) return true;
        this.toast(`Nothing to ${action} yet.`, "warning");
        return false;
      }

      handleResultAction(event, type) {
        const action = this.view.getAction(event);
        if (!action) return;
        const items = type === "title" ? this.state.titles : this.state.metas;
        const item = items.find((entry) => entry.id === action.id);
        if (!item) return;

        if (action.action === "select") {
          if (type === "title") this.state.selectedTitleId = action.id;
          else this.state.selectedMetaId = action.id;
          this.view.render(this.state);
          this.refreshPreview();
          return;
        }
        if (action.action === "copy") {
          this.copyToClipboard(item.text);
          return;
        }
        if (action.action === "favorite") {
          this.saveFavorite(item, type);
          return;
        }
        if (action.action === "compare" && type === "title") {
          this.state.toggleComparison(action.id);
          this.view.render(this.state);
        }
      }

      setDevice(device) {
        this.state.device = device;
        this.view.setDevice(device);
        this.refreshPreview();
      }
    }

    return { GeneratorController, GeneratorState };
  },
);
