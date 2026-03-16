import userAuth from '../services/userAuth.js';

/* ── Fingerprint SVG icon ── */
const FINGERPRINT = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3.5 7A10 10 0 0 1 12 2c5.52 0 10 4.48 10 10 0 1.5-.33 2.92-.93 4.2"/><path d="M6 18.7A10 10 0 0 1 2 12c0-3.13 1.44-5.93 3.69-7.77"/><path d="M12 8c2.21 0 4 1.79 4 4 0 2.96-1.22 5.63-3.18 7.54"/><path d="M8 11.6A4 4 0 0 1 12 8"/><path d="M12 12c0 4.08-1.65 7.78-4.33 10.45"/><path d="M19 14.12c-.73 2.27-2.02 4.29-3.76 5.92"/></svg>`;
const FINGERPRINT_LG = FINGERPRINT.replace('width="24" height="24"', 'width="48" height="48"');

export class Login {
  constructor(container, onLogin) {
    this.container = container;
    this.onLogin = onLogin;
    this.step = 'phone'; // phone | denied | explain-pin | create-pin | pin | biometric-offer
    this.phone = '';
    this.userData = null;
    this._bioAvailable = false;
    this._bioRegistered = false;
    this._particleRAF = null;
  }

  render() {
    this.container.innerHTML = `
      <section class="login-page">
        <canvas id="login-particles" class="login-particles"></canvas>
        <div class="login-content">
          <div class="login-logo">
            <div class="login-ring"></div>
            <div class="login-ring login-ring--2"></div>
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
    this._initParticles();
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
        <div class="login-phone-progress"><div class="login-phone-progress-fill" id="login-phone-fill"></div></div>
      </div>
      <button id="login-submit" class="login-btn login-btn--glow">
        <span>Continuar</span>
        <svg class="login-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
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
        <button id="login-create-pin-btn" class="login-btn login-btn--glow">
          <span>Crear mi PIN</span>
          <svg class="login-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    `;
  }

  _renderPinStep(isNew = false) {
    const title = isNew ? 'Crea tu PIN de acceso' : 'Ingresa tu PIN';
    const subtitle = isNew ? 'Elige 4 digitos que puedas recordar' : 'Tu PIN de 4 digitos';

    let html = `
      <p class="login-pin-title">${title}</p>
      <p class="login-pin-subtitle">${subtitle}</p>
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
      <button id="login-pin-submit" class="login-btn login-btn--glow" style="display:${isNew ? 'inline-flex' : 'none'}">
        <span>${isNew ? 'Crear PIN' : 'Verificar'}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    `;

    // Biometric button for returning users who already registered fingerprint
    if (!isNew && this._bioRegistered) {
      html += `
        <div class="login-bio-divider"><span>o</span></div>
        <button id="login-bio-btn" class="login-btn login-btn--biometric" type="button">
          ${FINGERPRINT}
          <span>Usar huella digital</span>
        </button>
      `;
    }

    return html;
  }

  _renderBiometricOffer() {
    return `
      <div class="login-bio-offer">
        <div class="login-bio-offer-icon" id="login-bio-icon">
          <canvas id="login-bio-particles" class="login-bio-canvas"></canvas>
          ${FINGERPRINT_LG}
        </div>
        <h3 class="login-bio-offer-title">Acceso rapido</h3>
        <p class="login-bio-offer-text">
          Activa tu <strong>huella digital</strong> para ingresar sin PIN la proxima vez.
        </p>
        <button id="login-bio-enable" class="login-btn login-btn--biometric-enable">
          ${FINGERPRINT}
          <span>Activar huella digital</span>
        </button>
        <button id="login-bio-skip" class="login-btn login-btn--secondary" style="margin-top: var(--space-3);">
          <span>Ahora no</span>
        </button>
      </div>
    `;
  }

  // ─── Listeners ─────────────────────────────────────────

  _attachListeners() {
    const form = this.container.querySelector('#login-form');

    if (this.step === 'phone') {
      const phoneInput = form.querySelector('#login-phone');
      const submitBtn = form.querySelector('#login-submit');

      phoneInput?.focus();

      // Auto-format phone + auto-submit when 8 digits
      phoneInput?.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 4) val = val.slice(0, 4) + '-' + val.slice(4, 8);
        e.target.value = val;

        // Update progress bar
        const digits = val.replace(/\D/g, '').length;
        const fill = form.querySelector('#login-phone-fill');
        if (fill) fill.style.width = `${(digits / 8) * 100}%`;

        // Auto-submit when 8 digits reached
        if (digits === 8) {
          phoneInput.blur();
          setTimeout(() => this._handlePhoneSubmit(), 300);
        }
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

    } else if (this.step === 'biometric-offer') {
      this._initBioParticles();
      form.querySelector('#login-bio-enable')?.addEventListener('click', () => this._handleBiometricRegister());
      form.querySelector('#login-bio-skip')?.addEventListener('click', () => {
        userAuth.declineBiometric(this.phone);
        userAuth.saveSession(this.userData);
        this.onLogin?.(this.userData);
      });
    }
  }

  _attachPinListeners() {
    const form = this.container.querySelector('#login-form');
    const pinInputs = form.querySelectorAll('.login-pin-input');
    const isNew = this.step === 'create-pin';

    pinInputs[0]?.focus();

    pinInputs.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val;

        // Visual feedback — filled dot animation
        if (val) {
          input.classList.add('login-pin-input--filled');
        } else {
          input.classList.remove('login-pin-input--filled');
        }

        if (val && idx < pinInputs.length - 1) {
          pinInputs[idx + 1].focus();
        }

        // Auto-submit when last PIN digit entered (verify mode only)
        if (!isNew && val && idx === 3) {
          // All 4 verify digits filled?
          const pin = this._getPinValue('login-pin-');
          if (pin.length === 4) {
            input.blur();
            setTimeout(() => this._handlePinSubmit(), 250);
          }
        }

        // For create-pin: auto-submit when last confirm digit entered
        if (isNew && val && idx === pinInputs.length - 1) {
          const pin = this._getPinValue('login-pin-');
          const confirm = this._getPinValue('login-pin-c');
          if (pin.length === 4 && confirm.length === 4) {
            input.blur();
            setTimeout(() => this._handlePinSubmit(), 250);
          }
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && idx > 0) {
          pinInputs[idx - 1].focus();
          pinInputs[idx - 1].classList.remove('login-pin-input--filled');
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
            pinInputs[idx + i].classList.add('login-pin-input--filled');
          }
        });
        const nextIdx = Math.min(idx + chars.length, pinInputs.length - 1);
        pinInputs[nextIdx]?.focus();
      });
    });

    const submitBtn = form.querySelector('#login-pin-submit');
    submitBtn?.addEventListener('click', () => this._handlePinSubmit());

    // Biometric button listener (only present if _bioRegistered)
    form.querySelector('#login-bio-btn')?.addEventListener('click', () => this._handleBiometricAuth());

    // Auto-trigger biometric for seamless fingerprint login
    if (this._bioRegistered && this.step === 'pin') {
      setTimeout(() => this._handleBiometricAuth(), 600);
    }
  }

  // ─── Step Transitions ──────────────────────────────────

  _goToPhoneStep() {
    this.step = 'phone';
    this.phone = '';
    this.userData = null;
    this._bioAvailable = false;
    this._bioRegistered = false;
    const form = this.container.querySelector('#login-form');
    const subtitle = this.container.querySelector('#login-subtitle');
    form.style.opacity = '0';
    form.style.transform = 'translateY(10px)';
    setTimeout(() => {
      form.innerHTML = this._renderPhoneStep();
      subtitle.textContent = 'Ingresa tu numero para continuar';
      this._hideError();
      this._attachListeners();
      requestAnimationFrame(() => {
        form.style.opacity = '1';
        form.style.transform = 'translateY(0)';
      });
    }, 200);
  }

  _goToCreatePinStep() {
    this.step = 'create-pin';
    const form = this.container.querySelector('#login-form');
    const subtitle = this.container.querySelector('#login-subtitle');
    form.style.opacity = '0';
    form.style.transform = 'translateY(10px)';
    setTimeout(() => {
      form.innerHTML = this._renderPinStep(true);
      subtitle.textContent = `Hola ${this.userData?.name || ''}`;
      this._hideError();
      this._attachPinListeners();
      requestAnimationFrame(() => {
        form.style.opacity = '1';
        form.style.transform = 'translateY(0)';
      });
    }, 200);
  }

  _transitionTo(stepName, renderFn, subtitleText) {
    const form = this.container.querySelector('#login-form');
    const subtitle = this.container.querySelector('#login-subtitle');
    form.style.opacity = '0';
    form.style.transform = 'translateY(10px)';
    setTimeout(() => {
      this.step = stepName;
      form.innerHTML = renderFn();
      if (subtitleText !== undefined) subtitle.textContent = subtitleText;
      this._hideError();
      this._attachListeners();
      requestAnimationFrame(() => {
        form.style.opacity = '1';
        form.style.transform = 'translateY(0)';
      });
    }, 200);
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
        this._transitionTo('denied', () => this._renderDeniedStep(), '');
        this._setLoading(false);
        return;
      }

      this.userData = result.data;

      if (!result.data.pinHash) {
        this._transitionTo('explain-pin', () => this._renderExplainPinStep(), `Hola ${result.data.name || ''}!`);
      } else {
        this._bioAvailable = this._isMobile() && await userAuth.isBiometricAvailable();
        this._bioRegistered = this._bioAvailable && userAuth.isBiometricEnabled(this.phone);
        this._transitionTo('pin', () => this._renderPinStep(false), `Hola ${result.data.name || ''}`);
        // Re-attach PIN listeners after transition
        setTimeout(() => this._attachPinListeners(), 250);
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
        this._bioAvailable = this._isMobile() && await userAuth.isBiometricAvailable();

        if (this._bioAvailable) {
          this._transitionTo('biometric-offer', () => this._renderBiometricOffer(), `Bienvenido ${this.userData?.name || ''}`);
        } else {
          userAuth.saveSession(this.userData);
          this.onLogin?.(this.userData);
        }
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
          // Success animation on PIN inputs
          const inputs = form.querySelectorAll('.login-pin-input');
          inputs.forEach(i => i.classList.add('login-pin-input--success'));

          setTimeout(() => {
            if (this._bioAvailable && !this._bioRegistered && !userAuth.isBiometricDeclined(this.phone)) {
              this._transitionTo('biometric-offer', () => this._renderBiometricOffer(), `Bienvenido ${this.userData?.name || ''}`);
            } else {
              userAuth.saveSession(this.userData);
              this.onLogin?.(this.userData);
            }
          }, 400);
        } else {
          this._showError('PIN incorrecto');
          const inputs = form.querySelectorAll('.login-pin-input');
          inputs.forEach(i => {
            i.value = '';
            i.classList.remove('login-pin-input--filled');
            i.classList.add('login-pin-input--error');
          });
          setTimeout(() => inputs.forEach(i => i.classList.remove('login-pin-input--error')), 500);
          inputs[0]?.focus();
        }
      } catch (e) {
        this._showError('Error de conexion');
      }

      this._setLoading(false);
    }
  }

  // ─── Biometric Handlers ─────────────────────────────────

  async _handleBiometricAuth() {
    this._setLoading(true);
    this._hideError();
    try {
      await userAuth.authenticateBiometric(this.phone);
      userAuth.saveSession(this.userData);
      this.onLogin?.(this.userData);
    } catch (e) {
      this._setLoading(false);
      this._showError('No se pudo verificar la huella. Usa tu PIN.');
      this.container.querySelector('#login-pin-1')?.focus();
    }
  }

  async _handleBiometricRegister() {
    // Start particle attraction animation
    this._bioParticleAttract = true;
    this._setLoading(true);
    this._hideError();
    try {
      await userAuth.registerBiometric(this.phone, this.userData?.name);
      userAuth.saveSession(this.userData);
      this.onLogin?.(this.userData);
    } catch (e) {
      userAuth.saveSession(this.userData);
      this.onLogin?.(this.userData);
    }
  }

  // ─── Background Particles ───────────────────────────────

  _initParticles() {
    const canvas = this.container.querySelector('#login-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        a: Math.random() * 0.3 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.a})`;
        ctx.fill();
      }
      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.04 * (1 - dist / 100)})`;
            ctx.stroke();
          }
        }
      }
      this._particleRAF = requestAnimationFrame(draw);
    };
    draw();
  }

  // ─── Biometric Fingerprint Particles ────────────────────

  _initBioParticles() {
    const canvas = this.container.querySelector('#login-bio-particles');
    if (!canvas) return;
    const icon = this.container.querySelector('#login-bio-icon');
    if (!icon) return;

    const size = icon.offsetWidth || 88;
    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    this._bioParticleAttract = false;

    const dots = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 40;
      dots.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        ox: cx + Math.cos(angle) * dist,
        oy: cy + Math.sin(angle) * dist,
        r: Math.random() * 2 + 1,
        angle,
        speed: 0.003 + Math.random() * 0.005,
        dist,
        a: Math.random() * 0.6 + 0.2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const d of dots) {
        if (this._bioParticleAttract) {
          // Attract toward center (fingerprint)
          const dx = cx - d.x;
          const dy = cy - d.y;
          d.x += dx * 0.08;
          d.y += dy * 0.08;
          d.a = Math.max(0, d.a - 0.008);
        } else {
          // Orbit around center
          d.angle += d.speed;
          d.x = cx + Math.cos(d.angle) * d.dist;
          d.y = cy + Math.sin(d.angle) * d.dist;
          // Gentle float
          d.x += Math.sin(Date.now() * 0.001 + d.angle) * 2;
          d.y += Math.cos(Date.now() * 0.001 + d.angle) * 2;
        }

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(86, 204, 242, ${d.a})`;
        ctx.fill();

        // Connection lines to center
        const distToCenter = Math.sqrt((d.x - cx) ** 2 + (d.y - cy) ** 2);
        if (distToCenter < 70) {
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = `rgba(86, 204, 242, ${0.06 * (1 - distToCenter / 70)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      this._bioRAF = requestAnimationFrame(draw);
    };
    draw();
  }

  // ─── Helpers ───────────────────────────────────────────

  _isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth <= 1024);
  }

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

  unmount() {
    if (this._particleRAF) cancelAnimationFrame(this._particleRAF);
    if (this._bioRAF) cancelAnimationFrame(this._bioRAF);
  }
}
