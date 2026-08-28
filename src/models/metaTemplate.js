const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class MetaTemplate extends Model {}

  MetaTemplate.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      style: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      formula: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      benefitWeight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      urgencyWeight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
    },
    {
      sequelize,
      modelName: "MetaTemplate",
      tableName: "meta_templates",
      indexes: [{ fields: ["style"] }],
    },
  );

  return MetaTemplate;
};
