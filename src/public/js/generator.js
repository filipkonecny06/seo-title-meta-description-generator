(() => {
  const root = document.querySelector("[data-generator-page]");
  if (!root) {
    return;
  }

  const csrfToken =
    document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content") || "";
  const isAuthenticated = root.dataset.authenticated === "true";

  const form = document.getElementById("generator-form");
  const generateBtn = document.getElementById("generate-btn");
  const downloadBtn = document.getElementById("download-btn");
  const exportBtn = document.getElementById("export-btn");
  const saveGenerationBtn = document.getElementById("save-generation-btn");
  const titleResults = document.getElementById("title-results");
  const metaResults = document.getElementById("meta-results");
  const summaryBadges = document.getElementById("summary-badges");
  const comparePanel = document.getElementById("compare-panel");
  const resultsPanel = document.getElementById("results-panel");
  const generatorStatus = document.getElementById("generator-status");

  const previewUrl = document.getElementById("preview-url");
  const previewTitle = document.getElementById("preview-title");
  const previewMeta = document.getElementById("preview-meta");
  const serpCard = document.getElementById("serp-card");
  const titlePixels = document.getElementById("title-pixels");
  const metaPixels = document.getElementById("meta-pixels");
  const titleProgress = document.getElementById("title-progress");
  const metaProgress = document.getElementById("meta-progress");
  const titleWarning = document.getElementById("title-warning");
  const metaWarning = document.getElementById("meta-warning");
  const schemaSuggestions = document.getElementById("schema-suggestions");

  const desktopToggle = document.getElementById("desktop-toggle");
  const mobileToggle = document.getElementById("mobile-toggle");

  let generationController = null;
  let previewController = null;
  let generationSequence = 0;

  const state = {
    config: null,
    titles: [],
    metas: [],
    summary: null,
    schemaHeadlineSuggestions: [],
    selectedTitleId: null,
    selectedMetaId: null,
    generationHistoryId: null,
    compareTitleIds: [],
    device: "desktop",
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const slugify = (value) =>
    String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const postJson = async (url, payload, { signal } = {}) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify(payload),
      signal,
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error || "Request failed.");
    }

    return body;
  };

  const getPayload = () => ({
    primaryKeyword: form.primaryKeyword.value.trim(),
    secondaryKeywords: form.secondaryKeywords.value.trim(),
    audience: form.audience.value.trim(),
    location: form.location.value.trim(),
    includeYear: form.includeYear.checked,
    intent: form.intent.value,
    tone: form.tone.value,
    titleStyle: form.titleStyle.value,
    metaStyle: form.metaStyle.value,
    length: form.length.value,
    bulkMode: form.bulkMode.checked,
  });

  const badgeClass = (badge) => {
    const normalized = String(badge || "").toLowerCase();
    if (normalized === "elite") return "badge-elite";
    if (normalized === "strong") return "badge-strong";
    if (normalized === "good") return "badge-good";
    return "badge-weak";
  };

  const getSelectedTitle = () =>
    state.titles.find((item) => item.id === state.selectedTitleId) || null;
  const getSelectedMeta = () =>
    state.metas.find((item) => item.id === state.selectedMetaId) || null;

  const renderSummary = () => {
    if (!state.summary) {
      summaryBadges.innerHTML = '<span class="pill">Ready</span>';
      return;
    }

    summaryBadges.innerHTML = `
      <span class="pill">Titles: ${state.summary.titleCount}</span>
      <span class="pill">Metas: ${state.summary.metaCount}</span>
      <span class="pill">Avg Title Score: ${state.summary.avgTitleScore}</span>
      <span class="pill">Avg Meta Score: ${state.summary.avgMetaScore}</span>
    `;
  };

  const renderSchemaSuggestions = () => {
    if (!state.schemaHeadlineSuggestions.length) {
      schemaSuggestions.innerHTML = "<li>No headline suggestions yet.</li>";
      return;
    }

    schemaSuggestions.innerHTML = state.schemaHeadlineSuggestions
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
  };

  const renderTitleCard = (item, index) => {
    const activeClass = item.id === state.selectedTitleId ? "active" : "";
    const compareActive = state.compareTitleIds.includes(item.id)
      ? "active"
      : "";

    return `
      <article class="result-card ${activeClass}" data-id="${item.id}">
        <div class="card-head">
          <strong>Title ${index + 1}</strong>
          <span class="pill ${badgeClass(item.badge)}">${item.badge} ${item.optimizationScore}</span>
        </div>
        <p class="result-text">${escapeHtml(item.text)}</p>
        <div class="result-metrics">
          <span>Chars: ${item.charCount}</span>
          <span>Pixels: ${item.pixelWidth}</span>
          <span>${item.truncated ? "Potential truncation" : "Fits desktop SERP"}</span>
        </div>
        <div class="result-actions">
          <button type="button" data-action="select" data-type="title" data-id="${item.id}" aria-label="Preview title ${index + 1}">Preview</button>
          <button type="button" data-action="copy" data-type="title" data-id="${item.id}" aria-label="Copy title ${index + 1}">Copy</button>
          <button type="button" data-action="favorite" data-type="title" data-id="${item.id}" aria-label="Save title ${index + 1} as favorite">Favorite</button>
          <button type="button" data-action="compare" data-type="title" data-id="${item.id}" class="${compareActive}" aria-pressed="${compareActive ? "true" : "false"}" aria-label="Compare title ${index + 1}">Compare</button>
        </div>
      </article>
    `;
  };

  const renderMetaCard = (item, index) => {
    const activeClass = item.id === state.selectedMetaId ? "active" : "";

    return `
      <article class="result-card ${activeClass}" data-id="${item.id}">
        <div class="card-head">
          <strong>Meta ${index + 1}</strong>
          <span class="pill ${badgeClass(item.badge)}">${item.badge} ${item.optimizationScore}</span>
        </div>
        <p class="result-text">${escapeHtml(item.text)}</p>
        <div class="result-metrics">
          <span>Chars: ${item.charCount}</span>
          <span>Pixels: ${item.pixelWidth}</span>
          <span>${item.truncated ? "Potential truncation" : "Fits desktop SERP"}</span>
        </div>
        <div class="result-actions">
          <button type="button" data-action="select" data-type="meta" data-id="${item.id}" aria-label="Preview meta description ${index + 1}">Preview</button>
          <button type="button" data-action="copy" data-type="meta" data-id="${item.id}" aria-label="Copy meta description ${index + 1}">Copy</button>
          <button type="button" data-action="favorite" data-type="meta" data-id="${item.id}" aria-label="Save meta description ${index + 1} as favorite">Favorite</button>
        </div>
      </article>
    `;
  };

  const renderComparePanel = () => {
    if (state.compareTitleIds.length < 2) {
      comparePanel.classList.add("hidden");
      comparePanel.innerHTML = "";
      return;
    }

    const selected = state.compareTitleIds
      .map((id) => state.titles.find((item) => item.id === id))
      .filter(Boolean);

    if (selected.length < 2) {
      comparePanel.classList.add("hidden");
      comparePanel.innerHTML = "";
      return;
    }

    const [first, second] = selected;
    const winner =
      first.optimizationScore >= second.optimizationScore ? first : second;

    comparePanel.classList.remove("hidden");
    comparePanel.innerHTML = `
      <h3>Compare 2 Titles</h3>
      <div class="compare-grid">
        <article class="compare-item">
          <strong>A</strong>
          <p>${escapeHtml(first.text)}</p>
          <p>Score: ${first.optimizationScore} (${first.badge}) | Chars: ${first.charCount} | Estimated pixels: ${first.pixelWidth}</p>
        </article>
        <article class="compare-item">
          <strong>B</strong>
          <p>${escapeHtml(second.text)}</p>
          <p>Score: ${second.optimizationScore} (${second.badge}) | Chars: ${second.charCount} | Estimated pixels: ${second.pixelWidth}</p>
        </article>
      </div>
      <p class="muted small-text">Recommended winner: <strong>${escapeHtml(winner.text)}</strong></p>
    `;
  };

  const renderResults = () => {
    if (!state.titles.length) {
      titleResults.innerHTML =
        '<p class="empty-state">Generate titles to populate this panel.</p>';
    } else {
      titleResults.innerHTML = state.titles.map(renderTitleCard).join("");
    }

    if (!state.metas.length) {
      metaResults.innerHTML =
        '<p class="empty-state">Generate meta descriptions to populate this panel.</p>';
    } else {
      metaResults.innerHTML = state.metas.map(renderMetaCard).join("");
    }

    renderSummary();
    renderSchemaSuggestions();
    renderComparePanel();
  };

  const updatePreviewPanel = (previewData) => {
    previewUrl.textContent = previewData.url || "https://www.yourdomain.com";
    previewTitle.innerHTML =
      previewData.titleHtml || "Generated title preview.";
    previewMeta.innerHTML = previewData.metaHtml || "Generated meta preview.";

    titlePixels.textContent = `${previewData.titlePixels} / ${previewData.titleLimit}px`;
    metaPixels.textContent = `${previewData.metaPixels} / ${previewData.metaLimit}px`;

    titleProgress.value = previewData.titleProgress;
    titleProgress.textContent = `${previewData.titleProgress}%`;
    metaProgress.value = previewData.metaProgress;
    metaProgress.textContent = `${previewData.metaProgress}%`;

    titleProgress.classList.toggle(
      "warn",
      previewData.titleTruncated || previewData.titleProgress > 96,
    );
    metaProgress.classList.toggle(
      "warn",
      previewData.metaTruncated || previewData.metaProgress > 96,
    );

    titleWarning.textContent = previewData.titleTruncated
      ? "Title may truncate in SERP."
      : "";
    metaWarning.textContent = previewData.metaTruncated
      ? "Meta description may truncate in SERP."
      : "";

    serpCard.classList.toggle("mobile", state.device === "mobile");
  };

  const refreshPreview = async () => {
    const selectedTitle = getSelectedTitle();
    const selectedMeta = getSelectedMeta();

    if (!selectedTitle || !selectedMeta || !state.config) {
      return;
    }

    const configuredUrl = form.pageUrl.value.trim();
    const payload = {
      title: selectedTitle.text,
      meta: selectedMeta.text,
      primaryKeyword: state.config.primaryKeyword,
      secondaryKeywords: state.config.secondaryKeywords,
      url:
        configuredUrl ||
        `https://www.example.com/${slugify(state.config.primaryKeyword)}`,
      device: state.device,
    };

    try {
      previewController?.abort();
      previewController = new AbortController();
      const response = await postJson("/api/preview", payload, {
        signal: previewController.signal,
      });
      updatePreviewPanel(response.data);
    } catch (error) {
      if (error.name === "AbortError") return;
      window.showToast(error.message, "error");
    }
  };

  const copyToClipboard = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      window.showToast("Copied to clipboard.", "success");
    } catch {
      window.showToast("Clipboard failed. Copy manually.", "warning");
    }
  };

  const setLoadingState = (loading) => {
    generateBtn.disabled = loading;
    generateBtn.textContent = loading ? "Generating..." : "Generate";
    resultsPanel.setAttribute("aria-busy", String(loading));
    if (loading)
      generatorStatus.textContent = "Generating SEO snippet variations.";
  };

  const generate = async ({ notify = false } = {}) => {
    if (!form.reportValidity()) return;
    const payload = getPayload();
    if (!payload.primaryKeyword) {
      state.titles = [];
      state.metas = [];
      state.summary = null;
      state.schemaHeadlineSuggestions = [];
      state.selectedTitleId = null;
      state.selectedMetaId = null;
      renderResults();
      return;
    }

    generationController?.abort();
    generationController = new AbortController();
    const requestSequence = ++generationSequence;
    setLoadingState(true);

    try {
      const response = await postJson("/api/generate", payload, {
        signal: generationController.signal,
      });
      if (requestSequence !== generationSequence) return;
      const data = response.data;

      state.config = data.config;
      state.titles = data.titles || [];
      state.metas = data.metas || [];
      state.summary = data.summary || null;
      state.schemaHeadlineSuggestions = data.schemaHeadlineSuggestions || [];
      state.selectedTitleId = state.titles[0]?.id || null;
      state.selectedMetaId = state.metas[0]?.id || null;
      state.compareTitleIds = [];
      state.generationHistoryId = null;

      renderResults();
      await refreshPreview();

      if (notify) {
        window.showToast("Variations generated.", "success");
      }
      generatorStatus.textContent = `${state.titles.length} titles and ${state.metas.length} meta descriptions generated.`;
    } catch (error) {
      if (error.name === "AbortError") return;
      window.showToast(error.message, "error");
      generatorStatus.textContent = `Generation failed: ${error.message}`;
    } finally {
      if (requestSequence === generationSequence) setLoadingState(false);
    }
  };

  const saveGeneration = async ({ notify = true } = {}) => {
    if (!isAuthenticated) {
      window.showToast("Login required to save generation.", "warning");
      return null;
    }

    if (!state.config || !state.titles.length || !state.metas.length) {
      window.showToast("Generate snippets first.", "warning");
      return null;
    }

    if (state.generationHistoryId) return state.generationHistoryId;

    try {
      const response = await postJson("/api/save", {
        config: state.config,
        selectedTitleId: state.selectedTitleId,
        selectedMetaId: state.selectedMetaId,
      });

      state.generationHistoryId = response.generationHistoryId;
      if (notify) window.showToast("Generation saved.", "success");
      return state.generationHistoryId;
    } catch (error) {
      window.showToast(error.message, "error");
      return null;
    }
  };

  const saveFavorite = async (item, type) => {
    if (!isAuthenticated) {
      window.showToast("Login required to save favorites.", "warning");
      return;
    }

    try {
      const generationHistoryId = await saveGeneration({ notify: false });
      if (!generationHistoryId) return;
      await postJson("/api/favorites", {
        generationHistoryId,
        type,
        itemId: item.id,
      });
      window.showToast("Favorite saved.", "success");
    } catch (error) {
      window.showToast(error.message, "error");
    }
  };

  const downloadTxt = () => {
    if (!state.titles.length && !state.metas.length) {
      window.showToast("Nothing to download yet.", "warning");
      return;
    }

    const lines = [];
    lines.push("SEO Title + Meta Export");
    lines.push(`Keyword: ${state.config?.primaryKeyword || ""}`);
    lines.push("");
    lines.push("Titles");
    state.titles.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.text} (Score ${item.optimizationScore})`);
    });

    lines.push("");
    lines.push("Meta Descriptions");
    state.metas.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.text} (Score ${item.optimizationScore})`);
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `seo-snippets-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const { csvEscape } = window.OrbitCsv;

  const exportCsv = () => {
    if (!state.titles.length && !state.metas.length) {
      window.showToast("Nothing to export yet.", "warning");
      return;
    }

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
    state.titles.forEach((item) => {
      rows.push([
        "title",
        item.text,
        item.charCount,
        item.pixelWidth,
        item.optimizationScore,
        item.badge,
      ]);
    });
    state.metas.forEach((item) => {
      rows.push([
        "meta",
        item.text,
        item.charCount,
        item.pixelWidth,
        item.optimizationScore,
        item.badge,
      ]);
    });

    const csv = rows
      .map((row) => row.map((field) => csvEscape(field)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `seo-snippets-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleResultActions = (event, type) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const id = button.dataset.id;

    const list = type === "title" ? state.titles : state.metas;
    const item = list.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    if (action === "select") {
      if (type === "title") {
        state.selectedTitleId = id;
      } else {
        state.selectedMetaId = id;
      }
      renderResults();
      refreshPreview();
      return;
    }

    if (action === "copy") {
      copyToClipboard(item.text);
      return;
    }

    if (action === "favorite") {
      saveFavorite(item, type);
      return;
    }

    if (action === "compare" && type === "title") {
      if (state.compareTitleIds.includes(id)) {
        state.compareTitleIds = state.compareTitleIds.filter(
          (entry) => entry !== id,
        );
      } else {
        state.compareTitleIds.push(id);
        if (state.compareTitleIds.length > 2) {
          state.compareTitleIds = state.compareTitleIds.slice(-2);
        }
      }
      renderResults();
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    generate({ notify: true });
  });

  saveGenerationBtn.addEventListener("click", () => {
    saveGeneration();
  });

  downloadBtn.addEventListener("click", () => {
    downloadTxt();
  });

  exportBtn.addEventListener("click", () => {
    exportCsv();
  });

  titleResults.addEventListener("click", (event) => {
    handleResultActions(event, "title");
  });

  metaResults.addEventListener("click", (event) => {
    handleResultActions(event, "meta");
  });

  desktopToggle.addEventListener("click", () => {
    state.device = "desktop";
    desktopToggle.classList.add("active");
    mobileToggle.classList.remove("active");
    desktopToggle.setAttribute("aria-pressed", "true");
    mobileToggle.setAttribute("aria-pressed", "false");
    refreshPreview();
  });

  mobileToggle.addEventListener("click", () => {
    state.device = "mobile";
    mobileToggle.classList.add("active");
    desktopToggle.classList.remove("active");
    desktopToggle.setAttribute("aria-pressed", "false");
    mobileToggle.setAttribute("aria-pressed", "true");
    refreshPreview();
  });

  form.pageUrl.addEventListener("change", () => refreshPreview());

  renderResults();
})();
