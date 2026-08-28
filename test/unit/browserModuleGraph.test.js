const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");
const vm = require("node:vm");

const browserModulePaths = [
  "generatorUtilities.js",
  "generatorState.js",
  "requestLifecycle.js",
  "generatorRendering.js",
  "generatorApi.js",
  "generatorExport.js",
  "generatorView.js",
  "generatorController.js",
];

describe("generator browser module graph", () => {
  it("attaches every directly served module in documented dependency order", () => {
    const context = vm.createContext({});
    for (const filename of browserModulePaths) {
      const absolutePath = path.resolve(
        __dirname,
        "../../src/public/js",
        filename,
      );
      vm.runInContext(fs.readFileSync(absolutePath, "utf8"), context, {
        filename: absolutePath,
      });
    }

    assert.deepEqual(
      [
        "GeneratorApiClient",
        "GeneratorController",
        "GeneratorState",
        "GeneratorView",
        "RequestLifecycle",
        "SnippetExporter",
        "renderResultCard",
      ].filter(
        (name) => typeof context.OrbitGeneratorModules[name] !== "function",
      ),
      [],
    );
  });
});
