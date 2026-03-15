import { apiUrl } from '../services/apiConfig.js';

export class AdminChatPanel {
  constructor(container, { users, businesses, clients, transactions, episodes, comments, appointments, quotes }) {
    this.container = container;
    this.users = users || [];
    this.businesses = businesses || [];
    this.clients = clients || [];
    this.transactions = transactions || [];
    this.episodes = episodes || [];
    this.comments = comments || [];
    this.appointments = appointments || [];
    this.quotes = quotes || [];
    this.messages = [];
    this.isLoading = false;
    this._inputEl = null;
    this._messagesEl = null;
    this._micBtn = null;
    this._recognition = null;
    this._isListening = false;
    this._interimText = '';
  }

  render() {
    this.container.innerHTML = `
      <div class="admin-chat">
        <div class="admin-chat__messages" id="admin-chat-messages">
          <div class="admin-chat__bubble admin-chat__bubble--assistant">
            <p>Hola! Soy tu asistente de ACCIOS CORE. Puedo responder preguntas sobre usuarios, negocios, citas, cotizaciones, episodios y mas.</p>
            <p style="margin-top:var(--space-2);color:var(--text-dim);font-size:0.75rem;">Ejemplos: "Cuantos usuarios hay?" · "Que negocios estan activos?" · "Hay citas pendientes?"</p>
          </div>
        </div>
        <div class="admin-chat__input-bar">
          <textarea class="admin-chat__input" id="admin-chat-input" placeholder="Escribe o usa el microfono..." rows="1"></textarea>
          <button class="admin-chat__mic-btn" id="admin-chat-mic" title="Hablar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
          <button class="admin-chat__send-btn" id="admin-chat-send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
          </button>
        </div>
      </div>
    `;

    this._messagesEl = this.container.querySelector('#admin-chat-messages');
    this._inputEl = this.container.querySelector('#admin-chat-input');
    this._micBtn = this.container.querySelector('#admin-chat-mic');
    const sendBtn = this.container.querySelector('#admin-chat-send');

    // Auto-resize textarea
    this._inputEl.addEventListener('input', () => {
      this._inputEl.style.height = 'auto';
      this._inputEl.style.height = Math.min(this._inputEl.scrollHeight, 120) + 'px';
    });

    // Send on Enter (shift+enter for newline)
    this._inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._handleSend();
      }
    });

    sendBtn.addEventListener('click', () => this._handleSend());

    // Voice input
    this._initSpeechRecognition();
    this._micBtn.addEventListener('click', () => this._toggleVoice());
  }

  // ─── VOICE ─────────────────────────────────────────────

  _initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this._micBtn.style.display = 'none';
      return;
    }
    this._recognition = new SR();
    this._recognition.lang = 'es-PA';
    this._recognition.interimResults = true;
    this._recognition.continuous = true;

    this._recognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      this._inputEl.value = final + interim;
      this._inputEl.style.height = 'auto';
      this._inputEl.style.height = Math.min(this._inputEl.scrollHeight, 120) + 'px';
      this._interimText = interim;
    };

    this._recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error);
      }
      this._stopVoice();
    };

    this._recognition.onend = () => {
      // If still in listening mode, restart (continuous behavior)
      if (this._isListening) {
        try { this._recognition.start(); } catch (_) {}
      }
    };
  }

  _toggleVoice() {
    if (this._isListening) {
      this._stopVoice();
      // Auto-send if there's text
      if (this._inputEl.value.trim()) {
        this._handleSend();
      }
    } else {
      this._startVoice();
    }
  }

  _startVoice() {
    if (!this._recognition) return;
    this._isListening = true;
    this._micBtn.classList.add('admin-chat__mic-btn--active');
    this._inputEl.placeholder = 'Escuchando...';
    try { this._recognition.start(); } catch (_) {}
  }

  _stopVoice() {
    this._isListening = false;
    this._micBtn.classList.remove('admin-chat__mic-btn--active');
    this._inputEl.placeholder = 'Escribe o usa el microfono...';
    try { this._recognition.stop(); } catch (_) {}
  }

  // ─── SEND ──────────────────────────────────────────────

  async _handleSend() {
    if (this._isListening) this._stopVoice();

    const text = this._inputEl.value.trim();
    if (!text || this.isLoading) return;

    this._inputEl.value = '';
    this._inputEl.style.height = 'auto';

    this._addBubble('user', text);
    this.messages.push({ role: 'user', content: text });

    this.isLoading = true;
    const typingEl = this._showTyping();

    try {
      const response = await fetch(apiUrl('/api/claude-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.messages,
          systemPrompt: this._buildSystemPrompt()
        })
      });

      if (!response.ok) throw new Error('Error en el servidor');
      const data = await response.json();
      const content = data.content;

      typingEl.remove();
      this.isLoading = false;

      this._addBubble('assistant', content);
      this.messages.push({ role: 'assistant', content });

    } catch (err) {
      typingEl.remove();
      this.isLoading = false;
      this._addBubble('assistant', 'Error al comunicarse con el asistente. Intenta de nuevo.');
      console.error('AdminChat error:', err);
    }
  }

  // ─── SYSTEM PROMPT ─────────────────────────────────────

  _buildSystemPrompt() {
    const userList = this.users.map(u => `- ${u.name || u.phone} | Tel: ${u.phone} | Rol: ${u.role || 'usuario'}`).join('\n');

    const bizList = this.businesses.map(b => `- ${b.name} | Categoria: ${b.category || '-'} | Status: ${b.status || 'activo'}`).join('\n');

    const clientList = this.clients.map(c => `- ${c.name} (ID: ${c.clientId || c.id})`).join('\n');

    const pendingTxns = this.transactions
      .filter(t => t.status !== 'cobrado')
      .map(t => `- ${t.clientName}: "${t.description}" — Pendiente: $${t.pendingAmount || t.totalAmount} (${t.status})`)
      .join('\n');

    const epList = this.episodes.slice(0, 20).map(e => `- ${e.title || e.name} | Negocio: ${e.businessName || '-'}`).join('\n');

    const apptList = this.appointments.slice(0, 20).map(a => `- ${a.clientName || a.name} | ${a.date || '-'} ${a.time || ''} | Status: ${a.status || 'pendiente'}`).join('\n');

    const quoteList = this.quotes.slice(0, 20).map(q => `- ${q.clientName || q.businessName || '-'} | $${q.total || q.amount || 0} | Status: ${q.status || 'pendiente'}`).join('\n');

    const commentCount = this.comments.length;

    return `Eres el asistente inteligente de ACCIOS CORE, un ecosistema digital que gestiona multiples negocios, usuarios, finanzas, citas, cotizaciones y mas. Responde siempre en espanol.

RESUMEN DEL ECOSISTEMA:
- ${this.users.length} usuarios registrados
- ${this.businesses.length} negocios
- ${this.clients.length} clientes financieros
- ${this.transactions.length} transacciones (${this.transactions.filter(t => t.status !== 'cobrado').length} pendientes)
- ${this.appointments.length} citas
- ${this.quotes.length} cotizaciones
- ${this.episodes.length} episodios/capitulos
- ${commentCount} comentarios

USUARIOS REGISTRADOS:
${userList || '(Ninguno)'}

NEGOCIOS:
${bizList || '(Ninguno)'}

CLIENTES FINANCIEROS:
${clientList || '(Ninguno)'}

TRANSACCIONES PENDIENTES:
${pendingTxns || '(Sin pendientes)'}

EPISODIOS RECIENTES:
${epList || '(Ninguno)'}

CITAS:
${apptList || '(Ninguna)'}

COTIZACIONES:
${quoteList || '(Ninguna)'}

REGLAS:
1. Responde siempre en espanol
2. Usa la informacion disponible para responder consultas sobre el ecosistema
3. Si no tienes la informacion exacta, dilo honestamente
4. Puedes hacer calculos, resumenes y analisis con los datos disponibles
5. Se conciso pero completo en tus respuestas
6. Los montos son en USD ($)`;
  }

  // ─── UI HELPERS ────────────────────────────────────────

  _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  _addBubble(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `admin-chat__bubble admin-chat__bubble--${role}`;

    const formatted = this._esc(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    bubble.innerHTML = `<div>${formatted}</div>`;
    this._messagesEl.appendChild(bubble);

    bubble.style.opacity = '0';
    bubble.style.transform = role === 'user' ? 'translateX(10px)' : 'translateX(-10px)';
    requestAnimationFrame(() => {
      bubble.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateX(0)';
    });

    this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
  }

  _showTyping() {
    const typing = document.createElement('div');
    typing.className = 'admin-chat__bubble admin-chat__bubble--assistant admin-chat__typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    this._messagesEl.appendChild(typing);
    this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
    return typing;
  }

  // Update context with fresh data
  updateContext({ users, businesses, clients, transactions, episodes, comments, appointments, quotes }) {
    if (users) this.users = users;
    if (businesses) this.businesses = businesses;
    if (clients) this.clients = clients;
    if (transactions) this.transactions = transactions;
    if (episodes) this.episodes = episodes;
    if (comments) this.comments = comments;
    if (appointments) this.appointments = appointments;
    if (quotes) this.quotes = quotes;
  }

  destroy() {
    if (this._isListening) this._stopVoice();
    this.messages = [];
    this._inputEl = null;
    this._messagesEl = null;
    this._micBtn = null;
  }
}
