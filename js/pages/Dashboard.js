import userAuth from '../services/userAuth.js';
import { Toast } from '../components/Toast.js';

// ── Question labels for expediente display ──────────────────
const EXPEDIENTE_SECTIONS = [
  {
    code: 'SEC-I',
    title: 'Protocolo de Hospitalidad',
    questions: [
      { id: 'q1', code: 'HOSP-001', label: 'El Combustible Exacto' },
      { id: 'q2', code: 'HOSP-002', label: 'El Rescate de Emergencia' },
      { id: 'q3', code: 'HOSP-003', label: 'El Entorno Ideal' },
      { id: 'q4', code: 'HOSP-004', label: 'El "No-Go" Visual y Gastrico' },
    ],
  },
  {
    code: 'SEC-II',
    title: 'El Circulo de Confianza',
    questions: [
      { id: 'q5', code: 'CONF-001', label: 'El Complice de Riesgo' },
      { id: 'q6', code: 'CONF-002', label: 'El Ancla a Tierra' },
      { id: 'q7', code: 'CONF-003', label: 'La Linea Roja Invisible' },
      { id: 'q8', code: 'CONF-004', label: 'Veto Absoluto' },
    ],
  },
  {
    code: 'SEC-III',
    title: 'Psicologia de Escena',
    questions: [
      { id: 'q9', code: 'PSI-001', label: 'La Mentira de Sociedad' },
      { id: 'q10', code: 'PSI-002', label: 'El Boton Rojo' },
      { id: 'q11', code: 'PSI-003', label: 'El Superpoder de Negociacion' },
      { id: 'q12', code: 'PSI-004', label: 'El Trofeo Invisible' },
    ],
  },
];

export class Dashboard {
  constructor(container, currentUser, businessId, episodeId) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.businessId = businessId || 'mdn-podcast';
    this.episodeId = episodeId || 'ep-001';
    this.activeTab = 'episode';
    this.expedienteData = null;
    this.episodeData = null;
    this.comments = [];
  }

  async render() {
    this.container.innerHTML = `
      <div class="dash-page">
        <div class="dash-loading">
          <div class="dash-loading-spinner"></div>
          <span>Cargando dashboard...</span>
        </div>
      </div>
    `;

    try {
      const [expediente, comments, episodes] = await Promise.all([
        userAuth.getOnboardingResponse(this.currentUser.phone, this.businessId),
        userAuth.getCommentsByEpisode(this.episodeId),
        userAuth.getEpisodesByBusiness(this.businessId),
      ]);
      this.expedienteData = expediente;
      this.comments = comments;
      this.episodeData = episodes.find(ep => ep.id === this.episodeId) || null;
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }

    this._renderShell();
  }

  _renderShell() {
    const epNum = this.episodeData?.num || '001';

    this.container.innerHTML = `
      <div class="dash-page">
        <header class="dash-header">
          <div class="dash-header-row">
            <button class="dash-back" id="dash-back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <div class="dash-brand">
              <span class="dash-brand-tag">MDN</span>
              <span class="dash-brand-name">Manual de Nadie</span>
            </div>
          </div>
          <nav class="dash-tabs" id="dash-tabs">
            <button class="dash-tab ${this.activeTab === 'episode' ? 'active' : ''}" data-tab="episode">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              <span>EP. ${epNum}</span>
            </button>
            <button class="dash-tab ${this.activeTab === 'expediente' ? 'active' : ''}" data-tab="expediente">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>Expediente</span>
            </button>
          </nav>
        </header>

        <div class="dash-content" id="dash-content">
          ${this.activeTab === 'episode' ? this._buildEpisodeContent() : this._buildExpedienteContent()}
        </div>
      </div>
    `;

    this._attachListeners();
  }

  _switchTab(tab) {
    if (tab === this.activeTab) return;
    this.activeTab = tab;

    this.container.querySelectorAll('.dash-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    const content = this.container.querySelector('#dash-content');
    if (!content) return;

    content.classList.add('dash-content--exit');

    setTimeout(() => {
      content.innerHTML = tab === 'episode'
        ? this._buildEpisodeContent()
        : this._buildExpedienteContent();

      this._attachContentListeners();
      content.classList.remove('dash-content--exit');
      content.classList.add('dash-content--enter');

      setTimeout(() => content.classList.remove('dash-content--enter'), 400);
    }, 200);
  }

  // ═══════════════════════════════════════════════════
  //  EPISODE CONTENT — Dynamic Hero + Body + Comments
  // ═══════════════════════════════════════════════════

  _buildEpisodeContent() {
    const ep = this.episodeData;
    const heroNum = ep?.num || '001';
    const heroTitle = ep?.title || 'Capitulo';
    const heroDuration = ep?.duration || '-';
    const heroStatus = ep?.status || 'pre-produccion';
    const heroQuote = ep?.quote || '';

    return `
      <div class="ep-content">

        <!-- ── HERO (dynamic) ── -->
        <div class="ep-hero">
          <div class="ep-hero-top">
            <span class="ep-hero-podcast">PODCAST: MANUAL DE NADIE</span>
          </div>
          <div class="ep-hero-number">${heroNum}</div>
          <h1 class="ep-hero-title">${heroTitle}</h1>
          <div class="ep-hero-badges">
            <span class="ep-badge ep-badge--time">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${heroDuration}
            </span>
            <span class="ep-badge ep-badge--status">${heroStatus}</span>
          </div>
          ${heroQuote ? `<blockquote class="ep-hero-quote">&ldquo;${heroQuote}&rdquo;</blockquote>` : ''}
        </div>

        ${this._buildEpisodeBody()}

        ${this._buildCommentsSection()}

      </div>
    `;
  }

  _buildEpisodeBody() {
    const rich = this.episodeData?.richContent;
    if (rich) {
      try {
        const data = typeof rich === 'string' ? JSON.parse(rich) : rich;
        return this._buildRichContent(data);
      } catch (e) {
        console.error('Failed to parse richContent:', e);
      }
    }

    return `
      <div style="text-align: center; padding: var(--space-8); color: var(--text-muted);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: var(--space-3); opacity: 0.4;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>Contenido del capitulo en desarrollo.</p>
      </div>
    `;
  }

  _buildRichContent(d) {
    const epNum = this.episodeData?.num || '001';
    let html = '';

    // I. Concepto Central
    if (d.concepto) {
      html += `
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">I</span>
            <div>
              <h2 class="ep-section-title">Concepto Central</h2>
              <p class="ep-section-sub">El nucleo narrativo del episodio</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-block">
              <p class="ep-block-text">${d.concepto}</p>
            </div>
          </div>
        </section>`;
    }

    // II. Direccion de Arte
    if (d.arte) {
      html += `
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">II</span>
            <div>
              <h2 class="ep-section-title">Direccion de Arte y Estetica</h2>
              <p class="ep-section-sub">La identidad visual del episodio</p>
            </div>
          </div>
          <div class="ep-section-body">

            <!-- Dress Code Hero Image -->
            <div class="ep-dresscode-hero">
              <div class="ep-dresscode-img-wrap">
                <img src="assets/images/ep001-dresscode.png"
                     alt="Dress Code — Referencia visual"
                     class="ep-dresscode-img"
                     loading="lazy" />
                <div class="ep-dresscode-img-overlay"></div>
              </div>
              <div class="ep-dresscode-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2 12 5.59 8 2 3.62 3.46 2 8l3.59 4L2 16l1.62 4.54L8 22l4-3.59L16 22l4.38-1.46L22 16l-3.59-4L22 8l-1.62-4.54z"/></svg>
                Dress Code Reference
              </div>
              <div class="ep-dresscode-caption">
                <span class="ep-dresscode-caption-label">Outfit Guide</span>
                <span class="ep-dresscode-caption-style">${d.arte.chicasStyle}</span>
              </div>
            </div>

            <!-- Text cards -->
            <div class="ep-grid-2">
              <div class="ep-card-visual">
                <div class="ep-card-visual-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.38 3.46L16 2 12 5.59 8 2 3.62 3.46 2 8l3.59 4L2 16l1.62 4.54L8 22l4-3.59L16 22l4.38-1.46L22 16l-3.59-4L22 8l-1.62-4.54z"/></svg>
                </div>
                <div class="ep-card-visual-tag">Dress Code</div>
                <div class="ep-card-visual-accent">${d.arte.chicasStyle}</div>
                <p class="ep-card-visual-text">${d.arte.chicasDesc}</p>
                ${d.arte.chicasMsg ? `<div class="ep-card-visual-note"><strong>Mensaje:</strong> ${d.arte.chicasMsg}</div>` : ''}
              </div>
              <div class="ep-card-visual">
                <div class="ep-card-visual-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <div class="ep-card-visual-tag">El Set</div>
                <div class="ep-card-visual-accent">${d.arte.setStyle}</div>
                <p class="ep-card-visual-text">${d.arte.setDesc}</p>
                ${d.arte.setNote ? `<div class="ep-card-visual-note">${d.arte.setNote}</div>` : ''}
              </div>
            </div>
          </div>
        </section>`;
    }

    // III. Escaleta
    if (d.escaleta && d.escaleta.length) {
      html += `
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">III</span>
            <div>
              <h2 class="ep-section-title">Escaleta de Grabacion</h2>
              <p class="ep-section-sub">El flow del episodio — minuto a minuto</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-timeline">
              ${d.escaleta.map((seg, i) => `
              <div class="ep-tl-item">
                <div class="ep-tl-time">
                  <span class="ep-tl-start">${seg.start}</span>
                  <span class="ep-tl-end">${seg.end}</span>
                </div>
                <div class="ep-tl-track">
                  <div class="ep-tl-node${seg.accent ? ' ep-tl-node--accent' : ''}"></div>
                  ${i < d.escaleta.length - 1 ? '<div class="ep-tl-line"></div>' : ''}
                </div>
                <div class="ep-tl-body">
                  <div class="ep-tl-title">${seg.title}</div>
                  ${seg.subtitle ? `<div class="ep-tl-subtitle">${seg.subtitle}</div>` : ''}
                  <p class="ep-tl-desc">${seg.desc}</p>
                </div>
              </div>`).join('')}
            </div>
          </div>
        </section>`;
    }

    // IV. Tarjeta Negra
    if (d.tarjeta) {
      html += `
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">IV</span>
            <div>
              <h2 class="ep-section-title">Herramientas para las Conductoras</h2>
              <p class="ep-section-sub">Lo unico en la mesa — sin guion</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-tarjeta">
              <div class="ep-tarjeta-top">
                <span class="ep-tarjeta-label">TARJETA NEGRA MATE</span>
                <span class="ep-tarjeta-ep">EP. ${epNum}</span>
              </div>
              <div class="ep-tarjeta-divider"></div>
              <div class="ep-tarjeta-rules">
                <div class="ep-tarjeta-rule">
                  <span class="ep-tarjeta-num">01</span>
                  <div>
                    <div class="ep-tarjeta-rule-label">El Fact a Defender</div>
                    <div class="ep-tarjeta-rule-text">"${d.tarjeta.fact}"</div>
                  </div>
                </div>
                <div class="ep-tarjeta-rule">
                  <span class="ep-tarjeta-num">02</span>
                  <div>
                    <div class="ep-tarjeta-rule-label">La Palabra Prohibida</div>
                    <div class="ep-tarjeta-rule-text">${d.tarjeta.prohibida}</div>
                  </div>
                </div>
                <div class="ep-tarjeta-rule">
                  <span class="ep-tarjeta-num">03</span>
                  <div>
                    <div class="ep-tarjeta-rule-label">La Pregunta de Cierre</div>
                    <div class="ep-tarjeta-rule-text">"${d.tarjeta.cierre}"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>`;
    }

    // V. Props
    if (d.props) {
      html += `
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">V</span>
            <div>
              <h2 class="ep-section-title">Props e Insumos en Set</h2>
              <p class="ep-section-sub">Elementos fisicos de produccion</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-block">
              <p class="ep-block-text">${d.props}</p>
            </div>
          </div>
        </section>`;
    }

    // VI. Estrategia
    if (d.estrategia) {
      html += `
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">VI</span>
            <div>
              <h2 class="ep-section-title">Estrategia de Promocion</h2>
              <p class="ep-section-sub">Redes sociales y posicionamiento</p>
            </div>
          </div>
          <div class="ep-section-body">
            ${d.estrategia.youtubeTitle ? `
            <div class="ep-block">
              <div class="ep-block-label">Titulo en YouTube</div>
              <div class="ep-yt-title">${d.estrategia.youtubeTitle}</div>
            </div>` : ''}
            ${d.estrategia.reels && d.estrategia.reels.length ? `
            <div class="ep-block">
              <div class="ep-block-label">Cortes Planificados — Reels / TikTok</div>
              <div class="ep-reels">
                ${d.estrategia.reels.map((r, i) => `
                <div class="ep-reel">
                  <div class="ep-reel-head">
                    <span class="ep-reel-num">${String(i + 1).padStart(2, '0')}</span>
                    <span class="ep-reel-name">${r.name}</span>
                  </div>
                  <p class="ep-reel-clip">${r.clip}</p>
                  <div class="ep-reel-caption">${r.caption}</div>
                  ${i === 0 ? '<span class="ep-reel-tag">#ManualDeNadie</span>' : ''}
                </div>`).join('')}
              </div>
            </div>` : ''}
          </div>
        </section>`;
    }

    // VII. Protocolo de Rescate
    if (d.protocolo) {
      html += `
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">VII</span>
            <div>
              <h2 class="ep-section-title">Protocolo de Rescate</h2>
              <p class="ep-section-sub">El salvavidas del productor</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-block">
              <p class="ep-block-text">${d.protocolo}</p>
            </div>
          </div>
        </section>`;
    }

    // VIII. Control de Danos
    if (d.control) {
      html += `
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">VIII</span>
            <div>
              <h2 class="ep-section-title">Control de Danos</h2>
              <p class="ep-section-sub">Limites de produccion</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-block">
              <div class="ep-block-label" style="color: #ef4444;">Restricciones</div>
              <p class="ep-block-text">${d.control}</p>
            </div>
          </div>
        </section>`;
    }

    return html;
  }

  // ═══════════════════════════════════════════════════
  //  COMMENTS SECTION
  // ═══════════════════════════════════════════════════

  _buildCommentsSection() {
    const user = this.currentUser;

    const commentsList = this.comments.map(c => {
      const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-PA', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      }) : '';
      const isOwn = c.userId === user?.phone;

      return `
        <div class="comment-item ${isOwn ? 'comment-item--own' : ''}">
          <div class="comment-header">
            <div class="comment-avatar">${(c.userName || '?')[0].toUpperCase()}</div>
            <div class="comment-meta">
              <span class="comment-author">${c.userName || 'Anonimo'}</span>
              <span class="comment-date">${date}</span>
            </div>
          </div>
          <div class="comment-text">${this._escapeHtml(c.text)}</div>
        </div>
      `;
    }).join('');

    return `
      <section class="ep-section ep-comments-section">
        <div class="ep-section-head">
          <span class="ep-section-num">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </span>
          <div>
            <h2 class="ep-section-title">Comentarios</h2>
            <p class="ep-section-sub">${this.comments.length} comentario${this.comments.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div class="ep-section-body">
          <div class="comments-list" id="comments-list">
            ${commentsList || '<p class="comments-empty">Se el primero en comentar.</p>'}
          </div>

          <div class="comment-form" id="comment-form">
            <div class="comment-form-avatar">${(user?.name || '?')[0].toUpperCase()}</div>
            <div class="comment-form-input-wrap">
              <textarea class="comment-input" id="comment-input" placeholder="Escribe un comentario..." rows="2"></textarea>
              <button class="comment-submit" id="comment-submit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ═══════════════════════════════════════════════════
  //  EXPEDIENTE CONTENT
  // ═══════════════════════════════════════════════════

  _buildExpedienteContent() {
    const data = this.expedienteData;
    const answers = data?.answers || {};
    const isCompleted = !!data?.completedAt;
    const totalAnswered = Object.values(answers).filter(a => a?.trim()).length;

    if (!data) {
      return `
        <div class="exp-content">
          <div class="exp-empty">
            <div class="exp-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <h3 class="exp-empty-title">Expediente Pendiente</h3>
            <p class="exp-empty-text">Este talento aun no ha completado el formulario de onboarding.</p>
            <button class="glass-btn glass-btn--primary" id="exp-start-onboarding">Iniciar Expediente</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="exp-content">
        <div class="exp-header">
          <div class="exp-header-left">
            <div class="exp-header-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <h2 class="exp-header-title">Expediente de Talento</h2>
              <p class="exp-header-name">${data.userName || this.currentUser?.name || 'Sin nombre'}</p>
            </div>
          </div>
          <div class="exp-status ${isCompleted ? 'exp-status--done' : ''}">
            ${isCompleted
              ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Completado'
              : `<span class="exp-status-count">${totalAnswered}</span>/12`
            }
          </div>
        </div>

        ${EXPEDIENTE_SECTIONS.map(section => {
          const sectionAnswered = section.questions.filter(q => answers[q.id]?.trim()).length;
          return `
            <div class="exp-section">
              <div class="exp-section-head">
                <div class="exp-section-left">
                  <span class="exp-section-code">${section.code}</span>
                  <span class="exp-section-title">${section.title}</span>
                </div>
                <span class="exp-section-count">${sectionAnswered}/${section.questions.length}</span>
              </div>
              <div class="exp-section-body">
                ${section.questions.map(q => {
                  const answer = answers[q.id];
                  return `
                    <div class="exp-item ${answer ? '' : 'exp-item--empty'}">
                      <div class="exp-item-top">
                        <span class="exp-item-code">${q.code}</span>
                        <span class="exp-item-label">${q.label}</span>
                      </div>
                      ${answer
                        ? `<div class="exp-item-answer">${answer}</div>`
                        : `<div class="exp-item-na">Sin respuesta</div>`
                      }
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}

        <div class="exp-footer">
          <button class="glass-btn" id="exp-edit-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar Respuestas
          </button>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════
  //  LISTENERS
  // ═══════════════════════════════════════════════════

  _attachListeners() {
    this.container.querySelector('#dash-back')?.addEventListener('click', () => {
      window.location.hash = `#podcast/${this.businessId}`;
    });

    this.container.querySelectorAll('.dash-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._switchTab(tab.dataset.tab);
      });
    });

    this._attachContentListeners();
  }

  _attachContentListeners() {
    this.container.querySelector('#exp-start-onboarding')?.addEventListener('click', () => {
      window.location.hash = '#onboarding/mdn-podcast';
    });

    this.container.querySelector('#exp-edit-btn')?.addEventListener('click', () => {
      window.location.hash = '#onboarding/mdn-podcast';
    });

    // Comment submission
    const submitBtn = this.container.querySelector('#comment-submit');
    const commentInput = this.container.querySelector('#comment-input');

    if (submitBtn && commentInput) {
      const handleSubmit = async () => {
        const text = commentInput.value.trim();
        if (!text) return;

        submitBtn.disabled = true;
        try {
          await userAuth.addComment({
            episodeId: this.episodeId,
            businessId: this.businessId,
            userId: this.currentUser.phone,
            userName: this.currentUser.name,
            text,
          });
          Toast.success('Comentario enviado');
          commentInput.value = '';

          // Reload comments
          this.comments = await userAuth.getCommentsByEpisode(this.episodeId);
          const listEl = this.container.querySelector('#comments-list');
          if (listEl) {
            listEl.innerHTML = this.comments.map(c => {
              const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-PA', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              }) : '';
              const isOwn = c.userId === this.currentUser?.phone;
              return `
                <div class="comment-item ${isOwn ? 'comment-item--own' : ''}">
                  <div class="comment-header">
                    <div class="comment-avatar">${(c.userName || '?')[0].toUpperCase()}</div>
                    <div class="comment-meta">
                      <span class="comment-author">${c.userName || 'Anonimo'}</span>
                      <span class="comment-date">${date}</span>
                    </div>
                  </div>
                  <div class="comment-text">${this._escapeHtml(c.text)}</div>
                </div>
              `;
            }).join('') || '<p class="comments-empty">Se el primero en comentar.</p>';
          }
          // Update count
          const subEl = this.container.querySelector('.ep-comments-section .ep-section-sub');
          if (subEl) subEl.textContent = `${this.comments.length} comentario${this.comments.length !== 1 ? 's' : ''}`;
        } catch (e) {
          Toast.error('Error: ' + e.message);
        } finally {
          submitBtn.disabled = false;
        }
      };

      submitBtn.addEventListener('click', handleSubmit);
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      });
    }
  }

  unmount() {}
}
