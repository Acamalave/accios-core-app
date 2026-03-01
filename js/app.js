import { ParticleCanvas } from './components/ParticleCanvas.js';
import { Toast } from './components/Toast.js';
import router from './router.js';
import userAuth from './services/userAuth.js';

// Pages
import { Login } from './pages/Login.js';
import { Home } from './pages/Home.js';
import { SuperAdmin } from './pages/SuperAdmin.js';
import { Onboarding } from './pages/Onboarding.js';
import { Dashboard } from './pages/Dashboard.js';
import { PodcastWorld } from './pages/PodcastWorld.js';
import { Finance } from './pages/Finance.js';
import { ClientPortal } from './pages/ClientPortal.js';
import { LaVainaPresentation } from './pages/LaVainaPresentation.js';
import behaviorService from './services/behaviorService.js';

class App {
  constructor() {
    this.particles = null;
    this.appShell = null;
    this.content = null;
    this.currentUser = null;
  }

  async init() {
    // Start loading bar
    const loadingBar = document.querySelector('.loading-bar-fill');
    if (loadingBar) {
      requestAnimationFrame(() => { loadingBar.style.width = '100%'; });
    }

    // Init particle canvas
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
      this.particles = new ParticleCanvas(canvas);
    }

    await this.wait(1200);

    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.classList.add('hide');

    this.appShell = document.getElementById('app');
    this.content = document.getElementById('page-content');

    if (this.appShell) {
      this.appShell.style.opacity = '1';
      this.appShell.style.transition = 'opacity 0.5s ease';
    }

    // Check session
    const session = userAuth.getSession();
    if (session) {
      this.currentUser = session;
    }

    // Router setup
    router.onNavigate = (route) => this.handleRoute(route);
    router.init(this.content);

    // If not logged in, redirect to login
    if (!this.currentUser) {
      window.location.hash = '#login';
    }

    router.resolve();

    await this.wait(600);
    loadingScreen?.remove();

    // Global toast event listener (used by Finance, ClientPortal, etc.)
    document.addEventListener('toast', (e) => {
      const { message, type } = e.detail || {};
      if (message) Toast.show(message, type || 'info');
    });

    // Register service worker for PWA (skip on native Capacitor — SW is unnecessary there)
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    if ('serviceWorker' in navigator && !isNative) {
      try {
        await navigator.serviceWorker.register('sw.js');
      } catch (e) {
        // SW registration is optional
      }
    }
  }

  async handleRoute(route) {
    const { page } = route;

    // Track every page navigation
    behaviorService.track(page, 'page_navigate', { route: route.full });

    // Auth guard: only login accessible without session
    if (page !== 'login' && !this.currentUser) {
      router.navigate('login');
      return;
    }

    let pageInstance;

    switch (page) {
      case 'login':
        pageInstance = new Login(this.content, (userData) => this._onLogin(userData));
        break;

      case 'home':
        pageInstance = new Home(this.content, this.currentUser);
        break;

      case 'superadmin':
        pageInstance = new SuperAdmin(this.content);
        break;

      case 'onboarding':
        pageInstance = new Onboarding(this.content, this.currentUser, route.sub);
        break;

      case 'podcast':
        pageInstance = new PodcastWorld(this.content, this.currentUser, route.sub);
        break;

      case 'dashboard':
        pageInstance = new Dashboard(this.content, this.currentUser, route.sub, route.extra);
        break;

      case 'finance':
        pageInstance = new Finance(this.content, this.currentUser, route.sub);
        break;

      case 'portal':
        pageInstance = new ClientPortal(this.content, this.currentUser, route.sub);
        break;

      case 'lavaina':
        pageInstance = new LaVainaPresentation(this.content, this.currentUser);
        break;

      default:
        // Default to home
        pageInstance = new Home(this.content, this.currentUser);
        break;
    }

    if (pageInstance) {
      router.currentPage = pageInstance;
      await pageInstance.render();
    }
  }

  _onLogin(userData) {
    this.currentUser = userAuth.getSession();

    // SuperAdmin goes to home (can navigate to admin via shield button)
    router.navigate('home');
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => {
    console.error('[ACCIOS] Init error:', err);
    // Always dismiss loading screen even on error
    const ls = document.getElementById('loading-screen');
    if (ls) { ls.classList.add('hide'); setTimeout(() => ls.remove(), 500); }
    const shell = document.getElementById('app');
    if (shell) { shell.style.opacity = '1'; }
  });
});
