import { db, collection, addDoc } from './firebase.js';
import userAuth from './userAuth.js';

class BehaviorService {
  constructor() {
    this._visitorId = null;
    this._sessionId = null;
  }

  get visitorId() {
    if (!this._visitorId) {
      let id = localStorage.getItem('accios_visitor_id');
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('accios_visitor_id', id);
      }
      this._visitorId = id;
    }
    return this._visitorId;
  }

  get sessionId() {
    if (!this._sessionId) {
      let id = sessionStorage.getItem('accios_session_id');
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem('accios_session_id', id);
      }
      this._sessionId = id;
    }
    return this._sessionId;
  }

  track(page, action, data = {}) {
    const session = userAuth.getSession();
    const doc = {
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      page,
      action,
      data,
      userPhone: session?.phone || null,
      userName: session?.name || null,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.hash,
    };
    addDoc(collection(db, 'behavior_events'), doc).catch(e => {
      console.error('[behavior] write failed:', e);
    });
  }
}

export default new BehaviorService();
