"use strict";

/** Evolves paired favorites into individually identifiable title or meta favorites. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameTable("favorite_titles", "favorite_snippets");
    await queryInterface.addIndex("favorite_snippets", ["userId"], {
      name: "favorite_snippets_user_idx",
    });
    await queryInterface.addIndex(
      "favorite_snippets",
      ["generationHistoryId"],
      { name: "favorite_snippets_history_idx" },
    );
    await queryInterface.removeIndex(
      "favorite_snippets",
      "favorite_titles_user_idx",
    );
    await queryInterface.removeIndex(
      "favorite_snippets",
      "favorite_titles_history_idx",
    );
    await queryInterface.addColumn("favorite_snippets", "kind", {
      type: Sequelize.STRING(16),
      allowNull: false,
      defaultValue: "pair",
    });
    await queryInterface.addColumn("favorite_snippets", "itemKey", {
      type: Sequelize.STRING(40),
      allowNull: true,
    });
    await queryInterface.addIndex(
      "favorite_snippets",
      ["userId", "generationHistoryId", "kind", "itemKey"],
      {
        // MySQL permits duplicate unique-key rows containing NULL. This guards
        // per-item identity only while both history and item identifiers exist.
        unique: true,
        name: "favorite_snippets_identity_unique",
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "favorite_snippets",
      "favorite_snippets_identity_unique",
    );
    await queryInterface.addIndex("favorite_snippets", ["userId"], {
      name: "favorite_titles_user_idx",
    });
    await queryInterface.addIndex(
      "favorite_snippets",
      ["generationHistoryId"],
      { name: "favorite_titles_history_idx" },
    );
    await queryInterface.removeIndex(
      "favorite_snippets",
      "favorite_snippets_user_idx",
    );
    await queryInterface.removeIndex(
      "favorite_snippets",
      "favorite_snippets_history_idx",
    );
    await queryInterface.removeColumn("favorite_snippets", "itemKey");
    await queryInterface.removeColumn("favorite_snippets", "kind");
    await queryInterface.renameTable("favorite_snippets", "favorite_titles");
  },
};
