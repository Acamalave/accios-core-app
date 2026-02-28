import { apiUrl } from '../services/apiConfig.js';

export class ChatPanel {
  constructor(container, { clients, transactions, onDataSaved }) {
    this.container = container;
    this.clients = clients || [];
    this.transactions = transactions || [];
    this.onDataSaved = onDataSaved || (() => {});
    this.messages = [];
    this.isLoading = false;
    this._inputEl = null;
    this._messagesEl = null;
  }

  render() {
    // Build the chat HTML structure
    this.container.innerHTML = `
      <div class="fin-chat">
        <div class="fin-chat__messages" id="fin-chat-messages">
          <div class="fin-chat__bubble fin-chat__bubble--assistant">
            <p>Hola! Soy tu asistente financiero. Puedo ayudarte a registrar transacciones y pagos.</p>
            <p style="margin-top:var(--space-2);color:var(--text-dim);font-size:0.75rem;">Ejemplos: "Se imprimió por $50 para Rush Ride" · "Rush Ride abonó $200 a su factura"</p>
          </div>
        </div>
        <div class="fin-chat__input-bar">
          <textarea class="fin-chat__input" id="fin-chat-input" placeholder="Escribe un comando o pregunta..." rows="1"></textarea>
          <button class="fin-chat__send-btn" id="fin-chat-send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
          </button>
        </div>
      </div>
    `;

    this._messagesEl = this.container.querySelector('#fin-chat-messages');
    this._inputEl = this.container.querySelector('#fin-chat-input');
    const sendBtn = this.container.querySelector('#fin-chat-send');

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
  }

  async _handleSend() {
    const text = this._inputEl.value.trim();
    if (!text || this.isLoading) return;

    this._inputEl.value = '';
    this._inputEl.style.height = 'auto';

    // Add user bubble
    this._addBubble('user', text);
    this.messages.push({ role: 'user', content: text });

    // Show typing indicator
    this.isLoading = true;
    const typingEl = this._showTyping();

    try {
      // Call Claude API proxy
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

      // Remove typing indicator
      typingEl.remove();
      this.isLoading = false;

      // Parse for structured data (JSON blocks)
      const actionData = this._parseAction(content);

      if (actionData) {
        // Show the text part (before/after JSON)
        const cleanText = content.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*"action"[\s\S]*\}/g, '').trim();
        if (cleanText) {
          this._addBubble('assistant', cleanText);
        }
        // Show confirmation card
        this._showConfirmCard(actionData);
        this.messages.push({ role: 'assistant', content: content });
      } else {
        this._addBubble('assistant', content);
        this.messages.push({ role: 'assistant', content: content });
      }

    } catch (err) {
      typingEl.remove();
      this.isLoading = false;
      this._addBubble('assistant', 'Error al comunicarse con el asistente. Intenta de nuevo.');
      console.error('ChatPanel error:', err);
    }
  }

  _buildSystemPrompt() {
    const clientList = this.clients.map(c => `- ${c.name} (ID: ${c.clientId || c.id})`).join('\n');
    const pendingTxns = this.transactions
      .filter(t => t.status !== 'cobrado')
      .map(t => `- ${t.clientName}: "${t.description}" — Pendiente: $${t.pendingAmount} (ID: ${t.id})`)
      .join('\n');

    return `Eres el asistente financiero de ACCIOS CORE. Tu trabajo es ayudar al Super Admin a registrar transacciones y pagos usando lenguaje natural en español.

CLIENTES REGISTRADOS:
${clientList || '(Sin clientes registrados aun)'}

TRANSACCIONES PENDIENTES:
${pendingTxns || '(Sin transacciones pendientes)'}

REGLAS:
1. Siempre responde en español
2. Si el usuario menciona un gasto/cobro/factura, identifica: cliente, descripcion, monto
3. Si falta informacion (ej: no especifica cliente), PREGUNTA antes de proceder
4. Cuando tengas toda la info para crear una transaccion, incluye este JSON en tu respuesta:
   \`\`\`json
   {"action": "create_transaction", "data": {"clientName": "Nombre del Cliente", "clientId": "id-si-lo-conoces", "description": "Descripcion del servicio", "totalAmount": 50.00, "type": "unico"}}
   \`\`\`
5. Para registrar un pago/abono, usa:
   \`\`\`json
   {"action": "record_payment", "data": {"clientName": "Nombre", "transactionId": "id-de-transaccion", "amount": 200.00, "description": "factura de este mes"}}
   \`\`\`
6. Si el usuario pregunta sobre status o balance, responde con la info disponible sin JSON
7. Siempre confirma la accion con el usuario mostrando el JSON antes de que se ejecute
8. Los montos son en USD ($)`;
  }

  _parseAction(content) {
    // Try to find JSON in code blocks
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (e) { /* not valid JSON */ }
    }

    // Try to find raw JSON with action field
    const jsonMatch = content.match(/\{[\s\S]*?"action"\s*:\s*"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) { /* not valid JSON */ }
    }

    return null;
  }

  _addBubble(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `fin-chat__bubble fin-chat__bubble--${role}`;

    // Convert markdown-like formatting
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    bubble.innerHTML = `<div>${formatted}</div>`;
    this._messagesEl.appendChild(bubble);

    // Animate in
    bubble.style.opacity = '0';
    bubble.style.transform = role === 'user' ? 'translateX(10px)' : 'translateX(-10px)';
    requestAnimationFrame(() => {
      bubble.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateX(0)';
    });

    // Scroll to bottom
    this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
  }

  _showTyping() {
    const typing = document.createElement('div');
    typing.className = 'fin-chat__bubble fin-chat__bubble--assistant fin-chat__typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    this._messagesEl.appendChild(typing);
    this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
    return typing;
  }

  _showConfirmCard(actionData) {
    const card = document.createElement('div');
    card.className = 'fin-confirm';

    const isPayment = actionData.action === 'record_payment';
    const data = actionData.data;
    const title = isPayment ? 'Registrar Pago' : 'Nueva Transaccion';
    const icon = isPayment
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>';

    let fieldsHTML = '';
    if (isPayment) {
      fieldsHTML = `
        <div class="fin-confirm__field"><span class="fin-confirm__field-label">Cliente</span><span class="fin-confirm__field-value">${data.clientName || '-'}</span></div>
        <div class="fin-confirm__field"><span class="fin-confirm__field-label">Monto</span><span class="fin-confirm__field-value" style="color:var(--success);">$${(data.amount || 0).toFixed(2)}</span></div>
        <div class="fin-confirm__field"><span class="fin-confirm__field-label">Referencia</span><span class="fin-confirm__field-value">${data.description || data.transactionId || '-'}</span></div>
      `;
    } else {
      fieldsHTML = `
        <div class="fin-confirm__field"><span class="fin-confirm__field-label">Cliente</span><span class="fin-confirm__field-value">${data.clientName || '-'}</span></div>
        <div class="fin-confirm__field"><span class="fin-confirm__field-label">Descripcion</span><span class="fin-confirm__field-value">${data.description || '-'}</span></div>
        <div class="fin-confirm__field"><span class="fin-confirm__field-label">Monto</span><span class="fin-confirm__field-value" style="color:var(--purple-400);">$${(data.totalAmount || 0).toFixed(2)}</span></div>
        <div class="fin-confirm__field"><span class="fin-confirm__field-label">Tipo</span><span class="fin-confirm__field-value">${data.type === 'recurrente' ? 'Recurrente' : 'Unico'}</span></div>
      `;
    }

    card.innerHTML = `
      <div class="fin-confirm__header">
        ${icon}
        <span>${title}</span>
      </div>
      <div class="fin-confirm__fields">${fieldsHTML}</div>
      <div class="fin-confirm__actions">
        <button class="glass-btn glass-btn--primary fin-confirm__btn-ok">Confirmar</button>
        <button class="glass-btn fin-confirm__btn-cancel">Cancelar</button>
      </div>
    `;

    this._messagesEl.appendChild(card);

    // Animate in
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });

    this._messagesEl.scrollTop = this._messagesEl.scrollHeight;

    // Confirm handler
    card.querySelector('.fin-confirm__btn-ok').addEventListener('click', async () => {
      card.querySelector('.fin-confirm__btn-ok').disabled = true;
      card.querySelector('.fin-confirm__btn-ok').textContent = 'Guardando...';

      try {
        await this.onDataSaved(actionData);
        card.querySelector('.fin-confirm__actions').innerHTML = '<span style="color:var(--success);font-size:0.8rem;">✓ Guardado exitosamente</span>';
        this._addBubble('assistant', isPayment ? 'Pago registrado correctamente.' : 'Transaccion creada correctamente.');
      } catch (err) {
        card.querySelector('.fin-confirm__actions').innerHTML = '<span style="color:var(--error);font-size:0.8rem;">Error al guardar</span>';
        this._addBubble('assistant', 'Hubo un error al guardar. Intenta de nuevo.');
        console.error('Confirm save error:', err);
      }
    });

    // Cancel handler
    card.querySelector('.fin-confirm__btn-cancel').addEventListener('click', () => {
      card.querySelector('.fin-confirm__actions').innerHTML = '<span style="color:var(--text-dim);font-size:0.8rem;">Cancelado</span>';
      this._addBubble('assistant', 'Entendido, no se guardo nada. ¿En que mas puedo ayudarte?');
    });
  }

  // Update data context (called when finance data changes)
  updateContext(clients, transactions) {
    this.clients = clients;
    this.transactions = transactions;
  }

  destroy() {
    this.messages = [];
    this._inputEl = null;
    this._messagesEl = null;
  }
}
