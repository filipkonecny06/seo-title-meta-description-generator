"use strict";

const { loadCatalog } = require("../src/catalog/catalogSchema");
const { expandCatalogRows } = require("../src/catalog/catalogRows");

const managedRows = () => expandCatalogRows(loadCatalog()).titleTemplates;

module.exports = {
  async up(queryInterface) {
    const rows = managedRows();
    for (const row of rows) {
      await queryInterface.bulkDelete("title_templates", {
        intent: row.intent,
        style: row.style,
        formula: row.formula,
      });
    }
    await queryInterface.bulkInsert("title_templates", rows);
  },

  async down(queryInterface) {
    for (const row of managedRows()) {
      await queryInterface.bulkDelete("title_templates", {
        intent: row.intent,
        style: row.style,
        formula: row.formula,
      });
    }
  },
};
