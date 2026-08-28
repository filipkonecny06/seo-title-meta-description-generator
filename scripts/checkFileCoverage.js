#!/usr/bin/env node

/** Enforces risk-based per-file coverage floors in addition to global thresholds. */
const fs = require("node:fs");
const path = require("node:path");

const COVERAGE_FLOORS = Object.freeze({
  "src/controllers/authController.js": Object.freeze({
    lines: 90,
    functions: 95,
    branches: 85,
  }),
  "src/middleware/auth.js": Object.freeze({
    lines: 100,
    functions: 100,
    branches: 100,
  }),
  "src/middleware/errorHandler.js": Object.freeze({
    lines: 95,
    functions: 100,
    branches: 85,
  }),
  "src/middleware/requestLogger.js": Object.freeze({
    lines: 100,
    functions: 100,
    branches: 100,
  }),
  "src/public/js/generator.js": Object.freeze({
    lines: 95,
    functions: 95,
    branches: 60,
  }),
  "src/public/js/generatorApi.js": Object.freeze({
    lines: 95,
    functions: 95,
    branches: 85,
  }),
  "src/public/js/generatorController.js": Object.freeze({
    lines: 90,
    functions: 90,
    branches: 75,
  }),
  "src/public/js/generatorView.js": Object.freeze({
    lines: 95,
    functions: 95,
    branches: 65,
  }),
  "src/public/js/main.js": Object.freeze({
    lines: 95,
    functions: 95,
    branches: 80,
  }),
  "src/services/serpService.js": Object.freeze({
    lines: 95,
    functions: 90,
    branches: 80,
  }),
});

const normalizePath = (filePath) => filePath.split(path.sep).join("/");

/** Finds one coverage record regardless of operating-system path separators. */
const findFileCoverage = (summary, target) =>
  Object.entries(summary).find(([filePath]) =>
    normalizePath(filePath).endsWith(target),
  )?.[1];

/**
 * @param {string} summaryPath c8 JSON summary path.
 * @throws {Error} When a guarded file is missing or below any configured floor.
 */
const checkFileCoverage = (
  summaryPath = path.resolve("coverage/coverage-summary.json"),
) => {
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  for (const [target, floors] of Object.entries(COVERAGE_FLOORS)) {
    const metrics = findFileCoverage(summary, target);
    if (!metrics) {
      throw new Error(`Coverage summary does not contain ${target}.`);
    }

    const failures = Object.entries(floors)
      .filter(([metric, minimum]) => metrics[metric].pct < minimum)
      .map(
        ([metric, minimum]) =>
          `${metric} coverage is ${metrics[metric].pct}% (minimum ${minimum}%)`,
      );
    if (failures.length) {
      throw new Error(
        `${target} failed its coverage floor:\n- ${failures.join("\n- ")}`,
      );
    }

    process.stdout.write(
      `${target} coverage passed (${Object.keys(floors)
        .map((metric) => `${metric} ${metrics[metric].pct}%`)
        .join(", ")}).\n`,
    );
  }
};

if (require.main === module) checkFileCoverage();

module.exports = {
  COVERAGE_FLOORS,
  checkFileCoverage,
  findFileCoverage,
  normalizePath,
};
