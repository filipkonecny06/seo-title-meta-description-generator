const { Sequelize } = require("sequelize");

const buildTlsOptions = (config) =>
  config.ssl
    ? {
        require: true,
        rejectUnauthorized: config.rejectUnauthorized !== false,
      }
    : undefined;

const createSequelize = (config, { logging = false } = {}) =>
  new Sequelize(config.name, config.user, config.password, {
    host: config.host,
    port: config.port,
    dialect: "mysql",
    logging,
    pool: {
      max: config.pool?.max ?? 10,
      min: config.pool?.min ?? 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: config.ssl ? { ssl: buildTlsOptions(config) } : undefined,
  });

module.exports = { buildTlsOptions, createSequelize };
