/** Normalizes user text and renders validated catalog formulas. */
const KNOWN_TERMS = new Map([
  ["api", "API"],
  ["b2b", "B2B"],
  ["b2c", "B2C"],
  ["cms", "CMS"],
  ["ctr", "CTR"],
  ["html", "HTML"],
  ["saas", "SaaS"],
  ["seo", "SEO"],
  ["ui", "UI"],
  ["url", "URL"],
  ["ux", "UX"],
]);

const safeString = (value) => String(value ?? "").trim();

const titleCaseToken = (token) => {
  const known = KNOWN_TERMS.get(token.toLowerCase());
  if (known) return known;
  // Preserve mixed-case brands and initialisms that are not in the known-term map.
  if (/[a-z][A-Z]|[A-Z].*[A-Z]/.test(token)) return token;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
};

const titleCase = (value) =>
  safeString(value).split(/\s+/).filter(Boolean).map(titleCaseToken).join(" ");

const normalizeWhitespace = (value) =>
  safeString(value)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([|–—-])\s*$/g, "")
    .trim();

const removeEmptyYearClause = (formula, year) => {
  if (year) return formula;
  return formula
    .replace(/^\s*\{Year\}\s*:\s*/i, "")
    .replace(/\s+(?:in|for)\s+\{Year\}/gi, "")
    .replace(/\s*\(\s*\{Year\}\s*\)/g, "")
    .replace(/\s*[,|–—-]\s*\{Year\}/g, "")
    .replace(/\{Year\}/g, "");
};

/**
 * Replaces catalog placeholders and removes punctuation left by an omitted year.
 * Catalog validation guarantees that formulas use only supported placeholders.
 */
const applyTemplate = (formula, context) =>
  normalizeWhitespace(
    removeEmptyYearClause(safeString(formula), context.Year).replace(
      /\{([A-Za-z0-9_]+)\}/g,
      (match, key) =>
        Object.hasOwn(context, key) ? safeString(context[key]) : "",
    ),
  );

module.exports = { applyTemplate, normalizeWhitespace, safeString, titleCase };
