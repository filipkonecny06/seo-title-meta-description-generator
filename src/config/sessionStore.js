const session = require("express-session");
const createMySQLStore = require("express-mysql-session");

const MySQLStore = createMySQLStore(session);

const createSessionStore = (config) =>
  new MySQLStore({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.name,
    createDatabaseTable: false,
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 1000 * 60 * 60 * 24 * 7,
    schema: {
      tableName: "sessions",
      columnNames: {
        session_id: "session_id",
        expires: "expires",
        data: "data",
      },
    },
  });

module.exports = { createSessionStore };
