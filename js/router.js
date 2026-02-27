class Router {
  constructor() {
    this.currentPage = null;
    this.currentHash = null;
    this.container = null;
    this.onNavigate = null;
    this._onHashChange = this.resolve.bind(this);
  }

  init(container) {
    this.container = container;
    window.addEventListener('hashchange', this._onHashChange);
  }

  parseHash() {
    const raw = window.location.hash.slice(1) || 'home';
    const parts = raw.split('/');
    return {
      page: parts[0],
      sub: parts[1] || null,
      extra: parts[2] || null,
      full: raw,
    };
  }

  async resolve() {
    const route = this.parseHash();
    if (route.full === this.currentHash) return;

    // Exit transition
    if (this.currentPage) {
      this.container.classList.add('page-exit');
      await this.wait(200);
      if (this.currentPage.unmount) this.currentPage.unmount();
    }

    this.container.classList.remove('page-exit');
    this.container.innerHTML = '';
    this.currentHash = route.full;

    // Clear any lingering modals from previous pages
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';

    // Notify app to mount correct page
    if (this.onNavigate) await this.onNavigate(route);

    // Enter transition
    this.container.classList.add('page-enter');
    await this.wait(400);
    this.container.classList.remove('page-enter');
  }

  navigate(path) {
    window.location.hash = '#' + path;
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    window.removeEventListener('hashchange', this._onHashChange);
  }
}

export default new Router();
