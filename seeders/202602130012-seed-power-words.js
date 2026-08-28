"use strict";

const { loadCatalog } = require("../src/catalog/catalogSchema");
const { expandCatalogRows } = require("../src/catalog/catalogRows");

const managedRows = () => expandCatalogRows(loadCatalog()).powerWords;

module.exports = {
  async up(queryInterface) {
    const rows = managedRows();
    for (const row of rows) {
      await queryInterface.bulkDelete("power_words", { word: row.word });
    }
    await queryInterface.bulkInsert("power_words", rows);
  },

  async down(queryInterface) {
    for (const row of managedRows()) {
      await queryInterface.bulkDelete("power_words", { word: row.word });
    }
  },
};
