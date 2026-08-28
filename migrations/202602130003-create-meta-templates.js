"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("meta_templates", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      style: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      formula: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      benefitWeight: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      urgencyWeight: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
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

    await queryInterface.addIndex("meta_templates", ["style"], {
      name: "meta_templates_style_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("meta_templates");
  },
};
