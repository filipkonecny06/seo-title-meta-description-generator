"use strict";

const { loadCatalog } = require("../src/catalog/catalogSchema");
const { expandCatalogRows } = require("../src/catalog/catalogRows");

const managedRows = () => expandCatalogRows(loadCatalog()).metaTemplates;

module.exports = {
  async up(queryInterface) {
    const rows = managedRows();
    for (const row of rows) {
      await queryInterface.bulkDelete("meta_templates", {
        style: row.style,
        formula: row.formula,
      });
    }
    await queryInterface.bulkInsert("meta_templates", rows);
  },

  async down(queryInterface) {
    for (const row of managedRows()) {
      await queryInterface.bulkDelete("meta_templates", {
        style: row.style,
        formula: row.formula,
      });
    }
  },
};
