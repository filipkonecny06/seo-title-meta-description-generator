const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class TitleTemplate extends Model {}

  TitleTemplate.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      intent: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      style: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      formula: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      powerWordBoostScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'TitleTemplate',
      tableName: 'title_templates',
      indexes: [
        { fields: ['intent'] },
        { fields: ['style'] },
      ],
    }
  );

  return TitleTemplate;
};
