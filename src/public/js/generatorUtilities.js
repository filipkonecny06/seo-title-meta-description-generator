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

  const badgeClass = (badge) => {
    const normalized = String(badge || "").toLowerCase();
    if (normalized === "high alignment") return "badge-high";
    if (normalized === "moderate alignment") return "badge-medium";
    if (normalized === "partial alignment") return "badge-low";
    return "badge-review";
  };

  return { badgeClass, escapeHtml, slugify };
});
