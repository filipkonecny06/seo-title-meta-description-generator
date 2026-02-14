(() => {
  const flash = document.querySelector('[data-flash]');
  if (flash) {
    window.setTimeout(() => {
      flash.classList.add('fade-out');
    }, 3800);
  }

  const stack = document.createElement('div');
  stack.className = 'toast-stack';
  document.body.appendChild(stack);

  window.showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    stack.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 3200);
  };
})();
