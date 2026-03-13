import { Toast } from '../components/Toast.js';
import userAuth from '../services/userAuth.js';
import {
  db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc,
  query, where, orderBy, onSnapshot, limit
} from '../services/firebase.js';

/* ─────────────────────────────────────────────────────
 *  COMM CENTER — Real-time Chat + Jitsi Video Calls
 *  Futuristic communication hub for ACCIOS CORE
 * ───────────────────────────────────────────────────── */

export class CommCenter {
  constructor(container, currentUser, sub) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getSession();
    this.sub = sub;

    // State
    this.contacts = [];
    this.conversations = [];
    this.activeConversation = null;
    this.activeContact = null;
    this.messages = [];
    this.meetingLogs = [];

    // Firestore listeners
    this._convUnsub = null;
    this._msgUnsub = null;
    this._presenceUnsubs = [];
    this._presenceInterval = null;
    this._presenceMap = {};

    // Jitsi
    this._jitsiApi = null;
    this._jitsiLoaded = false;
  }

  /* ── Render ──────────────────────────────────── */
  async render() {
    this.container.innerHTML = `
      <section class="comms-page">
        <div class="comms-header">
          <div class="comms-header__left">
            <button class="comms-back-btn" id="comms-back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
              Volver
            </button>
            <h1 class="comms-title">COMM CENTER</h1>
            <span class="comms-subtitle">Sistema de Comunicaciones</span>
          </div>
          <div class="comms-header__right">
            <div class="comms-live-indicator">
              <span class="comms-live-dot"></span>
              <span>EN LÍNEA</span>
            </div>
          </div>
        </div>
        <div class="comms-body" id="comms-body">
          <!-- Sidebar: Contacts -->
          <aside class="comms-sidebar">
            <div class="comms-sidebar__search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input class="comms-search" id="comms-search" placeholder="Buscar contacto...">
            </div>
            <div class="comms-contact-list" id="comms-contact-list">
              <div style="padding:var(--space-6);text-align:center;color:var(--text-muted);font-size:var(--text-sm);">Cargando contactos...</div>
            </div>
          </aside>

          <!-- Center: Chat -->
          <main class="comms-chat" id="comms-chat">
            <div class="comms-chat__header" id="comms-chat-header"></div>
            <div class="comms-chat__messages" id="comms-chat-messages">
              <div class="comms-chat__empty">
                <div class="comms-chat__empty-icon">📡</div>
                <div class="comms-chat__empty-text">Selecciona un contacto para iniciar una conversación</div>
              </div>
            </div>
          </main>

          <!-- Right: Info Panel -->
          <aside class="comms-info-panel" id="comms-info-panel">
            <div class="comms-info__contact-card" id="comms-info-card">
              <div class="comms-info__avatar-lg">AC</div>
              <div class="comms-info__name">ACCIOS CORE</div>
              <div class="comms-info__phone">Comm Center</div>
            </div>
            <div class="comms-info__actions" id="comms-actions" style="display:none;"></div>
            <div>
              <h3 class="comms-info__section-title">Historial de Llamadas</h3>
              <div class="comms-meeting-list" id="comms-meeting-list">
                <div style="font-size:0.7rem;color:var(--text-muted);padding:var(--space-3) 0;">Sin llamadas recientes</div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    `;

    this._attachListeners();
    await this._loadContacts();
    this._subscribeToConversations();
    this._startPresenceHeartbeat();
    this._loadJitsiAPI();
  }

  /* ── Load contacts from Firestore users ──── */
  async _loadContacts() {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const myPhone = this.currentUser.phone;
      this.contacts = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.phone !== myPhone && u.id !== myPhone);
      this._renderContactList();
    } catch (err) {
      console.error('[CommCenter] Load contacts error:', err);
      Toast.error('Error cargando contactos');
    }
  }

  /* ── Render contact list ─────────────────── */
  _renderContactList() {
    const listEl = this.container.querySelector('#comms-contact-list');
    if (!listEl) return;

    const searchTerm = (this.container.querySelector('#comms-search')?.value || '').toLowerCase();
    const filtered = this.contacts.filter(c =>
      (c.name || '').toLowerCase().includes(searchTerm) ||
      (c.phone || c.id || '').includes(searchTerm)
    );

    if (!filtered.length) {
      listEl.innerHTML = `<div style="padding:var(--space-6);text-align:center;color:var(--text-muted);font-size:var(--text-sm);">No se encontraron contactos</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(c => {
      const phone = c.phone || c.id;
      const initials = (c.name || '??').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const isOnline = this._isOnline(phone);
      const isActive = this.activeContact && (this.activeContact.phone || this.activeContact.id) === phone;
      const conv = this.conversations.find(cv => cv.participants?.includes(phone));
      const preview = conv?.lastMessage || '';
      const time = conv?.lastMessageAt ? this._formatTime(conv.lastMessageAt) : '';

      return `
        <div class="comms-contact${isActive ? ' active' : ''}" data-phone="${phone}">
          <div class="comms-contact__avatar">
            ${initials}
            <span class="comms-contact__status comms-contact__status--${isOnline ? 'online' : 'offline'}"></span>
          </div>
          <div class="comms-contact__info">
            <div class="comms-contact__name">${c.name || phone}</div>
            ${preview ? `<div class="comms-contact__preview">${this._escapeHtml(preview)}</div>` : ''}
          </div>
          ${time ? `<span class="comms-contact__time">${time}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  /* ── Subscribe to conversations ──────────── */
  _subscribeToConversations() {
    if (this._convUnsub) { this._convUnsub(); this._convUnsub = null; }

    const myPhone = this.currentUser.phone;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', myPhone),
      orderBy('lastMessageAt', 'desc')
    );

    this._convUnsub = onSnapshot(q, (snap) => {
      this.conversations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._renderContactList();
    }, (err) => {
      console.warn('[CommCenter] Conversations query error (index may need creation):', err);
    });
  }

  /* ── Open a contact / conversation ───────── */
  async _openContact(phone) {
    const contact = this.contacts.find(c => (c.phone || c.id) === phone);
    if (!contact) return;

    this.activeContact = contact;
    this._renderContactList();

    // Find or create conversation
    const conv = await this._startOrGetConversation(phone);
    this.activeConversation = conv;

    // Render chat header
    this._renderChatHeader();
    this._renderInfoPanel();

    // Show input bar
    const chatEl = this.container.querySelector('#comms-chat');
    if (chatEl && !chatEl.querySelector('.comms-chat__input-bar')) {
      const inputBar = document.createElement('div');
      inputBar.className = 'comms-chat__input-bar';
      inputBar.innerHTML = `
        <textarea class="comms-chat__input" id="comms-chat-input" placeholder="Escribe un mensaje..." rows="1"></textarea>
        <button class="comms-chat__send-btn" id="comms-send-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      `;
      chatEl.appendChild(inputBar);

      // Send handlers
      inputBar.querySelector('#comms-send-btn')?.addEventListener('click', () => this._sendMessage());
      inputBar.querySelector('#comms-chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendMessage(); }
      });
    }

    // Subscribe to messages
    this._subscribeToMessages(conv.id);

    // Load meeting history
    this._loadMeetingHistory(phone);
  }

  /* ── Find or create conversation ─────────── */
  async _startOrGetConversation(contactPhone) {
    const myPhone = this.currentUser.phone;

    // Check existing
    const existing = this.conversations.find(c =>
      c.participants?.includes(contactPhone) && c.participants?.includes(myPhone)
    );
    if (existing) return existing;

    // Create new
    const contact = this.contacts.find(c => (c.phone || c.id) === contactPhone);
    const now = new Date().toISOString();

    const docRef = await addDoc(collection(db, 'conversations'), {
      participants: [myPhone, contactPhone],
      participantNames: {
        [myPhone]: this.currentUser.name,
        [contactPhone]: contact?.name || contactPhone
      },
      lastMessage: '',
      lastMessageAt: now,
      lastMessageBy: '',
      createdAt: now,
      updatedAt: now
    });

    return { id: docRef.id, participants: [myPhone, contactPhone] };
  }

  /* ── Subscribe to messages ───────────────── */
  _subscribeToMessages(convId) {
    if (this._msgUnsub) { this._msgUnsub(); this._msgUnsub = null; }

    const q = query(
      collection(db, 'conversations', convId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(200)
    );

    this._msgUnsub = onSnapshot(q, (snap) => {
      this.messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._renderMessages();
    }, (err) => {
      console.warn('[CommCenter] Messages query error:', err);
    });
  }

  /* ── Send message ────────────────────────── */
  async _sendMessage(text, type = 'text') {
    const input = this.container.querySelector('#comms-chat-input');
    if (!text) text = input?.value;
    if (!text?.trim() || !this.activeConversation) return;

    const myPhone = this.currentUser.phone;
    const myName = this.currentUser.name;
    const now = new Date().toISOString();

    if (input) { input.value = ''; input.style.height = 'auto'; }

    await addDoc(collection(db, 'conversations', this.activeConversation.id, 'messages'), {
      sender: myPhone,
      senderName: myName,
      text: text.trim(),
      type,
      timestamp: now,
      read: false
    });

    await updateDoc(doc(db, 'conversations', this.activeConversation.id), {
      lastMessage: type === 'meet-link' ? '📹 Videollamada' : text.trim().substring(0, 100),
      lastMessageAt: now,
      lastMessageBy: myPhone,
      updatedAt: now
    });
  }

  /* ── Render messages ─────────────────────── */
  _renderMessages() {
    const container = this.container.querySelector('#comms-chat-messages');
    if (!container) return;

    if (!this.messages.length) {
      container.innerHTML = `
        <div class="comms-chat__empty">
          <div class="comms-chat__empty-icon">💬</div>
          <div class="comms-chat__empty-text">Envía el primer mensaje</div>
        </div>`;
      return;
    }

    const myPhone = this.currentUser.phone;
    let html = '';
    let lastDate = '';

    for (const msg of this.messages) {
      const msgDate = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString('es-PA') : '';
      if (msgDate && msgDate !== lastDate) {
        html += `<div class="comms-date-sep">${msgDate}</div>`;
        lastDate = msgDate;
      }

      const isMine = msg.sender === myPhone;
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' }) : '';

      if (msg.type === 'meet-link') {
        html += `
          <div class="comms-msg comms-msg--meet">
            <div>📹 <strong>Videollamada iniciada</strong></div>
            <a href="${this._escapeHtml(msg.text)}" target="_blank">Unirse a la llamada</a>
            <div class="comms-msg__time">${time}</div>
          </div>`;
      } else if (msg.type === 'system') {
        html += `<div class="comms-msg comms-msg--system">${this._escapeHtml(msg.text)}</div>`;
      } else {
        html += `
          <div class="comms-msg comms-msg--${isMine ? 'sent' : 'received'}">
            <div>${this._escapeHtml(msg.text)}</div>
            <div class="comms-msg__time">${time}</div>
          </div>`;
      }
    }

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  /* ── Render chat header ──────────────────── */
  _renderChatHeader() {
    const el = this.container.querySelector('#comms-chat-header');
    if (!el || !this.activeContact) return;

    const name = this.activeContact.name || this.activeContact.phone || this.activeContact.id;
    const phone = this.activeContact.phone || this.activeContact.id;
    const isOnline = this._isOnline(phone);

    el.innerHTML = `
      <div class="comms-chat__header-info">
        <div>
          <div class="comms-chat__header-name">${this._escapeHtml(name)}</div>
          <div class="comms-chat__header-status" style="color:${isOnline ? 'rgba(57,255,20,0.7)' : 'var(--text-muted)'}">
            ${isOnline ? 'En línea' : 'Desconectado'}
          </div>
        </div>
      </div>
      <div class="comms-chat__header-actions">
        <button class="comms-chat__header-btn" id="comms-header-call" title="Video Llamada">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        </button>
      </div>
    `;

    el.querySelector('#comms-header-call')?.addEventListener('click', () => this._startVideoCall());
  }

  /* ── Render info panel ───────────────────── */
  _renderInfoPanel() {
    if (!this.activeContact) return;

    const name = this.activeContact.name || this.activeContact.phone || this.activeContact.id;
    const phone = this.activeContact.phone || this.activeContact.id;
    const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const rawPhone = phone.replace('+507', '');

    const cardEl = this.container.querySelector('#comms-info-card');
    if (cardEl) {
      cardEl.innerHTML = `
        <div class="comms-info__avatar-lg">${initials}</div>
        <div class="comms-info__name">${this._escapeHtml(name)}</div>
        <div class="comms-info__phone">${phone}</div>
      `;
    }

    const actionsEl = this.container.querySelector('#comms-actions');
    if (actionsEl) {
      actionsEl.style.display = '';
      actionsEl.innerHTML = `
        <button class="comms-call-btn" id="comms-video-call">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Video Llamada
        </button>
        <a href="https://wa.me/507${rawPhone}" target="_blank" class="comms-call-btn comms-call-btn--wa" style="text-decoration:none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          WhatsApp
        </a>
      `;
      actionsEl.querySelector('#comms-video-call')?.addEventListener('click', () => this._startVideoCall());
    }
  }

  /* ── Load meeting history ────────────────── */
  async _loadMeetingHistory(contactPhone) {
    try {
      const myPhone = this.currentUser.phone;
      const logsSnap = await getDocs(query(
        collection(db, 'meeting_logs'),
        where('initiator', '==', myPhone),
        orderBy('startedAt', 'desc'),
        limit(10)
      ));
      this.meetingLogs = logsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(l => l.participant === contactPhone || l.initiator === contactPhone);

      const listEl = this.container.querySelector('#comms-meeting-list');
      if (!listEl) return;

      if (!this.meetingLogs.length) {
        listEl.innerHTML = `<div style="font-size:0.7rem;color:var(--text-muted);padding:var(--space-3) 0;">Sin llamadas con este contacto</div>`;
        return;
      }

      listEl.innerHTML = this.meetingLogs.map(l => {
        const date = l.startedAt ? new Date(l.startedAt).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
        return `<div class="comms-meeting-item">📹 ${date} <span class="comms-meeting-item__date">${l.notes || ''}</span></div>`;
      }).join('');
    } catch (err) {
      console.warn('[CommCenter] Meeting history load error (index may be needed):', err);
    }
  }

  /* ── Jitsi Meet — Load API ───────────────── */
  _loadJitsiAPI() {
    if (this._jitsiLoaded || document.querySelector('script[src*="jitsi"]')) {
      this._jitsiLoaded = true;
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.onload = () => { this._jitsiLoaded = true; };
    document.head.appendChild(script);
  }

  /* ── Jitsi Meet — Start Call ─────────────── */
  async _startVideoCall() {
    if (!this.activeConversation || !this.activeContact) {
      Toast.warning('Selecciona un contacto primero');
      return;
    }

    if (!this._jitsiLoaded || typeof JitsiMeetExternalAPI === 'undefined') {
      Toast.warning('Cargando sistema de video... intenta de nuevo en unos segundos');
      this._loadJitsiAPI();
      return;
    }

    const contactName = this.activeContact.name || this.activeContact.phone || '';
    const roomName = `accios-${this.activeConversation.id}-${Date.now()}`;
    const jitsiLink = `https://meet.jit.si/${roomName}`;

    // Switch chat area to video mode
    const body = this.container.querySelector('#comms-body');
    body?.classList.add('comms-video-active');

    const chatEl = this.container.querySelector('#comms-chat');
    if (!chatEl) return;

    chatEl.innerHTML = `
      <div class="comms-video-container" id="comms-video-container"></div>
      <div class="comms-video-overlay">
        <button class="comms-video-end-btn" id="comms-end-call">Colgar</button>
      </div>
    `;

    // Create Jitsi embed
    try {
      this._jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: document.getElementById('comms-video-container'),
        width: '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableModeratorIndicator: true,
          enableEmailInStats: false,
          prejoinPageEnabled: false
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'hangup'],
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
        },
        userInfo: {
          displayName: this.currentUser.name || 'ACCIOS User'
        }
      });

      // On hangup
      this._jitsiApi.addListener('readyToClose', () => this._endVideoCall());
    } catch (err) {
      console.error('[CommCenter] Jitsi init error:', err);
      Toast.error('Error iniciando videollamada');
      this._endVideoCall();
      return;
    }

    // End call button
    chatEl.querySelector('#comms-end-call')?.addEventListener('click', () => this._endVideoCall());

    // Send meet-link message in chat
    await this._sendMessage(jitsiLink, 'meet-link');

    // Save to meeting_logs
    const otherPhone = this.activeContact.phone || this.activeContact.id;
    await addDoc(collection(db, 'meeting_logs'), {
      initiator: this.currentUser.phone,
      initiatorName: this.currentUser.name,
      participant: otherPhone,
      participantName: this.activeContact.name || otherPhone,
      roomName,
      jitsiLink,
      conversationId: this.activeConversation.id,
      startedAt: new Date().toISOString(),
      notes: '',
      createdAt: new Date().toISOString()
    });

    Toast.success('Videollamada iniciada — link compartido en el chat');
  }

  /* ── Jitsi Meet — End Call ───────────────── */
  _endVideoCall() {
    if (this._jitsiApi) {
      try { this._jitsiApi.dispose(); } catch (_) {}
      this._jitsiApi = null;
    }

    const body = this.container.querySelector('#comms-body');
    body?.classList.remove('comms-video-active');

    // Restore chat area
    const chatEl = this.container.querySelector('#comms-chat');
    if (chatEl) {
      chatEl.innerHTML = `
        <div class="comms-chat__header" id="comms-chat-header"></div>
        <div class="comms-chat__messages" id="comms-chat-messages"></div>
        <div class="comms-chat__input-bar">
          <textarea class="comms-chat__input" id="comms-chat-input" placeholder="Escribe un mensaje..." rows="1"></textarea>
          <button class="comms-chat__send-btn" id="comms-send-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      `;

      chatEl.querySelector('#comms-send-btn')?.addEventListener('click', () => this._sendMessage());
      chatEl.querySelector('#comms-chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendMessage(); }
      });
    }

    // Re-render chat
    this._renderChatHeader();
    if (this.activeConversation) {
      this._subscribeToMessages(this.activeConversation.id);
    }

    Toast.info('Videollamada finalizada');
  }

  /* ── Presence ────────────────────────────── */
  _startPresenceHeartbeat() {
    const myPhone = this.currentUser.phone;
    const presRef = doc(db, 'presence', myPhone);

    setDoc(presRef, { online: true, lastSeen: new Date().toISOString(), page: 'comms' }, { merge: true });

    this._presenceInterval = setInterval(() => {
      setDoc(presRef, { online: true, lastSeen: new Date().toISOString(), page: 'comms' }, { merge: true });
    }, 60000);

    // Subscribe to all contacts' presence
    for (const c of this.contacts) {
      const phone = c.phone || c.id;
      const unsub = onSnapshot(doc(db, 'presence', phone), (snap) => {
        if (snap.exists()) {
          this._presenceMap[phone] = snap.data();
        }
      });
      this._presenceUnsubs.push(unsub);
    }
  }

  _isOnline(phone) {
    const p = this._presenceMap[phone];
    if (!p || !p.online) return false;
    // Stale check: offline if lastSeen > 2 min ago
    if (p.lastSeen) {
      const diff = Date.now() - new Date(p.lastSeen).getTime();
      if (diff > 120000) return false;
    }
    return true;
  }

  /* ── Event listeners ─────────────────────── */
  _attachListeners() {
    // Back button
    this.container.querySelector('#comms-back')?.addEventListener('click', () => {
      window.location.hash = '#home';
    });

    // Search
    this.container.querySelector('#comms-search')?.addEventListener('input', () => {
      this._renderContactList();
    });

    // Contact clicks (delegated)
    this.container.querySelector('#comms-contact-list')?.addEventListener('click', (e) => {
      const contactEl = e.target.closest('.comms-contact');
      if (contactEl) {
        const phone = contactEl.dataset.phone;
        if (phone) this._openContact(phone);
      }
    });
  }

  /* ── Helpers ─────────────────────────────── */
  _formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' });
  }

  _escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str || '';
    return el.innerHTML;
  }

  /* ── Cleanup ─────────────────────────────── */
  unmount() {
    // Mark offline
    const presRef = doc(db, 'presence', this.currentUser.phone);
    setDoc(presRef, { online: false, lastSeen: new Date().toISOString() }, { merge: true }).catch(() => {});

    // Clear heartbeat
    if (this._presenceInterval) clearInterval(this._presenceInterval);

    // Unsubscribe all Firestore listeners
    if (this._convUnsub) this._convUnsub();
    if (this._msgUnsub) this._msgUnsub();
    this._presenceUnsubs.forEach(u => u());

    // Destroy Jitsi
    if (this._jitsiApi) {
      try { this._jitsiApi.dispose(); } catch (_) {}
      this._jitsiApi = null;
    }
  }
}
