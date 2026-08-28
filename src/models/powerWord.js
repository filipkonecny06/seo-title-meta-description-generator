const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class PowerWord extends Model {}

  PowerWord.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      word: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      category: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      weight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: "PowerWord",
      tableName: "power_words",
      indexes: [{ fields: ["category"] }, { unique: true, fields: ["word"] }],
    },
  );

  return PowerWord;
};
