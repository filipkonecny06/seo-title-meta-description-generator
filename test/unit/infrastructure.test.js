const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");
const bcrypt = require("bcrypt");
const {
  buildTlsOptions,
  createSequelize,
} = require("../../src/config/database");
const {
  buildSessionPoolOptions,
  buildSessionStoreOptions,
  createSessionStore,
} = require("../../src/config/sessionStore");
const { createModels } = require("../../src/models");

const databaseConfig = {
  host: "database.internal",
  port: 3307,
  name: "seo_snippets",
  user: "app_user",
  password: "database-password",
  ssl: true,
  rejectUnauthorized: false,
  pool: { max: 14, min: 2 },
};

describe("database infrastructure", () => {
  it("keeps secrets and local artifacts out of container build contexts", () => {
    const repositoryRoot = path.resolve(__dirname, "../..");
    const ignored = new Set(
      fs
        .readFileSync(path.join(repositoryRoot, ".dockerignore"), "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    );
    for (const pattern of [
      ".git",
      ".github",
      ".env",
      ".env.*",
      "!.env.example",
      ".envrc",
      ".idea",
      ".vscode",
      "node_modules",
      "coverage",
      ".nyc_output",
      "test",
      "test-support",
      "*.log",
      "*.tmp",
      "*.local",
      "*.pem",
      "*.key",
    ]) {
      assert.ok(ignored.has(pattern), `Missing .dockerignore rule: ${pattern}`);
    }
  });

  it("shares the exact TLS policy between Sequelize and the session pool", () => {
    const tls = buildTlsOptions(databaseConfig);
    assert.deepEqual(tls, { require: true, rejectUnauthorized: false });
    assert.equal(buildTlsOptions({ ssl: false }), undefined);

    const sequelize = createSequelize(databaseConfig);
    const sessionPool = buildSessionPoolOptions(databaseConfig);
    assert.deepEqual(sequelize.options.dialectOptions.ssl, tls);
    assert.deepEqual(sessionPool.ssl, tls);
    assert.equal(sessionPool.connectionLimit, 14);
    assert.equal(sessionPool.host, databaseConfig.host);
    assert.equal(sessionPool.port, databaseConfig.port);
  });

  it("owns and closes the injected session connection pool", async () => {
    let receivedOptions;
    let closeCount = 0;
    const pool = {
      end: async () => {
        closeCount += 1;
      },
    };
    const store = createSessionStore(databaseConfig, {
      createPool: (options) => {
        receivedOptions = options;
        return pool;
      },
    });

    await store.onReady();
    assert.deepEqual(receivedOptions, buildSessionPoolOptions(databaseConfig));
    assert.equal(buildSessionStoreOptions().endConnectionOnClose, true);
    assert.equal(store.options.createDatabaseTable, false);
    await store.close();
    assert.equal(closeCount, 1);
    assert.equal(store.state, "CLOSED");
  });

  it("registers only runtime models and enforces favorite identity metadata", async () => {
    const sequelize = createSequelize({
      ...databaseConfig,
      ssl: false,
    });
    const models = createModels(sequelize);

    assert.deepEqual(Object.keys(models).sort(), [
      "FavoriteSnippet",
      "GenerationHistory",
      "User",
      "sequelize",
    ]);
    assert.equal(models.FavoriteSnippet.tableName, "favorite_snippets");
    assert.equal(
      models.FavoriteSnippet.options.indexes.find(
        (index) => index.name === "favorite_snippets_identity_unique",
      ).unique,
      true,
    );
    assert.ok(models.User.associations.FavoriteSnippets);
    assert.ok(models.GenerationHistory.associations.FavoriteSnippets);
    assert.deepEqual(models.User._scope.attributes.exclude, ["passwordHash"]);
    assert.ok(
      models.User.scope("withPassword")._scope.attributes.includes(
        "passwordHash",
      ),
    );
    assert.equal(models.User.options.indexes.length, 0);

    const invalidFavorite = models.FavoriteSnippet.build({
      userId: 1,
      kind: "unsupported",
      title: "A title",
      optimizationScore: 101,
    });
    await assert.rejects(() => invalidFavorite.validate());
    const missingItemKey = models.FavoriteSnippet.build({
      userId: 1,
      kind: "title",
      title: "A title",
      optimizationScore: 50,
    });
    await assert.rejects(
      () => missingItemKey.validate(),
      /requires an item key/,
    );

    const passwordHash = await bcrypt.hash("correct horse battery staple", 4);
    const user = models.User.build({
      name: "Test User",
      email: "test@example.com",
      passwordHash,
    });
    assert.equal(
      await user.validatePassword("correct horse battery staple"),
      true,
    );
    assert.equal(await user.validatePassword("incorrect"), false);
    await sequelize.close();
  });
});
