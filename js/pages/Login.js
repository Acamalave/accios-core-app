import userAuth from '../services/userAuth.js';

export class Login {
  constructor(container, onLogin) {
    this.container = container;
    this.onLogin = onLogin;
    this.step = 'phone'; // phone | denied | explain-pin | create-pin | pin
    this.phone = '';
    this.userData = null;
  }

  render() {
    this.container.innerHTML = `
      <section class="login-page">
        <div class="login-content">
          <div class="login-logo">
            <div class="login-ring"></div>
            <span class="login-icon">AC</span>
          </div>
          <h1 class="login-title">
            <span class="gradient-text">ACCIOS</span>
            <span class="login-title-light">CORE</span>
          </h1>
          <p class="login-subtitle" id="login-subtitle">Ingresa tu numero para continuar</p>

          <div id="login-form" class="login-form">
            ${this._renderPhoneStep()}
          </div>

          <div id="login-error" class="login-error" style="display: none;"></div>
        </div>
      </section>
    `;
    this._attachListeners();
  }

  // ─── Step Renderers ────────────────────────────────────

  _renderPhoneStep() {
    return `
      <div class="login-input-group">
        <div class="login-phone-wrapper">
          <span class="login-phone-prefix">+507</span>
          <input type="tel" id="login-phone" class="login-input" placeholder="XXXX-XXXX" maxlength="9" autocomplete="tel" inputmode="tel">
        </div>
      </div>
      <button id="login-submit" class="login-btn">
        <span>Continuar</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    `;
  }

  _renderDeniedStep() {
    return `
      <div class="login-denied">
        <div class="login-denied-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h2 class="login-denied-title">Espacio Privado</h2>
        <p class="login-denied-text">
          No hemos podido confirmar tu identidad.<br>
          Este espacio esta reservado para usuarios autorizados.
        </p>
        <p class="login-denied-hint">
          Si crees que deberias tener acceso, contacta al administrador de tu ecosistema.
        </p>
        <button id="login-retry" class="login-btn login-btn--secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          <span>Intentar con otro numero</span>
        </button>
      </div>
    `;
  }

  _renderExplainPinStep() {
    return `
      <div class="login-explain">
        <div class="login-explain-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <p class="login-explain-text">
          Es tu primera vez en <strong>ACCIOS CORE</strong>. Para proteger tu cuenta, vamos a crear un <strong>PIN de 4 digitos</strong> que usaras cada vez que inicies sesion.
        </p>
        <div class="login-explain-features">
          <div class="login-explain-feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Solo 4 digitos faciles de recordar</span>
          </div>
          <div class="login-explain-feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Tu sesion se mantiene por 30 dias</span>
          </div>
          <div class="login-explain-feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Protege tu informacion de negocio</span>
          </div>
        </div>
        <button id="login-create-pin-btn" class="login-btn">
          <span>Crear mi PIN</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    `;
  }

  _renderPinStep(isNew = false) {
    const title = isNew ? 'Crea tu PIN de acceso' : 'Ingresa tu PIN';
    const subtitle = isNew ? 'Elige 4 digitos que puedas recordar' : '';
    return `
      <p class="login-pin-title">${title}</p>
      ${subtitle ? `<p class="login-pin-subtitle">${subtitle}</p>` : ''}
      <div class="login-pin-wrapper">
        <input type="password" id="login-pin-1" class="login-pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
        <input type="password" id="login-pin-2" class="login-pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
        <input type="password" id="login-pin-3" class="login-pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
        <input type="password" id="login-pin-4" class="login-pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
      </div>
      ${isNew ? `
        <p class="login-pin-title" style="margin-top: var(--space-4);">Confirma tu PIN</p>
        <div class="login-pin-wrapper">
          <input type="password" id="login-pin-c1" class="login-pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
          <input type="password" id="login-pin-c2" class="login-pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
          <input type="password" id="login-pin-c3" class="login-pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
          <input type="password" id="login-pin-c4" class="login-pin-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
        </div>
      ` : ''}
      <button id="login-pin-submit" class="login-btn">
        <span>${isNew ? 'Crear PIN' : 'Verificar'}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    `;
  }

  // ─── Listeners ─────────────────────────────────────────

  _attachListeners() {
    const form = this.container.querySelector('#login-form');

    if (this.step === 'phone') {
      const phoneInput = form.querySelector('#login-phone');
      const submitBtn = form.querySelector('#login-submit');

      phoneInput?.focus();

      // Auto-format phone
      phoneInput?.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 4) val = val.slice(0, 4) + '-' + val.slice(4, 8);
        e.target.value = val;
      });

      phoneInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitBtn?.click();
      });

      submitBtn?.addEventListener('click', () => this._handlePhoneSubmit());

    } else if (this.step === 'denied') {
      const retryBtn = form.querySelector('#login-retry');
      retryBtn?.addEventListener('click', () => this._goToPhoneStep());

    } else if (this.step === 'explain-pin') {
      const createBtn = form.querySelector('#login-create-pin-btn');
      createBtn?.addEventListener('click', () => this._goToCreatePinStep());

    } else if (this.step === 'pin' || this.step === 'create-pin') {
      this._attachPinListeners();
    }
  }

  _attachPinListeners() {
    const form = this.container.querySelector('#login-form');
    const pinInputs = form.querySelectorAll('.login-pin-input');

    pinInputs[0]?.focus();

    pinInputs.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val;
        if (val && idx < pinInputs.length - 1) {
          pinInputs[idx + 1].focus();
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && idx > 0) {
          pinInputs[idx - 1].focus();
        }
      });
      // Paste support for PIN
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        const chars = paste.split('');
        chars.forEach((ch, i) => {
          if (pinInputs[idx + i]) {
            pinInputs[idx + i].value = ch;
          }
        });
        const nextIdx = Math.min(idx + chars.length, pinInputs.length - 1);
        pinInputs[nextIdx]?.focus();
      });
    });

    const submitBtn = form.querySelector('#login-pin-submit');
    submitBtn?.addEventListener('click', () => this._handlePinSubmit());
  }

  // ─── Step Transitions ──────────────────────────────────

  _goToPhoneStep() {
    this.step = 'phone';
    this.phone = '';
    this.userData = null;
    const form = this.container.querySelector('#login-form');
    const subtitle = this.container.querySelector('#login-subtitle');
    form.innerHTML = this._renderPhoneStep();
    subtitle.textContent = 'Ingresa tu numero para continuar';
    this._hideError();
    this._attachListeners();
  }

  _goToCreatePinStep() {
    this.step = 'create-pin';
    const form = this.container.querySelector('#login-form');
    const subtitle = this.container.querySelector('#login-subtitle');
    form.innerHTML = this._renderPinStep(true);
    subtitle.textContent = `Hola ${this.userData?.name || ''}`;
    this._hideError();
    this._attachPinListeners();
  }

  // ─── Handlers ──────────────────────────────────────────

  async _handlePhoneSubmit() {
    const input = this.container.querySelector('#login-phone');
    const phone = input?.value.replace(/\D/g, '') || '';

    if (phone.length < 7) {
      this._showError('Ingresa un numero valido');
      return;
    }

    this._setLoading(true);
    this._hideError();

    try {
      const result = await userAuth.lookupPhone(phone);
      this.phone = phone;

      if (!result.exists) {
        this.step = 'denied';
        const form = this.container.querySelector('#login-form');
        const subtitle = this.container.querySelector('#login-subtitle');
        form.innerHTML = this._renderDeniedStep();
        subtitle.textContent = '';
        this._attachListeners();
        this._setLoading(false);
        return;
      }

      this.userData = result.data;

      if (!result.data.pinHash) {
        // First time — show explanation
        this.step = 'explain-pin';
        const form = this.container.querySelector('#login-form');
        const subtitle = this.container.querySelector('#login-subtitle');
        form.innerHTML = this._renderExplainPinStep();
        subtitle.textContent = `Hola ${result.data.name || ''}!`;
        this._attachListeners();
      } else {
        // Has PIN — verify
        this.step = 'pin';
        const form = this.container.querySelector('#login-form');
        const subtitle = this.container.querySelector('#login-subtitle');
        form.innerHTML = this._renderPinStep(false);
        subtitle.textContent = `Hola ${result.data.name || ''}`;
        this._attachPinListeners();
      }
    } catch (e) {
      this._showError(e.message || 'Error de conexion');
    }

    this._setLoading(false);
  }

  async _handlePinSubmit() {
    const form = this.container.querySelector('#login-form');

    if (this.step === 'create-pin') {
      const pin = this._getPinValue('login-pin-');
      const confirm = this._getPinValue('login-pin-c');

      if (pin.length !== 4) {
        this._showError('El PIN debe tener 4 digitos');
        return;
      }
      if (pin !== confirm) {
        this._showError('Los PINs no coinciden');
        return;
      }

      this._setLoading(true);
      this._hideError();

      try {
        await userAuth.createPin(this.phone, pin);
        userAuth.saveSession(this.userData);
        this.onLogin?.(this.userData);
      } catch (e) {
        this._showError(e.message || 'Error al crear PIN');
      }

      this._setLoading(false);
    } else {
      // Verify PIN
      const pin = this._getPinValue('login-pin-');

      if (pin.length !== 4) {
        this._showError('Ingresa tu PIN de 4 digitos');
        return;
      }

      this._setLoading(true);
      this._hideError();

      try {
        const valid = await userAuth.verifyPin(this.phone, pin);
        if (valid) {
          userAuth.saveSession(this.userData);
          this.onLogin?.(this.userData);
        } else {
          this._showError('PIN incorrecto');
          const inputs = form.querySelectorAll('.login-pin-input');
          inputs.forEach(i => { i.value = ''; });
          inputs[0]?.focus();
        }
      } catch (e) {
        this._showError('Error de conexion');
      }

      this._setLoading(false);
    }
  }

  // ─── Helpers ───────────────────────────────────────────

  _getPinValue(prefix) {
    let pin = '';
    for (let i = 1; i <= 4; i++) {
      const input = this.container.querySelector(`#${prefix}${i}`);
      pin += input?.value || '';
    }
    return pin;
  }

  _showError(msg) {
    const el = this.container.querySelector('#login-error');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  _hideError() {
    const el = this.container.querySelector('#login-error');
    if (el) el.style.display = 'none';
  }

  _setLoading(loading) {
    const btn = this.container.querySelector('.login-btn');
    if (btn) {
      btn.disabled = loading;
      btn.classList.toggle('loading', loading);
    }
  }

  unmount() {}
}
