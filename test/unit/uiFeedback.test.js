const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { bootstrapUiFeedback } = require("../../src/public/js/main");
const { FakeElement } = require("../../test-support/browserFixtures");

describe("UI feedback", () => {
  it("manages flash and toast feedback through a named browser controller", () => {
    const timers = [];
    const appended = [];
    const flashClasses = [];
    const flash = {
      classList: { add: (name) => flashClasses.push(name) },
    };
    const document = {
      querySelector: () => flash,
      createElement: () => {
        const element = new FakeElement();
        element.children = [];
        element.appendChild = (child) => element.children.push(child);
        element.remove = () => {
          element.removed = true;
        };
        return element;
      },
      body: {
        appendChild: (element) => appended.push(element),
      },
    };
    const window = {
      setTimeout: (callback, delay) => timers.push({ callback, delay }),
    };

    const controller = bootstrapUiFeedback({
      window,
      document,
      flashDuration: 10,
      toastDuration: 20,
    });
    assert.equal(appended.length, 1);
    assert.equal(appended[0].attributes["aria-live"], "polite");

    timers.find(({ delay }) => delay === 10).callback();
    assert.deepEqual(flashClasses, ["fade-out"]);

    const errorToast = window.showToast("Request failed.", "error");
    assert.equal(errorToast.className, "toast error");
    assert.equal(errorToast.attributes.role, "alert");
    assert.equal(errorToast.textContent, "Request failed.");
    const defaultToast = controller.showToast(42, "unexpected");
    assert.equal(defaultToast.className, "toast info");
    assert.equal(defaultToast.attributes.role, "status");
    assert.equal(defaultToast.textContent, "42");

    timers
      .filter(({ delay }) => delay === 20)
      .forEach(({ callback }) => callback());
    assert.equal(errorToast.removed, true);
    assert.equal(defaultToast.removed, true);
  });
});
