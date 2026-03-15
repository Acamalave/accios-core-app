import { Toast } from '../components/Toast.js';
import userAuth from '../services/userAuth.js';
import { apiUrl } from '../services/apiConfig.js';
import { normBiz } from '../services/bizUtils.js';

export class CommandCenter {
  constructor(container, currentUser, sub) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getSession();
    this.currentTab = sub || 'overview';
    this.kpiData = null;
    this.usersData = null;
    this.dateRange = '30d';
    this.userPage = 1;
    this.userSearch = '';
    this.userFilter = 'all';
    this.charts = {};
    this._searchTimeout = null;
    this._profileOverlay = null;
    // Polling state
    this._pollInterval = null;
    this._lastUpdate = null;
    this._pollPaused = false;
    this._liveTimerInterval = null;
    this._prevKpiJSON = null;
    this._prevUsersJSON = null;
  }

  async render() {
    // Auth guard
    if (!this.currentUser || this.currentUser.role !== 'superadmin') {
      this.container.innerHTML = `
        <section class="cc-page">
          <div class="cc-denied">
            <div class="cc-denied__icon">🔒</div>
            <div class="cc-denied__title">ACCESO DENEGADO</div>
            <div class="cc-denied__text">Solo SuperAdmin puede acceder al Command Center</div>
            <button class="glass-btn" onclick="window.location.hash='#home'">Volver al Home</button>
          </div>
        </section>`;
      return;
    }

    // Loading state
    this.container.innerHTML = `
      <section class="cc-page">
        <div class="cc-loading">
          <div class="cc-loading__spinner"></div>
          <div class="cc-loading__text">INICIALIZANDO COMMAND CENTER...</div>
        </div>
      </section>`;

    // Load Chart.js if needed
    await this._loadChartJS();

    // Fetch initial data
    await this._fetchKPIs();

    // Render shell
    this._renderShell();
  }

  // ─── Chart.js CDN loader ──────────────────────────────────────────
  async _loadChartJS() {
    if (window.Chart) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
      script.onload = resolve;
      script.onerror = () => { console.warn('Chart.js failed to load'); resolve(); };
      document.head.appendChild(script);
    });
  }

  // ─── Data Fetching ────────────────────────────────────────────────
  async _fetchKPIs() {
    try {
      const res = await fetch(apiUrl(`/api/command-data?range=${this.dateRange}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.kpiData = await res.json();
    } catch (err) {
      console.error('CommandCenter KPI fetch error:', err);
      this.kpiData = null;
    }
  }

  async _fetchUsers() {
    try {
      const params = new URLSearchParams({
        page: this.userPage,
        limit: 25,
        filter: this.userFilter,
        search: this.userSearch,
        sort: 'name'
      });
      const res = await fetch(apiUrl(`/api/command-users?${params}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.usersData = await res.json();
    } catch (err) {
      console.error('CommandCenter users fetch error:', err);
      this.usersData = null;
    }
  }

  async _fetchProfile(phone, email) {
    try {
      const params = [];
      if (phone) params.push(`phone=${encodeURIComponent(phone)}`);
      if (email) params.push(`email=${encodeURIComponent(email)}`);
      let url = `/api/command-profile?${params.join('&')}`;
      const res = await fetch(apiUrl(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('CommandCenter profile fetch error:', err);
      return null;
    }
  }

  // ─── Shell ────────────────────────────────────────────────────────
  _renderShell() {
    const isMock = this.kpiData?.mock;
    this.container.innerHTML = `
      <section class="cc-page">
        <div class="cc-header">
          <div class="cc-header__left">
            <button class="cc-back-btn" id="cc-back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Home
            </button>
            <div>
              <div class="cc-title">Command Center</div>
              <div class="cc-subtitle">ACCIOS CORE — Multi-Business Intelligence${isMock ? ' <span class="cc-mock-badge">DEMO DATA</span>' : ''}</div>
            </div>
          </div>
          <div class="cc-header__right">
            <div class="cc-live-indicator">
              <div class="cc-live-dot"></div>
              <span class="cc-live-text">LIVE</span>
              <button class="cc-live-toggle" title="Pausar/Reanudar auto-refresh">⏸</button>
            </div>
            <div class="cc-range-selector">
              <button class="cc-range-btn${this.dateRange === '7d' ? ' active' : ''}" data-range="7d">7D</button>
              <button class="cc-range-btn${this.dateRange === '30d' ? ' active' : ''}" data-range="30d">30D</button>
              <button class="cc-range-btn${this.dateRange === '90d' ? ' active' : ''}" data-range="90d">90D</button>
              <button class="cc-range-btn${this.dateRange === '365d' ? ' active' : ''}" data-range="365d">1Y</button>
            </div>
          </div>
        </div>

        <div class="cc-tabs">
          <button class="cc-tab${this.currentTab === 'overview' ? ' active' : ''}" data-tab="overview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Overview
          </button>
          <button class="cc-tab${this.currentTab === 'users' ? ' active' : ''}" data-tab="users">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Usuarios
          </button>
        </div>

        <div class="cc-content" id="cc-content"></div>
      </section>`;

    // Attach events
    this.container.querySelector('#cc-back').addEventListener('click', () => {
      window.location.hash = '#home';
    });

    this.container.querySelectorAll('.cc-range-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.dateRange = btn.dataset.range;
        this.container.querySelectorAll('.cc-range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        await this._fetchKPIs();
        this._renderTab();
      });
    });

    this.container.querySelectorAll('.cc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentTab = tab.dataset.tab;
        this.container.querySelectorAll('.cc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderTab();
      });
    });

    // Live toggle
    const liveToggle = this.container.querySelector('.cc-live-toggle');
    if (liveToggle) liveToggle.addEventListener('click', () => this._togglePollPause());

    this._renderTab();
  }

  _renderTab() {
    this._stopPolling();
    this._destroyCharts();
    const content = this.container.querySelector('#cc-content');
    if (!content) return;

    if (this.currentTab === 'overview') {
      this._renderOverview(content);
    } else if (this.currentTab === 'users') {
      this._renderUsersTab(content);
    }

    this._startPolling();
  }

  // ─── Overview Tab ─────────────────────────────────────────────────
  _renderOverview(content) {
    const d = this.kpiData;
    if (!d) {
      content.innerHTML = '<div class="cc-loading"><div class="cc-loading__spinner"></div><div class="cc-loading__text">ERROR CARGANDO DATOS</div></div>';
      return;
    }

    const k = d.kpis;
    const fmt = (n) => n.toLocaleString('es-PA');
    const fmtMoney = (n) => '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    content.innerHTML = `
      <div class="cc-kpi-grid">
        <div class="cc-kpi-card">
          <div class="cc-kpi-card__label">Total Usuarios</div>
          <div class="cc-kpi-card__value cc-kpi-card__value--green">${fmt(k.totalUsers)}</div>
          <div class="cc-kpi-card__sub">Across all businesses</div>
        </div>
        <div class="cc-kpi-card">
          <div class="cc-kpi-card__label">Revenue Total</div>
          <div class="cc-kpi-card__value cc-kpi-card__value--purple">${fmtMoney(k.totalRevenue)}</div>
          <div class="cc-kpi-card__sub">Combined lifetime</div>
        </div>
        <div class="cc-kpi-card">
          <div class="cc-kpi-card__label">Total Transacciones</div>
          <div class="cc-kpi-card__value cc-kpi-card__value--amber">${fmt(k.totalTransactions)}</div>
          <div class="cc-kpi-card__sub">Pagos registrados</div>
        </div>
        <div class="cc-kpi-card">
          <div class="cc-kpi-card__label">Avg Revenue/User</div>
          <div class="cc-kpi-card__value">${fmtMoney(k.avgRevenuePerUser)}</div>
          <div class="cc-kpi-card__sub">Lifetime average</div>
        </div>
      </div>

      <div class="cc-charts-grid">
        <div class="cc-chart-card">
          <div class="cc-chart-card__header">
            <div class="cc-chart-card__title">Comportamiento de Consumo</div>
          </div>
          <div class="cc-chart-wrap"><canvas id="cc-chart-revenue"></canvas></div>
        </div>
        <div class="cc-chart-card">
          <div class="cc-chart-card__header">
            <div class="cc-chart-card__title">Business Share</div>
          </div>
          <div class="cc-share-layout">
            <div class="cc-share-legend" id="cc-share-legend"></div>
            <div class="cc-share-donut"><canvas id="cc-chart-share"></canvas></div>
          </div>
        </div>
      </div>

      <div class="cc-activity">
        <div class="cc-activity__title">Actividad Reciente</div>
        <div class="cc-activity__list" id="cc-activity-list"></div>
      </div>`;

    // Render charts
    requestAnimationFrame(() => {
      this._renderRevenueChart(d);
      this._renderShareChart(d);
      this._renderActivityFeed(d);
    });
  }

  // ─── Charts ───────────────────────────────────────────────────────
  _chartDefaults() {
    return {
      color: '#A78BFA',
      borderColor: 'rgba(124, 58, 237, 0.15)',
      font: { family: "'Inter', sans-serif" }
    };
  }

  _renderRevenueChart(data) {
    const ctx = document.getElementById('cc-chart-revenue');
    if (!ctx || !window.Chart) return;

    const trend = data.consumptionTrend || [];
    const labels = trend.map(t => {
      const [y, m] = t.month.split('-');
      const d = new Date(+y, +m - 1);
      return d.toLocaleDateString('es', { month: 'short', year: '2-digit' });
    });

    const bizSeries = [
      { key: 'cakefit', label: 'Cake Fit', color: '#F97316' },
      { key: 'colson', label: 'La Colson', color: '#EC4899' },
      { key: 'cristian', label: 'Cristian Studio', color: '#8B5CF6' },
      { key: 'glowin', label: 'Glowin Strong', color: '#10B981' },
      { key: 'hechizos', label: 'Hechizos Salón', color: '#D946EF' },
      { key: 'resultados', label: 'Resultados', color: '#06B6D4' },
      { key: 'salon507', label: 'Salón 507', color: '#F43F5E' },
      { key: 'tabares', label: 'J. Tabares', color: '#EF4444' },
      { key: 'rush-ride', label: 'Rush Ride', color: '#39FF14' },
      { key: 'xazai', label: 'Xazai', color: '#8B5CF6' }
    ];

    // Only include businesses that have activity in at least 1 month
    const datasets = bizSeries
      .filter(b => trend.some(t => (t[b.key] || 0) > 0))
      .map(b => ({
        label: b.label,
        data: trend.map(t => t[b.key] || 0),
        borderColor: b.color,
        backgroundColor: b.color + '18',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: b.color,
        borderWidth: 2
      }));

    this.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#A78BFA', font: { size: 10, family: "'Inter'" }, boxWidth: 12, padding: 12 } },
          tooltip: {
            callbacks: {
              title: (items) => items[0]?.label || '',
              label: (item) => `${item.dataset.label}: ${item.raw} eventos`
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(124, 58, 237, 0.06)' }, ticks: { color: '#6B5E99', font: { size: 9 }, maxRotation: 45 } },
          y: { grid: { color: 'rgba(124, 58, 237, 0.06)' }, ticks: { color: '#6B5E99', font: { size: 9 } }, beginAtZero: true }
        }
      }
    });
  }

  _renderShareChart(data) {
    const ctx = document.getElementById('cc-chart-share');
    if (!ctx || !window.Chart) return;

    const biz = data.byBusiness || {};
    const labels = Object.values(biz).map(b => b.name);
    const values = Object.values(biz).map(b => b.revenue);
    const colors = Object.values(biz).map(b => b.color);

    // Build custom legend with dot indicators
    const legendEl = document.getElementById('cc-share-legend');
    if (legendEl) {
      legendEl.innerHTML = Object.values(biz).map(b => `
        <div class="cc-share-legend__item">
          <span class="cc-share-legend__dot" style="background:${b.color}"></span>
          <span class="cc-share-legend__name">${b.name}</span>
          <span class="cc-share-legend__val">$${(b.revenue || 0).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
        </div>`).join('');
    }

    this.charts.share = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors.map(c => c + '40'), borderColor: colors, borderWidth: 2 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  _renderActivityFeed(data) {
    const list = document.getElementById('cc-activity-list');
    if (!list) return;

    const icons = {
      order: '🛒', checkin: '🏋️', transaction: '💳', reservation: '📅',
      sale: '🧾', membership: '⭐', quote: '📄', expense: '📦', payment: '💰'
    };

    const items = (data.recentActivity || []).slice(0, 8);
    list.innerHTML = items.map(a => {
      const timeAgo = this._timeAgo(a.date);
      return `
        <div class="cc-activity__item" data-biz="${a.business}">
          <div class="cc-activity__icon">${icons[a.type] || '📌'}</div>
          <div class="cc-activity__text">
            <span class="cc-biz-badge cc-biz-badge--${a.business === 'rush-ride' ? 'rush' : a.business === 'xazai' ? 'xazai' : a.business === 'la-colson' ? 'colson' : a.business === 'resultados' ? 'resultados' : a.business === 'cristian' ? 'cristian' : a.business === 'tabares' ? 'tabares' : a.business === 'cakefit' ? 'cakefit' : a.business === 'glowin' ? 'glowin' : a.business === 'hechizos' ? 'hechizos' : a.business === 'salon507' ? 'salon507' : a.business === 'tcp' ? 'tcp' : a.business === 'janelle' ? 'janelle' : 'accios'}">${(data.byBusiness[a.business]?.name || a.business).split(' ')[0]}</span>
            ${a.description}
          </div>
          <div class="cc-activity__time">${timeAgo}</div>
        </div>`;
    }).join('');
  }

  // ─── Users Tab ────────────────────────────────────────────────────
  async _renderUsersTab(content) {
    content.innerHTML = `
      <div class="cc-users-header">
        <div class="cc-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input class="cc-search" id="cc-search" type="text" placeholder="Buscar por nombre, telefono o email..." value="${this.userSearch}">
        </div>
        <div class="cc-filters">
          <button class="cc-filter-chip${this.userFilter === 'all' ? ' active' : ''}" data-filter="all">Todos</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_rush' ? ' active' : ''}" data-filter="cross_rush">No en Rush Ride</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_xazai' ? ' active' : ''}" data-filter="cross_xazai">No en Xazai</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_colson' ? ' active' : ''}" data-filter="cross_colson">No en La Colson</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_resultados' ? ' active' : ''}" data-filter="cross_resultados">No en RI</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_cristian' ? ' active' : ''}" data-filter="cross_cristian">No en CS</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_tabares' ? ' active' : ''}" data-filter="cross_tabares">No en JT</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_cakefit' ? ' active' : ''}" data-filter="cross_cakefit">No en CF</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_glowin' ? ' active' : ''}" data-filter="cross_glowin">No en GS</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_hechizos' ? ' active' : ''}" data-filter="cross_hechizos">No en HS</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_salon507' ? ' active' : ''}" data-filter="cross_salon507">No en S5</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_tcp' ? ' active' : ''}" data-filter="cross_tcp">No en TC</button>
          <button class="cc-filter-chip${this.userFilter === 'cross_janelle' ? ' active' : ''}" data-filter="cross_janelle">No en JI</button>
          <button class="cc-filter-chip${this.userFilter === 'vip' ? ' active' : ''}" data-filter="vip">VIP</button>
          <button class="cc-filter-chip${this.userFilter === 'churn' ? ' active' : ''}" data-filter="churn">Riesgo Fuga</button>
        </div>
      </div>
      <div id="cc-table-area">
        <div class="cc-loading"><div class="cc-loading__spinner"></div><div class="cc-loading__text">CARGANDO USUARIOS...</div></div>
      </div>`;

    // Events
    const searchInput = content.querySelector('#cc-search');
    searchInput.addEventListener('input', () => {
      clearTimeout(this._searchTimeout);
      this._searchTimeout = setTimeout(async () => {
        this.userSearch = searchInput.value;
        this.userPage = 1;
        await this._fetchAndRenderUsers();
      }, 300);
    });

    content.querySelectorAll('.cc-filter-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        this.userFilter = chip.dataset.filter;
        this.userPage = 1;
        content.querySelectorAll('.cc-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        await this._fetchAndRenderUsers();
      });
    });

    await this._fetchAndRenderUsers();
  }

  async _fetchAndRenderUsers() {
    const area = this.container.querySelector('#cc-table-area');
    if (!area) return;
    area.innerHTML = '<div class="cc-loading"><div class="cc-loading__spinner"></div><div class="cc-loading__text">CARGANDO...</div></div>';

    await this._fetchUsers();
    if (!this.usersData) {
      area.innerHTML = '<div class="cc-loading"><div class="cc-loading__text">ERROR CARGANDO USUARIOS</div></div>';
      return;
    }

    const { users, total, page, totalPages } = this.usersData;

    const BIZ_BADGE_MAP = {
      accioscore: { cls: 'accios', label: 'AC' },
      rushride: { cls: 'rush', label: 'RR' },
      xazai: { cls: 'xazai', label: 'XZ' },
      lacolson: { cls: 'colson', label: 'LC' },
      resultados: { cls: 'resultados', label: 'RI' },
      cristian: { cls: 'cristian', label: 'CS' },
      tabares: { cls: 'tabares', label: 'JT' },
      cakefit: { cls: 'cakefit', label: 'CF' },
      glowin: { cls: 'glowin', label: 'GS' },
      hechizos: { cls: 'hechizos', label: 'HS' },
      salon507: { cls: 'salon507', label: 'S5' },
      tcp: { cls: 'tcp', label: 'TC' },
      janelle: { cls: 'janelle', label: 'JI' },
      mlparts: { cls: 'mlparts', label: 'ML' },
    };
    const bizBadge = (b) => {
      const entry = BIZ_BADGE_MAP[normBiz(b)];
      if (entry) return `<span class="cc-biz-badge cc-biz-badge--${entry.cls}">${entry.label}</span>`;
      return `<span class="cc-biz-badge">${b}</span>`;
    };

    area.innerHTML = `
      <div class="cc-table-wrap">
        <table class="cc-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Telefono</th>
              <th>Negocios</th>
              <th>Total Gastado</th>
              <th>Ultima Actividad</th>
            </tr>
          </thead>
          <tbody>
            ${users.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:2rem;">No se encontraron usuarios</td></tr>' : users.map(u => `
              <tr data-phone="${u.phone || ''}" data-email="${u.email || ''}" class="cc-user-row">
                <td>
                  <div class="cc-table__name">${u.name || 'Sin nombre'}</div>
                  <div class="cc-table__phone">${u.email || ''}</div>
                </td>
                <td><span class="cc-table__phone">${u.phone || '-'}</span></td>
                <td><div class="cc-table__badges">${(u.businesses || []).map(bizBadge).join('')}</div></td>
                <td><span class="cc-table__amount">$${(u.totalSpent || 0).toFixed(2)}</span></td>
                <td><span class="cc-table__date">${this._formatDate(u.lastActive)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="cc-pagination">
          <button class="cc-pagination__btn" id="cc-prev"${page <= 1 ? ' disabled' : ''}>← Prev</button>
          <span class="cc-pagination__info">${total} usuarios · Pagina ${page} de ${totalPages || 1}</span>
          <button class="cc-pagination__btn" id="cc-next"${page >= totalPages ? ' disabled' : ''}>Next →</button>
        </div>
      </div>`;

    // Row click → profile
    area.querySelectorAll('.cc-user-row').forEach(row => {
      row.addEventListener('click', () => {
        const phone = row.dataset.phone;
        const email = row.dataset.email;
        if (phone || email) this._openProfile(phone, email);
      });
    });

    // Pagination
    const prevBtn = area.querySelector('#cc-prev');
    const nextBtn = area.querySelector('#cc-next');
    if (prevBtn) prevBtn.addEventListener('click', async () => { this.userPage--; await this._fetchAndRenderUsers(); });
    if (nextBtn) nextBtn.addEventListener('click', async () => { this.userPage++; await this._fetchAndRenderUsers(); });
  }

  // ─── Profile Panel (Expediente Digital) ──────────────────────────
  async _openProfile(phone, email) {
    const modal = document.getElementById('modal-root');
    if (!modal) return;

    modal.classList.add('active');
    modal.innerHTML = `
      <div class="cc-profile-overlay" id="cc-profile-overlay">
        <div class="cc-profile-panel">
          <div class="cc-loading" style="min-height:300px;">
            <div class="cc-loading__spinner"></div>
            <div class="cc-loading__text">CARGANDO EXPEDIENTE...</div>
          </div>
        </div>
      </div>`;

    modal.querySelector('#cc-profile-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'cc-profile-overlay') this._closeProfile();
    });

    const profile = await this._fetchProfile(phone, email);
    if (!profile) {
      this._closeProfile();
      Toast.show('Error cargando perfil', 'error');
      return;
    }

    const p = profile.unified || {};
    const panel = modal.querySelector('.cc-profile-panel');
    if (!panel) return; // Guard against race condition with polling

    // Find photo URL from allFields
    const photoField = (profile.allFields || []).find(f =>
      typeof f.value === 'string' && /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)/i.test(f.value) &&
      /photo|avatar|image|picture|foto|profilePic|photoURL/i.test(f.key)
    );
    const photoUrl = photoField?.value || '';
    const initials = (p.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    // Extract personal fields from allFields for header card
    const allF = profile.allFields || [];
    const getField = (key) => { const f = allF.find(x => x.key === key); return f ? f.value : null; };
    const instagram = getField('instagram');
    const birthDate = getField('birthDate');
    const cedula = getField('cedula');
    const company = getField('company');
    const direccion = getField('direccion') || getField('addresses');
    const talla = getField('talla') || getField('shoeSize');

    // Build personal details HTML
    let personalDetails = '';
    if (instagram) personalDetails += `<div class="cc-profile-detail"><span class="cc-profile-detail__icon">📸</span><span class="cc-profile-detail__text">@${instagram}</span></div>`;
    if (birthDate) personalDetails += `<div class="cc-profile-detail"><span class="cc-profile-detail__icon">🎂</span><span class="cc-profile-detail__text">${this._formatDate(birthDate)}</span></div>`;
    if (cedula) personalDetails += `<div class="cc-profile-detail"><span class="cc-profile-detail__icon">🪪</span><span class="cc-profile-detail__text">${cedula}</span></div>`;
    if (company) personalDetails += `<div class="cc-profile-detail"><span class="cc-profile-detail__icon">🏢</span><span class="cc-profile-detail__text">${company}</span></div>`;
    if (direccion) {
      const addr = Array.isArray(direccion) ? direccion.join(', ') : direccion;
      personalDetails += `<div class="cc-profile-detail"><span class="cc-profile-detail__icon">📍</span><span class="cc-profile-detail__text">${addr}</span></div>`;
    }
    if (talla) personalDetails += `<div class="cc-profile-detail"><span class="cc-profile-detail__icon">👟</span><span class="cc-profile-detail__text">Talla ${talla}</span></div>`;

    panel.innerHTML = `
      <div class="cc-profile-header">
        <button class="cc-profile-close" id="cc-profile-close">✕</button>
        <button class="cc-profile-merge-btn" id="cc-profile-merge" title="Fusionar con otro contacto">⛓ Fusionar</button>
        <div class="cc-profile-avatar-row">
          ${photoUrl
            ? `<img src="${photoUrl}" class="cc-profile-avatar" alt="">`
            : `<div class="cc-profile-avatar cc-profile-avatar--initials">${initials}</div>`
          }
          <div>
            <div class="cc-profile-name">${p.name || 'Sin nombre'}</div>
            <div class="cc-profile-phone">${p.phone || phone}</div>
            ${p.email ? `<div class="cc-profile-email">${p.email}</div>` : ''}
          </div>
        </div>
        <div class="cc-profile-badges">
          ${(p.businesses || []).map(b => {
            const BIZ_FULL = {
              accioscore: { cls: 'accios', name: 'ACCIOS CORE' },
              rushride: { cls: 'rush', name: 'Rush Ride' },
              xazai: { cls: 'xazai', name: 'Xazai' },
              lacolson: { cls: 'colson', name: 'La Colson' },
              resultados: { cls: 'resultados', name: 'Resultados Inevitables' },
              cristian: { cls: 'cristian', name: 'Cristian Studio' },
              tabares: { cls: 'tabares', name: 'Jesus Tabares Salón' },
              cakefit: { cls: 'cakefit', name: 'Cake Fit' },
              glowin: { cls: 'glowin', name: 'Glowin Strong' },
              hechizos: { cls: 'hechizos', name: 'Hechizos Salón' },
              salon507: { cls: 'salon507', name: 'Salón 507' },
              tcp: { cls: 'tcp', name: 'Tu Compra Panamá' },
              janelle: { cls: 'janelle', name: 'Janelle Innovación' },
              mlparts: { cls: 'mlparts', name: 'ML Parts' },
            };
            const entry = BIZ_FULL[normBiz(b)];
            return entry ? `<span class="cc-biz-badge cc-biz-badge--${entry.cls}">${entry.name}</span>` : '';
          }).join('')}
        </div>
        <div class="cc-profile-stats">
          <div class="cc-profile-stat cc-profile-stat--expandable" id="cc-stat-spent">
            <div class="cc-profile-stat__value">$${(p.totalSpent || 0).toFixed(0)}</div>
            <div class="cc-profile-stat__label">Total Spent ▾</div>
            <div class="cc-spent-breakdown" id="cc-spent-breakdown">
              ${this._renderSpentBreakdown(profile)}
            </div>
          </div>
          <div class="cc-profile-stat">
            <div class="cc-profile-stat__value">${(p.businesses || []).length}</div>
            <div class="cc-profile-stat__label">Negocios</div>
          </div>
          ${p.firstSeen ? `<div class="cc-profile-stat">
            <div class="cc-profile-stat__value">${this._formatDate(p.firstSeen)}</div>
            <div class="cc-profile-stat__label">Desde</div>
          </div>` : ''}
        </div>
        ${personalDetails ? `<div class="cc-profile-personal">${personalDetails}</div>` : ''}
      </div>
      <div class="cc-profile-body">
        ${this._renderBusinessSection('accios-core', 'ACCIOS CORE', profile.accios)}
        ${this._renderBusinessSection('rush-ride', 'Rush Ride Studio', profile.rushRide)}
        ${this._renderBusinessSection('xazai', 'Xazai', profile.xazai)}
        ${this._renderBusinessSection('la-colson', 'La Colson', profile.laColson)}
        ${this._renderBusinessSection('resultados', 'Resultados Inevitables', profile.resultados)}
        ${this._renderBusinessSection('cristian', 'Cristian Studio', profile.cristian)}
        ${this._renderBusinessSection('tabares', 'Jesus Tabares Salón', profile.tabares)}
        ${this._renderBusinessSection('cakefit', 'Cake Fit', profile.cakefit)}
        ${this._renderBusinessSection('glowin', 'Glowin Strong', profile.glowin)}
        ${this._renderBusinessSection('hechizos', 'Hechizos Salón', profile.hechizos)}
        ${this._renderBusinessSection('salon507', 'Salón 507', profile.salon507)}
        ${this._renderBusinessSection('tcp', 'Tu Compra Panamá', profile.tcp)}
        ${this._renderBusinessSection('janelle', 'Janelle Innovación', profile.janelle)}
        ${this._renderTimeline(profile.timeline)}
      </div>`;

    panel.querySelector('#cc-profile-close').addEventListener('click', () => this._closeProfile());

    // Expandable Total Spent
    const spentStat = panel.querySelector('#cc-stat-spent');
    if (spentStat) spentStat.addEventListener('click', () => spentStat.classList.toggle('expanded'));

    // Merge button
    panel.querySelector('#cc-profile-merge')?.addEventListener('click', () => {
      this._openMergeFlow(p.phone || phone, p.email || email, p.name || 'Sin nombre');
    });
  }

  // ─── Dynamic Field Renderer (Expediente) ────────────────────────
  _fieldLabel(key) {
    const labels = {
      name: 'Nombre', displayName: 'Nombre', email: 'Email', phone: 'Teléfono',
      role: 'Rol', address: 'Dirección', direccion: 'Dirección',
      photo: 'Foto', photoURL: 'Foto', avatar: 'Foto', profilePic: 'Foto',
      shoeSize: 'Talla Zapato', talla: 'Talla', createdAt: 'Registrado',
      lastLogin: 'Último Login', lastActive: 'Última Actividad',
      totalSpent: 'Total Gastado', totalOrders: 'Total Órdenes',
      businesses: 'Negocios Vinculados', membership: 'Membresía',
      favoriteItems: 'Favoritos', lastOrderDate: 'Último Pedido',
      firstSeen: 'Primera Vez', updatedAt: 'Actualizado',
      etiquetas: 'Etiquetas', tags: 'Etiquetas', addresses: 'Direcciones',
      birthDate: 'Fecha de Nacimiento', company: 'Compañía', instagram: 'Instagram', cedula: 'Cédula',
      transactionCount: 'Transacciones', paymentMethods: 'Métodos de Pago', lastPayment: 'Último Pago'
    };
    return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  _fieldValue(key, val) {
    if (val === null || val === undefined || val === '') return null;
    // Image URL
    if (typeof val === 'string' && /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)/i.test(val)) {
      return `<img src="${val}" class="cc-dossier-img" alt="${key}">`;
    }
    // Array
    if (Array.isArray(val)) {
      if (val.length === 0) return null;
      if (typeof val[0] === 'string') return val.map(v => `<span class="cc-dossier-tag">${v}</span>`).join('');
      return `${val.length} items`;
    }
    // Object (membership, etc)
    if (typeof val === 'object') {
      const entries = Object.entries(val).filter(([, v]) => v !== null && v !== undefined && v !== '');
      if (entries.length === 0) return null;
      return entries.map(([k, v]) => `<span class="cc-dossier-subfield">${this._fieldLabel(k)}: ${v}</span>`).join('');
    }
    // Date string
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return this._formatDate(val);
    }
    // Number that looks like money
    if (typeof val === 'number' && (key.toLowerCase().includes('spent') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('revenue'))) {
      return `$${val.toFixed(2)}`;
    }
    return String(val);
  }

  _sourceBadge(src) {
    if (src === 'accios-core') return '<span class="cc-dossier-src cc-dossier-src--accios">AC</span>';
    if (src === 'rush-ride') return '<span class="cc-dossier-src cc-dossier-src--rush">RR</span>';
    if (src === 'xazai') return '<span class="cc-dossier-src cc-dossier-src--xazai">XZ</span>';
    if (src === 'la-colson') return '<span class="cc-dossier-src cc-dossier-src--colson">LC</span>';
    if (src === 'resultados') return '<span class="cc-dossier-src cc-dossier-src--resultados">RI</span>';
    if (src === 'cristian') return '<span class="cc-dossier-src cc-dossier-src--cristian">CS</span>';
    if (src === 'tabares') return '<span class="cc-dossier-src cc-dossier-src--tabares">JT</span>';
    if (src === 'cakefit') return '<span class="cc-dossier-src cc-dossier-src--cakefit">CF</span>';
    if (src === 'glowin') return '<span class="cc-dossier-src cc-dossier-src--glowin">GS</span>';
    if (src === 'hechizos') return '<span class="cc-dossier-src cc-dossier-src--hechizos">HS</span>';
    if (src === 'salon507') return '<span class="cc-dossier-src cc-dossier-src--salon507">S5</span>';
    if (src === 'tcp') return '<span class="cc-dossier-src cc-dossier-src--tcp">TC</span>';
    if (src === 'janelle') return '<span class="cc-dossier-src cc-dossier-src--janelle">JI</span>';
    return `<span class="cc-dossier-src">${src}</span>`;
  }

  _renderDossierFields(allFields) {
    if (!allFields || allFields.length === 0) return '';

    // Filter out fields already shown in header or internal
    const skipInDossier = new Set(['name', 'displayName', 'phone', 'email', 'exists', 'id']);
    const fields = allFields.filter(f => !skipInDossier.has(f.key));

    if (fields.length === 0) return '';

    const items = fields.map(f => {
      const val = this._fieldValue(f.key, f.value);
      if (!val) return '';
      const srcBadges = f.sources.length < 3 ? f.sources.map(s => this._sourceBadge(s)).join('') : '';
      return `
        <div class="cc-dossier-field">
          <div class="cc-dossier-field__label">${this._fieldLabel(f.key)} ${srcBadges}</div>
          <div class="cc-dossier-field__value">${val}</div>
        </div>`;
    }).filter(Boolean).join('');

    if (!items) return '';

    return `
      <div class="cc-profile-section">
        <div class="cc-profile-section__title" style="color:var(--neon-green);">Expediente Digital</div>
        <div class="cc-dossier-grid">${items}</div>
      </div>`;
  }

  // ─── Business Sections ──────────────────────────────────────────
  _renderBusinessSection(key, name, data) {
    if (!data || !data.exists) return ''; // Only show businesses where user is registered

    const COLOR_MAP = { rushride:'rush', xazai:'xazai', lacolson:'colson', resultados:'resultados', cristian:'cristian', tabares:'tabares', cakefit:'cakefit', glowin:'glowin', hechizos:'hechizos', salon507:'salon507', tcp:'tcp', janelle:'janelle', mlparts:'mlparts', accioscore:'accios' };
    const nk = normBiz(key); // Normalized key for all comparisons
    const colorClass = COLOR_MAP[nk] || 'accios';
    let items = '';

    if (nk === 'accioscore') {
      // Transactions
      if (data.transactions?.length) {
        items += data.transactions.slice(0, 5).map(t => `
          <div class="cc-profile-item">
            <span>${t.description || 'Transacción'}</span>
            <span class="cc-profile-item__amount" style="color:var(--purple-400);">$${(t.totalAmount || t.amount || 0).toFixed(2)}</span>
            <span class="cc-profile-item__date">${this._formatDate(t.createdAt || t.date)}</span>
          </div>`).join('');
      }
      // Quotes
      if (data.quotes?.length) {
        items += `<div style="font-size:0.7rem;color:var(--text-dim);padding:8px 12px 2px;text-transform:uppercase;letter-spacing:0.05em;">Cotizaciones</div>`;
        items += data.quotes.slice(0, 3).map(q => `
          <div class="cc-profile-item">
            <span>${q.items?.[0]?.description || 'Cotización'}</span>
            <span class="cc-profile-item__amount" style="color:var(--purple-400);">$${(q.total || 0).toFixed(2)}</span>
            <span class="cc-biz-badge" style="font-size:0.6rem;">${q.status || ''}</span>
          </div>`).join('');
      }
    }

    if (nk === 'rushride') {
      // Membership
      const m = data.membership;
      if (m && typeof m === 'object') {
        const plan = m.plan || m.type || m.name || '';
        const status = m.status || '';
        if (plan || status) items += `<div class="cc-profile-item"><span>Membresía: ${plan}</span><span class="cc-biz-badge cc-biz-badge--rush">${status}</span></div>`;
      }
      // Check-ins
      if (data.recentCheckIns?.length) {
        items += data.recentCheckIns.slice(0, 5).map(c => `
          <div class="cc-profile-item">
            <span>Check-in${c.className ? ': ' + c.className : ''}${c.coach ? ' — ' + c.coach : ''}</span>
            <span class="cc-profile-item__date">${this._formatDate(c.date || c.createdAt)}</span>
          </div>`).join('');
      }
      // Reservations
      if (data.recentReservations?.length) {
        items += `<div style="font-size:0.7rem;color:var(--text-dim);padding:8px 12px 2px;text-transform:uppercase;letter-spacing:0.05em;">Reservaciones</div>`;
        items += data.recentReservations.slice(0, 3).map(r => `
          <div class="cc-profile-item">
            <span>${r.className || 'Reserva'}${r.coach ? ' — ' + r.coach : ''}</span>
            <span class="cc-profile-item__date">${this._formatDate(r.date || r.createdAt)}</span>
          </div>`).join('');
      }
      if (data.totalClasses) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">${data.totalClasses} clases registradas</div>`;
    }

    if (nk === 'xazai') {
      if (data.recentOrders?.length) {
        items += data.recentOrders.slice(0, 5).map(o => `
          <div class="cc-profile-item">
            <span>Pedido #${(o.id || '').slice(-4) || '?'}${o.items ? ` (${o.items} items)` : ''}</span>
            <span class="cc-profile-item__amount" style="color:#8B5CF6;">$${(o.total || o.amount || 0).toFixed(2)}</span>
            <span class="cc-profile-item__date">${this._formatDate(o.createdAt || o.date)}</span>
          </div>`).join('');
      }
      if (data.totalOrders) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">${data.totalOrders} órdenes totales · $${(data.totalSpent || 0).toFixed(2)} total</div>`;
    }

    if (nk === 'lacolson') {
      // Tags/Etiquetas
      if (data.tags?.length) {
        items += `<div class="cc-profile-item"><span>Etiquetas:</span></div>`;
        items += `<div style="padding:2px 12px 8px;display:flex;flex-wrap:wrap;gap:4px;">${data.tags.map(t => `<span class="cc-dossier-tag">${t}</span>`).join('')}</div>`;
      }
      // Addresses
      if (data.addresses?.length) {
        items += data.addresses.map(a => `
          <div class="cc-profile-item">
            <span>📍 ${a}</span>
          </div>`).join('');
      }
      if (data.createdAt) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Registrado: ${this._formatDate(data.createdAt)}</div>`;
    }

    if (nk === 'resultados') {
      if (data.instagram) items += `<div class="cc-profile-item"><span>📸 @${data.instagram}</span></div>`;
      if (data.cedula) items += `<div class="cc-profile-item"><span>🪪 Cédula: ${data.cedula}</span></div>`;
      if (data.birthDate) items += `<div class="cc-profile-item"><span>🎂 ${this._formatDate(data.birthDate)}</span></div>`;
      if (data.company) items += `<div class="cc-profile-item"><span>🏢 ${data.company}</span></div>`;
      if (data.tags?.length) {
        items += `<div class="cc-profile-item"><span>Etiquetas:</span></div>`;
        items += `<div style="padding:2px 12px 8px;display:flex;flex-wrap:wrap;gap:4px;">${data.tags.map(t => `<span class="cc-dossier-tag">${t}</span>`).join('')}</div>`;
      }
      if (data.addresses?.length) {
        items += data.addresses.map(a => `
          <div class="cc-profile-item">
            <span>📍 ${a}</span>
          </div>`).join('');
      }
      if (data.createdAt) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Registrado: ${this._formatDate(data.createdAt)}</div>`;
    }

    if (nk === 'cristian') {
      if (data.totalSpent) items += `<div class="cc-profile-item"><span>💰 Total gastado</span><span class="cc-profile-item__amount" style="color:#8B5CF6;">$${(data.totalSpent || 0).toFixed(2)}</span></div>`;
      if (data.transactionCount) items += `<div class="cc-profile-item"><span>🧾 ${data.transactionCount} transacciones</span></div>`;
      if (data.paymentMethods?.length) {
        items += `<div class="cc-profile-item"><span>💳 ${data.paymentMethods.join(', ')}</span></div>`;
      }
      if (data.lastPayment) items += `<div class="cc-profile-item"><span>📅 Último pago: ${this._formatDate(data.lastPayment)}</span></div>`;
      if (data.addresses?.length) {
        items += data.addresses.map(a => `
          <div class="cc-profile-item">
            <span>📍 ${a}</span>
          </div>`).join('');
      }
      if (data.createdAt) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Primer pago: ${this._formatDate(data.createdAt)}</div>`;
    }

    if (nk === 'tabares') {
      if (data.totalSpent) items += `<div class="cc-profile-item"><span>💰 Total gastado</span><span class="cc-profile-item__amount" style="color:#EF4444;">$${(data.totalSpent || 0).toFixed(2)}</span></div>`;
      if (data.transactionCount) items += `<div class="cc-profile-item"><span>🧾 ${data.transactionCount} transacciones</span></div>`;
      if (data.paymentMethods?.length) {
        items += `<div class="cc-profile-item"><span>💳 ${data.paymentMethods.join(', ')}</span></div>`;
      }
      if (data.lastPayment) items += `<div class="cc-profile-item"><span>📅 Último pago: ${this._formatDate(data.lastPayment)}</span></div>`;
      if (data.createdAt) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Primer pago: ${this._formatDate(data.createdAt)}</div>`;
    }

    if (nk === 'cakefit') {
      if (data.totalSpent) items += `<div class="cc-profile-item"><span>💰 Total gastado</span><span class="cc-profile-item__amount" style="color:#F97316;">$${(data.totalSpent || 0).toFixed(2)}</span></div>`;
      if (data.transactionCount) items += `<div class="cc-profile-item"><span>🧾 ${data.transactionCount} transacciones</span></div>`;
      if (data.paymentMethods?.length) {
        items += `<div class="cc-profile-item"><span>💳 ${data.paymentMethods.join(', ')}</span></div>`;
      }
      if (data.cardDetails?.length) {
        items += `<div class="cc-profile-item"><span>💳 ${data.cardDetails.join(', ')}</span></div>`;
      }
      if (data.lastPayment) items += `<div class="cc-profile-item"><span>📅 Último pago: ${this._formatDate(data.lastPayment)}</span></div>`;
      if (data.addresses?.length) {
        items += data.addresses.map(a => `
          <div class="cc-profile-item">
            <span>📍 ${a}</span>
          </div>`).join('');
      }
      if (data.createdAt) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Primer pago: ${this._formatDate(data.createdAt)}</div>`;
    }

    if (nk === 'glowin') {
      if (data.totalSpent) items += `<div class="cc-profile-item"><span>💰 Total gastado</span><span class="cc-profile-item__amount" style="color:#10B981;">$${(data.totalSpent || 0).toFixed(2)}</span></div>`;
      if (data.transactionCount) items += `<div class="cc-profile-item"><span>🧾 ${data.transactionCount} transacciones</span></div>`;
      if (data.paymentMethods?.length) {
        items += `<div class="cc-profile-item"><span>💳 ${data.paymentMethods.join(', ')}</span></div>`;
      }
      if (data.cardDetails?.length) {
        items += `<div class="cc-profile-item"><span>💳 ${data.cardDetails.join(', ')}</span></div>`;
      }
      if (data.products?.length) {
        items += `<div class="cc-profile-item"><span>📦 ${data.products.join(', ')}</span></div>`;
      }
      if (data.lastPayment) items += `<div class="cc-profile-item"><span>📅 Último pago: ${this._formatDate(data.lastPayment)}</span></div>`;
      if (data.addresses?.length) {
        items += data.addresses.map(a => `
          <div class="cc-profile-item">
            <span>📍 ${a}</span>
          </div>`).join('');
      }
      if (data.createdAt) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Primer pago: ${this._formatDate(data.createdAt)}</div>`;
    }

    if (nk === 'hechizos') {
      if (data.totalSpent) items += `<div class="cc-profile-item"><span>💰 Total gastado</span><span class="cc-profile-item__amount" style="color:#D946EF;">$${(data.totalSpent || 0).toFixed(2)}</span></div>`;
      if (data.transactionCount) items += `<div class="cc-profile-item"><span>🧾 ${data.transactionCount} transacciones</span></div>`;
      if (data.paymentMethods?.length) {
        items += `<div class="cc-profile-item"><span>💳 ${data.paymentMethods.join(', ')}</span></div>`;
      }
      if (data.cardDetails?.length) {
        items += `<div class="cc-profile-item"><span>💳 ${data.cardDetails.join(', ')}</span></div>`;
      }
      if (data.products?.length) {
        items += `<div class="cc-profile-item"><span>📦 ${data.products.join(', ')}</span></div>`;
      }
      if (data.lastPayment) items += `<div class="cc-profile-item"><span>📅 Último pago: ${this._formatDate(data.lastPayment)}</span></div>`;
      if (data.addresses?.length) {
        items += data.addresses.map(a => `
          <div class="cc-profile-item">
            <span>📍 ${a}</span>
          </div>`).join('');
      }
      if (data.createdAt) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Registrado: ${this._formatDate(data.createdAt)}</div>`;
    }

    if (nk === 'salon507') {
      if (data.services?.length) {
        items += `<div class="cc-profile-item"><span>💇 ${data.services.join(', ')}</span></div>`;
      }
      if (data.createdAt) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Primera cita: ${this._formatDate(data.createdAt)}</div>`;
    }

    if (nk === 'tcp') {
      if (data.company) items += `<div class="cc-profile-item"><span>🏢 ${data.company}</span></div>`;
      if (data.tags?.length) items += `<div class="cc-profile-item"><span>🏷️ ${data.tags.join(', ')}</span></div>`;
      if (data.addresses?.length) {
        items += data.addresses.map(a => `
          <div class="cc-profile-item">
            <span>📍 ${a}</span>
          </div>`).join('');
      }
    }

    if (nk === 'janelle') {
      if (data.name) items += `<div class="cc-profile-item"><span>👤 ${data.name}</span></div>`;
      if (data.email) items += `<div class="cc-profile-item"><span>📧 ${data.email}</span></div>`;
    }

    if (!items) return ''; // Don't show business section with no activity
    return `
      <div class="cc-profile-section">
        <div class="cc-profile-section__title cc-profile-section__title--${colorClass}">${name}</div>
        ${items}
      </div>`;
  }

  _renderTimeline(timeline) {
    if (!timeline || timeline.length === 0) return '';
    return `
      <div class="cc-profile-section">
        <div class="cc-profile-section__title" style="color:var(--text-secondary);">Timeline Consolidado</div>
        <div class="cc-timeline">
          ${timeline.slice(0, 15).map(t => `
            <div class="cc-timeline__item" data-biz="${t.business}">
              <div class="cc-timeline__date">${this._formatDate(t.date)}</div>
              <div class="cc-timeline__desc">${t.description}</div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  // ─── Spent Breakdown (expandable) ────────────────────────────────
  _renderSpentBreakdown(profile) {
    const items = [];
    const acciosSpent = (profile.accios?.transactions || []).reduce((s, t) => s + (t.totalAmount || t.amount || 0), 0);
    if (acciosSpent > 0) items.push({ name: 'ACCIOS Core', amount: acciosSpent, color: '#A78BFA' });
    const bizMap = [
      ['rushRide', 'Rush Ride', '#39FF14'], ['xazai', 'Xazai', '#8B5CF6'], ['laColson', 'La Colson', '#EC4899'],
      ['resultados', 'Resultados', '#06B6D4'], ['cristian', 'Cristian Studio', '#8B5CF6'],
      ['tabares', 'Jesus Tabares', '#EF4444'], ['cakefit', 'Cake Fit', '#F97316'],
      ['glowin', 'Glowin Strong', '#10B981'], ['hechizos', 'Hechizos', '#D946EF'],
      ['salon507', 'Salón 507', '#F43F5E'], ['tcp', 'Tu Compra Panamá', '#0EA5E9'],
      ['janelle', 'Janelle', '#84CC16']
    ];
    for (const [key, name, color] of bizMap) {
      const spent = profile[key]?.totalSpent || 0;
      if (spent > 0) items.push({ name, amount: spent, color });
    }
    if (items.length === 0) return '<div style="padding:6px 0;font-size:0.65rem;color:var(--text-dim);text-align:center;">Sin detalle</div>';
    return items.map(i => `
      <div class="cc-spent-row">
        <span class="cc-spent-row__dot" style="background:${i.color}"></span>
        <span class="cc-spent-row__name">${i.name}</span>
        <span class="cc-spent-row__amount">$${i.amount.toFixed(2)}</span>
      </div>`).join('');
  }

  // ─── Merge Contacts Flow ───────────────────────────────────────────
  async _openMergeFlow(currentPhone, currentEmail, currentName) {
    const panel = document.querySelector('.cc-profile-panel');
    if (!panel) return;

    // Create merge overlay inside the profile panel
    const overlay = document.createElement('div');
    overlay.className = 'cc-merge-overlay';
    overlay.innerHTML = `
      <div class="cc-merge-panel">
        <div class="cc-merge-header">
          <div class="cc-merge-title">Fusionar Contacto</div>
          <button class="cc-merge-close" id="cc-merge-close">✕</button>
        </div>
        <div class="cc-merge-info">Busca el contacto duplicado para fusionar con <strong>${currentName}</strong></div>
        <input class="cc-merge-search" id="cc-merge-search" type="text" placeholder="Buscar por nombre, teléfono o email..." autofocus>
        <div class="cc-merge-results" id="cc-merge-results"></div>
      </div>`;
    panel.appendChild(overlay);

    overlay.querySelector('#cc-merge-close').addEventListener('click', () => overlay.remove());

    const searchInput = overlay.querySelector('#cc-merge-search');
    const resultsDiv = overlay.querySelector('#cc-merge-results');
    let searchTimeout;

    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const q = searchInput.value.trim();
      if (q.length < 2) { resultsDiv.innerHTML = ''; return; }
      searchTimeout = setTimeout(async () => {
        resultsDiv.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text-dim);font-size:0.75rem;">Buscando...</div>';
        try {
          const res = await fetch(`/api/command-users?search=${encodeURIComponent(q)}&limit=10`);
          const data = await res.json();
          const users = (data.users || []).filter(u => u.phone !== currentPhone);
          if (users.length === 0) {
            resultsDiv.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text-dim);font-size:0.75rem;">Sin resultados</div>';
            return;
          }
          resultsDiv.innerHTML = users.map(u => `
            <div class="cc-merge-result" data-phone="${u.phone || ''}" data-email="${u.email || ''}">
              <div class="cc-merge-result__name">${u.name || 'Sin nombre'}</div>
              <div class="cc-merge-result__detail">${u.phone || ''} · ${u.email || ''}</div>
              <div class="cc-merge-result__badges">${(u.businesses || []).map(b => { const cm = { accioscore:'accios', rushride:'rush', lacolson:'colson', xazai:'xazai', mlparts:'mlparts' }; return `<span class="cc-biz-badge cc-biz-badge--${cm[normBiz(b)] || normBiz(b)}" style="font-size:0.5rem;padding:1px 4px;">${b}</span>`; }).join('')}</div>
            </div>`).join('');

          resultsDiv.querySelectorAll('.cc-merge-result').forEach(row => {
            row.addEventListener('click', () => {
              const secPhone = row.dataset.phone;
              const secEmail = row.dataset.email;
              const secName = row.querySelector('.cc-merge-result__name').textContent;
              this._confirmMerge(currentPhone, currentEmail, currentName, secPhone, secEmail, secName, overlay);
            });
          });
        } catch (e) {
          resultsDiv.innerHTML = '<div style="text-align:center;padding:12px;color:#EF4444;font-size:0.75rem;">Error buscando</div>';
        }
      }, 400);
    });
  }

  async _confirmMerge(priPhone, priEmail, priName, secPhone, secEmail, secName, overlay) {
    const resultsDiv = overlay.querySelector('#cc-merge-results');
    const searchInput = overlay.querySelector('#cc-merge-search');
    searchInput.style.display = 'none';

    resultsDiv.innerHTML = `
      <div class="cc-merge-confirm">
        <div class="cc-merge-confirm__title">Confirmar Fusión</div>
        <div class="cc-merge-confirm__row">
          <div class="cc-merge-confirm__card">
            <div style="font-weight:600;color:var(--neon-green);">PRINCIPAL</div>
            <div>${priName}</div>
            <div style="font-size:0.7rem;color:var(--text-dim);">${priPhone}<br>${priEmail || ''}</div>
          </div>
          <div style="font-size:1.5rem;color:var(--text-dim);align-self:center;">⟵</div>
          <div class="cc-merge-confirm__card">
            <div style="font-weight:600;color:var(--text-dim);">SE FUSIONA</div>
            <div>${secName}</div>
            <div style="font-size:0.7rem;color:var(--text-dim);">${secPhone}<br>${secEmail || ''}</div>
          </div>
        </div>
        <div style="font-size:0.7rem;color:var(--text-dim);text-align:center;margin:8px 0;">Los datos de "${secName}" se combinarán con "${priName}"</div>
        <div class="cc-merge-confirm__actions">
          <button class="cc-merge-btn cc-merge-btn--cancel" id="cc-merge-cancel">Cancelar</button>
          <button class="cc-merge-btn cc-merge-btn--confirm" id="cc-merge-confirm">Fusionar</button>
        </div>
      </div>`;

    resultsDiv.querySelector('#cc-merge-cancel').addEventListener('click', () => overlay.remove());
    resultsDiv.querySelector('#cc-merge-confirm').addEventListener('click', async () => {
      resultsDiv.querySelector('#cc-merge-confirm').textContent = 'Fusionando...';
      resultsDiv.querySelector('#cc-merge-confirm').disabled = true;
      try {
        await fetch('/api/command-merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            primaryPhone: priPhone, primaryEmail: priEmail || '',
            secondaryPhone: secPhone, secondaryEmail: secEmail || ''
          })
        });
        overlay.remove();
        this._closeProfile();
        // Refresh users list
        if (this.currentTab === 'users') this._renderTab();
        if (typeof Toast !== 'undefined') Toast.show('Contactos fusionados', 'success');
      } catch (e) {
        if (typeof Toast !== 'undefined') Toast.show('Error fusionando', 'error');
      }
    });
  }

  _closeProfile() {
    const modal = document.getElementById('modal-root');
    if (modal) {
      modal.innerHTML = '';
      modal.classList.remove('active');
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────
  _timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  _formatDate(dateStr) {
    if (!dateStr) return '–';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '–';
      const now = new Date();
      const diff = now - d;
      const days = Math.floor(diff / 86400000);
      if (days === 0) return 'Hoy';
      if (days === 1) return 'Ayer';
      if (days < 7) return `Hace ${days}d`;
      if (days < 30) return `Hace ${Math.floor(days / 7)}sem`;
      return d.toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return '–'; }
  }

  _destroyCharts() {
    Object.values(this.charts).forEach(c => { try { c.destroy(); } catch (_) {} });
    this.charts = {};
  }

  // ─── Polling / Live Updates ──────────────────────────────────────
  _startPolling() {
    this._stopPolling();
    this._lastUpdate = Date.now();
    this._prevKpiJSON = JSON.stringify(this.kpiData);
    this._prevUsersJSON = JSON.stringify(this.usersData);

    const intervalMs = this.currentTab === 'users' ? 45000 : 30000;

    this._pollInterval = setInterval(() => {
      if (!this._pollPaused) this._pollTick();
    }, intervalMs);

    // Update the "hace Xs" timer every second
    this._liveTimerInterval = setInterval(() => this._updateLiveTimer(), 1000);
    this._updateLiveIndicator();
  }

  _stopPolling() {
    if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
    if (this._liveTimerInterval) { clearInterval(this._liveTimerInterval); this._liveTimerInterval = null; }
  }

  async _pollTick() {
    if (this.currentTab === 'overview') {
      await this._fetchKPIs();
      const newJSON = JSON.stringify(this.kpiData);
      if (newJSON !== this._prevKpiJSON) {
        this._smartUpdateOverview();
        this._prevKpiJSON = newJSON;
      }
    } else if (this.currentTab === 'users') {
      await this._fetchUsers();
      const newJSON = JSON.stringify(this.usersData);
      if (newJSON !== this._prevUsersJSON) {
        await this._fetchAndRenderUsers();
        this._prevUsersJSON = newJSON;
      }
    }
    this._lastUpdate = Date.now();
    this._updateLiveTimer();
  }

  _togglePollPause() {
    this._pollPaused = !this._pollPaused;
    this._updateLiveIndicator();
  }

  _updateLiveIndicator() {
    const dot = this.container.querySelector('.cc-live-dot');
    const text = this.container.querySelector('.cc-live-text');
    const btn = this.container.querySelector('.cc-live-toggle');
    if (dot) dot.className = `cc-live-dot${this._pollPaused ? ' cc-live-dot--paused' : ''}`;
    if (text) text.textContent = this._pollPaused ? 'PAUSADO' : this._getLiveText();
    if (btn) btn.textContent = this._pollPaused ? '▶' : '⏸';
  }

  _updateLiveTimer() {
    if (this._pollPaused) return;
    const text = this.container.querySelector('.cc-live-text');
    if (text) text.textContent = this._getLiveText();
  }

  _getLiveText() {
    if (!this._lastUpdate) return 'LIVE';
    const secs = Math.floor((Date.now() - this._lastUpdate) / 1000);
    if (secs < 5) return 'Actualizado';
    return `Hace ${secs}s`;
  }

  _smartUpdateOverview() {
    if (!this.kpiData) return;
    const k = this.kpiData.kpis;
    const fmt = (n) => n.toLocaleString('es-PA');
    const fmtMoney = (n) => '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const newValues = [fmt(k.totalUsers), fmtMoney(k.totalRevenue), fmt(k.totalTransactions), fmtMoney(k.avgRevenuePerUser)];
    const cards = this.container.querySelectorAll('.cc-kpi-card');

    cards.forEach((card, i) => {
      const valueEl = card.querySelector('.cc-kpi-card__value');
      if (valueEl && valueEl.textContent !== newValues[i]) {
        valueEl.textContent = newValues[i];
        card.classList.add('cc-kpi-card--updated');
        setTimeout(() => card.classList.remove('cc-kpi-card--updated'), 1500);
      }
    });

    // Update charts in-place
    this._updateChartsInPlace(this.kpiData);

    // Update activity feed
    this._renderActivityFeed(this.kpiData);
  }

  _updateChartsInPlace(data) {
    // Consumption behavior chart
    if (this.charts.revenue && data.consumptionTrend) {
      const trend = data.consumptionTrend;
      const bizKeys = ['cakefit', 'colson', 'cristian', 'glowin', 'hechizos', 'resultados', 'salon507', 'tabares'];
      const activeKeys = bizKeys.filter(k => trend.some(t => (t[k] || 0) > 0));
      activeKeys.forEach((key, i) => {
        if (this.charts.revenue.data.datasets[i]) {
          this.charts.revenue.data.datasets[i].data = trend.map(t => t[key] || 0);
        }
      });
      this.charts.revenue.update('none');
    }

    // Share chart
    if (this.charts.share && data.byBusiness) {
      const values = Object.values(data.byBusiness).map(b => b.revenue);
      this.charts.share.data.datasets[0].data = values;
      this.charts.share.update('none');
    }

  }

  unmount() {
    this._stopPolling();
    this._destroyCharts();
    this._closeProfile();
    clearTimeout(this._searchTimeout);
  }
}
