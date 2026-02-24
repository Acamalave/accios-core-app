export class Toast {
  static show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  static success(msg) { Toast.show(msg, 'success'); }
  static error(msg) { Toast.show(msg, 'error'); }
  static warning(msg) { Toast.show(msg, 'warning'); }
  static info(msg) { Toast.show(msg, 'info'); }
}
