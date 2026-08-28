const session = require("express-session");
const createMySQLStore = require("express-mysql-session");
const mysql = require("mysql2/promise");
const { buildTlsOptions } = require("./database");

const MySQLStore = createMySQLStore(session);

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

const buildSessionStoreOptions = () => ({
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

const createSessionStore = (config, { createPool = mysql.createPool } = {}) => {
  const connectionPool = createPool(buildSessionPoolOptions(config));
  return new MySQLStore(buildSessionStoreOptions(), connectionPool);
};

module.exports = {
  buildSessionPoolOptions,
  buildSessionStoreOptions,
  createSessionStore,
};
