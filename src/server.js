require("dotenv").config();

const { createApp } = require("./app");
const { createSequelize } = require("./config/database");
const { loadEnvironment } = require("./config/env");
const { createSessionStore } = require("./config/sessionStore");
const { createModels } = require("./models");

const startServer = async () => {
  const config = loadEnvironment();
  const sequelize = createSequelize(config.database);
  const models = createModels(sequelize);
  const sessionStore = createSessionStore(config.database);
  const app = createApp({ config, models, sessionStore });

  await sequelize.authenticate();
  const server = app.listen(config.port, () => {
    console.log(`Orbit Snippets listening on ${config.baseUrl}`);
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; shutting down.`);
    server.close(async (serverError) => {
      try {
        await sequelize.close();
      } finally {
        if (serverError) console.error(serverError);
        process.exit(serverError ? 1 : 0);
      }
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  return { app, server, sequelize };
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Unable to start Orbit Snippets.", error);
    process.exit(1);
  });
}

module.exports = { startServer };
