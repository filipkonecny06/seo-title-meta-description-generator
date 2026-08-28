"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("favorite_titles", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      generationHistoryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "generation_histories",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      meta: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ctrScore: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      badge: {
        type: Sequelize.STRING(24),
        allowNull: false,
        defaultValue: "Weak",
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

    await queryInterface.addIndex("favorite_titles", ["userId"], {
      name: "favorite_titles_user_idx",
    });

    await queryInterface.addIndex("favorite_titles", ["generationHistoryId"], {
      name: "favorite_titles_history_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("favorite_titles");
  },
};
