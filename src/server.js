/**
 * Process entry point: validates infrastructure, starts HTTP service, and
 * coordinates bounded graceful shutdown.
 */
require("dotenv").config({ quiet: true });

const { createApp } = require("./app");
const { createSequelize } = require("./config/database");
const { loadEnvironment } = require("./config/env");
const { createSessionStore } = require("./config/sessionStore");
const { createModels } = require("./models");

/**
 * Starts the application only after both persistence layers are reachable.
 *
 * @returns {Promise<object>} Live application resources, primarily for tests
 * and embedding.
 */
const startServer = async () => {
  const config = loadEnvironment();
  const sequelize = createSequelize(config.database);
  const models = createModels(sequelize);
  const sessionStore = createSessionStore(config.database);
  const app = createApp({ config, models, sessionStore });

  try {
    await sessionStore.onReady();
    await sequelize.authenticate();
  } catch (error) {
    await Promise.allSettled([sessionStore.close(), sequelize.close()]);
    throw error;
  }
  const server = app.listen(config.port, () => {
    console.log(`Orbit Snippets listening on ${config.baseUrl}`);
  });

  let shuttingDown = false;
  // Signals may arrive more than once; only one shutdown sequence may own cleanup.
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; shutting down.`);
    const closeServer = new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    // A forced deadline prevents an unhealthy dependency from hanging deployment.
    setTimeout(() => process.exit(1), 10000).unref();
    let exitCode = 0;
    try {
      await closeServer;
    } catch (error) {
      console.error(error);
      exitCode = 1;
    }

    const closeResults = await Promise.allSettled([
      sessionStore.close(),
      sequelize.close(),
    ]);
    for (const result of closeResults) {
      if (result.status === "rejected") {
        console.error(result.reason);
        exitCode = 1;
      }
    }
    process.exit(exitCode);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  return { app, server, sequelize, sessionStore };
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Unable to start Orbit Snippets.", error);
    process.exit(1);
  });
}

module.exports = { startServer };
