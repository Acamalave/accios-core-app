const admin = require('firebase-admin');
const colsonContacts = require('../data/colson-contacts.json');
const resultadosContacts = require('../data/resultados-contacts.json');
const cristianContacts = require('../data/cristian-contacts.json');
const tabaresContacts = require('../data/tabares-contacts.json');
const cakefitContacts = require('../data/cakefit-contacts.json');
const glowinContacts = require('../data/glowin-contacts.json');
const hechizosContacts = require('../data/hechizos-contacts.json');
const salon507Contacts = require('../data/salon507-contacts.json');
const tcpContacts = require('../data/tcp-contacts.json');
const janelleContacts = require('../data/janelle-contacts.json');

// ─── Real trend data from JSON contacts ─────────────────────────────
// Aggregate all contacts that have date fields (8 of 10 files)
const ALL_CONTACTS_WITH_DATES = [
  ...cakefitContacts,
  ...colsonContacts,
  ...cristianContacts,
  ...glowinContacts,
  ...hechizosContacts,
  ...resultadosContacts,
  ...salon507Contacts,
  ...tabaresContacts
  // janelleContacts & tcpContacts excluded: no date fields
];

// Per-business contacts for registration trend
const BUSINESS_CONTACTS = [
  { key: 'cakefit', name: 'Cake Fit', color: '#F97316', contacts: cakefitContacts },
  { key: 'colson', name: 'La Colson', color: '#EC4899', contacts: colsonContacts },
  { key: 'cristian', name: 'Cristian Studio', color: '#8B5CF6', contacts: cristianContacts },
  { key: 'glowin', name: 'Glowin Strong', color: '#10B981', contacts: glowinContacts },
  { key: 'hechizos', name: 'Hechizos Salón', color: '#D946EF', contacts: hechizosContacts },
  { key: 'resultados', name: 'Resultados Inevitables', color: '#06B6D4', contacts: resultadosContacts },
  { key: 'salon507', name: 'Salón 507', color: '#F43F5E', contacts: salon507Contacts },
  { key: 'tabares', name: 'Jesus Tabares Salón', color: '#EF4444', contacts: tabaresContacts }
];

/** Extract YYYY-MM-DD from any contact date format */
function toDateKey(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 10) return null;
  return dateStr.slice(0, 10);
}

/**
 * Compute real trend data from JSON contact dates.
 * @param {string} range - '7d','30d','90d','365d'
 */
function computeRealTrends() {
  const now = new Date();

  // ── Consumption behavior: monthly activity by business (last 12 months) ──
  const monthKeys = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(d.toISOString().slice(0, 7)); // YYYY-MM
  }

  const consumByBiz = {};
  for (const { key, contacts } of BUSINESS_CONTACTS) {
    const byMonth = {};
    for (const c of contacts) {
      // Count both createdAt and lastPayment as activity events
      const created = toDateKey(c.createdAt);
      if (created) {
        const m = created.slice(0, 7);
        if (monthKeys.includes(m)) byMonth[m] = (byMonth[m] || 0) + 1;
      }
      const paid = toDateKey(c.lastPayment);
      if (paid && paid !== created) {
        const m = paid.slice(0, 7);
        if (monthKeys.includes(m)) byMonth[m] = (byMonth[m] || 0) + 1;
      }
    }
    consumByBiz[key] = byMonth;
  }

  const consumptionTrend = monthKeys.map(month => {
    const entry = { month };
    for (const { key } of BUSINESS_CONTACTS) {
      entry[key] = (consumByBiz[key] && consumByBiz[key][month]) || 0;
    }
    return entry;
  });

  return { consumptionTrend };
}

// ─── Multi-project Firebase initialization ──────────────────────────
function getApp(name, envVar) {
  const existing = admin.apps.find(a => a.name === name);
  if (existing) return existing;
  try {
    const sa = JSON.parse(process.env[envVar] || '{}');
    if (!sa.project_id) return null;
    return admin.initializeApp({ credential: admin.credential.cert(sa) }, name);
  } catch (e) {
    console.warn(`[command-data] Could not init ${name}:`, e.message);
    return null;
  }
}

function getDb(name, envVar) {
  const app = getApp(name, envVar);
  return app ? admin.firestore(app) : null;
}

// ─── Mock data (used when service accounts not configured) ──────────
function generateMockData(range) {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '365d' ? 365 : 30;
  const now = new Date();
  const rangeFactor = days / 30; // scale metrics by range

  const trend = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    trend.push({
      date: d.toISOString().slice(0, 10),
      accios: Math.round(300 + Math.random() * 400),
      rush: Math.round(500 + Math.random() * 600),
      xazai: Math.round(200 + Math.random() * 500)
    });
  }

  // ─── Monthly trend data per business (12 months) ───
  const bizMonthlyTrend = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.toISOString().slice(0, 7);
    const season = 1 + 0.15 * Math.sin((d.getMonth() - 3) * Math.PI / 6);
    bizMonthlyTrend.push({
      month,
      'rush-ride': {
        revenue: Math.round(18000 * season + Math.random() * 4000),
        checkIns: Math.round(900 * season + Math.random() * 300),
        reservations: Math.round(350 * season + Math.random() * 150),
        newMembers: Math.round(12 + Math.random() * 13),
        activeMembers: Math.round(160 + i * 2 + Math.random() * 20),
      },
      'xazai': {
        revenue: Math.round(11000 * season + Math.random() * 5000),
        orders: Math.round(700 * season + Math.random() * 200),
        customers: Math.round(180 + Math.random() * 60),
        sales: Math.round(550 * season + Math.random() * 150),
      },
      'accios-core': {
        revenue: Math.round(9000 + Math.random() * 4000),
        transactions: Math.round(160 + Math.random() * 60),
        quotes: Math.round(15 + Math.random() * 20),
      }
    });
  }

  // ─── Staff data for Xazai ───
  const xazaiStaff = [
    { name: 'Carlos Méndez', role: 'Chef Principal', status: 'active', daysWorked: 26, totalDays: 28, punctuality: 96, rating: 4.8 },
    { name: 'María García', role: 'Sous Chef', status: 'active', daysWorked: 24, totalDays: 28, punctuality: 92, rating: 4.6 },
    { name: 'Juan Pérez', role: 'Cocinero', status: 'active', daysWorked: 25, totalDays: 28, punctuality: 89, rating: 4.3 },
    { name: 'Ana Rodríguez', role: 'Mesera', status: 'active', daysWorked: 27, totalDays: 28, punctuality: 98, rating: 4.9 },
    { name: 'Luis Torres', role: 'Mesero', status: 'active', daysWorked: 22, totalDays: 28, punctuality: 78, rating: 4.1 },
    { name: 'Carmen Díaz', role: 'Cajera', status: 'active', daysWorked: 26, totalDays: 28, punctuality: 93, rating: 4.5 },
    { name: 'Roberto Herrera', role: 'Ayudante Cocina', status: 'active', daysWorked: 23, totalDays: 28, punctuality: 82, rating: 4.0 },
    { name: 'Sofía Castillo', role: 'Bartender', status: 'active', daysWorked: 20, totalDays: 24, punctuality: 88, rating: 4.4 },
    { name: 'Pedro Morales', role: 'Delivery', status: 'active', daysWorked: 25, totalDays: 28, punctuality: 91, rating: 4.2 },
    { name: 'Laura Vega', role: 'Hostess', status: 'active', daysWorked: 24, totalDays: 26, punctuality: 94, rating: 4.7 },
    { name: 'Diego Santos', role: 'Auxiliar', status: 'inactive', daysWorked: 12, totalDays: 28, punctuality: 71, rating: 3.8 },
    { name: 'Isabella Ríos', role: 'Mesera', status: 'active', daysWorked: 26, totalDays: 28, punctuality: 95, rating: 4.6 },
  ];

  // ─── Staff data for Rush Ride ───
  const rushRideStaff = [
    { name: 'Andrés Martínez', role: 'Instructor Cycling', status: 'active', classesGiven: 28, totalClasses: 30, punctuality: 97, rating: 4.9 },
    { name: 'Valentina Rojas', role: 'Instructor CrossFit', status: 'active', classesGiven: 24, totalClasses: 26, punctuality: 94, rating: 4.7 },
    { name: 'Miguel Á. Flores', role: 'Instructor Funcional', status: 'active', classesGiven: 22, totalClasses: 24, punctuality: 91, rating: 4.5 },
    { name: 'Carolina Silva', role: 'Instructor Yoga', status: 'active', classesGiven: 20, totalClasses: 22, punctuality: 98, rating: 4.8 },
    { name: 'Ricardo Núñez', role: 'Personal Trainer', status: 'active', classesGiven: 30, totalClasses: 30, punctuality: 88, rating: 4.3 },
    { name: 'Daniela Moreno', role: 'Recepcionista', status: 'active', classesGiven: 0, totalClasses: 0, punctuality: 96, rating: 4.6 },
    { name: 'Alejandro Ramírez', role: 'Manager', status: 'active', classesGiven: 0, totalClasses: 0, punctuality: 99, rating: 4.9 },
    { name: 'Natalia Herrera', role: 'Instructor HIIT', status: 'active', classesGiven: 18, totalClasses: 22, punctuality: 85, rating: 4.2 },
  ];

  // Scale metrics by range
  const rxRev = Math.round(22340 * rangeFactor);
  const rxChk = Math.round(3400 * rangeFactor);
  const xzRev = Math.round(13330 * rangeFactor);
  const xzOrd = Math.round(876 * rangeFactor);

  return {
    mock: true,
    timestamp: now.toISOString(),
    range,
    kpis: {
      totalUsers: 847,
      totalRevenue: Math.round(48520 * rangeFactor),
      activeMembers: 186,
      totalOrders: Math.round(1243 * rangeFactor),
      totalTransactions: Math.round(1243 * rangeFactor),
      newUsersThisRange: Math.round((15 + Math.random() * 40) * rangeFactor),
      avgRevenuePerUser: 57.28
    },
    byBusiness: {
      'accios-core': {
        name: 'ACCIOS CORE',
        color: '#7C3AED',
        icon: 'hub',
        users: 342,
        revenue: Math.round(12850 * rangeFactor),
        collections: { users: 342, businesses: 8, fin_clients: 38, fin_transactions: Math.round(210 * rangeFactor), appointments: 55, quotes: Math.round(90 * rangeFactor) }
      },
      'rush-ride': {
        name: 'Rush Ride Studio',
        color: '#39FF14',
        icon: 'fitness',
        users: 285,
        revenue: rxRev,
        activeMembers: 186,
        staff: rushRideStaff,
        collections: { users: 285, transactions: Math.round(520 * rangeFactor), reservations: Math.round(1200 * rangeFactor), checkIns: rxChk, userMemberships: 186 }
      },
      'xazai': {
        name: 'Xazai',
        color: '#8B5CF6',
        icon: 'restaurant',
        users: 220,
        revenue: xzRev,
        staff: xazaiStaff,
        expenses: [
          { id: 'exp1', description: 'Compra de frutas y pulpas', amount: 485.00, category: 'Ingredientes', date: new Date(now - 86400000).toISOString(), invoiceUrl: 'https://placehold.co/400x560/1a1a2e/666?text=Factura%0AFrutería+El+Campo%0A$485.00', vendor: 'Frutería El Campo', status: 'pagado' },
          { id: 'exp2', description: 'Servicio de electricidad', amount: 220.50, category: 'Servicios', date: new Date(now - 172800000).toISOString(), invoiceUrl: 'https://placehold.co/400x560/1a1a2e/666?text=Factura%0ANaturgy%0A$220.50', vendor: 'Naturgy', status: 'pagado' },
          { id: 'exp3', description: 'Vasos y envases biodegradables', amount: 156.00, category: 'Insumos', date: new Date(now - 259200000).toISOString(), invoiceUrl: 'https://placehold.co/400x560/1a1a2e/666?text=Factura%0AEcoPack+Panamá%0A$156.00', vendor: 'EcoPack Panamá', status: 'pagado' },
          { id: 'exp4', description: 'Planilla quincenal', amount: 1850.00, category: 'Personal', date: new Date(now - 345600000).toISOString(), invoiceUrl: null, vendor: 'Nómina interna', status: 'pagado' },
          { id: 'exp5', description: 'Compra de açaí y granola', amount: 620.00, category: 'Ingredientes', date: new Date(now - 432000000).toISOString(), invoiceUrl: 'https://placehold.co/400x560/1a1a2e/666?text=Factura%0ADistribuidora+Tropical%0A$620.00', vendor: 'Distribuidora Tropical', status: 'pagado' },
          { id: 'exp6', description: 'Mantenimiento aire acondicionado', amount: 95.00, category: 'Mantenimiento', date: new Date(now - 518400000).toISOString(), invoiceUrl: 'https://placehold.co/400x560/1a1a2e/666?text=Factura%0ACool+Service+PTY%0A$95.00', vendor: 'Cool Service PTY', status: 'pagado' },
          { id: 'exp7', description: 'Internet y telefonía', amount: 89.99, category: 'Servicios', date: new Date(now - 604800000).toISOString(), invoiceUrl: null, vendor: 'Cable & Wireless', status: 'pagado' },
          { id: 'exp8', description: 'Campaña Instagram Ads', amount: 150.00, category: 'Marketing', date: new Date(now - 691200000).toISOString(), invoiceUrl: null, vendor: 'Meta Platforms', status: 'pagado' },
        ],
        totalExpenses: 3666.49,
        metaAds: {
          spend: 150.00,
          impressions: 42350,
          reach: 18720,
          clicks: 1245,
          ctr: 2.94,
          cpc: 0.12,
          cpm: 3.54,
          conversions: 87,
          costPerResult: 1.72,
          campaigns: [],
          lastUpdated: new Date(now - 3600000).toISOString(),
        },
        collections: { customers: 220, orders: xzOrd, sales: Math.round(650 * rangeFactor), inventory: 124, rrhh_collaborators: 12 }
      }
    },
    bizMonthlyTrend,
    revenueTrend: trend,
    recentActivity: [
      { type: 'order', business: 'xazai', description: 'Nuevo pedido #1243 — $18.50', date: new Date(now - 1800000).toISOString(), icon: 'receipt' },
      { type: 'sale', business: 'xazai', description: 'Venta mesa #4 — $45.00', date: new Date(now - 5400000).toISOString(), icon: 'storefront' },
      { type: 'order', business: 'xazai', description: 'Pedido delivery #1244 — $22.00', date: new Date(now - 9000000).toISOString(), icon: 'receipt' },
      { type: 'sale', business: 'xazai', description: 'Venta especial del día — $38.50', date: new Date(now - 12600000).toISOString(), icon: 'storefront' },
      { type: 'expense', business: 'xazai', description: 'Compra ingredientes — $320', date: new Date(now - 25200000).toISOString(), icon: 'shopping' },
      { type: 'order', business: 'xazai', description: 'Pedido para llevar #1245 — $27.00', date: new Date(now - 28800000).toISOString(), icon: 'receipt' },
      { type: 'checkin', business: 'rush-ride', description: 'Check-in clase Cycling 6PM', date: new Date(now - 3600000).toISOString(), icon: 'fitness' },
      { type: 'reservation', business: 'rush-ride', description: 'Reserva clase mañana 6AM', date: new Date(now - 7200000).toISOString(), icon: 'calendar' },
      { type: 'membership', business: 'rush-ride', description: 'Nueva membresía Premium', date: new Date(now - 10800000).toISOString(), icon: 'card' },
      { type: 'checkin', business: 'rush-ride', description: 'Check-in clase HIIT 7AM', date: new Date(now - 14400000).toISOString(), icon: 'fitness' },
      { type: 'membership', business: 'rush-ride', description: 'Renovación membresía Gold', date: new Date(now - 18000000).toISOString(), icon: 'card' },
      { type: 'reservation', business: 'rush-ride', description: 'Reserva clase Yoga sábado', date: new Date(now - 21600000).toISOString(), icon: 'calendar' },
      { type: 'checkin', business: 'rush-ride', description: 'Check-in CrossFit 5PM', date: new Date(now - 30600000).toISOString(), icon: 'fitness' },
      { type: 'transaction', business: 'accios-core', description: 'Pago recibido — $150.00', date: new Date(now - 7200000).toISOString(), icon: 'payment' },
      { type: 'quote', business: 'accios-core', description: 'Cotización enviada — $2,500', date: new Date(now - 21600000).toISOString(), icon: 'document' },
    ]
  };
}

// ─── Date helper — extract date from Firestore doc ──────────────────
function getDocDate(data) {
  const raw = data.createdAt || data.date || data.timestamp || data.fecha || data.created_at || data.dateCreated;
  if (!raw) return null;
  // Firestore Timestamp object
  if (raw._seconds) return new Date(raw._seconds * 1000);
  if (typeof raw.toDate === 'function') return raw.toDate();
  // ISO string or number
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function filterDocsByDate(docs, startDate, endDate) {
  if (!startDate || !endDate) return docs;
  return docs.filter(d => {
    const date = getDocDate(d.data());
    if (!date) return true; // include docs without a date field
    return date >= startDate && date <= endDate;
  });
}

// ─── Real data fetching ─────────────────────────────────────────────
async function fetchAcciosData(db, range, startDate, endDate) {
  const [usersSnap, bizSnap, clientsSnap, txnSnap, apptsSnap, quotesSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('businesses').get(),
    db.collection('fin_clients').get(),
    db.collection('fin_transactions').get(),
    db.collection('appointments').get(),
    db.collection('quotes').get()
  ]);

  const filteredTxn = filterDocsByDate(txnSnap.docs, startDate, endDate);
  const filteredAppts = filterDocsByDate(apptsSnap.docs, startDate, endDate);
  const filteredQuotes = filterDocsByDate(quotesSnap.docs, startDate, endDate);

  const revenue = filteredTxn.reduce((sum, d) => {
    const data = d.data();
    if (data.status === 'cobrado') sum += (data.totalAmount || 0);
    return sum;
  }, 0);

  return {
    name: 'ACCIOS CORE',
    color: '#7C3AED',
    icon: 'hub',
    users: usersSnap.size,
    revenue: Math.round(revenue * 100) / 100,
    collections: {
      users: usersSnap.size,
      businesses: bizSnap.size,
      fin_clients: clientsSnap.size,
      fin_transactions: filteredTxn.length,
      appointments: filteredAppts.length,
      quotes: filteredQuotes.length
    }
  };
}

async function fetchRushData(db, range, startDate, endDate) {
  const [usersSnap, txnSnap, membersSnap, reservSnap, checkInSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('transactions').get(),
    db.collection('userMemberships').get(),
    db.collection('reservations').get(),
    db.collection('checkIns').get()
  ]);

  const filteredTxn = filterDocsByDate(txnSnap.docs, startDate, endDate);
  const filteredReserv = filterDocsByDate(reservSnap.docs, startDate, endDate);
  const filteredCheckIns = filterDocsByDate(checkInSnap.docs, startDate, endDate);

  const revenue = filteredTxn.reduce((sum, d) => {
    const data = d.data();
    sum += (data.amount || data.total || 0);
    return sum;
  }, 0);

  const activeMembers = membersSnap.docs.filter(d => {
    const data = d.data();
    return data.status === 'active' || data.status === 'activo';
  }).length;

  return {
    name: 'Rush Ride Studio',
    color: '#39FF14',
    icon: 'fitness',
    users: usersSnap.size,
    revenue: Math.round(revenue * 100) / 100,
    activeMembers,
    collections: {
      users: usersSnap.size,
      transactions: filteredTxn.length,
      reservations: filteredReserv.length,
      checkIns: filteredCheckIns.length,
      userMemberships: membersSnap.size
    }
  };
}

async function fetchXazaiData(db, range, startDate, endDate) {
  const [custSnap, ordersSnap, salesSnap, invSnap, staffSnap, expSnap, metaSnap] = await Promise.all([
    db.collection('customers').get(),
    db.collection('orders').get(),
    db.collection('sales').get(),
    db.collection('inventory').get(),
    db.collection('rrhh_collaborators').get(),
    db.collection('expenses').get().catch(() => ({ docs: [], size: 0 })),
    db.collection('meta_ads').get().catch(() => ({ docs: [], size: 0 })),
  ]);

  const filteredOrders = filterDocsByDate(ordersSnap.docs, startDate, endDate);
  const filteredSales = filterDocsByDate(salesSnap.docs, startDate, endDate);

  const paymentMethods = {};
  const revenue = filteredSales.reduce((sum, d) => {
    const data = d.data();
    const amt = data.total || data.amount || 0;
    const rawMethod = (data.paymentMethod || data.metodo_pago || data.payment_method || data.metodo || data.tipo_pago || 'otro').toLowerCase().trim();
    const methodAliases = { 'pedidos ya': 'pedidosya', 'uber eats': 'uber_eats', 'didi food': 'didi', 'tarjeta de credito': 'tarjeta', 'tarjeta de debito': 'tarjeta', 'credit card': 'tarjeta', 'debit card': 'tarjeta', 'cash': 'efectivo', 'transfer': 'transferencia' };
    const method = methodAliases[rawMethod] || rawMethod.replace(/\s+/g, '_');
    paymentMethods[method] = (paymentMethods[method] || 0) + amt;
    sum += amt;
    return sum;
  }, 0);

  // ── Aggregate ALL sales by month (for trend chart) ──
  // Uses ALL sales docs (not date-filtered) to build complete monthly history
  const monthlyRevenue = {};
  const monthlyOrders = {};
  const monthlySalesCount = {};

  salesSnap.docs.forEach(d => {
    const data = d.data();
    const date = getDocDate(data);
    if (!date) return;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (data.total || data.amount || 0);
    monthlySalesCount[monthKey] = (monthlySalesCount[monthKey] || 0) + 1;
  });

  ordersSnap.docs.forEach(d => {
    const data = d.data();
    const date = getDocDate(data);
    if (!date) return;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyOrders[monthKey] = (monthlyOrders[monthKey] || 0) + 1;
  });

  // Build sorted monthly trend array
  const allMonths = [...new Set([...Object.keys(monthlyRevenue), ...Object.keys(monthlyOrders)])].sort();
  const monthlyTrend = allMonths.map(month => ({
    month,
    revenue: Math.round((monthlyRevenue[month] || 0) * 100) / 100,
    orders: monthlyOrders[month] || 0,
    sales: monthlySalesCount[month] || 0,
    customers: custSnap.size // total (not monthly)
  }));

  // Extract staff details from rrhh_collaborators
  const staff = staffSnap.docs.map(d => {
    const data = d.data();
    return {
      name: data.nombre || data.name || 'Sin nombre',
      role: data.cargo || data.role || data.puesto || 'Colaborador',
      status: data.estado || data.status || 'active',
      daysWorked: data.diasTrabajados || data.daysWorked || 0,
      totalDays: data.diasLaborales || data.totalDays || 28,
      punctuality: data.puntualidad || data.punctuality || 0,
      rating: data.calificacion || data.rating || 0,
    };
  });

  // ── Expenses ──
  const filteredExpenses = filterDocsByDate(expSnap.docs || [], startDate, endDate);
  const expenses = filteredExpenses.map(d => {
    const data = d.data();
    // Find image field: check all string fields that look like URLs or storage refs
    let photoUrl = data.facturaUrl || data.invoiceUrl || data.receipt || data.foto
      || data.imagen || data.image || data.imageUrl || data.photoUrl || data.photo
      || data.comprobante || data.recibo || data.factura || data.adjunto || data.attachment || null;
    // If it's a string that looks like a URL, keep it; otherwise null
    if (photoUrl && typeof photoUrl === 'string' && !photoUrl.startsWith('http')) photoUrl = null;
    return {
      id: d.id,
      description: data.descripcion || data.description || data.concepto || data.nombre || data.name || 'Gasto',
      amount: data.monto || data.amount || data.total || data.valor || data.precio || 0,
      category: data.categoria || data.category || data.tipo || 'General',
      date: (getDocDate(data) || new Date()).toISOString(),
      invoiceUrl: photoUrl,
      vendor: data.proveedor || data.vendor || data.supplier || '',
      status: data.estado || data.status || 'pagado',
      _rawKeys: Object.keys(data), // temporary debug
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // ── Meta Ads ──
  const metaDocs = (metaSnap.docs || []).map(d => ({ id: d.id, ...d.data() }));
  const latestMeta = metaDocs.sort((a, b) => {
    const da = getDocDate(a) || new Date(0);
    const db2 = getDocDate(b) || new Date(0);
    return db2 - da;
  })[0] || null;

  const metaAds = latestMeta ? {
    spend: latestMeta.spend || latestMeta.gasto || latestMeta.inversion || 0,
    impressions: latestMeta.impressions || latestMeta.impresiones || latestMeta.alcance_impresiones || 0,
    reach: latestMeta.reach || latestMeta.alcance || 0,
    clicks: latestMeta.clicks || latestMeta.clics || 0,
    ctr: latestMeta.ctr || 0,
    cpc: latestMeta.cpc || latestMeta.costo_por_clic || 0,
    cpm: latestMeta.cpm || latestMeta.costo_por_mil || 0,
    conversions: latestMeta.conversions || latestMeta.conversiones || latestMeta.resultados || 0,
    costPerResult: latestMeta.costPerResult || latestMeta.costo_por_resultado || 0,
    campaigns: latestMeta.campaigns || latestMeta.campanas || [],
    lastUpdated: (getDocDate(latestMeta) || new Date()).toISOString(),
  } : null;

  return {
    name: 'Xazai',
    color: '#8B5CF6',
    icon: 'restaurant',
    users: custSnap.size,
    revenue: Math.round(revenue * 100) / 100,
    paymentMethods,
    staff,
    expenses,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    metaAds,
    monthlyTrend,
    collections: {
      customers: custSnap.size,
      orders: filteredOrders.length,
      sales: filteredSales.length,
      inventory: invSnap.size,
      rrhh_collaborators: staffSnap.size
    }
  };
}

// ─── Build real monthly trend (merge real data into mock structure) ──
function buildRealBizMonthlyTrend(mockTrend, xazaiData, rushData) {
  // Start with mock trend as base
  const trend = mockTrend.map(m => ({ ...m }));

  // Override Xazai data with real monthly aggregation if available
  if (xazaiData?.monthlyTrend && xazaiData.monthlyTrend.length > 0) {
    const realByMonth = {};
    xazaiData.monthlyTrend.forEach(m => { realByMonth[m.month] = m; });

    trend.forEach(m => {
      if (realByMonth[m.month]) {
        // Replace mock Xazai data with real data
        m['xazai'] = {
          revenue: realByMonth[m.month].revenue,
          orders: realByMonth[m.month].orders,
          sales: realByMonth[m.month].sales,
          customers: realByMonth[m.month].customers
        };
      } else {
        // No real data for this month — show 0 (not mock)
        m['xazai'] = { revenue: 0, orders: 0, sales: 0, customers: 0 };
      }
    });

    // Add months that exist in real data but not in mock (e.g., older months)
    xazaiData.monthlyTrend.forEach(rm => {
      if (!trend.find(t => t.month === rm.month)) {
        trend.push({
          month: rm.month,
          'xazai': { revenue: rm.revenue, orders: rm.orders, sales: rm.sales, customers: rm.customers },
          'rush-ride': { revenue: 0, checkIns: 0, reservations: 0, newMembers: 0, activeMembers: 0 },
          'accios-core': { revenue: 0, transactions: 0, quotes: 0 }
        });
      }
    });

    // Re-sort by month
    trend.sort((a, b) => a.month.localeCompare(b.month));
  }

  return trend;
}

// ─── Handler ────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const range = req.query.range || '30d';
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

  // Validate dates if provided
  const validStart = startDate && !isNaN(startDate.getTime()) ? startDate : null;
  const validEnd = endDate && !isNaN(endDate.getTime()) ? endDate : null;

  try {
    const dbAccios = getDb('accios-core', 'FIREBASE_SERVICE_ACCOUNT');
    const dbRush = getDb('rush-ride', 'FIREBASE_SA_RUSH_RIDE');
    const dbXazai = getDb('xazai', 'FIREBASE_SA_XAZAI');

    // If no Firebase connections available, return mock + real trends
    if (!dbAccios && !dbRush && !dbXazai) {
      const fallback = generateMockData(range);
      const realTrends = computeRealTrends();
      return res.status(200).json({
        ...fallback,
        consumptionTrend: realTrends.consumptionTrend
      });
    }

    // Fetch from available projects in parallel
    const results = await Promise.all([
      dbAccios ? fetchAcciosData(dbAccios, range, validStart, validEnd).catch(e => { console.error('Accios fetch error:', e.message); return null; }) : null,
      dbRush ? fetchRushData(dbRush, range, validStart, validEnd).catch(e => { console.error('Rush fetch error:', e.message); return null; }) : null,
      dbXazai ? fetchXazaiData(dbXazai, range, validStart, validEnd).catch(e => { console.error('Xazai fetch error:', e.message); return null; }) : null
    ]);

    const [acciosData, rushData, xazaiData] = results;
    const mock = generateMockData(range);

    // Merge mock staff into real data when no staff collection exists
    if (rushData && !rushData.staff) {
      rushData.staff = mock.byBusiness['rush-ride'].staff;
    }

    // Use real data where available, mock where not
    const byBusiness = {
      'accios-core': acciosData || mock.byBusiness['accios-core'],
      'rush-ride': rushData || mock.byBusiness['rush-ride'],
      'xazai': xazaiData || mock.byBusiness['xazai'],
      'la-colson': {
        name: 'La Colson',
        color: '#EC4899',
        icon: 'nutrition',
        users: colsonContacts.length,
        revenue: Math.round(colsonContacts.reduce((s, c) => s + (c.totalSpent || 0), 0) * 100) / 100,
        collections: { contacts: colsonContacts.length }
      },
      'resultados': {
        name: 'Resultados Inevitables',
        color: '#06B6D4',
        icon: 'fitness_center',
        users: resultadosContacts.length,
        revenue: 0,
        collections: { contacts: resultadosContacts.length }
      },
      'cristian': {
        name: 'Cristian Studio',
        color: '#8B5CF6',
        icon: 'spa',
        users: cristianContacts.length,
        revenue: Math.round(cristianContacts.reduce((s, c) => s + (c.totalSpent || 0), 0) * 100) / 100,
        collections: { contacts: cristianContacts.length }
      },
      'tabares': {
        name: 'Jesus Tabares Salón',
        color: '#EF4444',
        icon: 'content_cut',
        users: tabaresContacts.length,
        revenue: Math.round(tabaresContacts.reduce((s, c) => s + (c.totalSpent || 0), 0) * 100) / 100,
        collections: { contacts: tabaresContacts.length }
      },
      'cakefit': {
        name: 'Cake Fit',
        color: '#F97316',
        icon: 'cake',
        users: cakefitContacts.length,
        revenue: Math.round(cakefitContacts.reduce((s, c) => s + (c.totalSpent || 0), 0) * 100) / 100,
        collections: { contacts: cakefitContacts.length }
      },
      'glowin': {
        name: 'Glowin Strong',
        color: '#10B981',
        icon: 'fitness_center',
        users: glowinContacts.length,
        revenue: Math.round(glowinContacts.reduce((s, c) => s + (c.totalSpent || 0), 0) * 100) / 100,
        collections: { contacts: glowinContacts.length }
      },
      'hechizos': {
        name: 'Hechizos Salón',
        color: '#D946EF',
        icon: 'spa',
        users: hechizosContacts.length,
        revenue: Math.round(hechizosContacts.reduce((s, c) => s + (c.totalSpent || 0), 0) * 100) / 100,
        collections: { contacts: hechizosContacts.length }
      },
      'salon507': {
        name: 'Salón 507',
        color: '#F43F5E',
        icon: 'content_cut',
        users: salon507Contacts.length,
        revenue: Math.round(salon507Contacts.reduce((s, c) => s + (c.totalSpent || 0), 0) * 100) / 100,
        collections: { contacts: salon507Contacts.length }
      },
      'tcp': {
        name: 'Tu Compra Panamá',
        color: '#0EA5E9',
        icon: 'local_shipping',
        users: tcpContacts.length,
        revenue: Math.round(tcpContacts.reduce((s, c) => s + (c.totalSpent || 0), 0) * 100) / 100,
        collections: { contacts: tcpContacts.length }
      },
      'janelle': {
        name: 'Janelle Innovación',
        color: '#84CC16',
        icon: 'lightbulb',
        users: janelleContacts.length,
        revenue: Math.round(janelleContacts.reduce((s, c) => s + (c.totalSpent || 0), 0) * 100) / 100,
        collections: { contacts: janelleContacts.length }
      }
    };

    const totalUsers = Object.values(byBusiness).reduce((s, b) => s + (b.users || 0), 0);
    const totalRevenue = Object.values(byBusiness).reduce((s, b) => s + (b.revenue || 0), 0);

    // Total payment transactions across all sources
    const jsonTransactions = [colsonContacts, cristianContacts, tabaresContacts, cakefitContacts, glowinContacts, hechizosContacts, salon507Contacts, tcpContacts, janelleContacts]
      .reduce((s, arr) => s + arr.reduce((a, c) => a + (c.transactionCount || 0), 0), 0);
    const fbTransactions = (byBusiness['xazai'].collections?.orders || 0) +
      (byBusiness['rush-ride'].collections?.reservations || 0) +
      (byBusiness['accios-core'].collections?.fin_transactions || 0);
    const totalTransactions = jsonTransactions + fbTransactions;

    const realTrends = computeRealTrends();

    res.status(200).json({
      mock: !dbAccios || !dbRush || !dbXazai,
      timestamp: new Date().toISOString(),
      range,
      kpis: {
        totalUsers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTransactions,
        avgRevenuePerUser: totalUsers > 0 ? Math.round((totalRevenue / totalUsers) * 100) / 100 : 0
      },
      byBusiness,
      bizMonthlyTrend: buildRealBizMonthlyTrend(mock.bizMonthlyTrend, xazaiData, rushData),
      consumptionTrend: realTrends.consumptionTrend,
      recentActivity: mock.recentActivity
    });

  } catch (err) {
    console.error('[command-data] Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
