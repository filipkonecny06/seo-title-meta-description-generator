/** Creates Sequelize connection options from validated application config. */
const { Sequelize } = require("sequelize");

/**
 * @param {object} config Database TLS settings.
 * @returns {object|undefined} mysql2 TLS options, or no TLS override.
 */
const buildTlsOptions = (config) =>
  config.ssl
    ? {
        require: true,
        rejectUnauthorized: config.rejectUnauthorized !== false,
      }
    : undefined;

/**
 * Creates the application database pool without connecting immediately.
 *
 * @param {object} config Validated database configuration.
 * @param {object} options Optional Sequelize logging override.
 * @returns {Sequelize} Configured Sequelize instance.
 */
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
