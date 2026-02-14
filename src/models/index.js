const sequelize = require('../config/database');

const User = require('./user')(sequelize);
const TitleTemplate = require('./titleTemplate')(sequelize);
const MetaTemplate = require('./metaTemplate')(sequelize);
const PowerWord = require('./powerWord')(sequelize);
const GenerationHistory = require('./generationHistory')(sequelize);
const FavoriteTitle = require('./favoriteTitle')(sequelize);

User.hasMany(GenerationHistory, { foreignKey: 'userId' });
GenerationHistory.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(FavoriteTitle, { foreignKey: 'userId' });
FavoriteTitle.belongsTo(User, { foreignKey: 'userId' });

GenerationHistory.hasMany(FavoriteTitle, { foreignKey: 'generationHistoryId' });
FavoriteTitle.belongsTo(GenerationHistory, { foreignKey: 'generationHistoryId' });

module.exports = {
  sequelize,
  User,
  TitleTemplate,
  MetaTemplate,
  PowerWord,
  GenerationHistory,
  FavoriteTitle,
};
