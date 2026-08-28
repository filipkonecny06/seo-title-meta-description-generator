"use strict";

const titleTemplatesMigration = require("./202602130002-create-title-templates");
const metaTemplatesMigration = require("./202602130003-create-meta-templates");
const powerWordsMigration = require("./202602130004-create-power-words");

/** Moves catalog ownership to validated, version-controlled JSON. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable("power_words");
    await queryInterface.dropTable("meta_templates");
    await queryInterface.dropTable("title_templates");
  },

  async down(queryInterface, Sequelize) {
    // Reusing the original migrations keeps rollback schema identical to its first form.
    await titleTemplatesMigration.up(queryInterface, Sequelize);
    await metaTemplatesMigration.up(queryInterface, Sequelize);
    await powerWordsMigration.up(queryInterface, Sequelize);
  },
};
