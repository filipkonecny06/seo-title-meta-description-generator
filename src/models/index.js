/** Creates the model registry and declares all persistence relationships. */
const createModels = (sequelize) => {
  const User = require("./user")(sequelize);
  const GenerationHistory = require("./generationHistory")(sequelize);
  const FavoriteSnippet = require("./favoriteSnippet")(sequelize);

  // Associations mirror migration foreign keys; request-layer filters enforce ownership.
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
