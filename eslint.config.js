/** Shared lint policy with browser globals limited to files shipped to clients. */
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["coverage/", "node_modules/"] },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Server modules must not accidentally depend on DOM or browser-only globals.
    files: ["src/public/**/*.js"],
    languageOptions: { globals: { ...globals.browser } },
  },
];
