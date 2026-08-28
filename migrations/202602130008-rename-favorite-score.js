"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "favorite_titles",
      "ctrScore",
      "optimizationScore",
    );
    await queryInterface.changeColumn("favorite_titles", "optimizationScore", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "favorite_titles",
      "optimizationScore",
      "ctrScore",
    );
    await queryInterface.changeColumn("favorite_titles", "ctrScore", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },
};
