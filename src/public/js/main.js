(() => {
  const flash = document.querySelector("[data-flash]");
  if (flash) {
    window.setTimeout(() => {
      flash.classList.add("fade-out");
    }, 3800);
  }

  const stack = document.createElement("div");
  stack.className = "toast-stack";
  stack.setAttribute("aria-live", "polite");
  stack.setAttribute("aria-atomic", "false");
  document.body.appendChild(stack);

  window.showToast = (message, type = "info") => {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;
    stack.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 3200);
  };
})();
