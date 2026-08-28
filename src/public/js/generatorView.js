/** Renders generator state and translates DOM events into controller actions. */
(function attachGeneratorView(root, factory) {
  const dependencies =
    typeof module === "object" && module.exports
      ? require("./generatorUtilities")
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
  ({ badgeClass, escapeHtml }) => {
    const SCORE_LABELS = {
      baseline: "Baseline",
      number: "Number",
      year: "Current year",
      powerWords: "Matched terms",
      optimalLength: "Optimal scoring length",
      keywordFirst: "Keyword first",
      intentSignal: "Intent signal",
    };

    // Strings that may contain user input are escaped; server-generated IDs and
    // numeric metrics are inserted directly.
    const renderScoreDetails = (item) => {
      const breakdown = Object.entries(item.scoreBreakdown || {})
        .map(
          ([key, value]) => `
            <div>
              <dt>${escapeHtml(SCORE_LABELS[key] || key)}</dt>
              <dd>${Number(value) || 0} points</dd>
            </div>`,
        )
        .join("");
      const matchedTerms = (item.matchedPowerWords || [])
        .map((term) => escapeHtml(term))
        .join(", ");
      return `
        <details class="score-details">
          <summary>Score breakdown</summary>
          <dl>${breakdown || "<div><dt>Scored signals</dt><dd>None</dd></div>"}</dl>
          <p><strong>Matched terms:</strong> ${matchedTerms || "None"}</p>
        </details>`;
    };

    const renderTitleCard = (item, index, state) => {
      const activeClass = item.id === state.selectedTitleId ? "active" : "";
      const compareActive = state.compareTitleIds.includes(item.id)
        ? "active"
        : "";
      return `
        <article class="result-card ${activeClass}" data-id="${item.id}">
          <div class="card-head">
            <strong>Title ${index + 1}</strong>
            <span class="pill ${badgeClass(item.badge)}">${escapeHtml(item.badge)} ${item.optimizationScore}</span>
          </div>
          <p class="result-text">${escapeHtml(item.text)}</p>
          <div class="result-metrics">
            <span>Chars: ${item.charCount}</span>
            <span>Pixels: ${item.pixelWidth}</span>
            <span>${item.truncated ? "Potential truncation" : "Within desktop width estimate"}</span>
            <span>${item.outsideCharacterTarget ? "Outside selected character band" : "Within selected character band"}</span>
          </div>
          ${renderScoreDetails(item)}
          <div class="result-actions">
            <button type="button" data-action="select" data-type="title" data-id="${item.id}" aria-label="Preview title ${index + 1}">Preview</button>
            <button type="button" data-action="copy" data-type="title" data-id="${item.id}" aria-label="Copy title ${index + 1}">Copy</button>
            <button type="button" data-action="favorite" data-type="title" data-id="${item.id}" aria-label="Save title ${index + 1} as favorite">Favorite</button>
            <button type="button" data-action="compare" data-type="title" data-id="${item.id}" class="${compareActive}" aria-pressed="${compareActive ? "true" : "false"}" aria-label="Compare title ${index + 1}">Compare</button>
          </div>
        </article>
      `;
    };

    const renderMetaCard = (item, index, state) => {
      const activeClass = item.id === state.selectedMetaId ? "active" : "";
      return `
        <article class="result-card ${activeClass}" data-id="${item.id}">
          <div class="card-head">
            <strong>Meta ${index + 1}</strong>
            <span class="pill ${badgeClass(item.badge)}">${escapeHtml(item.badge)} ${item.optimizationScore}</span>
          </div>
          <p class="result-text">${escapeHtml(item.text)}</p>
          <div class="result-metrics">
            <span>Chars: ${item.charCount}</span>
            <span>Pixels: ${item.pixelWidth}</span>
            <span>${item.truncated ? "Potential truncation" : "Within desktop width estimate"}</span>
            <span>${item.outsideCharacterTarget ? "Outside selected character band" : "Within selected character band"}</span>
          </div>
          ${renderScoreDetails(item)}
          <div class="result-actions">
            <button type="button" data-action="select" data-type="meta" data-id="${item.id}" aria-label="Preview meta description ${index + 1}">Preview</button>
            <button type="button" data-action="copy" data-type="meta" data-id="${item.id}" aria-label="Copy meta description ${index + 1}">Copy</button>
            <button type="button" data-action="favorite" data-type="meta" data-id="${item.id}" aria-label="Save meta description ${index + 1} as favorite">Favorite</button>
          </div>
        </article>
      `;
    };

    const renderComparison = (state) => {
      const selected = state.compareTitleIds
        .map((id) => state.titles.find((item) => item.id === id))
        .filter(Boolean);
      if (selected.length < 2) return "";
      const [first, second] = selected;
      const higherScoringTitle =
        first.optimizationScore >= second.optimizationScore ? first : second;
      return `
        <h3>Compare 2 Titles</h3>
        <div class="compare-grid">
          <article class="compare-item">
            <strong>A</strong>
            <p>${escapeHtml(first.text)}</p>
            <p>Score: ${first.optimizationScore} (${escapeHtml(first.badge)}) | Chars: ${first.charCount} | Estimated pixels: ${first.pixelWidth}</p>
          </article>
          <article class="compare-item">
            <strong>B</strong>
            <p>${escapeHtml(second.text)}</p>
            <p>Score: ${second.optimizationScore} (${escapeHtml(second.badge)}) | Chars: ${second.charCount} | Estimated pixels: ${second.pixelWidth}</p>
          </article>
        </div>
        <p class="muted small-text">Higher heuristic score: <strong>${escapeHtml(higherScoringTitle.text)}</strong></p>
      `;
    };

    /** Owns generator-page DOM queries, event binding, and accessible state updates. */
    class GeneratorView {
      constructor(document) {
        this.document = document;
        this.form = document.getElementById("generator-form");
        this.elements = Object.fromEntries(
          [
            "generate-btn",
            "download-btn",
            "export-btn",
            "save-generation-btn",
            "title-results",
            "meta-results",
            "summary-badges",
            "compare-panel",
            "results-panel",
            "generator-status",
            "preview-url",
            "preview-title",
            "preview-meta",
            "serp-card",
            "title-pixels",
            "meta-pixels",
            "title-progress",
            "meta-progress",
            "title-warning",
            "meta-warning",
            "schema-suggestions",
            "desktop-toggle",
            "mobile-toggle",
          ].map((id) => [id, document.getElementById(id)]),
        );
        if (!this.form || Object.values(this.elements).some((item) => !item)) {
          // Fail during bootstrap rather than producing partial, misleading interactions.
          throw new Error("Generator page markup is incomplete.");
        }
        this.persistenceBusy = false;
        this.generationBusy = false;
      }

      /** Returns the raw form boundary shape expected by the API validation schema. */
      getPayload() {
        return {
          primaryKeyword: this.form.primaryKeyword.value.trim(),
          secondaryKeywords: this.form.secondaryKeywords.value.trim(),
          audience: this.form.audience.value.trim(),
          location: this.form.location.value.trim(),
          includeYear: this.form.includeYear.checked,
          intent: this.form.intent.value,
          tone: this.form.tone.value,
          titleStyle: this.form.titleStyle.value,
          metaStyle: this.form.metaStyle.value,
          length: this.form.length.value,
          bulkMode: this.form.bulkMode.checked,
        };
      }

      getPageUrl() {
        return this.form.pageUrl.value.trim();
      }

      isValid() {
        return this.form.reportValidity();
      }

      getAction(event) {
        const button = event.target.closest?.("button[data-action]");
        return button ? { ...button.dataset } : null;
      }

      /** Binds stable container listeners; result-card actions use event delegation. */
      bind(handlers) {
        this.form.addEventListener("submit", (event) => {
          event.preventDefault();
          handlers.generate();
        });
        this.form.addEventListener("input", handlers.configurationChanged);
        this.elements["save-generation-btn"].addEventListener(
          "click",
          handlers.saveGeneration,
        );
        this.elements["download-btn"].addEventListener(
          "click",
          handlers.downloadText,
        );
        this.elements["export-btn"].addEventListener(
          "click",
          handlers.downloadCsv,
        );
        this.elements["title-results"].addEventListener("click", (event) =>
          handlers.resultAction(event, "title"),
        );
        this.elements["meta-results"].addEventListener("click", (event) =>
          handlers.resultAction(event, "meta"),
        );
        this.elements["desktop-toggle"].addEventListener("click", () =>
          handlers.device("desktop"),
        );
        this.elements["mobile-toggle"].addEventListener("click", () =>
          handlers.device("mobile"),
        );
        this.form.pageUrl.addEventListener("change", handlers.refreshPreview);
      }

      /** Rebuilds result panels from current state using escaped card templates. */
      render(state) {
        this.elements["title-results"].innerHTML = state.titles.length
          ? state.titles
              .map((item, index) => renderTitleCard(item, index, state))
              .join("")
          : '<p class="empty-state">Generate titles to populate this panel.</p>';
        this.elements["meta-results"].innerHTML = state.metas.length
          ? state.metas
              .map((item, index) => renderMetaCard(item, index, state))
              .join("")
          : '<p class="empty-state">Generate meta descriptions to populate this panel.</p>';
        this.renderSummary(state);
        this.renderSchemaSuggestions(state);
        this.renderComparison(state);
        this.applyPersistenceState();
      }

      renderSummary(state) {
        this.elements["summary-badges"].innerHTML = state.summary
          ? `
              <span class="pill">Titles: ${state.summary.titleCount}</span>
              <span class="pill">Metas: ${state.summary.metaCount}</span>
              <span class="pill">Avg Title Score: ${state.summary.avgTitleScore}</span>
              <span class="pill">Avg Meta Score: ${state.summary.avgMetaScore}</span>
              ${
                state.lengthFallback
                  ? `<span class="pill badge-review">${escapeHtml(state.lengthFallback.reason)}</span>`
                  : ""
              }
            `
          : '<span class="pill">Ready</span>';
      }

      renderSchemaSuggestions(state) {
        this.elements["schema-suggestions"].innerHTML =
          state.schemaHeadlineSuggestions.length > 0
            ? state.schemaHeadlineSuggestions
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join("")
            : "<li>No headline suggestions yet.</li>";
      }

      renderComparison(state) {
        const html = renderComparison(state);
        this.elements["compare-panel"].classList.toggle("hidden", !html);
        this.elements["compare-panel"].innerHTML = html;
      }

      /** Applies server-produced preview markup containing only escaped text and `strong`. */
      updatePreview(preview, state) {
        this.elements["preview-url"].textContent =
          preview.url || "https://www.yourdomain.com";
        this.elements["preview-title"].innerHTML =
          preview.titleHtml || "Generated title preview.";
        this.elements["preview-meta"].innerHTML =
          preview.metaHtml || "Generated meta preview.";
        this.elements["title-pixels"].textContent =
          `${preview.titlePixels} / ${preview.titleLimit}px`;
        this.elements["meta-pixels"].textContent =
          `${preview.metaPixels} / ${preview.metaLimit}px`;
        this.updateProgress("title", preview);
        this.updateProgress("meta", preview);
        this.elements["serp-card"].classList.toggle(
          "mobile",
          state.device === "mobile",
        );
      }

      updateProgress(type, preview) {
        const progress = preview[`${type}Progress`];
        const truncated = preview[`${type}Truncated`];
        const progressElement = this.elements[`${type}-progress`];
        progressElement.value = progress;
        progressElement.textContent = `${progress}%`;
        progressElement.classList.toggle("warn", truncated || progress > 96);
        this.elements[`${type}-warning`].textContent = truncated
          ? `${type === "title" ? "Title" : "Meta description"} may truncate in SERP.`
          : "";
      }

      setLoading(loading) {
        this.generationBusy = loading;
        this.elements["generate-btn"].disabled = loading;
        this.elements["generate-btn"].textContent = loading
          ? "Generating..."
          : "Generate";
        this.elements["results-panel"].setAttribute(
          "aria-busy",
          String(loading),
        );
        if (loading) this.setStatus("Generating SEO snippet variations.");
        this.applyPersistenceState();
      }

      setPersistenceBusy(busy) {
        this.persistenceBusy = busy;
        this.applyPersistenceState();
      }

      /** Keeps save and favorite actions disabled while related writes are unresolved. */
      applyPersistenceState() {
        const busy = this.persistenceBusy || this.generationBusy;
        const saveButton = this.elements["save-generation-btn"];
        saveButton.disabled = busy;
        saveButton.textContent = this.persistenceBusy
          ? "Saving..."
          : "Save Generation";
        for (const containerName of ["title-results", "meta-results"]) {
          const buttons =
            this.elements[containerName].querySelectorAll?.(
              'button[data-action="favorite"]',
            ) || [];
          for (const button of buttons) button.disabled = busy;
        }
      }

      setDevice(device) {
        const desktop = device === "desktop";
        this.elements["desktop-toggle"].classList.toggle("active", desktop);
        this.elements["mobile-toggle"].classList.toggle("active", !desktop);
        this.elements["desktop-toggle"].setAttribute(
          "aria-pressed",
          String(desktop),
        );
        this.elements["mobile-toggle"].setAttribute(
          "aria-pressed",
          String(!desktop),
        );
      }

      setStatus(message) {
        this.elements["generator-status"].textContent = message;
      }
    }

    return {
      GeneratorView,
      renderComparison,
      renderMetaCard,
      renderScoreDetails,
      renderTitleCard,
    };
  },
);
