/** Pure escaped-markup builders for generator results and comparisons. */
(function attachGeneratorRendering(root, factory) {
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
    /** @typedef {import("../../contracts/generation").GeneratedSnippet} GeneratedSnippet */
    const ACTION_TEXT = Object.freeze({
      select: "Preview",
      copy: "Copy",
      favorite: "Favorite",
      compare: "Compare",
    });

    /**
     * @param {GeneratedSnippet} item
     * @param {Object<string, string>} scoreLabels
     */
    const renderScoreDetails = (item, scoreLabels = {}) => {
      const breakdown = Object.entries(item.scoreBreakdown || {})
        .map(
          ([key, points]) => `
            <div>
              <dt>${escapeHtml(scoreLabels[key] || key)}</dt>
              <dd>${Number(points) || 0} points</dd>
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

    const renderMetrics = (item) => `
      <div class="result-metrics">
        <span>Chars: ${item.charCount}</span>
        <span>Pixels: ${item.pixelWidth}</span>
        <span>${item.truncated ? "Potential truncation" : "Within desktop width estimate"}</span>
        <span>${item.outsideCharacterTarget ? "Outside selected character band" : "Within selected character band"}</span>
      </div>`;

    const renderAction = ({ action, type, id, label, active = false }) => {
      const comparisonState =
        action === "compare"
          ? ` class="${active ? "active" : ""}" aria-pressed="${String(active)}"`
          : "";
      return `
        <button type="button" data-action="${escapeHtml(action)}" data-type="${escapeHtml(type)}" data-id="${escapeHtml(id)}"${comparisonState} aria-label="${escapeHtml(label)}">${ACTION_TEXT[action] || "Action"}</button>`;
    };

    /**
     * Shared result-card shell; type-specific actions stay explicit in one list.
     *
     * @param {GeneratedSnippet} item
     * @param {number} index
     * @param {object} state
     * @param {"title"|"meta"} type
     */
    const renderResultCard = (item, index, state, type) => {
      const isTitle = type === "title";
      const selectedId = isTitle ? state.selectedTitleId : state.selectedMetaId;
      const activeClass = item.id === selectedId ? "active" : "";
      const itemName = isTitle
        ? `title ${index + 1}`
        : `meta description ${index + 1}`;
      const actions = [
        { action: "select", label: `Preview ${itemName}` },
        { action: "copy", label: `Copy ${itemName}` },
        { action: "favorite", label: `Save ${itemName} as favorite` },
      ];
      if (isTitle) {
        actions.push({
          action: "compare",
          label: `Compare ${itemName}`,
          active: state.compareTitleIds.includes(item.id),
        });
      }

      return `
        <article class="result-card ${activeClass}" data-id="${escapeHtml(item.id)}">
          <div class="card-head">
            <strong>${isTitle ? "Title" : "Meta"} ${index + 1}</strong>
            <span class="pill ${badgeClass(item.badgeLevel)}">${escapeHtml(item.badge)} ${item.optimizationScore}</span>
          </div>
          <p class="result-text">${escapeHtml(item.text)}</p>
          ${renderMetrics(item)}
          ${renderScoreDetails(item, state.scoreBreakdownLabels)}
          <div class="result-actions">
            ${actions.map((action) => renderAction({ ...action, type, id: item.id })).join("")}
          </div>
        </article>
      `;
    };

    const renderTitleCard = (item, index, state) =>
      renderResultCard(item, index, state, "title");
    const renderMetaCard = (item, index, state) =>
      renderResultCard(item, index, state, "meta");

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

    return {
      renderComparison,
      renderMetaCard,
      renderResultCard,
      renderScoreDetails,
      renderTitleCard,
    };
  },
);
