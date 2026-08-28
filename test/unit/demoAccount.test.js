const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { demoAccount } = require("../../src/config/demoAccount");
const {
  PASSWORD_ROUNDS,
  provisionDemoAccount,
} = require("../../scripts/provisionDemoAccount");
const { registerSchema } = require("../../src/validation/schemas");

const createUserDouble = (existingUser = null) => {
  const calls = { defaults: null, scope: null };
  const User = {
    scope: (scope) => {
      calls.scope = scope;
      return {
        findOrCreate: async ({ where, defaults }) => {
          assert.deepEqual(where, { email: demoAccount.email });
          calls.defaults = defaults;
          if (existingUser) return [existingUser, false];
          return [{ ...defaults }, true];
        },
      };
    },
  };
  return { User, calls };
};

describe("portfolio demo account provisioning", () => {
  it("uses valid documented credentials and creates an ordinary user", async () => {
    assert.equal(
      registerSchema.safeParse({
        name: demoAccount.name,
        email: demoAccount.email,
        password: demoAccount.password,
      }).success,
      true,
    );

    const { User, calls } = createUserDouble();
    const result = await provisionDemoAccount(User, {
      hash: async (password, rounds) => {
        assert.equal(password, demoAccount.password);
        assert.equal(rounds, PASSWORD_ROUNDS);
        return "expected-password-hash";
      },
      compare: async () => assert.fail("new accounts do not need comparison"),
    });

    assert.deepEqual(result, { created: true, updated: false });
    assert.equal(calls.scope, "withPassword");
    assert.deepEqual(calls.defaults, {
      name: "Portfolio Demo",
      email: "demo@example.com",
      passwordHash: "expected-password-hash",
      role: "user",
    });
  });

  it("leaves a current account untouched when setup is repeated", async () => {
    const existingUser = {
      name: demoAccount.name,
      role: "user",
      passwordHash: "current-password-hash",
      update: async (changes) => assert.fail(`unexpected update: ${changes}`),
    };
    const { User } = createUserDouble(existingUser);

    const result = await provisionDemoAccount(User, {
      hash: async () => "new-random-hash",
      compare: async (password, hash) => {
        assert.equal(password, demoAccount.password);
        assert.equal(hash, existingUser.passwordHash);
        return true;
      },
    });

    assert.deepEqual(result, { created: false, updated: false });
  });

  it("repairs changed credentials and removes elevated roles", async () => {
    let appliedChanges;
    const existingUser = {
      name: "Changed Demo",
      role: "admin",
      passwordHash: "changed-password-hash",
      update: async (changes) => {
        appliedChanges = changes;
      },
    };
    const { User } = createUserDouble(existingUser);

    const result = await provisionDemoAccount(User, {
      hash: async () => "expected-password-hash",
      compare: async () => false,
    });

    assert.deepEqual(result, { created: false, updated: true });
    assert.deepEqual(appliedChanges, {
      name: "Portfolio Demo",
      role: "user",
      passwordHash: "expected-password-hash",
    });
  });
});
