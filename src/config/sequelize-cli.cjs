const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  dialect: "mysql",
  dialectOptions:
    String(process.env.DB_SSL).toLowerCase() === "true"
      ? {
          ssl: {
            require: true,
            rejectUnauthorized:
              String(process.env.DB_SSL_REJECT_UNAUTHORIZED).toLowerCase() !==
              "false",
          },
        }
      : undefined,
};

module.exports = {
  development: base,
  test: {
    ...base,
    database: `${process.env.DB_NAME}_test`,
  },
  production: {
    ...base,
  },
};
