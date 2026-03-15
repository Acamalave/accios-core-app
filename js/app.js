import { Toast } from './components/Toast.js';
import router from './router.js';
import userAuth from './services/userAuth.js';
import notificationSystem from './components/NotificationSystem.js?v=132';
import behaviorService from './services/behaviorService.js';
import liveSessionService from './services/liveSessionService.js';

class App {
  constructor() {
    this.particles = null;
    this.appShell = null;
    this.content = null;
    this.currentUser = null;
  }

  async init() {
    // DON'T init ParticleCanvas yet — it's invisible behind loading screen (z-index 10000)
    // We'll start it after the loading screen fades out

    // Let the Apple-style reveal animation play (visuals finish by ~1.3s)
    await this.wait(1400);

    // Start fading loading screen CONTENT (background stays solid — no crossfade bleed)
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.classList.add('hide');

    this.appShell = document.getElementById('app');
    this.content = document.getElementById('page-content');

    // DON'T show app yet — it stays at opacity: 0 until loading screen is fully removed
    // This prevents the flash of "ACCIOS CORE" bleeding through the fading loading screen

    // Init ParticleCanvas while content fades (runs in parallel)
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
      const { ParticleCanvas } = await import('./components/ParticleCanvas.js');
      this.particles = new ParticleCanvas(canvas);
    }

    // Check session
    const session = userAuth.getSession();
    if (session) {
      this.currentUser = session;
      notificationSystem.init(this.currentUser);
      liveSessionService.start();

      // Background: re-check role from Firestore (fixes stale sessions)
      if (session.phone) {
        userAuth.lookupPhone(session.phone).then(result => {
          if (result.exists && result.data.role !== session.role) {
            userAuth.saveSession(result.data);
            this.currentUser = userAuth.getSession();
            // If role changed to collaborator, redirect now
            if (result.data.role === 'collaborator' && window.location.hash !== '#collaborators') {
              window.location.hash = '#collaborators';
            }
          }
        }).catch(() => {});
      }
    }

    // Listen for logout to destroy notification system and live tracking
    document.addEventListener('accios-logout', () => {
      notificationSystem.destroy();
      liveSessionService.stop();
    });

    // Router setup
    router.onNavigate = (route) => this.handleRoute(route);
    router.init(this.content);

    // Redirect based on auth state
    if (!this.currentUser) {
      window.location.hash = '#login';
    } else if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#login') {
      // Authenticated user stuck on login hash → send to home
      window.location.hash = '#home';
    }

    router.resolve();

    // Clean handoff: remove loading screen THEN reveal app (no crossfade = no bleed-through)
    // Loading content fades in 0.45s → wait 500ms → clean cut → app fades in
    setTimeout(() => {
      loadingScreen?.remove();
      if (this.appShell) {
        this.appShell.style.transition = 'opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
        this.appShell.style.opacity = '1';
      }
    }, 500);

    // Global toast event listener (used by Finance, ClientPortal, etc.)
    document.addEventListener('toast', (e) => {
      const { message, type } = e.detail || {};
      if (message) Toast.show(message, type || 'info');
    });

    // Register service worker for PWA (skip on native Capacitor)
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    if ('serviceWorker' in navigator && !isNative) {
      try {
        const reg = await navigator.serviceWorker.register('sw.js');
        let reloading = false;

        const doReload = () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        };

        // SW tells us it updated → reload once
        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e.data?.type === 'SW_UPDATED') doReload();
        });

        // New SW activated → reload once
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'activated' && navigator.serviceWorker.controller) doReload();
          });
        });

        // Check for SW updates on launch + every 60s + on resume
        reg.update().catch(() => {});
        this._swUpdateInterval = setInterval(() => reg.update().catch(() => {}), 60000);
        this._swVisHandler = () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        };
        document.addEventListener('visibilitychange', this._swVisHandler);
      } catch (e) {
        // SW registration is optional
      }
    }
  }

  async handleRoute(route) {
    const { page } = route;

    // Track every page navigation
    behaviorService.track(page, 'page_navigate', { route: route.full });
    liveSessionService.trackPage(page, route.sub || '');

    // Auth guard: only login accessible without session
    if (page !== 'login' && !this.currentUser) {
      router.navigate('login');
      return;
    }

    let pageInstance;

    switch (page) {
      case 'login': {
        const { Login } = await import('./pages/Login.js');
        pageInstance = new Login(this.content, (userData) => this._onLogin(userData));
        break;
      }

      case 'home': {
        const { Home } = await import('./pages/Home.js?v=132');
        pageInstance = new Home(this.content, this.currentUser);
        break;
      }

      case 'superadmin': {
        const { SuperAdmin } = await import('./pages/SuperAdmin.js');
        pageInstance = new SuperAdmin(this.content);
        break;
      }

      case 'onboarding': {
        const { Onboarding } = await import('./pages/Onboarding.js');
        pageInstance = new Onboarding(this.content, this.currentUser, route.sub);
        break;
      }

      case 'podcast': {
        const { PodcastWorld } = await import('./pages/PodcastWorld.js');
        pageInstance = new PodcastWorld(this.content, this.currentUser, route.sub);
        break;
      }

      case 'dashboard': {
        const { Dashboard } = await import('./pages/Dashboard.js');
        pageInstance = new Dashboard(this.content, this.currentUser, route.sub, route.extra);
        break;
      }

      case 'finance': {
        const { Finance } = await import('./pages/Finance.js');
        pageInstance = new Finance(this.content, this.currentUser, route.sub);
        break;
      }

      case 'portal': {
        const { ClientPortal } = await import('./pages/ClientPortal.js');
        pageInstance = new ClientPortal(this.content, this.currentUser, route.sub);
        break;
      }

      case 'lavaina': {
        const { LaVainaPresentation } = await import('./pages/LaVainaPresentation.js');
        pageInstance = new LaVainaPresentation(this.content, this.currentUser);
        break;
      }

      case 'linatour': {
        const { LinaTourSlides } = await import('./pages/LinaTourSlides.js');
        pageInstance = new LinaTourSlides(this.content, this.currentUser);
        break;
      }

      case 'collaborators': {
        const { CollaboratorPanel } = await import('./pages/CollaboratorPanel.js?v=132');
        pageInstance = new CollaboratorPanel(this.content, this.currentUser, route.sub);
        break;
      }

      case 'command-center': {
        const { CommandCenter } = await import('./pages/CommandCenter.js?v=132');
        pageInstance = new CommandCenter(this.content, this.currentUser, route.sub);
        break;
      }

      case 'biz-dashboard': {
        const { BusinessDashboard } = await import('./pages/BusinessDashboard.js?v=132');
        pageInstance = new BusinessDashboard(this.content, this.currentUser, route.sub);
        break;
      }

      default: {
        const { Home } = await import('./pages/Home.js?v=132');
        pageInstance = new Home(this.content, this.currentUser);
        break;
      }
    }

    if (pageInstance) {
      router.currentPage = pageInstance;
      await pageInstance.render();
    }
  }

  _onLogin(userData) {
    this.currentUser = userAuth.getSession();

    // Init notification system for the logged-in user
    notificationSystem.init(this.currentUser);

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
