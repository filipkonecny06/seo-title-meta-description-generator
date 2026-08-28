const bcrypt = require("bcrypt");
const { DataTypes, Model } = require("sequelize");

/** Defines accounts while keeping password hashes out of ordinary queries. */
module.exports = (sequelize) => {
  class User extends Model {
    /** Compares a submitted password to this explicitly loaded password hash. */
    async validatePassword(password) {
      return bcrypt.compare(password, this.passwordHash);
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(180),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "user",
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      // Credentials require the explicit `withPassword` scope at authentication boundaries.
      defaultScope: {
        attributes: { exclude: ["passwordHash"] },
      },
      scopes: {
        withPassword: {
          attributes: [
            "id",
            "name",
            "email",
            "passwordHash",
            "role",
            "createdAt",
            "updatedAt",
          ],
        },
      },
    },
  );

  return User;
};
