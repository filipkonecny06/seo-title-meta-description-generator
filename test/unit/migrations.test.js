const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const dropCatalogTables = require("../../migrations/202602130009-drop-unused-catalog-tables");
const migrateFavoriteSnippets = require("../../migrations/202602130010-create-favorite-snippet-identity");
const dropRedundantEmailIndex = require("../../migrations/202602130011-drop-redundant-users-email-index");
const useBinarySessionIdentifiers = require("../../migrations/202602130012-use-binary-session-identifiers");

const createQueryInterface = () => {
  const calls = [];
  const record =
    (method) =>
    async (...args) => {
      calls.push({ method, args });
    };
  return {
    calls,
    queryInterface: {
      addColumn: record("addColumn"),
      addIndex: record("addIndex"),
      changeColumn: record("changeColumn"),
      dropTable: record("dropTable"),
      removeColumn: record("removeColumn"),
      removeIndex: record("removeIndex"),
      renameTable: record("renameTable"),
    },
  };
};

const Sequelize = {
  STRING: (length) => ({
    type: "STRING",
    length,
    BINARY: { type: "STRING", length, binary: true },
  }),
};

const indexMutations = (calls) =>
  calls
    .filter(({ method }) => method === "addIndex" || method === "removeIndex")
    .map(({ method, args }) => [method, args[2]?.name ?? args[1]]);

describe("forward migrations", () => {
  it("removes the three unused catalog tables in dependency-safe order", async () => {
    const { calls, queryInterface } = createQueryInterface();
    await dropCatalogTables.up(queryInterface);
    assert.deepEqual(
      calls.map(({ method, args }) => [method, args[0]]),
      [
        ["dropTable", "power_words"],
        ["dropTable", "meta_templates"],
        ["dropTable", "title_templates"],
      ],
    );
  });

  it("renames favorites, preserves legacy rows, and adds idempotent identity", async () => {
    const { calls, queryInterface } = createQueryInterface();
    await migrateFavoriteSnippets.up(queryInterface, Sequelize);

    assert.deepEqual(calls[0], {
      method: "renameTable",
      args: ["favorite_titles", "favorite_snippets"],
    });
    const kindColumn = calls.find(
      ({ method, args }) => method === "addColumn" && args[1] === "kind",
    );
    assert.equal(kindColumn.args[2].allowNull, false);
    assert.equal(kindColumn.args[2].defaultValue, "pair");
    const identityIndex = calls.find(
      ({ method, args }) =>
        method === "addIndex" &&
        args[2]?.name === "favorite_snippets_identity_unique",
    );
    assert.deepEqual(identityIndex.args[1], [
      "userId",
      "generationHistoryId",
      "kind",
      "itemKey",
    ]);
    assert.equal(identityIndex.args[2].unique, true);
  });

  it("creates replacement foreign-key indexes before removing legacy indexes", async () => {
    const { calls, queryInterface } = createQueryInterface();
    await migrateFavoriteSnippets.up(queryInterface, Sequelize);

    assert.deepEqual(indexMutations(calls), [
      ["addIndex", "favorite_snippets_user_idx"],
      ["addIndex", "favorite_snippets_history_idx"],
      ["removeIndex", "favorite_titles_user_idx"],
      ["removeIndex", "favorite_titles_history_idx"],
      ["addIndex", "favorite_snippets_identity_unique"],
    ]);
  });

  it("restores legacy favorite names on rollback", async () => {
    const { calls, queryInterface } = createQueryInterface();
    await migrateFavoriteSnippets.down(queryInterface);

    assert.deepEqual(calls.at(-1), {
      method: "renameTable",
      args: ["favorite_snippets", "favorite_titles"],
    });
    assert.ok(
      calls.some(
        ({ method, args }) =>
          method === "addIndex" && args[2]?.name === "favorite_titles_user_idx",
      ),
    );
  });

  it("restores legacy foreign-key indexes before removing replacements", async () => {
    const { calls, queryInterface } = createQueryInterface();
    await migrateFavoriteSnippets.down(queryInterface);

    assert.deepEqual(indexMutations(calls), [
      ["removeIndex", "favorite_snippets_identity_unique"],
      ["addIndex", "favorite_titles_user_idx"],
      ["addIndex", "favorite_titles_history_idx"],
      ["removeIndex", "favorite_snippets_user_idx"],
      ["removeIndex", "favorite_snippets_history_idx"],
    ]);
  });

  it("keeps one named users email uniqueness constraint", async () => {
    const forward = createQueryInterface();
    await dropRedundantEmailIndex.up(forward.queryInterface);
    assert.deepEqual(forward.calls, [
      { method: "removeIndex", args: ["users", "email"] },
    ]);

    const rollback = createQueryInterface();
    await dropRedundantEmailIndex.down(rollback.queryInterface);
    assert.equal(rollback.calls[0].method, "addIndex");
    assert.equal(rollback.calls[0].args[2].name, "email");
    assert.equal(rollback.calls[0].args[2].unique, true);
  });

  it("uses case-sensitive session identifiers", async () => {
    const forward = createQueryInterface();
    await useBinarySessionIdentifiers.up(forward.queryInterface, Sequelize);
    assert.deepEqual(forward.calls[0], {
      method: "changeColumn",
      args: [
        "sessions",
        "session_id",
        {
          type: { type: "STRING", length: 128, binary: true },
          allowNull: false,
        },
      ],
    });

    const rollback = createQueryInterface();
    await useBinarySessionIdentifiers.down(rollback.queryInterface, Sequelize);
    assert.equal(rollback.calls[0].args[2].type.binary, undefined);
  });
});
