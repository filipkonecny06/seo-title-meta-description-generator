/** Defines user-owned favorites, including legacy pairs and per-item snippets. */
const { DataTypes, Model } = require("sequelize");

/** @returns {typeof Model} FavoriteSnippet model bound to the supplied connection. */
module.exports = (sequelize) => {
  class FavoriteSnippet extends Model {}

  FavoriteSnippet.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      generationHistoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      kind: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "pair",
        validate: {
          isIn: [["pair", "title", "meta"]],
        },
      },
      itemKey: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      meta: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      optimizationScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
      },
      badge: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: "Review",
      },
    },
    {
      sequelize,
      modelName: "FavoriteSnippet",
      tableName: "favorite_snippets",
      indexes: [
        { fields: ["userId"], name: "favorite_snippets_user_idx" },
        {
          fields: ["generationHistoryId"],
          name: "favorite_snippets_history_idx",
        },
        {
          fields: ["userId", "generationHistoryId", "kind", "itemKey"],
          unique: true,
          name: "favorite_snippets_identity_unique",
        },
      ],
      validate: {
        // Legacy pairs may omit an item key; per-item rows identify their source candidate.
        itemKeyRequiredForSnippet() {
          if (this.kind !== "pair" && !this.itemKey) {
            throw new Error("A title or meta favorite requires an item key.");
          }
        },
      },
    },
  );

  return FavoriteSnippet;
};
