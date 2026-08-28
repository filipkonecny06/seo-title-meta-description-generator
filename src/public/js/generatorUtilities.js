/** Pure formatting helpers shared by browser modules and their Node tests. */
(function attachGeneratorUtilities(root, factory) {
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
  // Escape user-controlled strings before interpolating them into generated markup.
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

  const BADGE_LEVELS = new Set(["high", "medium", "partial", "review"]);

  /** Uses the stable API badge level instead of coupling CSS to display copy. */
  const badgeClass = (level) => {
    const normalized = String(level || "").toLowerCase();
    return `badge-${BADGE_LEVELS.has(normalized) ? normalized : "review"}`;
  };

  return { badgeClass, escapeHtml, slugify };
});
