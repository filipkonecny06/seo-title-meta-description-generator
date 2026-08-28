/** Encapsulates cancellation and stale-response checks for one request stream. */
(function attachRequestLifecycle(root, factory) {
  const exported = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = exported;
    return;
  }
  root.OrbitGeneratorModules = {
    ...(root.OrbitGeneratorModules || {}),
    ...exported,
  };
})(typeof globalThis === "object" ? globalThis : this, () => {
  class RequestLifecycle {
    constructor(createAbortController) {
      this.createAbortController = createAbortController;
      this.controller = null;
      this.sequence = 0;
      this.pending = false;
    }

    /** Invalidates the current sequence even when cancellation races completion. */
    invalidate() {
      this.controller?.abort();
      this.controller = null;
      this.pending = false;
      this.sequence += 1;
    }

    /** @returns {{sequence: number, signal: AbortSignal|object}} */
    begin() {
      this.controller = this.createAbortController();
      this.pending = true;
      return { sequence: this.sequence, signal: this.controller.signal };
    }

    isCurrent(sequence) {
      return sequence === this.sequence;
    }

    /** Clears pending state only when the completing request still owns it. */
    settle(sequence) {
      if (!this.isCurrent(sequence)) return false;
      this.controller = null;
      this.pending = false;
      return true;
    }
  }

  return { RequestLifecycle };
});
