const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { RequestLifecycle } = require("../../src/public/js/requestLifecycle");

describe("RequestLifecycle", () => {
  it("owns cancellation, sequence invalidation, and current-request settlement", () => {
    const controllers = [];
    const lifecycle = new RequestLifecycle(() => {
      const controller = {
        signal: {},
        aborted: false,
        abort() {
          this.aborted = true;
        },
      };
      controllers.push(controller);
      return controller;
    });

    const first = lifecycle.begin();
    assert.equal(lifecycle.pending, true);
    assert.equal(lifecycle.isCurrent(first.sequence), true);
    lifecycle.invalidate();
    assert.equal(controllers[0].aborted, true);
    assert.equal(lifecycle.isCurrent(first.sequence), false);
    assert.equal(lifecycle.settle(first.sequence), false);

    const second = lifecycle.begin();
    assert.equal(lifecycle.settle(second.sequence), true);
    assert.equal(lifecycle.pending, false);
  });
});
