#!/usr/bin/env node
require("dotenv").config();

const { loadCatalog } = require("../src/catalog/catalogSchema");
const { expandCatalogRows } = require("../src/catalog/catalogRows");

const printSummary = (catalog) => {
  const rows = expandCatalogRows(catalog);
  console.log(`Catalog v${catalog.version} is valid.`);
  console.log(`Title templates: ${rows.titleTemplates.length}`);
  console.log(`Meta templates: ${rows.metaTemplates.length}`);
  console.log(`Power words: ${rows.powerWords.length}`);
  return rows;
};

const syncModel = async ({ Model, rows, identity, transaction }) => {
  const result = { created: 0, updated: 0 };
  for (const row of rows) {
    const where = Object.fromEntries(
      identity.map((field) => [field, row[field]]),
    );
    const existing = await Model.findOne({ where, transaction });
    if (existing) {
      const values = { ...row };
      delete values.createdAt;
      await existing.update(values, { transaction });
      result.updated += 1;
    } else {
      await Model.create(row, { transaction });
      result.created += 1;
    }
  }
  return result;
};

const syncCatalog = async (rows) => {
  const { createSequelize } = require("../src/config/database");
  const { loadEnvironment } = require("../src/config/env");
  const { createModels } = require("../src/models");
  const config = loadEnvironment();
  const sequelize = createSequelize(config.database);
  const models = createModels(sequelize);

  try {
    const result = await sequelize.transaction(async (transaction) => ({
      titles: await syncModel({
        Model: models.TitleTemplate,
        rows: rows.titleTemplates,
        identity: ["intent", "style", "formula"],
        transaction,
      }),
      metas: await syncModel({
        Model: models.MetaTemplate,
        rows: rows.metaTemplates,
        identity: ["style", "formula"],
        transaction,
      }),
      powerWords: await syncModel({
        Model: models.PowerWord,
        rows: rows.powerWords,
        identity: ["word"],
        transaction,
      }),
    }));
    console.log(`Catalog synchronized: ${JSON.stringify(result)}`);
  } finally {
    await sequelize.close();
  }
};

const main = async () => {
  const command = process.argv[2] || "validate";
  const dryRun = process.argv.includes("--dry-run");
  const catalog = loadCatalog();
  const rows = printSummary(catalog);
  if (command === "validate" || dryRun) {
    if (dryRun) console.log("Dry run complete; no database rows were changed.");
    return;
  }
  if (command !== "sync")
    throw new Error(`Unknown catalog command: ${command}`);
  await syncCatalog(rows);
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { main, printSummary, syncModel };
