"use strict";

/** Stores each user's input configuration, candidate sets, and selected snippets. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("generation_histories", {
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
        // A deleted account must not leave personal generation history behind.
        onDelete: "CASCADE",
      },
      primaryKeyword: {
        type: Sequelize.STRING(180),
        allowNull: false,
      },
      config: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      titles: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      metas: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      selectedTitle: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      selectedMeta: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex("generation_histories", ["userId"], {
      name: "generation_histories_user_idx",
    });

    await queryInterface.addIndex("generation_histories", ["createdAt"], {
      name: "generation_histories_created_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("generation_histories");
  },
};
