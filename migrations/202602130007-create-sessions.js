"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sessions", {
      session_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
        primaryKey: true,
      },
      expires: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      data: {
        type: Sequelize.TEXT("medium"),
        allowNull: true,
      },
    });
    await queryInterface.addIndex("sessions", ["expires"], {
      name: "sessions_expires_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("sessions");
  },
};
