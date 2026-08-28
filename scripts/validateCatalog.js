/** Validates the editable catalog and prints a concise inventory for maintainers. */
const {
  JsonTemplateCatalogRepository,
} = require("../src/repositories/catalogRepository");

const repository = new JsonTemplateCatalogRepository();
const summary = repository.getSummary();

// Construction performs full schema and cross-template validation before output.
console.log(`Catalog v${summary.version} is valid.`);
console.log(`Title formulas: ${summary.titleFormulaCount}`);
console.log(`Meta description formulas: ${summary.metaFormulaCount}`);
console.log(`Scoring terms: ${summary.powerWordCount}`);
console.log(`Supported intents: ${summary.supportedIntents.length}`);
