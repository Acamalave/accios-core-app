/**
 * Live Session Service — Real-time user presence tracking
 *
 * Each user writes their current state to Firestore `live_sessions/{phone}`
 * SuperAdmin subscribes to the collection to see all active users in real-time.
 *
 * Tracked: current page, last action, device, online status, timestamps
 * Heartbeat every 15s to detect disconnections (stale > 60s = offline)
 */

import { db, doc, setDoc, onSnapshot, collection, Timestamp } from './firebase.js';
import userAuth from './userAuth.js';

const HEARTBEAT_MS = 15_000;     // Pulse every 15s
const STALE_THRESHOLD = 60_000;  // Offline if no pulse for 60s

const PAGE_LABELS = {
  home: 'Inicio',
  login: 'Login',
  superadmin: 'Super Admin',
  dashboard: 'Dashboard',
  finance: 'Finanzas',
  collaborators: 'Panel de Equipo',
  'command-center': 'Command Center',
  'biz-dashboard': 'Ecosistema Negocios',
  onboarding: 'Onboarding',
  podcast: 'Podcast World',
  portal: 'Portal de Clientes',
  lavaina: 'La Vaina',
  linatour: 'Lina Tour',
};

class LiveSessionService {
  constructor() {
    this._heartbeatTimer = null;
    this._currentPage = null;
    this._currentAction = null;
    this._sessionStart = Date.now();
    this._actionLog = [];       // Last 30 actions (kept in-memory for live feed)
    this._isTracking = false;
  }

  /* ── Start tracking (called once on app boot) ──────────── */
  start() {
    const session = userAuth.getSession();
    if (!session?.phone) return;

    // Don't double-start
    if (this._isTracking) return;
    this._isTracking = true;

    // Initial presence write
    this._writePresence(session);

    // Heartbeat
    this._heartbeatTimer = setInterval(() => {
      this._writePresence(session);
    }, HEARTBEAT_MS);

    // Visibility change — mark online/offline
    this._visHandler = () => {
      if (document.visibilityState === 'visible') {
        this._writePresence(session);
      } else {
        this._writePresence(session, { status: 'background' });
      }
    };
    document.addEventListener('visibilitychange', this._visHandler);

    // Before unload — mark offline
    this._unloadHandler = () => {
      this._writePresence(session, { status: 'offline' });
    };
    window.addEventListener('beforeunload', this._unloadHandler);
  }

  /* ── Track a page navigation ──────────────────────────── */
  trackPage(page, detail = '') {
    this._currentPage = page;
    this._currentAction = `Navigated to ${PAGE_LABELS[page] || page}`;

    const entry = {
      type: 'navigate',
      page,
      label: PAGE_LABELS[page] || page,
      detail,
      ts: Date.now(),
    };
    this._actionLog.push(entry);
    if (this._actionLog.length > 30) this._actionLog.shift();

    // Immediate write on navigation
    const session = userAuth.getSession();
    if (session?.phone) this._writePresence(session);
  }

  /* ── Track a user interaction ─────────────────────────── */
  trackAction(action, detail = '') {
    this._currentAction = action;

    const entry = {
      type: 'action',
      page: this._currentPage,
      label: action,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      ts: Date.now(),
    };
    this._actionLog.push(entry);
    if (this._actionLog.length > 30) this._actionLog.shift();
  }

  /* ── Write presence document ──────────────────────────── */
  _writePresence(session, overrides = {}) {
    const phone = session.phone;
    if (!phone) return;

    const isMobile = /iPhone|iPad|Android|webOS/i.test(navigator.userAgent);
    const deviceLabel = isMobile
      ? ((/iPhone|iPad/i.test(navigator.userAgent)) ? 'iOS' : 'Android')
      : 'Desktop';

    const data = {
      phone,
      name: session.name || phone,
      role: session.role || 'user',
      currentPage: this._currentPage || 'unknown',
      currentPageLabel: PAGE_LABELS[this._currentPage] || this._currentPage || '—',
      lastAction: this._currentAction || '',
      actionLog: this._actionLog.slice(-10),  // Last 10 for Firestore (keep doc small)
      device: deviceLabel,
      userAgent: navigator.userAgent,
      status: 'online',
      sessionStart: this._sessionStart,
      lastPulse: Date.now(),
      updatedAt: Timestamp.now(),
      ...overrides,
    };

    setDoc(doc(db, 'live_sessions', phone), data, { merge: true }).catch(() => {
      // Silent fail — presence is non-critical
    });
  }

  /* ── Subscribe to all live sessions (superadmin viewer) ── */
  subscribe(callback) {
    return onSnapshot(collection(db, 'live_sessions'), (snap) => {
      const sessions = [];
      const now = Date.now();
      snap.forEach(d => {
        const data = d.data();
        // Determine if session is stale
        const lastPulse = data.lastPulse || 0;
        const isStale = (now - lastPulse) > STALE_THRESHOLD;
        const effectiveStatus = isStale ? 'offline' : (data.status || 'online');

        sessions.push({
          id: d.id,
          ...data,
          effectiveStatus,
          isStale,
          msSinceLastPulse: now - lastPulse,
        });
      });

      // Sort: online first, then by lastPulse desc
      sessions.sort((a, b) => {
        if (a.effectiveStatus === 'online' && b.effectiveStatus !== 'online') return -1;
        if (b.effectiveStatus === 'online' && a.effectiveStatus !== 'online') return 1;
        return (b.lastPulse || 0) - (a.lastPulse || 0);
      });

      callback(sessions);
    });
  }

  /* ── Stop tracking ─────────────────────────────────────── */
  stop() {
    this._isTracking = false;
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
    if (this._visHandler) document.removeEventListener('visibilitychange', this._visHandler);
    if (this._unloadHandler) window.removeEventListener('beforeunload', this._unloadHandler);
  }
}

export default new LiveSessionService();
