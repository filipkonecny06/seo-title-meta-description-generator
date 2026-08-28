(function attachUiFeedback(root, factory) {
  const exported = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = exported;
    return;
  }
  exported.bootstrapUiFeedback({ window: root, document: root.document });
})(typeof globalThis === "object" ? globalThis : this, () => {
  const TOAST_TYPES = new Set(["info", "success", "warning", "error"]);

  class UiFeedbackController {
    constructor({
      window,
      document,
      flashDuration = 3800,
      toastDuration = 3200,
    }) {
      this.window = window;
      this.document = document;
      this.flashDuration = flashDuration;
      this.toastDuration = toastDuration;
      this.stack = null;
    }

    connect() {
      const flash = this.document.querySelector("[data-flash]");
      if (flash) {
        this.window.setTimeout(
          () => flash.classList.add("fade-out"),
          this.flashDuration,
        );
      }

      this.stack = this.document.createElement("div");
      this.stack.className = "toast-stack";
      this.stack.setAttribute("aria-live", "polite");
      this.stack.setAttribute("aria-atomic", "false");
      this.document.body.appendChild(this.stack);
      this.window.showToast = (message, type) => this.showToast(message, type);
      return this;
    }

    showToast(message, type = "info") {
      const normalizedType = TOAST_TYPES.has(type) ? type : "info";
      const toast = this.document.createElement("div");
      toast.className = `toast ${normalizedType}`;
      toast.setAttribute(
        "role",
        normalizedType === "error" ? "alert" : "status",
      );
      toast.textContent = String(message);
      this.stack.appendChild(toast);
      this.window.setTimeout(() => toast.remove(), this.toastDuration);
      return toast;
    }
  }

  const bootstrapUiFeedback = (platform) =>
    new UiFeedbackController(platform).connect();

  return { UiFeedbackController, bootstrapUiFeedback };
});
