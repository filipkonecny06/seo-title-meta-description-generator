/** Strict parsing for boolean environment variables shared by app and CLI. */
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

/**
 * @param {unknown} value Raw environment value.
 * @param {object} options Name used in errors and an optional missing-value default.
 * @returns {boolean} Parsed boolean value.
 * @throws {TypeError} When the value is missing or outside the accepted vocabulary.
 */
const parseEnvironmentBoolean = (
  value,
  { name = "Boolean environment value", defaultValue } = {},
) => {
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new TypeError(`${name} is required.`);
  }
  if (typeof value === "boolean") return value;
  if (value === 1 || value === 0) return value === 1;

  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  throw new TypeError(
    `${name} must be one of: true, false, 1, 0, yes, no, on, off.`,
  );
};

module.exports = { parseEnvironmentBoolean };
