const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class GenerationHistory extends Model {}

  GenerationHistory.init(
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
      primaryKeyword: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      config: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      titles: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      metas: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      selectedTitle: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      selectedMeta: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "GenerationHistory",
      tableName: "generation_histories",
      indexes: [{ fields: ["userId"] }, { fields: ["createdAt"] }],
    },
  );

  return GenerationHistory;
};
