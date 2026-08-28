const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class FavoriteTitle extends Model {}

  FavoriteTitle.init(
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
        defaultValue: "Weak",
      },
    },
    {
      sequelize,
      modelName: "FavoriteTitle",
      tableName: "favorite_titles",
      indexes: [{ fields: ["userId"] }, { fields: ["generationHistoryId"] }],
    },
  );

  return FavoriteTitle;
};
