"use strict";

/** Creates the original database-backed title catalog retained for migration history. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("title_templates", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      intent: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      style: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      formula: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      powerWordBoostScore: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex("title_templates", ["intent"], {
      name: "title_templates_intent_idx",
    });

    await queryInterface.addIndex("title_templates", ["style"], {
      name: "title_templates_style_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("title_templates");
  },
};
