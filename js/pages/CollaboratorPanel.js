import { apiUrl } from '../services/apiConfig.js';
import userAuth from '../services/userAuth.js';
import { Toast } from '../components/Toast.js';
import {
  db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  addDoc, query, where, orderBy, onSnapshot, Timestamp,
  storage, storageRef, uploadBytes, getDownloadURL
} from '../services/firebase.js';

/* ── SVG Icons ──────────────────────────────────── */
const IC = {
  back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  board: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  x: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  grip: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>`,
  shield: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  mail: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  phone: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
  image: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  externalLink: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  xCircle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  expand: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>`,
  building: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`,
  filter: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
};

/* ── Status config ────────────────────────────── */
const COLUMNS = [
  { id: 'inbox',       label: 'Bandeja',       color: '#8B5CF6' },
  { id: 'in_progress', label: 'En Proceso',    color: '#3B82F6' },
  { id: 'review',      label: 'Revision',      color: '#F59E0B' },
  { id: 'done',        label: 'Completado',    color: '#22C55E' },
];

/* ── Priority config ───────────────────────────── */
const PRIORITIES = {
  low:    { label: 'Baja',    color: '#6B7280' },
  medium: { label: 'Media',   color: '#3B82F6' },
  high:   { label: 'Alta',    color: '#F59E0B' },
  urgent: { label: 'Urgente', color: '#EF4444' },
};

export class CollaboratorPanel {
  constructor(container, currentUser, sub) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getSession();
    this._isSuperAdmin = this.currentUser?.role === 'superadmin';
    // Collaborators can only see solicitudes — force it
    this._view = this._isSuperAdmin ? (sub || 'solicitudes') : 'solicitudes';
    this._requests = [];
    this._collaborators = [];
    this._unsubRequests = null;
    this._unsubCollabs = null;
    this._statusFilter = 'all';
    this._bizFilter = 'all';
    this._priorityFilter = 'all';
    this._searchQuery = '';
    this._searchTimeout = null;
    this._pendingImages = []; // Files staged for upload with quick-create
    this._objectUrls = []; // Track blob URLs for cleanup
  }

  /** Escape HTML entities to prevent XSS */
  _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /** Strip URLs from text for clean display */
  _stripUrls(text) {
    if (!text) return '';
    return text.replace(/https?:\/\/[^\s<>"']+/gi, '').replace(/\s{2,}/g, ' ').trim();
  }

  async render() {
    if (!this.currentUser) {
      this.container.innerHTML = `<section class="collab-denied"><h2>Acceso denegado</h2></section>`;
      return;
    }

    this.container.innerHTML = `<section class="collab-loading"><div class="collab-spinner"></div><p>Cargando panel...</p></section>`;

    await this._loadData();
    this._renderPanel();
    this._attachListeners();
    this._startRealtimeSync();
  }

  async _loadData() {
    try {
      // Load requests
      const reqSnap = await getDocs(
        query(collection(db, 'solicitudes'), orderBy('createdAt', 'desc'))
      );
      this._requests = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Load collaborators
      const collabSnap = await getDocs(collection(db, 'collaborators'));
      this._collaborators = collabSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[CollabPanel] Load error:', e);
    }
  }

  _startRealtimeSync() {
    try {
      this._unsubRequests = onSnapshot(
        query(collection(db, 'solicitudes'), orderBy('createdAt', 'desc')),
        (snap) => {
          this._requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this._refreshSolicitudes();
        }
      );

      this._unsubCollabs = onSnapshot(
        collection(db, 'collaborators'),
        (snap) => {
          this._collaborators = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (this._view === 'team') this._refreshTeam();
        }
      );
    } catch (e) {
      console.warn('[CollabPanel] Realtime sync error:', e);
    }
  }

  _renderPanel() {
    const isSolicitudes = this._view === 'solicitudes';
    const sa = this._isSuperAdmin;
    // Filter tasks: collaborators only see their own
    const userPhone = this.currentUser?.phone || '';
    if (!sa) {
      const myCollabDoc = this._collaborators.find(c => {
        const cPhone = (c.phone || '').replace(/\D/g, '').slice(-8);
        const uPhone = userPhone.replace(/\D/g, '').slice(-8);
        return cPhone && uPhone && cPhone === uPhone;
      });
      if (myCollabDoc) {
        this._myCollabId = myCollabDoc.id;
      }
    }

    this.container.innerHTML = `
    <section class="collab-panel">
      <!-- Header -->
      <header class="collab-header">
        <div class="collab-header__left">
          <button class="collab-back" id="collab-back">${IC.back}</button>
          <div>
            <h1 class="collab-title">${sa ? 'Panel de Equipo' : 'Mis Solicitudes'}</h1>
            <p class="collab-subtitle">${sa
              ? `${this._collaborators.length} colaboradores · ${this._requests.length} solicitudes`
              : `${this._myCollabId ? this._requests.filter(r => r.assignedTo === this._myCollabId).length : this._requests.length} tareas asignadas`}</p>
          </div>
        </div>
        ${sa ? `
        <div class="collab-header__tabs">
          <button class="collab-tab ${isSolicitudes ? 'collab-tab--active' : ''}" data-tab="solicitudes">
            ${IC.board}<span>Solicitudes</span>
          </button>
          <button class="collab-tab ${!isSolicitudes ? 'collab-tab--active' : ''}" data-tab="team">
            ${IC.users}<span>Equipo</span>
          </button>
        </div>` : ''}
        ${sa ? `
        ${!isSolicitudes ? `<button class="collab-add-btn" id="collab-add-new">
          ${IC.plus}
          <span>Agregar Colaborador</span>
        </button>` : ''}` : `
        <button class="collab-logout-btn" id="collab-logout">
          ${IC.x}
          <span>Cerrar Sesion</span>
        </button>`}
      </header>

      <!-- Content -->
      <div class="collab-content" id="collab-content">
        ${isSolicitudes ? this._buildSolicitudes() : this._buildTeam()}
      </div>

      <!-- Modal container -->
      <div class="collab-modal-overlay" id="collab-modal-overlay"></div>
    </section>
    `;
  }

  /* ═══════════════════════════════════════
     SOLICITUDES VIEW
     ═══════════════════════════════════════ */

  _buildSolicitudes() {
    return this._buildQuickInput() + this._buildOverview() + this._buildFilterBar() + this._buildTimeline();
  }

  _buildQuickInput() {
    const bizTags = this._getUniqueBizTags();
    return `
    <div class="collab-quick">
      <div class="collab-quick__row">
        <input class="collab-quick__input" id="collab-quick-input" placeholder="Título de la solicitud..." maxlength="500" />
        <button class="collab-quick__attach" id="collab-quick-attach" title="Adjuntar imagen">${IC.image}</button>
        <button class="collab-quick__send" id="collab-quick-send">${IC.send}</button>
        <input type="file" id="collab-file-input" accept="image/*" multiple hidden />
      </div>
      <textarea class="collab-quick__desc" id="collab-quick-desc" placeholder="Descripción o detalles adicionales..." rows="2" maxlength="2000"></textarea>
      <div class="collab-quick__previews" id="collab-quick-previews"></div>
      <div class="collab-quick__options">
        <div class="collab-quick__tags">
          <span class="collab-quick__label">Prioridad</span>
          <button class="collab-quick__tag collab-quick__tag--priority" data-priority="low">Baja</button>
          <button class="collab-quick__tag collab-quick__tag--priority collab-quick__tag--active" data-priority="medium">Media</button>
          <button class="collab-quick__tag collab-quick__tag--priority" data-priority="high">Alta</button>
          <button class="collab-quick__tag collab-quick__tag--priority" data-priority="urgent">Urgente</button>
        </div>
        ${bizTags.length ? `
        <div class="collab-quick__tags">
          <span class="collab-quick__label">Negocio</span>
          ${bizTags.map(b => `<button class="collab-quick__tag collab-quick__tag--biz" data-biz="${b}">${b}</button>`).join('')}
        </div>` : ''}
      </div>
    </div>`;
  }

  _buildOverview() {
    const filtered = this._getFilteredRequests();
    const totalCount = filtered.length;
    const doneCount = filtered.filter(r => r.status === 'done').length;
    return `
    <div class="collab-overview" id="collab-overview">
      <div class="collab-overview__card">
        <span class="collab-overview__value">${totalCount}</span>
        <span class="collab-overview__label">Solicitudes</span>
      </div>
      <div class="collab-overview__card collab-overview__card--done">
        <span class="collab-overview__value">${doneCount}</span>
        <span class="collab-overview__label">Completadas</span>
      </div>
    </div>`;
  }

  _buildFilterBar() {
    const filters = [
      { id: 'all',         label: 'Todas',       color: '#9CA3AF' },
      { id: 'inbox',       label: 'Pendiente',   color: COLUMNS.find(c => c.id === 'inbox').color },
      { id: 'in_progress', label: 'En Proceso',  color: COLUMNS.find(c => c.id === 'in_progress').color },
      { id: 'review',      label: 'Revision',    color: COLUMNS.find(c => c.id === 'review').color },
      { id: 'done',        label: 'Completado',  color: COLUMNS.find(c => c.id === 'done').color },
    ];

    const bizTags = this._getUniqueBizTags();

    return `
    <div class="collab-filterbar" id="collab-filterbar">
      <div class="collab-filterbar__buttons">
        ${filters.map(f => `
          <button class="collab-filter collab-filter--status ${this._statusFilter === f.id ? 'collab-filter--active' : ''}" data-filter="${f.id}">
            <span class="collab-filter__dot" style="background:${f.color}"></span>
            ${f.label}
          </button>
        `).join('')}
      </div>
      ${bizTags.length ? `
      <div class="collab-filterbar__buttons collab-filterbar__buttons--biz">
        <span class="collab-filterbar__label">${IC.building} Negocio</span>
        <button class="collab-filter collab-filter--biz ${this._bizFilter === 'all' ? 'collab-filter--active' : ''}" data-biz-filter="all">Todos</button>
        ${bizTags.map(b => `
          <button class="collab-filter collab-filter--biz ${this._bizFilter === b ? 'collab-filter--active' : ''}" data-biz-filter="${b}">${b}</button>
        `).join('')}
      </div>` : ''}
      <div class="collab-filterbar__search">
        ${IC.search}
        <input class="collab-filterbar__input" id="collab-search-input" placeholder="Buscar solicitud..." value="${this._searchQuery}" />
      </div>
    </div>`;
  }

  _buildTimeline() {
    const filtered = this._getFilteredRequests();
    if (filtered.length === 0) {
      return `
      <div class="collab-timeline" id="collab-timeline">
        <div class="collab-empty">
          ${IC.board}
          <h3>No hay solicitudes</h3>
          <p>Escribe una solicitud arriba para comenzar.</p>
        </div>
      </div>`;
    }

    const groups = this._groupByDate(filtered);
    return `
    <div class="collab-timeline" id="collab-timeline">
      ${groups.map(group => `
        <div class="collab-timeline__group">
          <div class="collab-timeline__divider">
            <span class="collab-timeline__date-label">${group.label}</span>
          </div>
          ${group.items.map(card => this._buildTimelineCard(card)).join('')}
        </div>
      `).join('')}
    </div>`;
  }

  _buildTimelineCard(card) {
    const sa = this._isSuperAdmin;
    const pri = PRIORITIES[card.priority || 'medium'];
    const status = card.status || 'inbox';
    const colCfg = COLUMNS.find(c => c.id === status) || COLUMNS[0];
    const statusColor = colCfg.color;
    const statusLabel = colCfg.label;
    const creatorName = this._getCreatorName(card.createdBy);
    const initial = (creatorName || '?')[0].toUpperCase();
    const formattedTime = this._formatFullDate(card.createdAt);
    const tags = card.tags || [];
    const desc = card.description || '';
    const truncatedDesc = desc.length > 120 ? desc.slice(0, 120) + '...' : desc;
    const images = card.images || [];
    const urls = this._extractUrls(card.title + ' ' + desc);

    // Clean text: strip URLs from displayed title and description
    const cleanTitle = this._stripUrls(card.title || '') || 'Sin titulo';
    const cleanDesc = this._stripUrls(truncatedDesc);

    // Determine right-side media preview
    const hasImages = images.length > 0;
    const hasLinks = urls.length > 0;
    const showMediaPreview = hasImages || hasLinks;

    // Build right-side media preview HTML
    let mediaPreviewHtml = '';
    if (hasImages) {
      const extraCount = images.length - 1;
      mediaPreviewHtml = `
        <div class="collab-tcard__media-preview">
          <div class="collab-tcard__thumb-wrap">
            <img class="collab-tcard__thumb-img" src="${images[0]}" alt="Ref" loading="lazy" />
            ${extraCount > 0 ? `<span class="collab-tcard__thumb-badge">+${extraCount}</span>` : ''}
          </div>
        </div>`;
    } else if (hasLinks) {
      const domain = this._getDomain(urls[0]);
      const favicon = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
      mediaPreviewHtml = `
        <div class="collab-tcard__media-preview collab-tcard__media-preview--link">
          <div class="collab-tcard__link-thumb">
            <img class="collab-tcard__link-favicon" src="${favicon}" alt="" loading="lazy" onerror="this.style.display='none'" />
            <span class="collab-tcard__link-domain">${domain}</span>
          </div>
        </div>`;
    }

    return `
    <div class="collab-tcard collab-tcard--${card.priority || 'medium'}" data-id="${card.id}">
      <div class="collab-tcard__dot collab-tcard__dot--mobile-hide" style="background: ${statusColor}; box-shadow: 0 0 8px ${statusColor}40"></div>
      <div class="collab-tcard__body" data-detail-id="${card.id}">
        <div class="collab-tcard__header">
          <div class="collab-tcard__creator">
            <span class="collab-tcard__avatar">${initial}</span>
            <span>${creatorName}</span>
          </div>
          <span class="collab-tcard__time">${formattedTime}</span>
        </div>
        <div class="collab-tcard__content-row">
          <div class="collab-tcard__text-content">
            <h4 class="collab-tcard__title">${this._esc(cleanTitle)}</h4>
            ${cleanDesc ? `<p class="collab-tcard__desc">${this._esc(cleanDesc)}</p>` : ''}
            ${tags.length ? `<div class="collab-tcard__tags">${tags.map(t => `<span class="collab-tcard__tag">${this._esc(t)}</span>`).join('')}</div>` : ''}
          </div>
          ${showMediaPreview ? mediaPreviewHtml : ''}
        </div>
        <div class="collab-tcard__footer">
          <div class="collab-tcard__status-wrap" style="position:relative">
            <button class="collab-tcard__status-btn" data-id="${card.id}" style="color:${statusColor}">
              <span class="collab-tcard__status-dot" style="background:${statusColor}"></span>
              ${statusLabel} &#9662;
            </button>
            <div class="collab-tcard__status-menu" id="status-menu-${card.id}">
              ${COLUMNS.map(col => `
                <button class="collab-tcard__status-option ${col.id === status ? 'collab-tcard__status-option--active' : ''}" data-status="${col.id}" data-id="${card.id}">
                  <span class="collab-tcard__status-dot" style="background:${col.color}"></span>
                  ${col.label}
                </button>
              `).join('')}
            </div>
          </div>
          <span class="collab-tcard__priority-pill" style="background:${pri.color}20; color:${pri.color}">${pri.label}</span>
          ${sa ? `
          <div class="collab-tcard__actions">
            <button class="collab-card__action" data-attach-img="${card.id}" title="Adjuntar imagen">${IC.image}</button>
            <button class="collab-card__action" data-edit="${card.id}" title="Editar">${IC.edit}</button>
            <button class="collab-card__action collab-card__action--delete" data-delete="${card.id}" title="Eliminar">${IC.trash}</button>
          </div>` : ''}
        </div>
      </div>
    </div>`;
  }

  /* ═══════════════════════════════════════
     DETAIL POPUP
     ═══════════════════════════════════════ */

  _showDetailPopup(card) {
    const overlay = this.container.querySelector('#collab-modal-overlay');
    if (!overlay) return;

    const sa = this._isSuperAdmin;
    const pri = PRIORITIES[card.priority || 'medium'];
    const status = card.status || 'inbox';
    const colCfg = COLUMNS.find(c => c.id === status) || COLUMNS[0];
    const statusColor = colCfg.color;
    const statusLabel = colCfg.label;
    const creatorName = this._getCreatorName(card.createdBy);
    const formattedTime = this._formatFullDate(card.createdAt);
    const tags = card.tags || [];
    const desc = card.description || '';
    const images = card.images || [];
    const urls = this._extractUrls(card.title + ' ' + desc);

    overlay.classList.add('collab-modal-overlay--open');
    overlay.innerHTML = `
    <div class="collab-detail-popup">
      <div class="collab-detail-popup__header">
        <h2 class="collab-detail-popup__title">${this._esc(card.title || 'Sin titulo')}</h2>
        <button class="collab-modal__close" id="collab-detail-close">${IC.x}</button>
      </div>

      <div class="collab-detail-popup__body">
        ${desc ? `<p class="collab-detail-popup__desc">${this._esc(desc)}</p>` : ''}

        <div class="collab-detail-popup__meta">
          <div class="collab-detail-popup__meta-item">
            <span class="collab-detail-popup__meta-label">Estado</span>
            <div class="collab-detail-popup__status-wrap" style="position:relative">
              <button class="collab-tcard__status-btn collab-detail-popup__status-btn" data-detail-status-id="${card.id}" style="color:${statusColor}">
                <span class="collab-tcard__status-dot" style="background:${statusColor}"></span>
                ${statusLabel} &#9662;
              </button>
              <div class="collab-tcard__status-menu" id="detail-status-menu-${card.id}">
                ${COLUMNS.map(col => `
                  <button class="collab-tcard__status-option ${col.id === status ? 'collab-tcard__status-option--active' : ''}" data-status="${col.id}" data-detail-change-id="${card.id}">
                    <span class="collab-tcard__status-dot" style="background:${col.color}"></span>
                    ${col.label}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="collab-detail-popup__meta-item">
            <span class="collab-detail-popup__meta-label">Prioridad</span>
            <span class="collab-tcard__priority-pill" style="background:${pri.color}20; color:${pri.color}">${pri.label}</span>
          </div>
          <div class="collab-detail-popup__meta-item">
            <span class="collab-detail-popup__meta-label">Creado por</span>
            <span>${this._esc(creatorName)}</span>
          </div>
          <div class="collab-detail-popup__meta-item">
            <span class="collab-detail-popup__meta-label">Fecha</span>
            <span>${formattedTime}</span>
          </div>
        </div>

        ${tags.length ? `
        <div class="collab-detail-popup__section">
          <span class="collab-detail-popup__section-label">Etiquetas</span>
          <div class="collab-tcard__tags">${tags.map(t => `<span class="collab-tcard__tag">${this._esc(t)}</span>`).join('')}</div>
        </div>` : ''}

        ${urls.length ? `
        <div class="collab-detail-popup__section">
          <span class="collab-detail-popup__section-label">${IC.link} Enlaces</span>
          ${this._buildLinkPreviews(urls)}
        </div>` : ''}

        ${images.length ? `
        <div class="collab-detail-popup__section">
          <span class="collab-detail-popup__section-label">${IC.image} Imagenes</span>
          <div class="collab-detail-popup__gallery">
            ${images.map((img, i) => `
              <div class="collab-detail-popup__gallery-thumb" data-detail-img="${img}" data-index="${i}">
                <img src="${img}" alt="Ref ${i + 1}" loading="lazy" />
              </div>
            `).join('')}
          </div>
        </div>` : ''}

        ${sa ? `
        <div class="collab-detail-popup__actions">
          <button class="collab-btn collab-btn--ghost" data-detail-edit="${card.id}">${IC.edit} Editar</button>
          <button class="collab-btn collab-btn--danger" data-detail-delete="${card.id}">${IC.trash} Eliminar</button>
        </div>` : ''}
      </div>
    </div>`;

    // Attach detail popup listeners
    overlay.querySelector('#collab-detail-close')?.addEventListener('click', () => this._closeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._closeModal(); });

    // Status toggle in detail popup
    const statusBtn = overlay.querySelector('[data-detail-status-id]');
    if (statusBtn) {
      statusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = overlay.querySelector(`#detail-status-menu-${card.id}`);
        if (menu) menu.classList.toggle('collab-tcard__status-menu--open');
      });
    }

    // Status change options in detail popup
    overlay.querySelectorAll('[data-detail-change-id]').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const newStatus = opt.dataset.status;
        this._handleStatusChange(card.id, newStatus);
        const menu = overlay.querySelector(`#detail-status-menu-${card.id}`);
        if (menu) menu.classList.remove('collab-tcard__status-menu--open');
        // Refresh popup after status change
        setTimeout(() => {
          const updatedCard = this._requests.find(r => r.id === card.id);
          if (updatedCard) this._showDetailPopup(updatedCard);
        }, 500);
      });
    });

    // Image click -> lightbox
    overlay.querySelectorAll('[data-detail-img]').forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const fullUrl = thumb.dataset.detailImg;
        if (fullUrl) this._showLightbox(fullUrl);
      });
    });

    // Edit button in detail popup
    const editBtn = overlay.querySelector(`[data-detail-edit="${card.id}"]`);
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this._closeModal();
        setTimeout(() => this._showRequestModal(card), 100);
      });
    }

    // Delete button in detail popup
    const deleteBtn = overlay.querySelector(`[data-detail-delete="${card.id}"]`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Eliminar esta solicitud?')) return;
        try {
          await deleteDoc(doc(db, 'solicitudes', card.id));
          this._closeModal();
          document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Solicitud eliminada', type: 'info' } }));
        } catch (err) {
          console.error('[CollabPanel] Delete error:', err);
        }
      });
    }
  }

  /* ═══════════════════════════════════════
     LINK PREVIEW + IMAGE GALLERY HELPERS
     ═══════════════════════════════════════ */

  _extractUrls(text) {
    if (!text) return [];
    const urlReg = /https?:\/\/[^\s<>"']+/gi;
    return [...new Set((text.match(urlReg) || []))];
  }

  _getDomain(url) {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  }

  _buildLinkPreviews(urls) {
    return `
    <div class="collab-link-previews">
      ${urls.slice(0, 3).map(url => {
        const domain = this._getDomain(url);
        const favicon = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
        return `
        <a href="${url}" target="_blank" rel="noopener" class="collab-link-card">
          <img class="collab-link-card__favicon" src="${favicon}" alt="" loading="lazy" onerror="this.style.display='none'" />
          <div class="collab-link-card__info">
            <span class="collab-link-card__domain">${domain}</span>
            <span class="collab-link-card__url">${url.length > 60 ? url.slice(0, 60) + '...' : url}</span>
          </div>
          <span class="collab-link-card__ext">${IC.externalLink}</span>
        </a>`;
      }).join('')}
    </div>`;
  }

  _buildImageGallery(images, cardId) {
    return `
    <div class="collab-img-gallery">
      ${images.map((img, i) => `
        <div class="collab-img-thumb" data-full="${img}" data-card="${cardId}" data-index="${i}">
          <img src="${img}" alt="Ref ${i + 1}" loading="lazy" />
        </div>
      `).join('')}
    </div>`;
  }

  async _uploadImages(files, docId) {
    const urls = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) {
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Imagen muy grande (max 10MB)', type: 'error' } }));
        continue;
      }
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `solicitudes/${docId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, file);
        const url = await getDownloadURL(ref);
        urls.push(url);
      } catch (err) {
        console.error('[CollabPanel] Image upload error:', err);
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Error subiendo imagen', type: 'error' } }));
      }
    }
    return urls;
  }

  _showLightbox(imgUrl) {
    const overlay = this.container.querySelector('#collab-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('collab-modal-overlay--open');
    overlay.innerHTML = `
    <div class="collab-lightbox">
      <button class="collab-lightbox__close" id="lightbox-close">${IC.x}</button>
      <img src="${imgUrl}" class="collab-lightbox__img" alt="Imagen de referencia" />
    </div>`;
    overlay.querySelector('#lightbox-close')?.addEventListener('click', () => this._closeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._closeModal(); });
  }

  _renderPendingPreviews() {
    const container = this.container.querySelector('#collab-quick-previews');
    if (!container) return;
    if (this._pendingImages.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';
    // Revoke previous object URLs before creating new ones
    this._objectUrls.forEach(u => URL.revokeObjectURL(u));
    this._objectUrls = [];
    container.innerHTML = this._pendingImages.map((file, i) => {
      const url = URL.createObjectURL(file);
      this._objectUrls.push(url);
      return `
      <div class="collab-quick__thumb">
        <img src="${url}" alt="Preview" />
        <button class="collab-quick__thumb-remove" data-remove-idx="${i}">${IC.xCircle}</button>
      </div>`;
    }).join('');
    // Attach remove listeners
    container.querySelectorAll('[data-remove-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(btn.dataset.removeIdx);
        this._pendingImages.splice(idx, 1);
        this._renderPendingPreviews();
      });
    });
  }

  _getFilteredRequests() {
    let reqs = [...this._requests];

    // Collaborators only see their own tasks
    if (!this._isSuperAdmin && this._myCollabId) {
      reqs = reqs.filter(r => r.assignedTo === this._myCollabId);
    }

    // Status filter
    if (this._statusFilter !== 'all') {
      reqs = reqs.filter(r => (r.status || 'inbox') === this._statusFilter);
    }

    // Business tag filter
    if (this._bizFilter !== 'all') {
      reqs = reqs.filter(r => {
        const cardTags = r.tags || [];
        return cardTags.includes(this._bizFilter);
      });
    }

    // Search filter
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      reqs = reqs.filter(r => {
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    // Sort by createdAt desc
    reqs.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    return reqs;
  }

  _groupByDate(requests) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay());

    const groups = {
      hoy: { label: 'Hoy', items: [] },
      ayer: { label: 'Ayer', items: [] },
      semana: { label: 'Esta Semana', items: [] },
      anteriores: { label: 'Anteriores', items: [] },
    };

    for (const req of requests) {
      const d = req.createdAt?.toDate ? req.createdAt.toDate() : new Date(req.createdAt || 0);
      const reqDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (reqDate.getTime() === today.getTime()) {
        groups.hoy.items.push(req);
      } else if (reqDate.getTime() === yesterday.getTime()) {
        groups.ayer.items.push(req);
      } else if (reqDate >= weekStart) {
        groups.semana.items.push(req);
      } else {
        groups.anteriores.items.push(req);
      }
    }

    return Object.values(groups).filter(g => g.items.length > 0);
  }

  async _handleQuickCreate() {
    const input = this.container.querySelector('#collab-quick-input');
    const descInput = this.container.querySelector('#collab-quick-desc');
    if (!input) return;

    const title = input.value.trim();
    const description = descInput ? descInput.value.trim() : '';
    if (!title && !description && this._pendingImages.length === 0) return;

    // Get selected priority
    const activePri = this.container.querySelector('.collab-quick__tag--priority.collab-quick__tag--active');
    const priority = activePri ? activePri.dataset.priority : 'medium';

    // Get selected business tags (multi-select)
    const activeBiz = this.container.querySelectorAll('.collab-quick__tag--biz.collab-quick__tag--active');
    const tags = Array.from(activeBiz).map(b => b.dataset.biz);

    // Disable send button while creating
    const sendBtn = this.container.querySelector('#collab-quick-send');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '0.5'; }

    try {
      // Create doc first to get the ID for image paths
      const docData = {
        title: title || 'Solicitud con imagen',
        description,
        priority,
        status: 'inbox',
        assignedTo: null,
        tags,
        images: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: this.currentUser?.phone || '',
      };

      const docRef = await addDoc(collection(db, 'solicitudes'), docData);

      // Upload pending images if any
      if (this._pendingImages.length > 0) {
        const imageUrls = await this._uploadImages(this._pendingImages, docRef.id);
        if (imageUrls.length > 0) {
          await updateDoc(doc(db, 'solicitudes', docRef.id), { images: imageUrls });
        }
        this._pendingImages = [];
        this._renderPendingPreviews();
      }

      input.value = '';
      if (descInput) descInput.value = '';
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Solicitud creada', type: 'success' } }));
    } catch (err) {
      console.error('[CollabPanel] Quick create error:', err);
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Error al crear solicitud', type: 'error' } }));
    } finally {
      if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = '1'; }
    }
  }

  async _handleStatusChange(cardId, newStatus) {
    try {
      await updateDoc(doc(db, 'solicitudes', cardId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      const colLabel = COLUMNS.find(c => c.id === newStatus)?.label || newStatus;
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: `Movido a "${colLabel}"`, type: 'info' } }));
    } catch (err) {
      console.error('[CollabPanel] Status change error:', err);
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Error al cambiar estado', type: 'error' } }));
    }
  }

  _attachSolicitudesListeners() {
    // Quick input: Enter key
    const quickInput = this.container.querySelector('#collab-quick-input');
    if (quickInput) {
      quickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this._handleQuickCreate();
        }
      });
    }

    // Send button
    const sendBtn = this.container.querySelector('#collab-quick-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this._handleQuickCreate());
    }

    // Attach image button + file input
    const attachBtn = this.container.querySelector('#collab-quick-attach');
    const fileInput = this.container.querySelector('#collab-file-input');
    if (attachBtn && fileInput) {
      attachBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        const files = Array.from(fileInput.files || []);
        if (files.length === 0) return;
        // Max 5 pending images
        const remaining = 5 - this._pendingImages.length;
        this._pendingImages.push(...files.slice(0, remaining));
        this._renderPendingPreviews();
        fileInput.value = ''; // reset so same file can be selected again
      });
    }

    // Priority tags: single-select (always one active)
    this.container.querySelectorAll('.collab-quick__tag--priority').forEach(tag => {
      tag.addEventListener('click', () => {
        this.container.querySelectorAll('.collab-quick__tag--priority').forEach(t => t.classList.remove('collab-quick__tag--active'));
        tag.classList.add('collab-quick__tag--active');
      });
    });

    // Business tags: multi-select toggle
    this.container.querySelectorAll('.collab-quick__tag--biz').forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('collab-quick__tag--active');
      });
    });

    // Status filter buttons
    this.container.querySelectorAll('.collab-filter--status').forEach(btn => {
      btn.addEventListener('click', () => {
        this._statusFilter = btn.dataset.filter;
        this.container.querySelectorAll('.collab-filter--status').forEach(b => b.classList.remove('collab-filter--active'));
        btn.classList.add('collab-filter--active');
        this._refreshFilteredView();
      });
    });

    // Business filter buttons
    this.container.querySelectorAll('.collab-filter--biz').forEach(btn => {
      btn.addEventListener('click', () => {
        this._bizFilter = btn.dataset.bizFilter;
        this.container.querySelectorAll('.collab-filter--biz').forEach(b => b.classList.remove('collab-filter--active'));
        btn.classList.add('collab-filter--active');
        this._refreshFilteredView();
      });
    });

    // Search input: debounced
    const searchInput = this.container.querySelector('#collab-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (this._searchTimeout) clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
          this._searchQuery = searchInput.value.trim();
          this._refreshFilteredView();
        }, 300);
      });
    }

    // Card-level listeners
    this._attachTimelineCardListeners();
  }

  _refreshFilteredView() {
    const timeline = this.container.querySelector('#collab-timeline');
    if (timeline) timeline.outerHTML = this._buildTimeline();
    const overview = this.container.querySelector('#collab-overview');
    if (overview) overview.outerHTML = this._buildOverview();
    this._attachTimelineCardListeners();
  }

  _attachTimelineCardListeners() {
    const sa = this._isSuperAdmin;

    // Card body click -> detail popup
    this.container.querySelectorAll('.collab-tcard__body[data-detail-id]').forEach(body => {
      body.addEventListener('click', (e) => {
        // Don't open detail if clicking on interactive elements
        if (e.target.closest('.collab-tcard__status-btn') ||
            e.target.closest('.collab-tcard__status-menu') ||
            e.target.closest('.collab-tcard__actions') ||
            e.target.closest('.collab-card__action') ||
            e.target.closest('a')) {
          return;
        }
        const cardId = body.dataset.detailId;
        const card = this._requests.find(r => r.id === cardId);
        if (card) this._showDetailPopup(card);
      });
      body.style.cursor = 'pointer';
    });

    // Status buttons: toggle menu
    this.container.querySelectorAll('.collab-tcard__status-btn[data-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = btn.dataset.id;
        const menu = this.container.querySelector(`#status-menu-${cardId}`);
        if (!menu) return;
        // Close all other menus first
        this.container.querySelectorAll('.collab-tcard__status-menu').forEach(m => {
          if (m !== menu) m.classList.remove('collab-tcard__status-menu--open');
        });
        menu.classList.toggle('collab-tcard__status-menu--open');
      });
    });

    // Status menu options
    this.container.querySelectorAll('.collab-tcard__status-option[data-id]').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = opt.dataset.id;
        const newStatus = opt.dataset.status;
        this._handleStatusChange(cardId, newStatus);
        // Close menu
        const menu = this.container.querySelector(`#status-menu-${cardId}`);
        if (menu) menu.classList.remove('collab-tcard__status-menu--open');
      });
    });

    // Edit buttons (superadmin)
    if (sa) {
      // Attach image to existing card
      this.container.querySelectorAll('[data-attach-img]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cardId = btn.dataset.attachImg;
          const fi = document.createElement('input');
          fi.type = 'file';
          fi.accept = 'image/*';
          fi.multiple = true;
          fi.addEventListener('change', async () => {
            const files = Array.from(fi.files || []);
            if (files.length === 0) return;
            document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Subiendo imagen...', type: 'info' } }));
            const urls = await this._uploadImages(files.slice(0, 5), cardId);
            if (urls.length > 0) {
              const card = this._requests.find(r => r.id === cardId);
              const existing = card?.images || [];
              await updateDoc(doc(db, 'solicitudes', cardId), {
                images: [...existing, ...urls],
                updatedAt: Timestamp.now(),
              });
              document.dispatchEvent(new CustomEvent('toast', { detail: { message: `${urls.length} imagen(es) agregada(s)`, type: 'success' } }));
            }
          });
          fi.click();
        });
      });

      this.container.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const card = this._requests.find(r => r.id === btn.dataset.edit);
          if (card) this._showRequestModal(card);
        });
      });

      // Delete buttons (superadmin)
      this.container.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('Eliminar esta solicitud?')) return;
          try {
            await deleteDoc(doc(db, 'solicitudes', btn.dataset.delete));
            document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Solicitud eliminada', type: 'info' } }));
          } catch (err) {
            console.error('[CollabPanel] Delete error:', err);
          }
        });
      });
    }

    // Click outside status menu: close all
    document.addEventListener('click', this._closeAllStatusMenus.bind(this), { once: true });
  }

  _closeAllStatusMenus() {
    this.container.querySelectorAll('.collab-tcard__status-menu--open').forEach(m => {
      m.classList.remove('collab-tcard__status-menu--open');
    });
    // Re-register listener
    document.addEventListener('click', this._closeAllStatusMenus.bind(this), { once: true });
  }

  _refreshSolicitudes() {
    if (this._view !== 'solicitudes') return;

    const overview = this.container.querySelector('#collab-overview');
    if (overview) overview.outerHTML = this._buildOverview();

    const timeline = this.container.querySelector('#collab-timeline');
    if (timeline) timeline.outerHTML = this._buildTimeline();

    this._attachTimelineCardListeners();

    // Update subtitle count in real time
    const sub = this.container.querySelector('.collab-subtitle');
    if (sub) {
      sub.textContent = this._isSuperAdmin
        ? `${this._collaborators.length} colaboradores · ${this._requests.length} solicitudes`
        : `${this._myCollabId ? this._requests.filter(r => r.assignedTo === this._myCollabId).length : this._requests.length} tareas asignadas`;
    }
  }

  _getUniqueBizTags() {
    return [...new Set(this._collaborators.flatMap(c => c.businesses || []))];
  }

  _formatFullDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const day = d.getDate();
    const month = d.toLocaleString('es', { month: 'short' });
    const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${day} ${capMonth}, ${h12}:${minutes} ${ampm}`;
  }

  _getCreatorName(phone) {
    if (!phone) return 'Desconocido';
    const userPhone = this.currentUser?.phone || '';
    const uLast8 = userPhone.replace(/\D/g, '').slice(-8);
    const pLast8 = phone.replace(/\D/g, '').slice(-8);
    if (uLast8 && pLast8 && uLast8 === pLast8) return 'Tu';

    const match = this._collaborators.find(c => {
      const cPhone = (c.phone || '').replace(/\D/g, '').slice(-8);
      return cPhone && pLast8 && cPhone === pLast8;
    });
    return match ? match.name : phone;
  }

  /* ═══════════════════════════════════════
     TEAM VIEW
     ═══════════════════════════════════════ */

  _buildTeam() {
    return `
    <div class="collab-team">
      ${this._collaborators.length === 0
        ? `<div class="collab-empty">
            ${IC.users}
            <h3>No hay colaboradores</h3>
            <p>Agrega colaboradores para gestionar su acceso y asignarles solicitudes.</p>
          </div>`
        : `<div class="collab-team__grid">
            ${this._collaborators.map(c => this._buildCollabCard(c)).join('')}
          </div>`
      }
    </div>`;
  }

  _buildCollabCard(collab) {
    const initial = (collab.name || '?')[0].toUpperCase();
    const roleLabel = collab.role === 'admin' ? 'Administrador' : collab.role === 'editor' ? 'Editor' : 'Colaborador';
    const roleColor = collab.role === 'admin' ? '#EF4444' : collab.role === 'editor' ? '#F59E0B' : '#3B82F6';
    const taskCount = this._requests.filter(r => r.assignedTo === collab.id).length;
    const activeCount = this._requests.filter(r => r.assignedTo === collab.id && r.status === 'in_progress').length;

    return `
    <div class="collab-member" data-collab-id="${collab.id}">
      <div class="collab-member__header">
        <div class="collab-member__avatar-wrap">
          <div class="collab-member__avatar">${initial}</div>
          <span class="collab-member__status ${collab.active !== false ? 'collab-member__status--online' : ''}"></span>
        </div>
        <div class="collab-member__info">
          <h3 class="collab-member__name">${collab.name || 'Sin nombre'}</h3>
          <span class="collab-member__role" style="color:${roleColor}">${IC.shield} ${roleLabel}</span>
        </div>
        <div class="collab-member__actions">
          <button class="collab-card__action" data-edit-collab="${collab.id}" title="Editar">${IC.edit}</button>
          <button class="collab-card__action collab-card__action--delete" data-delete-collab="${collab.id}" title="Eliminar">${IC.trash}</button>
        </div>
      </div>
      <div class="collab-member__details">
        ${collab.email ? `<span class="collab-member__detail">${IC.mail} ${collab.email}</span>` : ''}
        ${collab.phone ? `<span class="collab-member__detail">${IC.phone} ${collab.phone}</span>` : ''}
      </div>
      <div class="collab-member__stats">
        <div class="collab-member__stat">
          <span class="collab-member__stat-val">${taskCount}</span>
          <span class="collab-member__stat-label">Tareas</span>
        </div>
        <div class="collab-member__stat">
          <span class="collab-member__stat-val">${activeCount}</span>
          <span class="collab-member__stat-label">Activas</span>
        </div>
        <div class="collab-member__stat">
          <span class="collab-member__stat-val">${collab.businesses?.length || 0}</span>
          <span class="collab-member__stat-label">Negocios</span>
        </div>
      </div>
      ${collab.businesses?.length ? `
      <div class="collab-member__access">
        <span class="collab-member__access-label">Acceso a:</span>
        ${collab.businesses.map(b => `<span class="collab-member__biz-tag">${b}</span>`).join('')}
      </div>` : ''}
    </div>`;
  }

  _refreshTeam() {
    const content = this.container.querySelector('#collab-content');
    if (content && this._view === 'team') {
      content.innerHTML = this._buildTeam();
      this._attachTeamListeners();
    }
  }

  /* ═══════════════════════════════════════
     MODALS
     ═══════════════════════════════════════ */

  _showRequestModal(existing = null) {
    const overlay = this.container.querySelector('#collab-modal-overlay');
    if (!overlay) return;

    const isEdit = !!existing;
    overlay.classList.add('collab-modal-overlay--open');
    overlay.innerHTML = `
    <div class="collab-modal">
      <div class="collab-modal__header">
        <h2>${isEdit ? 'Editar Solicitud' : 'Nueva Solicitud'}</h2>
        <button class="collab-modal__close" id="collab-modal-close">${IC.x}</button>
      </div>
      <form class="collab-modal__form" id="collab-request-form">
        <div class="collab-field">
          <label>Titulo *</label>
          <input type="text" name="title" required placeholder="Que necesitas?" value="${existing?.title || ''}" />
        </div>
        <div class="collab-field">
          <label>Descripcion</label>
          <textarea name="description" rows="3" placeholder="Describe la solicitud con detalle...">${existing?.description || ''}</textarea>
        </div>
        <div class="collab-field-row">
          <div class="collab-field">
            <label>Prioridad</label>
            <select name="priority">
              ${Object.entries(PRIORITIES).map(([k, v]) => `<option value="${k}" ${(existing?.priority || 'medium') === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select>
          </div>
          <div class="collab-field">
            <label>Estado</label>
            <select name="status">
              ${COLUMNS.map(c => `<option value="${c.id}" ${(existing?.status || 'inbox') === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="collab-field">
          <label>Asignar a</label>
          <select name="assignedTo">
            <option value="">Sin asignar</option>
            ${this._collaborators.map(c => `<option value="${c.id}" ${existing?.assignedTo === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="collab-field">
          <label>Etiquetas (separadas por coma)</label>
          <input type="text" name="tags" placeholder="diseno, urgente, web" value="${(existing?.tags || []).join(', ')}" />
        </div>
        ${isEdit && (existing?.images || []).length ? `
        <div class="collab-field">
          <label>Imagenes adjuntas</label>
          <div class="collab-modal__images">
            ${existing.images.map((img, i) => `
              <div class="collab-modal__img-item">
                <img src="${img}" alt="Ref ${i + 1}" />
                <button type="button" class="collab-modal__img-remove" data-rm-img="${i}" title="Quitar">${IC.xCircle}</button>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
        <div class="collab-field">
          <label>Agregar imagenes</label>
          <input type="file" name="newImages" accept="image/*" multiple class="collab-field__file-input" />
        </div>
        <div class="collab-modal__actions">
          <button type="button" class="collab-btn collab-btn--ghost" id="collab-modal-cancel">Cancelar</button>
          <button type="submit" class="collab-btn collab-btn--primary">${isEdit ? 'Guardar Cambios' : 'Crear Solicitud'}</button>
        </div>
      </form>
    </div>`;

    // Track removed image indexes
    let removedImgIndexes = [];

    // Modal listeners
    overlay.querySelector('#collab-modal-close')?.addEventListener('click', () => this._closeModal());
    overlay.querySelector('#collab-modal-cancel')?.addEventListener('click', () => this._closeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._closeModal(); });

    // Remove existing image buttons
    overlay.querySelectorAll('[data-rm-img]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.rmImg);
        removedImgIndexes.push(idx);
        btn.closest('.collab-modal__img-item')?.remove();
      });
    });

    overlay.querySelector('#collab-request-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        title: fd.get('title'),
        description: fd.get('description'),
        priority: fd.get('priority'),
        status: fd.get('status'),
        assignedTo: fd.get('assignedTo') || null,
        tags: fd.get('tags') ? fd.get('tags').split(',').map(t => t.trim()).filter(Boolean) : [],
        updatedAt: Timestamp.now(),
      };

      try {
        // Handle images
        let currentImages = existing?.images || [];

        // Remove deleted images
        if (removedImgIndexes.length > 0) {
          currentImages = currentImages.filter((_, i) => !removedImgIndexes.includes(i));
        }

        // Upload new images
        const newFiles = Array.from(e.target.querySelector('[name="newImages"]')?.files || []);
        if (newFiles.length > 0) {
          const docId = isEdit ? existing.id : 'temp';
          const newUrls = await this._uploadImages(newFiles.slice(0, 5), docId);
          currentImages = [...currentImages, ...newUrls];
        }

        data.images = currentImages;

        if (isEdit) {
          await updateDoc(doc(db, 'solicitudes', existing.id), data);
        } else {
          data.createdAt = Timestamp.now();
          data.createdBy = this.currentUser?.phone || 'unknown';
          const newDoc = await addDoc(collection(db, 'solicitudes'), data);
          // Re-upload images with correct doc ID if any were uploaded with 'temp'
          if (newFiles.length > 0) {
            const correctUrls = await this._uploadImages(newFiles.slice(0, 5), newDoc.id);
            if (correctUrls.length > 0) {
              await updateDoc(doc(db, 'solicitudes', newDoc.id), { images: correctUrls });
            }
          }
        }
        this._closeModal();
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: isEdit ? 'Solicitud actualizada' : 'Solicitud creada', type: 'success' } }));
      } catch (err) {
        console.error('[CollabPanel] Save error:', err);
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Error al guardar', type: 'error' } }));
      }
    });
  }

  _showCollabModal(existing = null) {
    const overlay = this.container.querySelector('#collab-modal-overlay');
    if (!overlay) return;

    const isEdit = !!existing;
    overlay.classList.add('collab-modal-overlay--open');
    overlay.innerHTML = `
    <div class="collab-modal">
      <div class="collab-modal__header">
        <h2>${isEdit ? 'Editar Colaborador' : 'Agregar Colaborador'}</h2>
        <button class="collab-modal__close" id="collab-modal-close">${IC.x}</button>
      </div>
      <form class="collab-modal__form" id="collab-member-form">
        <div class="collab-field">
          <label>Nombre completo *</label>
          <input type="text" name="name" required placeholder="Nombre del colaborador" value="${existing?.name || ''}" />
        </div>
        <div class="collab-field-row">
          <div class="collab-field">
            <label>Email</label>
            <input type="email" name="email" placeholder="correo@ejemplo.com" value="${existing?.email || ''}" />
          </div>
          <div class="collab-field">
            <label>Telefono</label>
            <input type="tel" name="phone" placeholder="+507 6XXX-XXXX" value="${existing?.phone || ''}" />
          </div>
        </div>
        <div class="collab-field">
          <label>Rol</label>
          <select name="role">
            <option value="collaborator" ${(existing?.role || 'collaborator') === 'collaborator' ? 'selected' : ''}>Colaborador</option>
            <option value="editor" ${existing?.role === 'editor' ? 'selected' : ''}>Editor</option>
            <option value="admin" ${existing?.role === 'admin' ? 'selected' : ''}>Administrador</option>
          </select>
        </div>
        <div class="collab-field">
          <label>Acceso a negocios (separados por coma)</label>
          <input type="text" name="businesses" placeholder="xazai, rush-ride" value="${(existing?.businesses || []).join(', ')}" />
        </div>
        <div class="collab-field collab-field--toggle">
          <label>Estado activo</label>
          <label class="collab-toggle">
            <input type="checkbox" name="active" ${existing?.active !== false ? 'checked' : ''} />
            <span class="collab-toggle__slider"></span>
          </label>
        </div>
        <div class="collab-modal__actions">
          <button type="button" class="collab-btn collab-btn--ghost" id="collab-modal-cancel">Cancelar</button>
          <button type="submit" class="collab-btn collab-btn--primary">${isEdit ? 'Guardar Cambios' : 'Agregar'}</button>
        </div>
      </form>
    </div>`;

    overlay.querySelector('#collab-modal-close')?.addEventListener('click', () => this._closeModal());
    overlay.querySelector('#collab-modal-cancel')?.addEventListener('click', () => this._closeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._closeModal(); });

    overlay.querySelector('#collab-member-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        name: fd.get('name'),
        email: fd.get('email') || null,
        phone: fd.get('phone') || null,
        role: fd.get('role'),
        businesses: fd.get('businesses') ? fd.get('businesses').split(',').map(t => t.trim()).filter(Boolean) : [],
        active: !!fd.get('active'),
        updatedAt: Timestamp.now(),
      };

      try {
        if (isEdit) {
          await updateDoc(doc(db, 'collaborators', existing.id), data);
        } else {
          data.createdAt = Timestamp.now();
          data.addedBy = this.currentUser?.phone || 'unknown';
          await addDoc(collection(db, 'collaborators'), data);
        }
        // Sync businesses access to 'users' collection so Home shows their linked businesses
        await this._syncCollabToUsers(data);
        this._closeModal();
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: isEdit ? 'Colaborador actualizado' : 'Colaborador agregado', type: 'success' } }));
      } catch (err) {
        console.error('[CollabPanel] Save collab error:', err);
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Error al guardar', type: 'error' } }));
      }
    });
  }

  _closeModal() {
    const overlay = this.container.querySelector('#collab-modal-overlay');
    if (overlay) {
      overlay.classList.remove('collab-modal-overlay--open');
      overlay.innerHTML = '';
    }
  }

  /* ═══════════════════════════════════════
     SYNC COLLABORATOR -> USERS COLLECTION
     ═══════════════════════════════════════ */

  async _syncCollabToUsers(data) {
    // When a collaborator has a phone, ensure they exist in the 'users' collection
    // so the Home page shows their linked businesses
    if (!data.phone) return;
    try {
      const formatted = userAuth.formatPhone(data.phone);
      const userDocRef = doc(db, 'users', formatted);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        // Update existing user's businesses, name, and ensure role is set
        await updateDoc(userDocRef, {
          businesses: data.businesses || [],
          name: data.name || userSnap.data().name,
          role: data.role === 'admin' ? 'admin' : 'collaborator',
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new user document so they can log in and see businesses
        await setDoc(userDocRef, {
          phone: formatted,
          name: data.name || '',
          role: data.role === 'admin' ? 'admin' : 'collaborator',
          businesses: data.businesses || [],
          pinHash: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLogin: null,
        });
      }
      console.log('[CollabPanel] Synced user access for', formatted);
    } catch (err) {
      console.warn('[CollabPanel] Failed to sync user access:', err);
    }
  }

  /* ═══════════════════════════════════════
     EVENT LISTENERS
     ═══════════════════════════════════════ */

  _attachListeners() {
    // Back button
    this.container.querySelector('#collab-back')?.addEventListener('click', () => {
      window.location.hash = '#home';
    });

    // SuperAdmin-only: tab switching & add button
    if (this._isSuperAdmin) {
      this.container.querySelectorAll('.collab-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this._view = tab.dataset.tab;
          this._renderPanel();
          this._attachListeners();
        });
      });

      // Add button only exists in team view
      this.container.querySelector('#collab-add-new')?.addEventListener('click', () => {
        this._showCollabModal();
      });
    } else {
      // Collaborator logout
      this.container.querySelector('#collab-logout')?.addEventListener('click', () => {
        userAuth.clearSession();
        document.dispatchEvent(new CustomEvent('accios-logout'));
        window.location.hash = '#login';
        window.location.reload();
      });
    }

    // Solicitudes or team listeners
    if (this._view === 'solicitudes') this._attachSolicitudesListeners();
    else this._attachTeamListeners();
  }

  _attachTeamListeners() {
    this.container.querySelectorAll('[data-edit-collab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const collab = this._collaborators.find(c => c.id === btn.dataset.editCollab);
        if (collab) this._showCollabModal(collab);
      });
    });

    this.container.querySelectorAll('[data-delete-collab]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Eliminar este colaborador?')) return;
        try {
          await deleteDoc(doc(db, 'collaborators', btn.dataset.deleteCollab));
          document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Colaborador eliminado', type: 'info' } }));
        } catch (err) {
          console.error('[CollabPanel] Delete collab error:', err);
        }
      });
    });
  }

  /* ═══════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════ */

  unmount() {
    if (this._unsubRequests) this._unsubRequests();
    if (this._unsubCollabs) this._unsubCollabs();
    if (this._searchTimeout) clearTimeout(this._searchTimeout);
    // Revoke any pending object URLs
    if (this._objectUrls) this._objectUrls.forEach(u => URL.revokeObjectURL(u));
  }
}
