/* ─────────────────────────────────────────────────────
 *  NOTIFICATION SYSTEM — Global Singleton
 *  Bidirectional: SuperAdmin ↔ Clients
 *  Floating bell + slide-out panel + client popup
 *  Real-time chat + WebRTC video calls
 * ───────────────────────────────────────────────────── */

import {
  db, collection, doc, addDoc, updateDoc, getDoc, getDocs, setDoc, deleteDoc, writeBatch,
  query, where, orderBy, onSnapshot, limit, messaging, getToken as getFCMToken
} from '../services/firebase.js';
import userAuth from '../services/userAuth.js';
import { Toast } from './Toast.js';
import { apiUrl } from '../services/apiConfig.js';

/* ── Business branding map ── */
const BIZ_BRANDING = {
  'ml-parts':   { name: 'ML Parts',   color: '#39FF14', photo: 'assets/images/Negocios Estephano/Ml Parts.001.jpeg' },
  'megalift':   { name: 'Megalift',   color: '#f97316', photo: 'assets/images/Negocios Estephano/Megalift.jpg' },
  'uniparts':   { name: 'Uniparts',   color: '#8B5CF6', photo: 'assets/images/Negocios Estephano/Uniparts.png' },
  'grupo-rca':  { name: 'Grupo RCA',  color: '#f97316', photo: 'assets/images/Negocios Estephano/Grupo RCA.png' },
  'parmonca':   { name: 'Parmonca',   color: '#f97316', photo: 'assets/images/Negocios Estephano/Parmonca.jpg' },
  'accios-core':{ name: 'ACCIOS CORE',color: '#7C3AED', photo: 'assets/images/Accios.001.png' },
};

const ICONS = {
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
  inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>`,
  video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  videoOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  micOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  phoneEnd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
};

/* ── WebRTC config (free Google STUN servers) ── */
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

class NotificationSystem {
  constructor() {
    this._initialized = false;
    this._user = null;
    this._isSuperAdmin = false;
    this._unsubs = [];
    this._notifications = [];
    this._unreadCount = 0;
    this._panelOpen = false;
    this._activeTab = 'history';
    this._rootEl = null;
    this._users = [];
    this._currentPopupId = null;
    this._selectedPriority = 'normal';

    // Presence
    this._presenceInterval = null;
    this._presenceUnsubs = [];
    this._presenceMap = {};

    // Chat
    this._activeChat = null;
    this._chatMessages = [];
    this._chatMsgUnsub = null;
    this._chatDocUnsub = null;
    this._chatPresenceUnsub = null;
    this._chatOtherOnline = false;

    // Video
    this._pc = null;              // RTCPeerConnection
    this._localStream = null;
    this._remoteStream = null;
    this._iceCandidateUnsub = null;
    this._videoMicMuted = false;
    this._videoCamOff = false;

    // Global chat/call listener
    this._globalChatUnsub = null;
    this._globalIncomingChatId = null;  // track which incoming call banner is showing
    this._pendingVideoAccept = false;   // prevents duplicate incoming-call banner during global accept

    // Compose multi-select
    this._selectedRecipients = new Set();

    // History collapse
    this._collapsedGroups = new Set();
  }

  /* ═══════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════ */

  async init(user) {
    if (this._initialized) return;
    if (!user?.phone) {
      console.warn('[NotifSystem] No user phone, cannot init');
      return;
    }

    console.log('[NotifSystem] Init for', user.name, '|', user.phone, '| role:', user.role);

    this._user = user;
    this._isSuperAdmin = user.role === 'superadmin';
    this._rootEl = document.getElementById('notification-root');
    if (!this._rootEl) { console.error('[NotifSystem] #notification-root not found'); return; }

    try {
      const allUsers = await userAuth.getAllUsers();
      this._users = allUsers.filter(u => u.phone !== this._user.phone);
    } catch (e) {
      console.error('[NotifSystem] Failed to load users:', e);
      this._users = [];
    }

    this._renderBell();
    this._startListeners();
    this._startPresenceHeartbeat();
    this._subscribeToAllPresence();
    this._startGlobalChatListener();
    this._initPushNotifications();
    this._initialized = true;
    console.log('[NotifSystem] Init complete');
  }

  destroy() {
    console.log('[NotifSystem] Destroying...');
    this._unsubs.forEach(u => { try { u(); } catch (_) {} });
    this._unsubs = [];
    if (this._globalChatUnsub) { this._globalChatUnsub(); this._globalChatUnsub = null; }
    this._cleanupChat();
    this._cleanupVideoCall();
    this._stopPresenceHeartbeat();
    if (this._rootEl) this._rootEl.innerHTML = '';
    this._notifications = [];
    this._initialized = false;
    this._panelOpen = false;
    this._currentPopupId = null;
    this._user = null;
    this._users = [];
    this._isSuperAdmin = false;
  }

  /* ═══════════════════════════════════════════════════════
     PRESENCE
     ═══════════════════════════════════════════════════════ */

  _startPresenceHeartbeat() {
    if (!this._user?.phone) return;
    const presRef = doc(db, 'presence', this._user.phone);
    const writePresence = () => {
      setDoc(presRef, {
        online: true,
        lastSeen: new Date().toISOString(),
        page: 'global',
      }, { merge: true }).catch(() => {});
    };
    writePresence();
    this._presenceInterval = setInterval(writePresence, 60000);
  }

  _stopPresenceHeartbeat() {
    if (this._presenceInterval) {
      clearInterval(this._presenceInterval);
      this._presenceInterval = null;
    }
    this._presenceUnsubs.forEach(u => { try { u(); } catch (_) {} });
    this._presenceUnsubs = [];
    this._presenceMap = {};
    // Mark offline
    if (this._user?.phone) {
      setDoc(doc(db, 'presence', this._user.phone), {
        online: false,
        lastSeen: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    }
  }

  _subscribeToAllPresence() {
    this._users.forEach(u => {
      if (!u.phone) return;
      const unsub = onSnapshot(doc(db, 'presence', u.phone), snap => {
        if (snap.exists()) {
          this._presenceMap[u.phone] = snap.data();
        }
      }, () => {});
      this._presenceUnsubs.push(unsub);
    });
  }

  _isOnline(phone) {
    const p = this._presenceMap[phone];
    if (!p || !p.online) return false;
    if (p.lastSeen) {
      const diff = Date.now() - new Date(p.lastSeen).getTime();
      if (diff > 120000) return false; // 2 min stale
    }
    return true;
  }

  /* ═══════════════════════════════════════════════════════
     GLOBAL CHAT / CALL LISTENER
     Detects incoming chats & video calls even when panel is closed
     ═══════════════════════════════════════════════════════ */

  _startGlobalChatListener() {
    if (!this._user?.phone) return;
    if (this._globalChatUnsub) this._globalChatUnsub();

    // Use only array-contains to avoid needing a composite Firestore index
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', this._user.phone)
    );

    this._globalChatUnsub = onSnapshot(q, snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const chatId = change.doc.id;

          // Only process active chats
          if (data.status !== 'active') return;

          // Skip if this chat is already open in the panel
          if (this._activeChat && this._activeChat.id === chatId) return;

          // Incoming video call detection
          const vc = data.videoCall;
          if (vc && vc.status === 'ringing' && vc.initiatedBy !== this._user.phone && !this._pc) {
            // Show global floating incoming call banner
            this._showGlobalIncomingCall(chatId, data, vc);
          }

          // If video call ended while global banner is showing, remove it
          if (vc && vc.status === 'ended' && this._globalIncomingChatId === chatId) {
            this._removeGlobalIncomingCall();
          }
          if (!vc && this._globalIncomingChatId === chatId) {
            this._removeGlobalIncomingCall();
          }

          // New chat notification (someone started a chat with us)
          if (change.type === 'added' && data.startedBy !== this._user.phone) {
            const callerName = data.participantNames?.[data.startedBy] || data.startedBy;
            // Only show if there's no video call (video call has its own banner)
            if (!vc || vc.status !== 'ringing') {
              this._showGlobalChatNotification(chatId, data, callerName);
            }
          }
        }
      });
    }, err => console.error('[NotifSystem] Global chat listener error:', err));
  }

  _showGlobalIncomingCall(chatId, chatData, vc) {
    // Don't show duplicates
    if (this._globalIncomingChatId === chatId) return;
    this._removeGlobalIncomingCall();
    this._globalIncomingChatId = chatId;

    const callerPhone = vc.initiatedBy;
    const callerName = chatData.participantNames?.[callerPhone] || callerPhone;
    const biz = chatData.senderBusiness ? BIZ_BRANDING[chatData.senderBusiness] : null;
    const color = biz?.color || '#f97316';

    const banner = document.createElement('div');
    banner.id = 'notif-global-incoming-call';
    banner.className = 'notif-global-call';
    banner.innerHTML = `
      <div class="notif-global-call__info">
        <div class="notif-global-call__icon">${ICONS.video}</div>
        <div class="notif-global-call__text">
          <div class="notif-global-call__title">Videollamada entrante</div>
          <div class="notif-global-call__caller" style="color: ${color};">${this._esc(callerName)}</div>
        </div>
      </div>
      <div class="notif-global-call__actions">
        <button class="notif-global-call__btn notif-global-call__btn--accept" id="notif-global-accept">
          ${ICONS.video} Aceptar
        </button>
        <button class="notif-global-call__btn notif-global-call__btn--reject" id="notif-global-reject">
          ${ICONS.phoneEnd} Rechazar
        </button>
      </div>
    `;
    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => banner.classList.add('notif-global-call--show'));

    // Accept: open chat, accept video call
    banner.querySelector('#notif-global-accept').addEventListener('click', async () => {
      this._removeGlobalIncomingCall();
      // Set flag to prevent _subscribeToChatDoc from showing in-chat banner
      this._pendingVideoAccept = true;

      // Open the chat first
      const notif = this._notifications.find(n => n.id === chatData.notificationId);
      if (notif) {
        await this._startChat(notif);
      } else {
        await this._openChatDirectly(chatId, chatData);
      }

      // Re-read fresh chat doc to get latest offer SDP
      setTimeout(async () => {
        this._pendingVideoAccept = false;
        if (this._activeChat && this._activeChat.id === chatId) {
          try {
            const freshSnap = await getDoc(doc(db, 'chats', chatId));
            let freshVc = vc; // fallback to original
            if (freshSnap.exists()) {
              const freshData = freshSnap.data();
              if (freshData.videoCall && freshData.videoCall.offer) {
                freshVc = freshData.videoCall;
              }
            }
            this._acceptVideoCall(freshVc);
          } catch (e) {
            console.error('[NotifSystem] Error re-reading chat for accept:', e);
            this._acceptVideoCall(vc); // fallback
          }
        }
      }, 300);
    });

    // Reject
    banner.querySelector('#notif-global-reject').addEventListener('click', async () => {
      this._removeGlobalIncomingCall();
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          'videoCall.status': 'ended',
          'videoCall.endedAt': new Date().toISOString(),
        });
      } catch (_) {}
      Toast.info('Llamada rechazada');
    });

    // Auto-dismiss after 30s
    setTimeout(() => {
      if (this._globalIncomingChatId === chatId) {
        this._removeGlobalIncomingCall();
      }
    }, 30000);
  }

  _removeGlobalIncomingCall() {
    this._globalIncomingChatId = null;
    const el = document.getElementById('notif-global-incoming-call');
    if (el) {
      el.classList.remove('notif-global-call--show');
      setTimeout(() => el.remove(), 350);
    }
  }

  _showGlobalChatNotification(chatId, chatData, callerName) {
    const biz = chatData.senderBusiness ? BIZ_BRANDING[chatData.senderBusiness] : null;
    const color = biz?.color || '#7C3AED';

    // If panel is already open → auto-switch to chat immediately
    if (this._panelOpen && !this._activeChat) {
      this._openChatDirectly(chatId, chatData);
      Toast.info(`${callerName} inició un chat`);
      return;
    }

    // Remove any existing chat banner
    document.getElementById('notif-global-incoming-chat')?.remove();

    const banner = document.createElement('div');
    banner.id = 'notif-global-incoming-chat';
    banner.className = 'notif-global-chat-banner';
    banner.innerHTML = `
      <div class="notif-global-chat-banner__info">
        <div class="notif-global-chat-banner__icon" style="color:${color};">${ICONS.chat}</div>
        <div class="notif-global-chat-banner__text">
          <div class="notif-global-chat-banner__title">Chat entrante</div>
          <div class="notif-global-chat-banner__caller" style="color:${color};">${this._esc(callerName)}</div>
        </div>
      </div>
      <div class="notif-global-chat-banner__actions">
        <button class="notif-global-chat-banner__btn notif-global-chat-banner__btn--open" id="notif-global-chat-open">
          ${ICONS.chat} Abrir Chat
        </button>
        <button class="notif-global-chat-banner__btn notif-global-chat-banner__btn--ignore" id="notif-global-chat-ignore">
          Ignorar
        </button>
      </div>
    `;
    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => banner.classList.add('notif-global-chat-banner--show'));

    const openChat = () => {
      clearTimeout(autoOpenTimer);
      banner.classList.remove('notif-global-chat-banner--show');
      setTimeout(() => banner.remove(), 350);
      this._openChatDirectly(chatId, chatData);
    };

    // Open button
    banner.querySelector('#notif-global-chat-open').addEventListener('click', openChat);

    // Ignore button
    banner.querySelector('#notif-global-chat-ignore').addEventListener('click', () => {
      clearTimeout(autoOpenTimer);
      banner.classList.remove('notif-global-chat-banner--show');
      setTimeout(() => banner.remove(), 350);
    });

    // Auto-open after 3 seconds
    const autoOpenTimer = setTimeout(openChat, 3000);
  }

  async _openChatDirectly(chatId, chatData) {
    // Open a chat directly from global listener (when notification isn't in our list)
    this._activeChat = { id: chatId, ...chatData };
    this._chatMessages = [];
    const otherPhone = chatData.participants.find(p => p !== this._user.phone) || '';
    this._chatOtherOnline = this._isOnline(otherPhone);

    this._subscribeToChatMessages(chatId);
    this._subscribeToChatDoc(chatId);
    this._subscribeToChatPresence(otherPhone);

    if (!this._panelOpen) this._togglePanel();
    else this._renderPanelContent();
  }

  /* ═══════════════════════════════════════════════════════
     FIRESTORE — NOTIFICATIONS
     ═══════════════════════════════════════════════════════ */

  _startListeners() {
    const qSent = query(collection(db, 'notifications'), where('senderPhone', '==', this._user.phone));
    const unsubSent = onSnapshot(qSent, snap => {
      const sent = snap.docs.map(d => ({ id: d.id, ...d.data(), _dir: 'sent' }));
      this._mergeNotifications(sent, 'sent');
    }, err => console.error('[NotifSystem] Sent listener error:', err));
    this._unsubs.push(unsubSent);

    const qRecv = query(collection(db, 'notifications'), where('recipientPhone', '==', this._user.phone));
    const unsubRecv = onSnapshot(qRecv, snap => {
      const recv = snap.docs.map(d => ({ id: d.id, ...d.data(), _dir: 'received' }));
      this._mergeNotifications(recv, 'received');
    }, err => console.error('[NotifSystem] Received listener error:', err));
    this._unsubs.push(unsubRecv);
  }

  _mergeNotifications(newDocs, direction) {
    this._notifications = this._notifications.filter(n => n._dir !== direction);
    this._notifications.push(...newDocs);
    this._notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    this._updateBadge();
    if (this._panelOpen && !this._activeChat) this._renderPanelContent();

    const unread = this._notifications.filter(n => n._dir === 'received' && !n.read && !n.dismissed);
    if (unread.length > 0 && unread[0].id !== this._currentPopupId) {
      this._showPopup(unread[0]);
    }
  }

  async _sendNotification(recipientPhone, recipientName, message, requiresReply, priority) {
    if (!message.trim()) return;
    const senderBiz = this._isSuperAdmin ? 'accios-core' : (this._user.businesses?.[0] || null);
    const payload = {
      senderPhone: this._user.phone,
      senderName: this._user.name || this._user.phone,
      senderBusiness: senderBiz,
      recipientPhone, recipientName,
      message: message.trim(),
      requiresReply: !!requiresReply,
      priority: priority || 'normal',
      read: false, dismissed: false,
      replies: [], repliesRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await addDoc(collection(db, 'notifications'), payload);
      Toast.success('Notificación enviada');
    } catch (err) {
      console.error('[NotifSystem] Send error:', err);
      Toast.error('Error al enviar notificación');
    }
  }

  async _sendReply(notificationId, text) {
    if (!text.trim()) return;
    const notif = this._notifications.find(n => n.id === notificationId);
    if (!notif) return;
    const currentReplies = Array.isArray(notif.replies) ? [...notif.replies] : [];
    currentReplies.push({
      from: this._user.phone,
      fromName: this._user.name || this._user.phone,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    });
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        replies: currentReplies, repliesRead: false, read: true,
        updatedAt: new Date().toISOString(),
      });
      Toast.success('Respuesta enviada');
    } catch (err) {
      console.error('[NotifSystem] Reply error:', err);
      Toast.error('Error al enviar respuesta');
    }
  }

  async _markAsRead(id) {
    try { await updateDoc(doc(db, 'notifications', id), { read: true, updatedAt: new Date().toISOString() }); } catch (_) {}
  }

  async _dismiss(id) {
    try { await updateDoc(doc(db, 'notifications', id), { dismissed: true, read: true, updatedAt: new Date().toISOString() }); } catch (_) {}
    this._currentPopupId = null;
    this._removePopup();
    const next = this._notifications.find(n => n._dir === 'received' && !n.read && !n.dismissed && n.id !== id);
    if (next) setTimeout(() => this._showPopup(next), 400);
  }

  async _markRepliesRead(id) {
    try { await updateDoc(doc(db, 'notifications', id), { repliesRead: true }); } catch (_) {}
  }

  /* ── Delete (SuperAdmin only) ── */

  async _deleteNotification(id) {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      this._notifications = this._notifications.filter(n => n.id !== id);
      if (this._panelOpen && !this._activeChat) this._renderPanelContent();
      this._updateBadge();
      Toast.success('Mensaje eliminado');
    } catch (err) {
      console.error('[NotifSystem] Delete error:', err);
      Toast.error('Error al eliminar');
    }
  }

  async _deleteConversation(phone) {
    try {
      const toDelete = this._notifications.filter(n => {
        const otherPhone = n._dir === 'sent' ? n.recipientPhone : n.senderPhone;
        return otherPhone === phone;
      });
      if (toDelete.length === 0) return;

      // Batch delete (max 500 per batch)
      const batchSize = 500;
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        toDelete.slice(i, i + batchSize).forEach(n => batch.delete(doc(db, 'notifications', n.id)));
        await batch.commit();
      }

      this._notifications = this._notifications.filter(n => {
        const otherPhone = n._dir === 'sent' ? n.recipientPhone : n.senderPhone;
        return otherPhone !== phone;
      });
      if (this._panelOpen && !this._activeChat) this._renderPanelContent();
      this._updateBadge();
      Toast.success('Conversación eliminada');
    } catch (err) {
      console.error('[NotifSystem] Delete conversation error:', err);
      Toast.error('Error al eliminar conversación');
    }
  }

  _showDeleteConfirm(targetEl, message, onConfirm) {
    // Remove any existing confirm
    document.querySelector('.notif-delete-confirm')?.remove();

    const confirm = document.createElement('div');
    confirm.className = 'notif-delete-confirm';
    confirm.innerHTML = `
      <span class="notif-delete-confirm__msg">${this._esc(message)}</span>
      <button class="notif-delete-confirm__yes">Eliminar</button>
      <button class="notif-delete-confirm__no">Cancelar</button>
    `;

    targetEl.closest('.notif-timeline-item, .notif-client-group')?.appendChild(confirm);
    requestAnimationFrame(() => confirm.classList.add('notif-delete-confirm--show'));

    confirm.querySelector('.notif-delete-confirm__yes').addEventListener('click', (e) => {
      e.stopPropagation();
      confirm.remove();
      onConfirm();
    });
    confirm.querySelector('.notif-delete-confirm__no').addEventListener('click', (e) => {
      e.stopPropagation();
      confirm.classList.remove('notif-delete-confirm--show');
      setTimeout(() => confirm.remove(), 200);
    });

    // Auto-dismiss
    setTimeout(() => {
      if (confirm.parentElement) {
        confirm.classList.remove('notif-delete-confirm--show');
        setTimeout(() => confirm.remove(), 200);
      }
    }, 5000);
  }

  /* ═══════════════════════════════════════════════════════
     CHAT — FIRESTORE
     ═══════════════════════════════════════════════════════ */

  async _startChat(notification) {
    const myPhone = this._user.phone;
    const otherPhone = notification.senderPhone === myPhone ? notification.recipientPhone : notification.senderPhone;
    const otherName = notification.senderPhone === myPhone ? notification.recipientName : notification.senderName;

    // Check for existing active chat for this notification
    try {
      const q = query(collection(db, 'chats'), where('notificationId', '==', notification.id));
      const snap = await getDocs(q);
      const activeDoc = snap.docs.find(d => d.data().status === 'active');

      let chatId, chatData;
      if (activeDoc) {
        chatId = activeDoc.id;
        chatData = { id: chatId, ...activeDoc.data() };
      } else {
        const now = new Date().toISOString();
        const payload = {
          notificationId: notification.id,
          participants: [myPhone, otherPhone],
          participantNames: { [myPhone]: this._user.name || myPhone, [otherPhone]: otherName || otherPhone },
          senderBusiness: notification.senderBusiness || null,
          status: 'active',
          startedBy: myPhone,
          startedAt: now, endedAt: null,
          lastMessage: '', lastMessageAt: now,
          videoCall: null,
        };
        const docRef = await addDoc(collection(db, 'chats'), payload);
        chatId = docRef.id;
        chatData = { id: chatId, ...payload };
      }

      this._activeChat = chatData;
      this._chatMessages = [];
      this._chatOtherOnline = this._isOnline(otherPhone);

      this._subscribeToChatMessages(chatId);
      this._subscribeToChatDoc(chatId);
      this._subscribeToChatPresence(otherPhone);

      if (!this._panelOpen) this._togglePanel();
      else this._renderPanelContent();
    } catch (err) {
      console.error('[NotifSystem] startChat error:', err);
      Toast.error('Error al iniciar chat');
    }
  }

  _subscribeToChatMessages(chatId) {
    if (this._chatMsgUnsub) this._chatMsgUnsub();
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(200));
    this._chatMsgUnsub = onSnapshot(q, snap => {
      this._chatMessages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._renderChatMessages();
    }, err => console.error('[NotifSystem] Chat messages listener error:', err));
  }

  _subscribeToChatDoc(chatId) {
    if (this._chatDocUnsub) this._chatDocUnsub();
    this._chatDocUnsub = onSnapshot(doc(db, 'chats', chatId), snap => {
      if (!snap.exists() || !this._activeChat) return;
      const data = snap.data();

      // Chat ended by other party
      if (data.status === 'ended' && this._activeChat.status !== 'ended') {
        this._activeChat = { ...this._activeChat, status: 'ended', endedAt: data.endedAt };
        this._renderPanelContent();
        return;
      }

      // Video call state changes
      const vc = data.videoCall;
      if (vc && vc.status === 'ringing' && vc.initiatedBy !== this._user.phone && !this._pc) {
        this._handleIncomingCall(vc);
      }
      if (vc && vc.status === 'active' && vc.answer && this._pc && !this._pc._answerSet) {
        // Caller receives answer
        this._handleCallAnswered(vc);
      }
      if (vc && vc.status === 'ended' && this._pc) {
        this._cleanupVideoCall();
        Toast.info('Videollamada finalizada');
      }

      this._activeChat = { ...this._activeChat, ...data, id: this._activeChat.id };
    }, () => {});
  }

  _subscribeToChatPresence(otherPhone) {
    if (this._chatPresenceUnsub) this._chatPresenceUnsub();
    this._chatPresenceUnsub = onSnapshot(doc(db, 'presence', otherPhone), snap => {
      if (!snap.exists()) return;
      const p = snap.data();
      const wasOnline = this._chatOtherOnline;
      this._chatOtherOnline = p.online && p.lastSeen && (Date.now() - new Date(p.lastSeen).getTime() < 120000);
      if (wasOnline !== this._chatOtherOnline) this._updateChatOnlineStatus();
    }, () => {});
  }

  async _sendChatMessage() {
    const input = this._rootEl?.querySelector('#notif-chat-input');
    const text = input?.value?.trim();
    if (!text || !this._activeChat) return;
    input.value = '';
    const now = new Date().toISOString();
    try {
      await addDoc(collection(db, 'chats', this._activeChat.id, 'messages'), {
        from: this._user.phone, fromName: this._user.name || this._user.phone,
        text, createdAt: now,
      });
      await updateDoc(doc(db, 'chats', this._activeChat.id), {
        lastMessage: text.substring(0, 100), lastMessageAt: now,
      });
    } catch (err) {
      console.error('[NotifSystem] Chat send error:', err);
      Toast.error('Error al enviar mensaje');
    }
  }

  async _endChat() {
    if (!this._activeChat) return;
    try {
      await updateDoc(doc(db, 'chats', this._activeChat.id), {
        status: 'ended', endedAt: new Date().toISOString(),
      });
    } catch (_) {}
    this._cleanupChat();
    this._renderPanelContent();
  }

  _cleanupChat() {
    if (this._chatMsgUnsub) { this._chatMsgUnsub(); this._chatMsgUnsub = null; }
    if (this._chatDocUnsub) { this._chatDocUnsub(); this._chatDocUnsub = null; }
    if (this._chatPresenceUnsub) { this._chatPresenceUnsub(); this._chatPresenceUnsub = null; }
    this._cleanupVideoCall();
    this._activeChat = null;
    this._chatMessages = [];
    this._chatOtherOnline = false;
  }

  /* ═══════════════════════════════════════════════════════
     VIDEO CALL — WebRTC
     ═══════════════════════════════════════════════════════ */

  async _initVideoCall() {
    if (!this._activeChat || !this._isSuperAdmin) return;

    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      console.error('[NotifSystem] getUserMedia error:', err);
      Toast.error('No se pudo acceder a la cámara');
      return;
    }

    this._pc = new RTCPeerConnection(RTC_CONFIG);
    this._remoteStream = new MediaStream();

    this._localStream.getTracks().forEach(track => this._pc.addTrack(track, this._localStream));

    this._pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach(track => this._remoteStream.addTrack(track));
      this._updateVideoElements();
    };

    this._pc.onicecandidate = (e) => {
      if (e.candidate) {
        addDoc(collection(db, 'chats', this._activeChat.id, 'candidates'), {
          from: this._user.phone,
          candidate: e.candidate.toJSON(),
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }
    };

    // Detect connection drops
    this._pc.onconnectionstatechange = () => {
      const state = this._pc?.connectionState;
      if (state === 'disconnected' || state === 'failed') {
        Toast.warning('Conexión perdida');
        this._endVideoCall();
      }
      if (state === 'connected') {
        // Update header status
        const statusEl = document.querySelector('.notif-video-overlay__header-status');
        if (statusEl) statusEl.textContent = 'En llamada';
        // Start live transcription
        this._startTranscription();
      }
    };

    // Subscribe to ICE candidates from other party
    this._subscribeToICECandidates(this._activeChat.id);

    try {
      const offer = await this._pc.createOffer();
      await this._pc.setLocalDescription(offer);

      await updateDoc(doc(db, 'chats', this._activeChat.id), {
        videoCall: {
          status: 'ringing',
          initiatedBy: this._user.phone,
          offer: JSON.stringify(offer),
          answer: null,
          startedAt: new Date().toISOString(),
          endedAt: null,
        }
      });

      this._buildVideoOverlay();
      Toast.info('Llamando...');
    } catch (err) {
      console.error('[NotifSystem] initVideoCall error:', err);
      this._cleanupVideoCall();
      Toast.error('Error al iniciar videollamada');
    }
  }

  async _handleIncomingCall(vc) {
    // Skip if we're already accepting from global banner
    if (this._pendingVideoAccept) return;

    // Show incoming call banner in chat
    const banner = this._rootEl?.querySelector('#notif-chat-incoming-call');
    if (banner) return; // already showing

    const messagesEl = this._rootEl?.querySelector('#notif-chat-messages');
    if (!messagesEl) return;

    const bannerHTML = `
      <div class="notif-video-incoming" id="notif-chat-incoming-call">
        <div class="notif-video-incoming__text">${ICONS.video} Videollamada entrante</div>
        <div class="notif-video-incoming__actions">
          <button class="notif-video-incoming__btn notif-video-incoming__btn--accept" id="notif-vc-accept">Aceptar</button>
          <button class="notif-video-incoming__btn notif-video-incoming__btn--reject" id="notif-vc-reject">Rechazar</button>
        </div>
      </div>
    `;
    messagesEl.insertAdjacentHTML('beforebegin', bannerHTML);

    this._rootEl.querySelector('#notif-vc-accept')?.addEventListener('click', () => this._acceptVideoCall(vc));
    this._rootEl.querySelector('#notif-vc-reject')?.addEventListener('click', () => this._rejectVideoCall());
  }

  async _acceptVideoCall(vc) {
    // Remove banner
    this._rootEl?.querySelector('#notif-chat-incoming-call')?.remove();

    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      console.error('[NotifSystem] getUserMedia error:', err);
      Toast.error('No se pudo acceder a la cámara');
      this._rejectVideoCall();
      return;
    }

    this._pc = new RTCPeerConnection(RTC_CONFIG);
    this._remoteStream = new MediaStream();

    this._localStream.getTracks().forEach(track => this._pc.addTrack(track, this._localStream));

    this._pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach(track => this._remoteStream.addTrack(track));
      this._updateVideoElements();
    };

    this._pc.onicecandidate = (e) => {
      if (e.candidate) {
        addDoc(collection(db, 'chats', this._activeChat.id, 'candidates'), {
          from: this._user.phone,
          candidate: e.candidate.toJSON(),
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }
    };

    // Detect connection drops
    this._pc.onconnectionstatechange = () => {
      const state = this._pc?.connectionState;
      if (state === 'disconnected' || state === 'failed') {
        Toast.warning('Conexión perdida');
        this._endVideoCall();
      }
      if (state === 'connected') {
        const statusEl = document.querySelector('.notif-video-overlay__header-status');
        if (statusEl) statusEl.textContent = 'En llamada';
      }
    };

    this._subscribeToICECandidates(this._activeChat.id);

    try {
      const offer = JSON.parse(vc.offer);
      await this._pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await this._pc.createAnswer();
      await this._pc.setLocalDescription(answer);

      await updateDoc(doc(db, 'chats', this._activeChat.id), {
        'videoCall.status': 'active',
        'videoCall.answer': JSON.stringify(answer),
      });

      this._buildVideoOverlay();
    } catch (err) {
      console.error('[NotifSystem] acceptVideoCall error:', err);
      this._cleanupVideoCall();
      Toast.error('Error al aceptar videollamada');
    }
  }

  async _handleCallAnswered(vc) {
    try {
      this._pc._answerSet = true;
      const answer = JSON.parse(vc.answer);
      await this._pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('[NotifSystem] handleCallAnswered error:', err);
    }
  }

  async _rejectVideoCall() {
    this._rootEl?.querySelector('#notif-chat-incoming-call')?.remove();
    if (!this._activeChat) return;
    try {
      await updateDoc(doc(db, 'chats', this._activeChat.id), {
        'videoCall.status': 'ended',
        'videoCall.endedAt': new Date().toISOString(),
      });
    } catch (_) {}
    Toast.info('Llamada rechazada');
  }

  async _endVideoCall() {
    // Save transcript before cleanup (async, won't block)
    this._saveTranscript();
    // Stop transcription
    this._stopTranscription();
    // Always attempt Firestore update if we have an active chat
    if (this._activeChat) {
      try {
        await updateDoc(doc(db, 'chats', this._activeChat.id), {
          'videoCall.status': 'ended',
          'videoCall.endedAt': new Date().toISOString(),
        });
      } catch (_) {}
    }
    // ALWAYS cleanup — even if _activeChat is null, to remove overlay and free resources
    this._cleanupVideoCall();
    Toast.info('Videollamada finalizada');
  }

  _subscribeToICECandidates(chatId) {
    if (this._iceCandidateUnsub) this._iceCandidateUnsub();
    const q = query(collection(db, 'chats', chatId, 'candidates'), orderBy('createdAt', 'asc'));
    this._iceCandidateUnsub = onSnapshot(q, snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.from !== this._user.phone && this._pc) {
            this._pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
          }
        }
      });
    }, () => {});
  }

  _cleanupVideoCall() {
    if (this._iceCandidateUnsub) { this._iceCandidateUnsub(); this._iceCandidateUnsub = null; }
    if (this._localStream) {
      this._localStream.getTracks().forEach(t => t.stop());
      this._localStream = null;
    }
    if (this._remoteStream) { this._remoteStream = null; }
    if (this._pc) { this._pc.close(); this._pc = null; }
    this._videoMicMuted = false;
    this._videoCamOff = false;
    // Remove overlay
    document.getElementById('notif-video-overlay')?.remove();
    this._rootEl?.querySelector('#notif-chat-incoming-call')?.remove();
  }

  _buildVideoOverlay() {
    // Remove existing
    document.getElementById('notif-video-overlay')?.remove();

    // Get other participant name for header
    const otherPhone = this._activeChat?.participants?.find(p => p !== this._user.phone) || '';
    const otherName = this._activeChat?.participantNames?.[otherPhone] || otherPhone;

    const overlay = document.createElement('div');
    overlay.id = 'notif-video-overlay';
    overlay.className = 'notif-video-overlay';
    overlay.innerHTML = `
      <div class="notif-video-overlay__bg"></div>
      <div class="notif-video-overlay__header">
        <div class="notif-video-overlay__header-icon">${ICONS.video}</div>
        <div class="notif-video-overlay__header-info">
          <div class="notif-video-overlay__header-name">${this._esc(otherName)}</div>
          <div class="notif-video-overlay__header-status">Conectado</div>
        </div>
      </div>
      <div class="notif-video-overlay__stage">
        <video class="notif-video-overlay__remote" id="notif-video-remote" autoplay playsinline></video>
        <video class="notif-video-overlay__local" id="notif-video-local" autoplay playsinline muted></video>
        <div class="notif-video-transcript" id="notif-video-transcript"></div>
      </div>
      <div class="notif-video-overlay__controls">
        <button class="notif-vc-btn notif-vc-btn--toggle" id="notif-vc-mic" title="Silenciar micrófono">
          ${ICONS.mic}
        </button>
        <button class="notif-vc-btn notif-vc-btn--end" id="notif-vc-end" title="Finalizar llamada">
          ${ICONS.phoneEnd}
        </button>
        <button class="notif-vc-btn notif-vc-btn--toggle" id="notif-vc-cam" title="Apagar cámara">
          ${ICONS.video}
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Set video sources
    this._updateVideoElements();

    // Controls
    overlay.querySelector('#notif-vc-end').addEventListener('click', () => this._endVideoCall());

    overlay.querySelector('#notif-vc-mic').addEventListener('click', () => {
      this._videoMicMuted = !this._videoMicMuted;
      this._localStream?.getAudioTracks().forEach(t => { t.enabled = !this._videoMicMuted; });
      const micBtn = overlay.querySelector('#notif-vc-mic');
      micBtn.innerHTML = this._videoMicMuted ? ICONS.micOff : ICONS.mic;
      micBtn.classList.toggle('notif-vc-btn--muted', this._videoMicMuted);
      micBtn.title = this._videoMicMuted ? 'Activar micrófono' : 'Silenciar micrófono';
    });

    overlay.querySelector('#notif-vc-cam').addEventListener('click', () => {
      this._videoCamOff = !this._videoCamOff;
      this._localStream?.getVideoTracks().forEach(t => { t.enabled = !this._videoCamOff; });
      const camBtn = overlay.querySelector('#notif-vc-cam');
      camBtn.innerHTML = this._videoCamOff ? ICONS.videoOff : ICONS.video;
      camBtn.classList.toggle('notif-vc-btn--muted', this._videoCamOff);
      camBtn.title = this._videoCamOff ? 'Activar cámara' : 'Apagar cámara';
    });

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('notif-video-overlay--show'));
  }

  _updateVideoElements() {
    const localEl = document.getElementById('notif-video-local');
    const remoteEl = document.getElementById('notif-video-remote');
    if (localEl && this._localStream) localEl.srcObject = this._localStream;
    if (remoteEl && this._remoteStream) remoteEl.srcObject = this._remoteStream;
  }

  /* ═══════════════════════════════════════════════════════
     LIVE TRANSCRIPTION — Speech Recognition + Overlay
     ═══════════════════════════════════════════════════════ */

  _startTranscription() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn('[NotifSystem] SpeechRecognition not supported');
      return;
    }

    this._transcript = [];
    this._transcriptRecognition = new SR();
    this._transcriptRecognition.lang = 'es-PA';
    this._transcriptRecognition.interimResults = true;
    this._transcriptRecognition.continuous = true;

    this._transcriptRecognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (!text) continue;

        if (result.isFinal) {
          this._transcript.push({
            text,
            timestamp: new Date().toISOString(),
            speaker: 'local'
          });
          this._addTranscriptLine(text, true);
        } else {
          this._updateInterimLine(text);
        }
      }
    };

    this._transcriptRecognition.onend = () => {
      if (this._pc && this._pc.connectionState === 'connected') {
        try { this._transcriptRecognition.start(); } catch (_) {}
      }
    };

    this._transcriptRecognition.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('[NotifSystem] Transcription error:', e.error);
      }
    };

    try { this._transcriptRecognition.start(); } catch (_) {}
  }

  _stopTranscription() {
    if (this._transcriptRecognition) {
      try { this._transcriptRecognition.stop(); } catch (_) {}
      this._transcriptRecognition = null;
    }
  }

  _addTranscriptLine(text) {
    const container = document.getElementById('notif-video-transcript');
    if (!container) return;

    // Remove interim line
    container.querySelector('.notif-transcript-line--interim')?.remove();

    const line = document.createElement('div');
    line.className = 'notif-transcript-line notif-transcript-line--enter';
    line.textContent = text;
    container.appendChild(line);

    // Trigger enter animation
    requestAnimationFrame(() => {
      line.classList.remove('notif-transcript-line--enter');
      line.classList.add('notif-transcript-line--visible');
    });

    // After 4s, fade up and remove
    setTimeout(() => {
      line.classList.add('notif-transcript-line--fade-up');
      line.addEventListener('animationend', () => line.remove(), { once: true });
    }, 4000);

    // Limit visible lines
    const lines = container.querySelectorAll('.notif-transcript-line:not(.notif-transcript-line--interim)');
    if (lines.length > 5) {
      lines[0].classList.add('notif-transcript-line--fade-up');
      lines[0].addEventListener('animationend', () => lines[0].remove(), { once: true });
    }
  }

  _updateInterimLine(text) {
    const container = document.getElementById('notif-video-transcript');
    if (!container) return;

    let interim = container.querySelector('.notif-transcript-line--interim');
    if (!interim) {
      interim = document.createElement('div');
      interim.className = 'notif-transcript-line notif-transcript-line--interim notif-transcript-line--visible';
      container.appendChild(interim);
    }
    interim.textContent = text;
  }

  /* ═══════════════════════════════════════════════════════
     TRANSCRIPT SAVE + AI SUMMARY + EMAIL
     ═══════════════════════════════════════════════════════ */

  async _saveTranscript() {
    if (!this._transcript || this._transcript.length === 0 || !this._activeChat) return;

    const chatId = this._activeChat.id;
    const otherPhone = this._activeChat.participants?.find(p => p !== this._user.phone) || '';
    const otherName = this._activeChat.participantNames?.[otherPhone] || otherPhone;

    // Determine business ID from participant's user doc
    let businessId = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', otherPhone));
      const businesses = userDoc.data()?.businesses || [];
      if (businesses.length > 0) businessId = businesses[0];
    } catch (_) {}

    const transcriptDoc = {
      chatId,
      participants: this._activeChat.participants,
      participantNames: this._activeChat.participantNames || {},
      startedAt: this._activeChat.videoCall?.startedAt || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      lines: this._transcript,
      summary: null,
      businessId,
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, 'call-transcripts'), transcriptDoc);
      this._lastTranscriptId = docRef.id;
      Toast.success('Transcripción guardada');
      // Generate AI summary in background
      this._generateAISummary(docRef.id, this._transcript, otherName, otherPhone);
    } catch (err) {
      console.error('[NotifSystem] Save transcript error:', err);
    }
  }

  async _generateAISummary(transcriptId, transcript, participantName, participantPhone) {
    try {
      const res = await fetch(apiUrl('/api/summarize-call'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, participantName })
      });
      const data = await res.json();
      if (data.summary) {
        await updateDoc(doc(db, 'call-transcripts', transcriptId), {
          summary: data.summary,
          summarizedAt: new Date().toISOString(),
        });
        // Send email with the summary
        this._sendMinutaEmail(data.summary, transcript, participantName, participantPhone);
      }
    } catch (err) {
      console.error('[NotifSystem] AI summary error:', err);
    }
  }

  async _sendMinutaEmail(summary, transcript, participantName, participantPhone) {
    // Get participant email from their user document
    let email = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', participantPhone));
      email = userDoc.data()?.email;
    } catch (_) {}
    if (!email) return; // No email registered, skip silently

    const date = new Date().toLocaleDateString('es-PA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const transcriptHTML = transcript.map(l =>
      `<p style="margin:4px 0;"><span style="color:#555;">[${new Date(l.timestamp).toLocaleTimeString('es-PA')}]</span> ${l.text}</p>`
    ).join('');

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0A0A0F;color:#E0E0E0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:32px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">📋 Minuta de Reunión</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">${date}</p>
        </div>
        <div style="padding:28px;">
          <p style="color:#A0A0A0;font-size:13px;margin:0 0 20px;">
            Participantes: <strong style="color:#E0E0E0;">SuperAdmin</strong> y <strong style="color:#E0E0E0;">${participantName}</strong>
          </p>
          <div style="background:rgba(124,58,237,0.08);border-left:3px solid #7C3AED;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;line-height:1.6;">
            ${summary.replace(/\n/g, '<br>')}
          </div>
          <details style="margin-top:20px;">
            <summary style="color:#7C3AED;cursor:pointer;font-weight:600;font-size:14px;">
              Ver transcripción completa (${transcript.length} líneas)
            </summary>
            <div style="margin-top:12px;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:12px;color:#888;">
              ${transcriptHTML}
            </div>
          </details>
        </div>
        <div style="padding:16px 28px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="color:#555;font-size:11px;margin:0;">ACCIOS CORE — Digital Ecosystem</p>
        </div>
      </div>
    `;

    try {
      await fetch(apiUrl('/api/send-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `📋 Minuta de Reunión — ${date}`,
          html,
        })
      });
      console.log('[NotifSystem] Minuta email sent to', email);
    } catch (err) {
      console.error('[NotifSystem] Email send error:', err);
    }
  }

  /* ═══════════════════════════════════════════════════════
     VIEW TRANSCRIPTS — Modal
     ═══════════════════════════════════════════════════════ */

  async _showTranscriptModal() {
    if (!this._activeChat) return;

    // Load transcripts for this chat
    let transcripts = [];
    try {
      const q = query(
        collection(db, 'call-transcripts'),
        where('chatId', '==', this._activeChat.id),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      transcripts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('[NotifSystem] Load transcripts error:', err);
    }

    if (transcripts.length === 0) {
      Toast.info('No hay minutas para este chat');
      return;
    }

    // Show most recent transcript
    const t = transcripts[0];
    this._renderTranscriptModal(t);
  }

  _renderTranscriptModal(t) {
    // Remove existing
    document.querySelector('.notif-transcript-modal-overlay')?.remove();

    const date = new Date(t.createdAt).toLocaleDateString('es-PA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const duration = t.startedAt && t.endedAt
      ? Math.round((new Date(t.endedAt) - new Date(t.startedAt)) / 60000)
      : 0;

    const summaryHTML = t.summary
      ? t.summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n- /g, '\n• ').replace(/\n/g, '<br>')
      : '<em style="color:var(--text-muted);">Generando resumen...</em>';

    const linesHTML = (t.lines || []).map(l =>
      `<div class="notif-transcript-modal__line">
        <span class="notif-transcript-modal__time">${new Date(l.timestamp).toLocaleTimeString('es-PA')}</span>
        <span>${this._esc(l.text)}</span>
      </div>`
    ).join('');

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'notif-transcript-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="notif-transcript-modal">
        <div class="notif-transcript-modal__header">
          <div>
            <h3>📋 Minuta de Reunión</h3>
            <span class="notif-transcript-modal__date">${date}${duration ? ` · ${duration} min` : ''}</span>
          </div>
          <button class="notif-transcript-modal__close" id="notif-tm-close">✕</button>
        </div>
        <div class="notif-transcript-modal__tabs">
          <button class="notif-transcript-modal__tab notif-transcript-modal__tab--active" data-tab="summary">Resumen</button>
          <button class="notif-transcript-modal__tab" data-tab="full">Transcripción</button>
        </div>
        <div class="notif-transcript-modal__body" id="notif-tm-body">
          <div class="notif-transcript-modal__summary">${summaryHTML}</div>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);
    requestAnimationFrame(() => modalOverlay.classList.add('notif-transcript-modal-overlay--show'));

    // Close
    modalOverlay.querySelector('#notif-tm-close').addEventListener('click', () => {
      modalOverlay.classList.remove('notif-transcript-modal-overlay--show');
      setTimeout(() => modalOverlay.remove(), 300);
    });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('notif-transcript-modal-overlay--show');
        setTimeout(() => modalOverlay.remove(), 300);
      }
    });

    // Tabs
    modalOverlay.querySelectorAll('.notif-transcript-modal__tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modalOverlay.querySelectorAll('.notif-transcript-modal__tab').forEach(t => t.classList.remove('notif-transcript-modal__tab--active'));
        tab.classList.add('notif-transcript-modal__tab--active');
        const body = modalOverlay.querySelector('#notif-tm-body');
        if (tab.dataset.tab === 'summary') {
          body.innerHTML = `<div class="notif-transcript-modal__summary">${summaryHTML}</div>`;
        } else {
          body.innerHTML = `<div class="notif-transcript-modal__lines">${linesHTML || '<em>Sin transcripción</em>'}</div>`;
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     SCHEDULE CALLS — .ics Calendar
     ═══════════════════════════════════════════════════════ */

  _showScheduleModal() {
    if (!this._activeChat) return;

    // Remove existing
    document.querySelector('.notif-schedule-modal-overlay')?.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'notif-schedule-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="notif-schedule-modal">
        <div class="notif-schedule-modal__header">
          <h3>📅 Agendar Videollamada</h3>
          <button class="notif-schedule-modal__close" id="notif-sm-close">✕</button>
        </div>
        <div class="notif-schedule-form">
          <label class="notif-schedule-label">Fecha y hora</label>
          <input type="datetime-local" class="notif-schedule-input" id="notif-schedule-datetime" />

          <label class="notif-schedule-label">Duración</label>
          <select class="notif-schedule-input" id="notif-schedule-duration">
            <option value="15">15 minutos</option>
            <option value="30" selected>30 minutos</option>
            <option value="60">1 hora</option>
          </select>

          <label class="notif-schedule-label">Nota (opcional)</label>
          <textarea class="notif-schedule-input notif-schedule-textarea" id="notif-schedule-note" placeholder="Tema de la reunión..." rows="3"></textarea>
        </div>
        <div class="notif-schedule-actions">
          <button class="notif-schedule-btn notif-schedule-btn--cancel" id="notif-sm-cancel">Cancelar</button>
          <button class="notif-schedule-btn notif-schedule-btn--confirm" id="notif-sm-confirm">📅 Agendar y Enviar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);
    requestAnimationFrame(() => modalOverlay.classList.add('notif-schedule-modal-overlay--show'));

    // Set min datetime to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    modalOverlay.querySelector('#notif-schedule-datetime').min = now.toISOString().slice(0, 16);

    // Close
    const closeModal = () => {
      modalOverlay.classList.remove('notif-schedule-modal-overlay--show');
      setTimeout(() => modalOverlay.remove(), 300);
    };
    modalOverlay.querySelector('#notif-sm-close').addEventListener('click', closeModal);
    modalOverlay.querySelector('#notif-sm-cancel').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    // Confirm
    modalOverlay.querySelector('#notif-sm-confirm').addEventListener('click', () => this._scheduleCall(closeModal));
  }

  _generateICS({ title, description, startDate, durationMinutes, organizerName }) {
    const start = new Date(startDate);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ACCIOS CORE//Videollamada//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      `ORGANIZER;CN=${organizerName}:mailto:noreply@accioscore.com`,
      `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@accioscore.com`,
      `DTSTAMP:${fmt(new Date())}`,
      'STATUS:CONFIRMED',
      'URL:https://accioscore.com',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  async _scheduleCall(closeModal) {
    const datetime = document.getElementById('notif-schedule-datetime')?.value;
    const duration = parseInt(document.getElementById('notif-schedule-duration')?.value || '30');
    const note = document.getElementById('notif-schedule-note')?.value || '';

    if (!datetime) { Toast.warning('Selecciona fecha y hora'); return; }

    const otherPhone = this._activeChat.participants?.find(p => p !== this._user.phone) || '';
    const otherName = this._activeChat.participantNames?.[otherPhone] || otherPhone;
    const title = `Videollamada ACCIOS — ${otherName}`;
    const description = note || `Videollamada agendada con ${otherName} vía ACCIOS CORE`;

    // 1. Generate .ics
    const icsContent = this._generateICS({
      title, description,
      startDate: datetime,
      durationMinutes: duration,
      organizerName: this._user.name || 'ACCIOS',
    });

    // 2. Download .ics file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accios-call-${new Date(datetime).toISOString().slice(0, 10)}.ics`;
    a.click();
    URL.revokeObjectURL(url);

    // 3. Save to Firestore appointments
    try {
      await userAuth.createAppointment({
        type: 'video-call',
        title, description,
        scheduledAt: new Date(datetime).toISOString(),
        duration,
        participants: this._activeChat.participants,
        participantNames: this._activeChat.participantNames,
        chatId: this._activeChat.id,
        createdBy: this._user.phone,
      });
    } catch (_) {}

    // 4. Send in-app notification
    const dateStr = new Date(datetime).toLocaleDateString('es-PA', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });
    try {
      await addDoc(collection(db, 'notifications'), {
        senderPhone: this._user.phone,
        senderName: this._user.name || this._user.phone,
        senderBusiness: 'accios-core',
        recipientPhone: otherPhone,
        recipientName: otherName,
        message: `📅 ${this._user.name || 'SuperAdmin'} agendó una videollamada para ${dateStr}`,
        requiresReply: false, priority: 'normal',
        read: false, dismissed: false,
        replies: [], repliesRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (_) {}

    // 5. Send push notification if available
    try {
      const userDoc = await getDoc(doc(db, 'users', otherPhone));
      const fcmToken = userDoc.data()?.fcmToken;
      if (fcmToken) {
        fetch(apiUrl('/api/send-push'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: [fcmToken],
            title: '📅 Videollamada Agendada',
            body: `${this._user.name || 'SuperAdmin'} agendó una llamada — ${dateStr}`
          })
        }).catch(() => {});
      }
    } catch (_) {}

    Toast.success('Llamada agendada');
    if (closeModal) closeModal();
  }

  /* ═══════════════════════════════════════════════════════
     PUSH NOTIFICATIONS — FCM
     ═══════════════════════════════════════════════════════ */

  async _initPushNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[NotifSystem] Push permission denied');
        return;
      }

      if (!messaging) return;

      const registration = await navigator.serviceWorker.ready;
      const token = await getFCMToken(messaging, {
        vapidKey: 'BPlGKYaEfMi5FR1PxYQy8aVq7T0k7bgJpqAqHnKKGoX5SfgJhlZ3Vt3PGMX5CfaLzrNwBH3xvKx0_VxzX4aRbU',
        serviceWorkerRegistration: registration
      });

      if (token) {
        await updateDoc(doc(db, 'users', this._user.phone), {
          fcmToken: token,
          fcmTokenUpdatedAt: new Date().toISOString(),
        });
        console.log('[NotifSystem] FCM token saved');
      }
    } catch (err) {
      console.error('[NotifSystem] Push setup error:', err);
    }
  }

  async _sendPushToUsers(userPhones, title, body) {
    const tokens = [];
    for (const phone of userPhones) {
      try {
        const userDoc = await getDoc(doc(db, 'users', phone));
        const token = userDoc.data()?.fcmToken;
        if (token) tokens.push(token);
      } catch (_) {}
    }

    if (tokens.length === 0) return;

    try {
      await fetch(apiUrl('/api/send-push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, title, body })
      });
    } catch (err) {
      console.error('[NotifSystem] Push send error:', err);
    }
  }

  /* ═══════════════════════════════════════════════════════
     BELL + BADGE
     ═══════════════════════════════════════════════════════ */

  _renderBell() {
    this._rootEl.innerHTML = `
      <button class="notif-bell" id="notif-bell-btn" title="Notificaciones">
        ${ICONS.bell}
        <span class="notif-badge" id="notif-bell-badge" style="display:none;"></span>
      </button>
      <div class="notif-overlay" id="notif-overlay"></div>
      <div class="notif-panel" id="notif-panel"></div>
      <div id="notif-popup-container"></div>
    `;
    this._rootEl.querySelector('#notif-bell-btn').addEventListener('click', () => this._togglePanel());
    this._rootEl.querySelector('#notif-overlay').addEventListener('click', () => this._togglePanel());
  }

  _updateBadge() {
    let count = 0;
    if (this._isSuperAdmin) {
      count = this._notifications.filter(n =>
        (n._dir === 'received' && !n.read) || (n._dir === 'sent' && n.replies?.length > 0 && !n.repliesRead)
      ).length;
    } else {
      count = this._notifications.filter(n => n._dir === 'received' && !n.read && !n.dismissed).length;
    }
    this._unreadCount = count;
    const badge = this._rootEl.querySelector('#notif-bell-badge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = ''; }
    else { badge.style.display = 'none'; }
  }

  /* ═══════════════════════════════════════════════════════
     PANEL — SLIDE OUT
     ═══════════════════════════════════════════════════════ */

  _togglePanel() {
    this._panelOpen = !this._panelOpen;
    const panel = this._rootEl.querySelector('#notif-panel');
    const overlay = this._rootEl.querySelector('#notif-overlay');
    if (this._panelOpen) {
      this._renderPanelContent();
      requestAnimationFrame(() => {
        panel.classList.add('notif-panel--open');
        overlay.classList.add('notif-overlay--show');
      });
    } else {
      panel.classList.remove('notif-panel--open');
      overlay.classList.remove('notif-overlay--show');
    }
  }

  _renderPanelContent() {
    const panel = this._rootEl.querySelector('#notif-panel');
    if (!panel) return;

    // ── Chat view ──
    if (this._activeChat) {
      panel.innerHTML = `
        <div class="notif-panel__header">
          <button class="notif-chat-back-btn" id="notif-chat-back">${ICONS.back} Notificaciones</button>
          <button class="notif-panel__close" id="notif-panel-close">${ICONS.x}</button>
        </div>
        ${this._buildChatView()}
      `;
      panel.querySelector('#notif-panel-close').addEventListener('click', () => this._togglePanel());
      panel.querySelector('#notif-chat-back').addEventListener('click', () => {
        this._cleanupChat();
        this._renderPanelContent();
      });
      panel.querySelector('#notif-chat-end')?.addEventListener('click', () => this._endChat());
      panel.querySelector('#notif-chat-send')?.addEventListener('click', () => this._sendChatMessage());
      panel.querySelector('#notif-chat-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendChatMessage(); }
      });
      panel.querySelector('#notif-chat-video-btn')?.addEventListener('click', () => this._initVideoCall());
      panel.querySelector('#notif-chat-schedule-btn')?.addEventListener('click', () => this._showScheduleModal());
      panel.querySelector('#notif-chat-transcript-btn')?.addEventListener('click', () => this._showTranscriptModal());
      this._renderChatMessages();
      return;
    }

    // ── Normal view ──
    const isSA = this._isSuperAdmin;
    panel.innerHTML = `
      <div class="notif-panel__header">
        <div class="notif-panel__title">${ICONS.bell} Notificaciones</div>
        <button class="notif-panel__close" id="notif-panel-close">${ICONS.x}</button>
      </div>
      <div class="notif-tabs">
        <button class="notif-tab ${this._activeTab === 'compose' ? 'notif-tab--active' : ''}" data-tab="compose">
          ${isSA ? 'Enviar' : 'Nueva'}
        </button>
        <button class="notif-tab ${this._activeTab === 'history' ? 'notif-tab--active' : ''}" data-tab="history">Historial</button>
      </div>
      <div id="notif-panel-body" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
        ${this._activeTab === 'compose' ? this._buildCompose() : this._buildHistory()}
      </div>
    `;
    panel.querySelector('#notif-panel-close').addEventListener('click', () => this._togglePanel());
    panel.querySelectorAll('.notif-tab').forEach(tab => {
      tab.addEventListener('click', () => { this._activeTab = tab.dataset.tab; this._renderPanelContent(); });
    });
    this._attachComposeListeners(panel);
    this._attachHistoryListeners(panel);
  }

  /* ── Chat UI ── */
  _buildChatView() {
    const chat = this._activeChat;
    if (!chat) return '';
    const myPhone = this._user.phone;
    const otherPhone = chat.participants.find(p => p !== myPhone);
    const otherName = chat.participantNames?.[otherPhone] || otherPhone;
    const biz = chat.senderBusiness ? BIZ_BRANDING[chat.senderBusiness] : null;
    const color = biz?.color || '#f97316';
    const initials = (otherName || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const isEnded = chat.status === 'ended';

    const avatarHTML = biz?.photo
      ? `<img src="${biz.photo}" alt="${otherName}" />`
      : `<span style="color:${color};font-weight:600;font-size:13px;">${initials}</span>`;

    // Video, schedule, and transcript buttons only for SuperAdmin
    const videoBtnHTML = (this._isSuperAdmin && !isEnded && this._chatOtherOnline) ? `
      <button class="notif-chat__video-btn" id="notif-chat-video-btn" title="Videollamada">
        ${ICONS.video}
      </button>
    ` : '';

    const scheduleBtnHTML = (this._isSuperAdmin && !isEnded) ? `
      <button class="notif-chat__action-btn" id="notif-chat-schedule-btn" title="Agendar llamada">📅</button>
    ` : '';

    const transcriptBtnHTML = this._isSuperAdmin ? `
      <button class="notif-chat__action-btn" id="notif-chat-transcript-btn" title="Ver minutas">📋</button>
    ` : '';

    const origNotif = this._notifications.find(n => n.id === chat.notificationId);
    const contextMsg = origNotif ? origNotif.message : '';

    const inputBar = isEnded ? `
      <div class="notif-chat__ended">Chat finalizado</div>
    ` : (!this._chatOtherOnline ? `
      <div class="notif-chat__disconnected">Usuario desconectado — esperando reconexión...</div>
      <div class="notif-chat__input-bar notif-chat__input-bar--disabled">
        <textarea class="notif-chat__input" disabled placeholder="Esperando reconexión..."></textarea>
        <button class="notif-chat__send-btn" disabled>${ICONS.send}</button>
      </div>
    ` : `
      <div class="notif-chat__input-bar">
        <textarea class="notif-chat__input" id="notif-chat-input" placeholder="Escribe un mensaje..." rows="1"></textarea>
        <button class="notif-chat__send-btn" id="notif-chat-send">${ICONS.send}</button>
      </div>
    `);

    return `
      <div class="notif-chat">
        <div class="notif-chat__header" style="--chat-color: ${color};">
          <div class="notif-chat__avatar" style="border-color: ${color}30; background: ${color}10;">
            ${avatarHTML}
          </div>
          <div class="notif-chat__info">
            <div class="notif-chat__name">${this._esc(otherName)}</div>
            <div class="notif-chat__status" id="notif-chat-status">
              <span class="notif-chat__status-dot notif-chat__status-dot--${this._chatOtherOnline ? 'online' : 'offline'}"></span>
              ${this._chatOtherOnline ? 'En línea' : 'Desconectado'}
            </div>
          </div>
          ${transcriptBtnHTML}
          ${scheduleBtnHTML}
          ${videoBtnHTML}
          ${!isEnded ? `<button class="notif-chat__end-btn" id="notif-chat-end">Cerrar</button>` : ''}
        </div>

        ${contextMsg ? `
          <div class="notif-chat__context">
            <div class="notif-chat__context-label">Notificación original</div>
            <div class="notif-chat__context-msg">${this._esc(contextMsg)}</div>
          </div>
        ` : ''}

        <div class="notif-chat__messages" id="notif-chat-messages"></div>
        ${inputBar}
      </div>
    `;
  }

  _renderChatMessages() {
    const container = this._rootEl?.querySelector('#notif-chat-messages');
    if (!container) return;

    if (!this._chatMessages.length) {
      container.innerHTML = `<div class="notif-chat__empty">Envía el primer mensaje</div>`;
      return;
    }

    const myPhone = this._user.phone;
    container.innerHTML = this._chatMessages.map(msg => {
      const isMine = msg.from === myPhone;
      return `
        <div class="notif-chat__msg notif-chat__msg--${isMine ? 'sent' : 'received'}">
          <div class="notif-chat__msg-text">${this._esc(msg.text)}</div>
          <div class="notif-chat__msg-time">${this._formatTime(msg.createdAt)}</div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  _updateChatOnlineStatus() {
    const statusEl = this._rootEl?.querySelector('#notif-chat-status');
    if (statusEl) {
      statusEl.innerHTML = `
        <span class="notif-chat__status-dot notif-chat__status-dot--${this._chatOtherOnline ? 'online' : 'offline'}"></span>
        ${this._chatOtherOnline ? 'En línea' : 'Desconectado'}
      `;
    }
    // Re-render panel to update input bar state and video button
    if (this._panelOpen && this._activeChat) this._renderPanelContent();
  }

  /* ── Compose form ── */
  _buildCompose() {
    if (this._isSuperAdmin) {
      const clients = this._users.filter(u => u.role !== 'superadmin');
      const cardsHTML = clients.map(u => {
        const bizKey = u.businesses?.[0] || null;
        const biz = bizKey ? BIZ_BRANDING[bizKey] : null;
        const color = biz?.color || '#8B5CF6';
        const initials = (u.name || u.phone || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const isOnline = this._isOnline(u.phone);
        const isSelected = this._selectedRecipients.has(u.phone);
        const avatarInner = biz?.photo
          ? `<img src="${biz.photo}" alt="${this._esc(u.name)}" />`
          : `<span style="color:${color};font-weight:600;font-size:12px;">${initials}</span>`;
        return `
          <button class="notif-user-card ${isSelected ? 'notif-user-card--selected' : ''}" data-phone="${u.phone}">
            <div class="notif-user-card__avatar" style="border-color:${color}30;background:${color}10;">
              ${avatarInner}
              ${isOnline ? '<span class="notif-user-card__online"></span>' : ''}
            </div>
            <div class="notif-user-card__info">
              <div class="notif-user-card__name">${this._esc(u.name || u.phone)}</div>
              <div class="notif-user-card__biz" style="color:${color};">${biz ? biz.name : (bizKey || 'Sin negocio')}</div>
            </div>
            <div class="notif-user-card__check">${ICONS.check}</div>
          </button>
        `;
      }).join('');

      const count = this._selectedRecipients.size;
      const countLabel = count > 0 ? `${count} seleccionado${count > 1 ? 's' : ''}` : '';

      return `
        <div class="notif-compose">
          <label class="notif-compose__label">
            Destinatarios
            <span class="notif-compose__count" id="notif-recipient-count"${!count ? ' style="display:none;"' : ''}>${countLabel}</span>
          </label>
          <div class="notif-user-cards" id="notif-user-cards">${cardsHTML}</div>
          <label class="notif-compose__label">Mensaje</label>
          <textarea class="notif-textarea" id="notif-message" placeholder="Escribe tu notificación..."></textarea>
          <div class="notif-compose__row">
            <label class="notif-toggle">
              <input type="checkbox" id="notif-requires-reply" checked />
              <span class="notif-toggle__track"></span>
              Requiere respuesta
            </label>
          </div>
          <div class="notif-compose__row">
            <label class="notif-toggle">
              <input type="checkbox" id="notif-send-push" />
              <span class="notif-toggle__track"></span>
              📲 Enviar también como push
            </label>
          </div>
          <button class="notif-send-btn" id="notif-send-btn" ${!count ? 'disabled' : ''}>
            ${count > 1 ? `Enviar a ${count} usuarios` : 'Enviar Notificación'}
          </button>
        </div>
      `;
    } else {
      return `
        <div class="notif-compose">
          <label class="notif-compose__label">Mensaje para ACCIOS</label>
          <textarea class="notif-textarea" id="notif-message" placeholder="Escribe tu solicitud o notificación..."></textarea>
          <label class="notif-compose__label">Prioridad</label>
          <div class="notif-priority-row" id="notif-priority-row">
            <button class="notif-priority-chip ${this._selectedPriority === 'normal' ? 'notif-priority-chip--active' : ''}" data-priority="normal">Normal</button>
            <button class="notif-priority-chip ${this._selectedPriority === 'alta' ? 'notif-priority-chip--active' : ''}" data-priority="alta">Alta</button>
            <button class="notif-priority-chip ${this._selectedPriority === 'urgente' ? 'notif-priority-chip--active' : ''}" data-priority="urgente">Urgente</button>
          </div>
          <button class="notif-send-btn" id="notif-send-btn">Enviar</button>
        </div>
      `;
    }
  }

  _updateRecipientCount(panel) {
    const count = this._selectedRecipients.size;
    const countEl = panel.querySelector('#notif-recipient-count');
    const sendBtn = panel.querySelector('#notif-send-btn');
    if (countEl) {
      countEl.textContent = count > 0 ? `${count} seleccionado${count > 1 ? 's' : ''}` : '';
      countEl.style.display = count > 0 ? '' : 'none';
    }
    if (sendBtn) {
      sendBtn.disabled = count === 0;
      sendBtn.textContent = count > 1 ? `Enviar a ${count} usuarios` : 'Enviar Notificación';
    }
  }

  _attachComposeListeners(panel) {
    // Priority chips (client only)
    panel.querySelectorAll('.notif-priority-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this._selectedPriority = chip.dataset.priority;
        panel.querySelectorAll('.notif-priority-chip').forEach(c => c.classList.remove('notif-priority-chip--active'));
        chip.classList.add('notif-priority-chip--active');
      });
    });

    // User card selection (admin only)
    panel.querySelectorAll('.notif-user-card').forEach(card => {
      card.addEventListener('click', () => {
        const phone = card.dataset.phone;
        if (this._selectedRecipients.has(phone)) {
          this._selectedRecipients.delete(phone);
          card.classList.remove('notif-user-card--selected');
        } else {
          this._selectedRecipients.add(phone);
          card.classList.add('notif-user-card--selected');
        }
        this._updateRecipientCount(panel);
      });
    });

    const sendBtn = panel.querySelector('#notif-send-btn');
    if (!sendBtn) return;

    sendBtn.addEventListener('click', async () => {
      const msgEl = panel.querySelector('#notif-message');
      const msg = msgEl?.value?.trim();
      if (!msg) { Toast.warning('Escribe un mensaje'); return; }
      sendBtn.disabled = true;
      sendBtn.textContent = 'Enviando...';
      try {
        if (this._isSuperAdmin) {
          if (this._selectedRecipients.size === 0) {
            Toast.warning('Selecciona al menos un destinatario');
            sendBtn.disabled = false;
            this._updateRecipientCount(panel);
            return;
          }
          const requiresReply = panel.querySelector('#notif-requires-reply')?.checked ?? true;
          const sendPush = panel.querySelector('#notif-send-push')?.checked ?? false;
          const recipients = [...this._selectedRecipients];
          const promises = recipients.map(phone => {
            const user = this._users.find(u => u.phone === phone);
            return this._sendNotification(phone, user?.name || phone, msg, requiresReply, 'normal');
          });
          await Promise.all(promises);
          // Send push notifications if checkbox was checked
          if (sendPush && recipients.length > 0) {
            this._sendPushToUsers(recipients, 'ACCIOS CORE', msg);
          }
          this._selectedRecipients.clear();
        } else {
          const admins = this._users.filter(u => u.role === 'superadmin');
          const admin = admins[0];
          if (!admin) { Toast.error('No se encontró administrador'); sendBtn.disabled = false; sendBtn.textContent = 'Enviar'; return; }
          await this._sendNotification(admin.phone, admin.name || 'Admin', msg, true, this._selectedPriority);
        }
        msgEl.value = '';
        sendBtn.disabled = false;
        sendBtn.textContent = this._isSuperAdmin ? 'Enviar Notificación' : 'Enviar';
        this._activeTab = 'history';
        this._renderPanelContent();
      } catch (err) {
        console.error('[NotifSystem] Send error:', err);
        sendBtn.disabled = false;
        sendBtn.textContent = 'Error — Reintentar';
      }
    });
  }

  /* ── History / Timeline ── */
  _buildHistory() {
    if (this._notifications.length === 0) {
      return `<div class="notif-empty">${ICONS.inbox}<div>Sin notificaciones</div></div>`;
    }
    return this._isSuperAdmin
      ? `<div class="notif-history">${this._buildAdminTimeline()}</div>`
      : `<div class="notif-history">${this._buildClientHistory()}</div>`;
  }

  _buildAdminTimeline() {
    const groups = {};
    this._notifications.forEach(n => {
      const otherPhone = n._dir === 'sent' ? n.recipientPhone : n.senderPhone;
      const otherName = n._dir === 'sent' ? n.recipientName : n.senderName;
      const otherBiz = n._dir === 'sent'
        ? (this._users.find(u => u.phone === otherPhone)?.businesses?.[0] || null)
        : (n.senderBusiness || null);
      if (!groups[otherPhone]) groups[otherPhone] = { name: otherName, biz: otherBiz, items: [], unread: 0 };
      groups[otherPhone].items.push(n);
      if ((n._dir === 'received' && !n.read) || (n._dir === 'sent' && n.replies?.length > 0 && !n.repliesRead)) groups[otherPhone].unread++;
    });

    // Sort: online users first, then by most recent message
    const sortedEntries = Object.entries(groups).sort(([phoneA, a], [phoneB, b]) => {
      const aOnline = this._isOnline(phoneA) ? 1 : 0;
      const bOnline = this._isOnline(phoneB) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      const aTime = a.items[0]?.createdAt || '';
      const bTime = b.items[0]?.createdAt || '';
      return bTime.localeCompare(aTime);
    });

    return sortedEntries.map(([phone, group]) => {
      const biz = group.biz ? BIZ_BRANDING[group.biz] : null;
      const color = biz?.color || '#8B5CF6';
      const initials = (group.name || phone).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const avatarHTML = biz?.photo
        ? `<img src="${biz.photo}" alt="${group.name}" />`
        : `<span class="notif-client-avatar-initials">${initials}</span>`;
      const itemsHTML = group.items.map(n => this._buildTimelineItem(n)).join('');
      const isOnline = this._isOnline(phone);
      const isCollapsed = this._collapsedGroups.has(phone);

      // Preview: most recent message
      const lastItem = group.items[0];
      const lastPreview = lastItem ? (lastItem.message || '').substring(0, 50) : '';
      const lastTime = lastItem ? this._formatTime(lastItem.createdAt) : '';
      const lastDir = lastItem?._dir === 'sent' ? 'Tú: ' : '';

      return `
        <div class="notif-client-group" data-group-phone="${phone}">
          <div class="notif-client-header notif-client-header--clickable" data-toggle-phone="${phone}">
            <div class="notif-client-avatar" style="border-color:${color}30;">${avatarHTML}</div>
            <div class="notif-client-header__content">
              <div class="notif-client-header__top">
                <span class="notif-client-name">${this._esc(group.name || phone)}</span>
                ${isOnline ? '<span class="notif-online-indicator"></span>' : ''}
                ${group.unread > 0 ? `<span class="notif-client-unread">${group.unread}</span>` : ''}
              </div>
              <div class="notif-client-header__preview">
                <span class="notif-client-preview-text">${lastDir}${this._esc(lastPreview)}</span>
                <span class="notif-timeline-time">${lastTime}</span>
              </div>
            </div>
            <button class="notif-delete-btn notif-delete-btn--group" data-delete-phone="${phone}" title="Eliminar conversación">
              ${ICONS.trash}
            </button>
            <div class="notif-client-chevron ${isCollapsed ? 'notif-client-chevron--collapsed' : ''}">
              ${ICONS.chevronDown}
            </div>
          </div>
          <div class="notif-timeline" ${isCollapsed ? 'style="display:none;"' : ''}>${itemsHTML}</div>
        </div>
      `;
    }).join('');
  }

  _buildClientHistory() {
    return `<div class="notif-timeline">${this._notifications.map(n => this._buildTimelineItem(n)).join('')}</div>`;
  }

  _buildTimelineItem(n) {
    const isSent = n._dir === 'sent';
    const isUnread = isSent ? (n.replies?.length > 0 && !n.repliesRead) : !n.read;
    const dirLabel = isSent ? 'Enviado' : 'Recibido';
    const dirClass = isSent ? 'sent' : 'received';

    // Chat button — only SuperAdmin can see online status and initiate chats
    const otherPhone = isSent ? n.recipientPhone : n.senderPhone;
    const otherOnline = this._isSuperAdmin && this._isOnline(otherPhone);

    let badges = '';
    if (n.requiresReply && isSent) badges += `<span class="notif-chip notif-chip--reply-needed">Requiere respuesta</span>`;
    if (isUnread) badges += `<span class="notif-chip notif-chip--new">Nuevo</span>`;
    if (n.priority && n.priority !== 'normal') badges += `<span class="notif-chip notif-chip--${n.priority}">${n.priority}</span>`;

    let repliesHTML = '';
    if (n.replies?.length > 0) {
      repliesHTML = `<div class="notif-timeline-replies">${n.replies.map(r => `
        <div class="notif-timeline-reply">
          ${this._esc(r.text)}
          <div class="notif-timeline-reply-meta">${this._esc(r.fromName || r.from)} · ${this._formatTime(r.createdAt)}</div>
        </div>
      `).join('')}</div>`;
    }

    const chatBtnHTML = otherOnline ? `
      <button class="notif-chat-inline-btn" data-notif-id="${n.id}" title="Iniciar chat">
        ${ICONS.chat}
        <span class="notif-online-dot"></span>
      </button>
    ` : '';

    const deleteBtnHTML = this._isSuperAdmin ? `
      <button class="notif-delete-btn notif-delete-btn--msg" data-delete-notif="${n.id}" title="Eliminar">
        ${ICONS.trash}
      </button>
    ` : '';

    return `
      <div class="notif-timeline-item notif-timeline-item--${dirClass} ${isUnread ? 'notif-timeline-item--unread' : ''}"
           data-notif-id="${n.id}">
        <div class="notif-timeline-item__actions">
          ${chatBtnHTML}
          ${deleteBtnHTML}
        </div>
        <div class="notif-timeline-meta">
          <span class="notif-timeline-dir notif-timeline-dir--${dirClass}">${dirLabel}</span>
          <span class="notif-timeline-time">${this._formatTime(n.createdAt)}</span>
        </div>
        <div class="notif-timeline-msg">${this._esc(n.message)}</div>
        ${badges ? `<div class="notif-timeline-badges">${badges}</div>` : ''}
        ${repliesHTML}
      </div>
    `;
  }

  _attachHistoryListeners(panel) {
    // Mark as read on click
    panel.querySelectorAll('.notif-timeline-item--unread[data-notif-id]').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.notifId;
        const n = this._notifications.find(x => x.id === id);
        if (n?._dir === 'sent' && n.replies?.length > 0 && !n.repliesRead) this._markRepliesRead(id);
        if (n?._dir === 'received' && !n.read) this._markAsRead(id);
      });
    });

    // Chat inline buttons
    panel.querySelectorAll('.notif-chat-inline-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const notifId = btn.dataset.notifId;
        const notif = this._notifications.find(n => n.id === notifId);
        if (notif) this._startChat(notif);
      });
    });

    // Collapse/expand group headers (direct DOM toggle — no re-render)
    panel.querySelectorAll('.notif-client-header--clickable').forEach(header => {
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking delete button
        if (e.target.closest('.notif-delete-btn')) return;
        const phone = header.dataset.togglePhone;
        if (this._collapsedGroups.has(phone)) {
          this._collapsedGroups.delete(phone);
        } else {
          this._collapsedGroups.add(phone);
        }
        const group = header.closest('.notif-client-group');
        const timeline = group?.querySelector('.notif-timeline');
        const chevron = header.querySelector('.notif-client-chevron');
        if (timeline) {
          const isCollapsed = this._collapsedGroups.has(phone);
          timeline.style.display = isCollapsed ? 'none' : '';
          chevron?.classList.toggle('notif-client-chevron--collapsed', isCollapsed);
        }
      });
    });

    // Delete individual messages (SuperAdmin)
    if (this._isSuperAdmin) {
      panel.querySelectorAll('.notif-delete-btn--msg').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const notifId = btn.dataset.deleteNotif;
          this._showDeleteConfirm(btn, '¿Eliminar este mensaje?', () => this._deleteNotification(notifId));
        });
      });

      // Delete entire conversation group
      panel.querySelectorAll('.notif-delete-btn--group').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const phone = btn.dataset.deletePhone;
          this._showDeleteConfirm(btn, '¿Eliminar toda la conversación?', () => this._deleteConversation(phone));
        });
      });
    }
  }

  /* ═══════════════════════════════════════════════════════
     CLIENT POPUP
     ═══════════════════════════════════════════════════════ */

  _showPopup(notification) {
    this._currentPopupId = notification.id;
    const container = this._rootEl.querySelector('#notif-popup-container');
    if (!container) return;

    const biz = notification.senderBusiness ? BIZ_BRANDING[notification.senderBusiness] : null;
    const color = biz?.color || '#f97316';
    const photo = biz?.photo || null;
    const senderInitials = (notification.senderName || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const avatarHTML = photo
      ? `<img src="${photo}" alt="${notification.senderName}" />`
      : `<span class="notif-popup__avatar-initials" style="color:${color};">${senderInitials}</span>`;

    // Chat button — only SuperAdmin can see online status and start chats
    const chatBtnHTML = (this._isSuperAdmin && this._isOnline(notification.senderPhone)) ? `
      <button class="notif-popup__btn notif-popup__btn--chat" id="notif-popup-chat-btn">
        ${ICONS.chat} Chatear
      </button>
    ` : '';

    const replySection = notification.requiresReply ? `
      <div class="notif-popup__reply">
        <textarea class="notif-popup__reply-input" id="notif-popup-reply-input" placeholder="Escribe tu respuesta..."></textarea>
        <div class="notif-popup__actions">
          <button class="notif-popup__btn notif-popup__btn--reply" id="notif-popup-reply-btn">Responder</button>
          ${chatBtnHTML}
        </div>
      </div>
    ` : `
      <div class="notif-popup__reply">
        <div class="notif-popup__actions">
          <button class="notif-popup__btn notif-popup__btn--dismiss" id="notif-popup-dismiss-btn">Entendido</button>
          ${chatBtnHTML}
        </div>
      </div>
    `;

    let priorityChip = '';
    if (notification.priority && notification.priority !== 'normal') {
      priorityChip = `<span class="notif-chip notif-chip--${notification.priority}">${notification.priority}</span>`;
    }

    container.innerHTML = `
      <div class="notif-popup" id="notif-popup" style="border-color: ${color}30; --notif-color: ${color};">
        <div class="notif-popup__accent" style="background: linear-gradient(90deg, transparent, ${color}, transparent);"></div>
        <div class="notif-popup__header">
          <div class="notif-popup__avatar" style="border-color: ${color}30; background: ${color}10;">
            ${avatarHTML}
          </div>
          <div class="notif-popup__sender">
            <div class="notif-popup__sender-name">${this._esc(notification.senderName || 'ACCIOS')}</div>
            <div class="notif-popup__sender-sub">${biz ? biz.name : 'ACCIOS CORE'}</div>
          </div>
          <button class="notif-popup__close" id="notif-popup-close">${ICONS.x}</button>
        </div>
        <div class="notif-popup__body">
          <div class="notif-popup__message">${this._esc(notification.message)}</div>
          <div class="notif-popup__time">
            ${this._formatTime(notification.createdAt)}
            ${priorityChip ? `<div class="notif-popup__priority">${priorityChip}</div>` : ''}
          </div>
        </div>
        ${replySection}
      </div>
    `;

    requestAnimationFrame(() => {
      const popup = container.querySelector('#notif-popup');
      if (popup) popup.classList.add('notif-popup--show');
    });

    setTimeout(() => {
      if (this._currentPopupId === notification.id) this._markAsRead(notification.id);
    }, 2000);

    container.querySelector('#notif-popup-close')?.addEventListener('click', () => this._dismiss(notification.id));
    container.querySelector('#notif-popup-dismiss-btn')?.addEventListener('click', () => this._dismiss(notification.id));
    container.querySelector('#notif-popup-reply-btn')?.addEventListener('click', async () => {
      const input = container.querySelector('#notif-popup-reply-input');
      const text = input?.value?.trim();
      if (!text) return;
      await this._sendReply(notification.id, text);
      this._dismiss(notification.id);
    });
    container.querySelector('#notif-popup-chat-btn')?.addEventListener('click', () => {
      this._dismiss(notification.id);
      this._startChat(notification);
    });
  }

  _removePopup() {
    const container = this._rootEl?.querySelector('#notif-popup-container');
    if (!container) return;
    const popup = container.querySelector('#notif-popup');
    if (popup) {
      popup.classList.remove('notif-popup--show');
      setTimeout(() => { container.innerHTML = ''; }, 400);
    } else {
      container.innerHTML = '';
    }
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */

  _formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin}m`;
    if (diffHr < 24) return `Hace ${diffHr}h`;
    const day = d.getDate();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hrs = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${months[d.getMonth()]}, ${hrs}:${mins}`;
  }

  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

export default new NotificationSystem();
