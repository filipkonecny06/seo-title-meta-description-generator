/** Escapes CSV syntax and neutralizes common spreadsheet-formula prefixes. */
(function exposeCsvUtilities(root, factory) {
  const utilities = factory();
  if (typeof module === "object" && module.exports) module.exports = utilities;
  if (root) root.OrbitCsv = utilities;
})(typeof window === "undefined" ? null : window, () => {
  // Prefix formula-leading cells to mitigate interpretation by spreadsheet software.
  const neutralizeSpreadsheetFormula = (value) => {
    const text = String(value ?? "");
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  };

  const csvEscape = (value) =>
    `"${neutralizeSpreadsheetFormula(value).replace(/"/g, '""')}"`;

  return { csvEscape, neutralizeSpreadsheetFormula };
});
