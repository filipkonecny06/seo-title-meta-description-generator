/** Configures the durable MySQL-backed Express session store. */
const session = require("express-session");
const createMySQLStore = require("express-mysql-session");
const mysql = require("mysql2/promise");
const { buildTlsOptions } = require("./database");

const MySQLStore = createMySQLStore(session);

/** @returns {object} mysql2 pool options derived from database configuration. */
const buildSessionPoolOptions = (config) => ({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.name,
  charset: "utf8mb4_bin",
  waitForConnections: true,
  connectionLimit: config.pool?.max ?? 10,
  maxIdle: config.pool?.max ?? 10,
  idleTimeout: 10000,
  queueLimit: 0,
  ssl: buildTlsOptions(config),
});

/** @returns {object} Store schema, expiry, and cleanup policy. */
const buildSessionStoreOptions = () => ({
  // Migrations own schema changes so application startup never mutates production DDL.
  createDatabaseTable: false,
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 1000 * 60 * 60 * 24 * 7,
  endConnectionOnClose: true,
  schema: {
    tableName: "sessions",
    columnNames: {
      session_id: "session_id",
      expires: "expires",
      data: "data",
    },
  },
});

/**
 * Creates a session store with an injectable pool factory for deterministic tests.
 *
 * @param {object} config Validated database configuration.
 * @returns {object} express-mysql-session store instance.
 */
const createSessionStore = (config, { createPool = mysql.createPool } = {}) => {
  const connectionPool = createPool(buildSessionPoolOptions(config));
  return new MySQLStore(buildSessionStoreOptions(), connectionPool);
};

module.exports = {
  buildSessionPoolOptions,
  buildSessionStoreOptions,
  createSessionStore,
};
