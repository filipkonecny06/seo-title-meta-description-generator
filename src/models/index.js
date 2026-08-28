const createModels = (sequelize) => {
  const User = require("./user")(sequelize);
  const GenerationHistory = require("./generationHistory")(sequelize);
  const FavoriteSnippet = require("./favoriteSnippet")(sequelize);

  User.hasMany(GenerationHistory, { foreignKey: "userId" });
  GenerationHistory.belongsTo(User, { foreignKey: "userId" });
  User.hasMany(FavoriteSnippet, { foreignKey: "userId" });
  FavoriteSnippet.belongsTo(User, { foreignKey: "userId" });
  GenerationHistory.hasMany(FavoriteSnippet, {
    foreignKey: "generationHistoryId",
  });
  FavoriteSnippet.belongsTo(GenerationHistory, {
    foreignKey: "generationHistoryId",
  });

  return {
    sequelize,
    User,
    GenerationHistory,
    FavoriteSnippet,
  };
};

module.exports = { createModels };
