(function exposeCsvUtilities(root, factory) {
  const utilities = factory();
  if (typeof module === "object" && module.exports) module.exports = utilities;
  if (root) root.OrbitCsv = utilities;
})(typeof window === "undefined" ? null : window, () => {
  const neutralizeSpreadsheetFormula = (value) => {
    const text = String(value ?? "");
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  };

  const csvEscape = (value) =>
    `"${neutralizeSpreadsheetFormula(value).replace(/"/g, '""')}"`;

  return { csvEscape, neutralizeSpreadsheetFormula };
});
