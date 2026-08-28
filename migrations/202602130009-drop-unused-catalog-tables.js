"use strict";

const titleTemplatesMigration = require("./202602130002-create-title-templates");
const metaTemplatesMigration = require("./202602130003-create-meta-templates");
const powerWordsMigration = require("./202602130004-create-power-words");

module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable("power_words");
    await queryInterface.dropTable("meta_templates");
    await queryInterface.dropTable("title_templates");
  },

  async down(queryInterface, Sequelize) {
    await titleTemplatesMigration.up(queryInterface, Sequelize);
    await metaTemplatesMigration.up(queryInterface, Sequelize);
    await powerWordsMigration.up(queryInterface, Sequelize);
  },
};
