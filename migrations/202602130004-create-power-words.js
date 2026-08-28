"use strict";

/** Creates the original scoring-term table retained for rollback support. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("power_words", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      word: {
        type: Sequelize.STRING(80),
        allowNull: false,
        unique: true,
      },
      category: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      weight: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
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

    await queryInterface.addIndex("power_words", ["category"], {
      name: "power_words_category_idx",
    });

    await queryInterface.addIndex("power_words", ["word"], {
      unique: true,
      name: "power_words_word_unique_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("power_words");
  },
};
