"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("sessions", "session_id", {
      type: Sequelize.STRING(128).BINARY,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("sessions", "session_id", {
      type: Sequelize.STRING(128),
      allowNull: false,
    });
  },
};
