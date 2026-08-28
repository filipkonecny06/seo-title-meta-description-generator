const path = require("path");
const dotenv = require("dotenv");
const { parseEnvironmentBoolean } = require("./environmentBoolean");

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const databaseUsesTls = parseEnvironmentBoolean(process.env.DB_SSL, {
  name: "DB_SSL",
  defaultValue: false,
});
const rejectUnauthorized = parseEnvironmentBoolean(
  process.env.DB_SSL_REJECT_UNAUTHORIZED,
  {
    name: "DB_SSL_REJECT_UNAUTHORIZED",
    defaultValue: true,
  },
);

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  dialect: "mysql",
  dialectOptions: databaseUsesTls
    ? { ssl: { require: true, rejectUnauthorized } }
    : undefined,
};

module.exports = {
  development: base,
  test: { ...base },
  production: {
    ...base,
  },
};
