/** Idempotently creates or repairs the public, non-admin portfolio account. */
const bcrypt = require("bcrypt");
const { Sequelize } = require("sequelize");
const { demoAccount } = require("../src/config/demoAccount");
const { createModels } = require("../src/models");

const PASSWORD_ROUNDS = 12;

/**
 * Converges the reserved demo identity to its documented public credentials.
 * Authentication still goes through the application's regular login handler.
 */
const provisionDemoAccount = async (
  User,
  { hash = bcrypt.hash, compare = bcrypt.compare } = {},
) => {
  const passwordHash = await hash(demoAccount.password, PASSWORD_ROUNDS);
  const ScopedUser = User.scope("withPassword");
  const [user, created] = await ScopedUser.findOrCreate({
    where: { email: demoAccount.email },
    defaults: {
      name: demoAccount.name,
      email: demoAccount.email,
      passwordHash,
      role: demoAccount.role,
    },
  });

  if (created) return { created: true, updated: false };

  const changes = {};
  if (user.name !== demoAccount.name) changes.name = demoAccount.name;
  if (user.role !== demoAccount.role) changes.role = demoAccount.role;
  if (!(await compare(demoAccount.password, user.passwordHash))) {
    changes.passwordHash = passwordHash;
  }

  if (Object.keys(changes).length === 0) {
    return { created: false, updated: false };
  }

  await user.update(changes);
  return { created: false, updated: true };
};

/** Uses the same environment-aware database configuration as migrations. */
const run = async () => {
  const environment = process.env.NODE_ENV || "development";
  const cliConfig = require("../src/config/sequelize-cli.cjs")[environment];
  const sequelize = new Sequelize(
    cliConfig.database,
    cliConfig.username,
    cliConfig.password,
    cliConfig,
  );

  try {
    const { User } = createModels(sequelize);
    const result = await provisionDemoAccount(User);
    const action = result.created
      ? "created"
      : result.updated
        ? "repaired"
        : "already current";
    console.log(`Portfolio demo account ${action}: ${demoAccount.email}`);
  } finally {
    await sequelize.close();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error("Unable to provision the portfolio demo account.", error);
    process.exitCode = 1;
  });
}

module.exports = { PASSWORD_ROUNDS, provisionDemoAccount, run };
