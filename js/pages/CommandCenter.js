import { Toast } from '../components/Toast.js';
import userAuth from '../services/userAuth.js';
import { apiUrl } from '../services/apiConfig.js';

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
          <div class="cc-kpi-card__sub">Combined ${this.dateRange} period</div>
        </div>
        <div class="cc-kpi-card">
          <div class="cc-kpi-card__label">Miembros Activos</div>
          <div class="cc-kpi-card__value cc-kpi-card__value--green">${k.activeMembers}</div>
          <div class="cc-kpi-card__sub">Rush Ride Studio</div>
        </div>
        <div class="cc-kpi-card">
          <div class="cc-kpi-card__label">Total Ordenes</div>
          <div class="cc-kpi-card__value">${fmt(k.totalOrders)}</div>
          <div class="cc-kpi-card__sub">Reservas + pedidos</div>
        </div>
        <div class="cc-kpi-card">
          <div class="cc-kpi-card__label">Nuevos Usuarios</div>
          <div class="cc-kpi-card__value cc-kpi-card__value--amber">${k.newUsersThisRange}</div>
          <div class="cc-kpi-card__sub">This ${this.dateRange} period</div>
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
            <div class="cc-chart-card__title">Revenue Trend</div>
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
        <div class="cc-chart-card">
          <div class="cc-chart-card__header">
            <div class="cc-chart-card__title">User Activity</div>
          </div>
          <div class="cc-chart-wrap"><canvas id="cc-chart-activity"></canvas></div>
        </div>
        <div class="cc-chart-card">
          <div class="cc-chart-card__header">
            <div class="cc-chart-card__title">Business Comparison</div>
          </div>
          <div class="cc-chart-wrap"><canvas id="cc-chart-comparison"></canvas></div>
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
      this._renderActivityChart(d);
      this._renderComparisonChart(d);
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

    const trend = data.revenueTrend || [];
    const labels = trend.map(t => {
      const d = new Date(t.date);
      return d.toLocaleDateString('es', { month: 'short', day: 'numeric' });
    });

    // Show at most ~30 labels
    const step = Math.max(1, Math.floor(trend.length / 30));
    const filteredLabels = labels.map((l, i) => i % step === 0 ? l : '');

    this.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels: filteredLabels,
        datasets: [
          {
            label: 'ACCIOS CORE',
            data: trend.map(t => t.accios),
            borderColor: '#7C3AED',
            backgroundColor: 'rgba(124, 58, 237, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
          },
          {
            label: 'Rush Ride',
            data: trend.map(t => t.rush),
            borderColor: '#39FF14',
            backgroundColor: 'rgba(57, 255, 20, 0.05)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
          },
          {
            label: 'Xazai',
            data: trend.map(t => t.xazai),
            borderColor: '#F59E0B',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#A78BFA', font: { size: 10, family: "'Inter'" }, boxWidth: 12, padding: 12 } }
        },
        scales: {
          x: { grid: { color: 'rgba(124, 58, 237, 0.06)' }, ticks: { color: '#6B5E99', font: { size: 9 }, maxRotation: 0 } },
          y: { grid: { color: 'rgba(124, 58, 237, 0.06)' }, ticks: { color: '#6B5E99', font: { size: 9 }, callback: v => '$' + v } }
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

  _renderActivityChart(data) {
    const ctx = document.getElementById('cc-chart-activity');
    if (!ctx || !window.Chart) return;

    const trend = data.userActivityTrend || [];
    const labels = trend.map(t => {
      const d = new Date(t.date);
      return d.toLocaleDateString('es', { month: 'short', day: 'numeric' });
    });
    const step = Math.max(1, Math.floor(trend.length / 30));
    const filteredLabels = labels.map((l, i) => i % step === 0 ? l : '');

    this.charts.activity = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: filteredLabels,
        datasets: [
          {
            label: 'Activos',
            data: trend.map(t => t.activeUsers),
            backgroundColor: 'rgba(124, 58, 237, 0.4)',
            borderColor: '#7C3AED',
            borderWidth: 1,
            borderRadius: 3
          },
          {
            label: 'Nuevos',
            data: trend.map(t => t.newUsers),
            backgroundColor: 'rgba(57, 255, 20, 0.3)',
            borderColor: '#39FF14',
            borderWidth: 1,
            borderRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#A78BFA', font: { size: 10, family: "'Inter'" }, boxWidth: 12, padding: 12 } }
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: '#6B5E99', font: { size: 9 }, maxRotation: 0 } },
          y: { stacked: true, grid: { color: 'rgba(124, 58, 237, 0.06)' }, ticks: { color: '#6B5E99', font: { size: 9 } } }
        }
      }
    });
  }

  _renderComparisonChart(data) {
    const ctx = document.getElementById('cc-chart-comparison');
    if (!ctx || !window.Chart) return;

    const biz = data.byBusiness || {};
    const names = Object.values(biz).map(b => b.name);
    const colors = Object.values(biz).map(b => b.color);

    this.charts.comparison = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Usuarios', 'Revenue ($)', 'Ordenes'],
        datasets: Object.keys(biz).map((key, i) => ({
          label: biz[key].name,
          data: [
            biz[key].users,
            biz[key].revenue,
            biz[key].collections?.orders || biz[key].collections?.reservations || biz[key].collections?.fin_transactions || 0
          ],
          backgroundColor: colors[i] + '50',
          borderColor: colors[i],
          borderWidth: 1,
          borderRadius: 3
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#A78BFA', font: { size: 10, family: "'Inter'" }, boxWidth: 12, padding: 12 } }
        },
        scales: {
          x: { grid: { color: 'rgba(124, 58, 237, 0.06)' }, ticks: { color: '#6B5E99', font: { size: 9 } } },
          y: { grid: { display: false }, ticks: { color: '#A78BFA', font: { size: 10, family: "'Inter'" } } }
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

    const bizBadge = (b) => {
      if (b === 'accios-core') return '<span class="cc-biz-badge cc-biz-badge--accios">AC</span>';
      if (b === 'rush-ride') return '<span class="cc-biz-badge cc-biz-badge--rush">RR</span>';
      if (b === 'xazai') return '<span class="cc-biz-badge cc-biz-badge--xazai">XZ</span>';
      if (b === 'la-colson') return '<span class="cc-biz-badge cc-biz-badge--colson">LC</span>';
      if (b === 'resultados') return '<span class="cc-biz-badge cc-biz-badge--resultados">RI</span>';
      if (b === 'cristian') return '<span class="cc-biz-badge cc-biz-badge--cristian">CS</span>';
      if (b === 'tabares') return '<span class="cc-biz-badge cc-biz-badge--tabares">JT</span>';
      if (b === 'cakefit') return '<span class="cc-biz-badge cc-biz-badge--cakefit">CF</span>';
      if (b === 'glowin') return '<span class="cc-biz-badge cc-biz-badge--glowin">GS</span>';
      if (b === 'hechizos') return '<span class="cc-biz-badge cc-biz-badge--hechizos">HS</span>';
      if (b === 'salon507') return '<span class="cc-biz-badge cc-biz-badge--salon507">S5</span>';
      if (b === 'tcp') return '<span class="cc-biz-badge cc-biz-badge--tcp">TC</span>';
      if (b === 'janelle') return '<span class="cc-biz-badge cc-biz-badge--janelle">JI</span>';
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

    // Find photo URL from allFields
    const photoField = (profile.allFields || []).find(f =>
      typeof f.value === 'string' && /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)/i.test(f.value) &&
      /photo|avatar|image|picture|foto|profilePic|photoURL/i.test(f.key)
    );
    const photoUrl = photoField?.value || '';
    const initials = (p.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    panel.innerHTML = `
      <div class="cc-profile-header">
        <button class="cc-profile-close" id="cc-profile-close">✕</button>
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
        <div style="display:flex;gap:4px;margin:var(--space-3) 0;">
          ${(p.businesses || []).map(b => {
            if (b === 'accios-core') return '<span class="cc-biz-badge cc-biz-badge--accios">ACCIOS CORE</span>';
            if (b === 'rush-ride') return '<span class="cc-biz-badge cc-biz-badge--rush">Rush Ride</span>';
            if (b === 'xazai') return '<span class="cc-biz-badge cc-biz-badge--xazai">Xazai</span>';
            if (b === 'la-colson') return '<span class="cc-biz-badge cc-biz-badge--colson">La Colson</span>';
            if (b === 'resultados') return '<span class="cc-biz-badge cc-biz-badge--resultados">Resultados Inevitables</span>';
            if (b === 'cristian') return '<span class="cc-biz-badge cc-biz-badge--cristian">Cristian Studio</span>';
            if (b === 'tabares') return '<span class="cc-biz-badge cc-biz-badge--tabares">Jesus Tabares Salón</span>';
            if (b === 'cakefit') return '<span class="cc-biz-badge cc-biz-badge--cakefit">Cake Fit</span>';
            if (b === 'glowin') return '<span class="cc-biz-badge cc-biz-badge--glowin">Glowin Strong</span>';
            if (b === 'hechizos') return '<span class="cc-biz-badge cc-biz-badge--hechizos">Hechizos Salón</span>';
            if (b === 'salon507') return '<span class="cc-biz-badge cc-biz-badge--salon507">Salón 507</span>';
            if (b === 'tcp') return '<span class="cc-biz-badge cc-biz-badge--tcp">Tu Compra Panamá</span>';
            if (b === 'janelle') return '<span class="cc-biz-badge cc-biz-badge--janelle">Janelle Innovación</span>';
            return '';
          }).join('')}
        </div>
        <div class="cc-profile-stats">
          <div class="cc-profile-stat">
            <div class="cc-profile-stat__value">$${(p.totalSpent || 0).toFixed(0)}</div>
            <div class="cc-profile-stat__label">Total Spent</div>
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
      </div>
      <div class="cc-profile-body">
        ${this._renderDossierFields(profile.allFields || [])}
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
    if (!data || !data.exists) {
      return `
        <div class="cc-profile-section">
          <div class="cc-profile-section__title cc-profile-section__title--inactive">${name} — No registrado</div>
        </div>`;
    }

    const colorClass = key === 'rush-ride' ? 'rush' : key === 'xazai' ? 'xazai' : key === 'la-colson' ? 'colson' : key === 'resultados' ? 'resultados' : key === 'cristian' ? 'cristian' : key === 'tabares' ? 'tabares' : key === 'cakefit' ? 'cakefit' : key === 'glowin' ? 'glowin' : key === 'hechizos' ? 'hechizos' : key === 'salon507' ? 'salon507' : key === 'tcp' ? 'tcp' : key === 'janelle' ? 'janelle' : 'accios';
    let items = '';

    if (key === 'accios-core') {
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

    if (key === 'rush-ride') {
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

    if (key === 'xazai') {
      if (data.recentOrders?.length) {
        items += data.recentOrders.slice(0, 5).map(o => `
          <div class="cc-profile-item">
            <span>Pedido #${(o.id || '').slice(-4) || '?'}${o.items ? ` (${o.items} items)` : ''}</span>
            <span class="cc-profile-item__amount" style="color:#F59E0B;">$${(o.total || o.amount || 0).toFixed(2)}</span>
            <span class="cc-profile-item__date">${this._formatDate(o.createdAt || o.date)}</span>
          </div>`).join('');
      }
      if (data.totalOrders) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">${data.totalOrders} órdenes totales · $${(data.totalSpent || 0).toFixed(2)} total</div>`;
    }

    if (key === 'la-colson') {
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

    if (key === 'resultados') {
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

    if (key === 'cristian') {
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

    if (key === 'tabares') {
      if (data.totalSpent) items += `<div class="cc-profile-item"><span>💰 Total gastado</span><span class="cc-profile-item__amount" style="color:#EF4444;">$${(data.totalSpent || 0).toFixed(2)}</span></div>`;
      if (data.transactionCount) items += `<div class="cc-profile-item"><span>🧾 ${data.transactionCount} transacciones</span></div>`;
      if (data.paymentMethods?.length) {
        items += `<div class="cc-profile-item"><span>💳 ${data.paymentMethods.join(', ')}</span></div>`;
      }
      if (data.lastPayment) items += `<div class="cc-profile-item"><span>📅 Último pago: ${this._formatDate(data.lastPayment)}</span></div>`;
      if (data.createdAt) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Primer pago: ${this._formatDate(data.createdAt)}</div>`;
    }

    if (key === 'cakefit') {
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

    if (key === 'glowin') {
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

    if (key === 'hechizos') {
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

    if (key === 'salon507') {
      if (data.services?.length) {
        items += `<div class="cc-profile-item"><span>💇 ${data.services.join(', ')}</span></div>`;
      }
      if (data.createdAt) items += `<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Primera cita: ${this._formatDate(data.createdAt)}</div>`;
    }

    if (key === 'tcp') {
      if (data.company) items += `<div class="cc-profile-item"><span>🏢 ${data.company}</span></div>`;
      if (data.tags?.length) items += `<div class="cc-profile-item"><span>🏷️ ${data.tags.join(', ')}</span></div>`;
      if (data.addresses?.length) {
        items += data.addresses.map(a => `
          <div class="cc-profile-item">
            <span>📍 ${a}</span>
          </div>`).join('');
      }
    }

    if (key === 'janelle') {
      if (data.name) items += `<div class="cc-profile-item"><span>👤 ${data.name}</span></div>`;
      if (data.email) items += `<div class="cc-profile-item"><span>📧 ${data.email}</span></div>`;
    }

    return `
      <div class="cc-profile-section">
        <div class="cc-profile-section__title cc-profile-section__title--${colorClass}">${name}</div>
        ${items || '<div style="font-size:0.75rem;color:var(--text-dim);padding:4px 12px;">Sin actividad registrada</div>'}
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
      return d.toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: '2-digit' });
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

    const newValues = [fmt(k.totalUsers), fmtMoney(k.totalRevenue), String(k.activeMembers), fmt(k.totalOrders), String(k.newUsersThisRange), fmtMoney(k.avgRevenuePerUser)];
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
    // Revenue chart
    if (this.charts.revenue && data.revenueTrend) {
      const trend = data.revenueTrend;
      this.charts.revenue.data.datasets[0].data = trend.map(t => t.accios);
      this.charts.revenue.data.datasets[1].data = trend.map(t => t.rush);
      this.charts.revenue.data.datasets[2].data = trend.map(t => t.xazai);
      this.charts.revenue.update('none');
    }

    // Share chart
    if (this.charts.share && data.byBusiness) {
      const values = Object.values(data.byBusiness).map(b => b.revenue);
      this.charts.share.data.datasets[0].data = values;
      this.charts.share.update('none');
    }

    // Activity chart
    if (this.charts.activity && data.userActivityTrend) {
      const trend = data.userActivityTrend;
      this.charts.activity.data.datasets[0].data = trend.map(t => t.activeUsers);
      this.charts.activity.data.datasets[1].data = trend.map(t => t.newUsers);
      this.charts.activity.update('none');
    }

    // Comparison chart
    if (this.charts.comparison && data.byBusiness) {
      const biz = data.byBusiness;
      Object.keys(biz).forEach((key, i) => {
        if (this.charts.comparison.data.datasets[i]) {
          this.charts.comparison.data.datasets[i].data = [
            biz[key].users,
            biz[key].revenue,
            biz[key].collections?.orders || biz[key].collections?.reservations || biz[key].collections?.fin_transactions || 0
          ];
        }
      });
      this.charts.comparison.update('none');
    }
  }

  unmount() {
    this._stopPolling();
    this._destroyCharts();
    this._closeProfile();
    clearTimeout(this._searchTimeout);
  }
}
