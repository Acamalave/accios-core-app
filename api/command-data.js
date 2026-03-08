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

  return {
    mock: true,
    timestamp: now.toISOString(),
    range,
    kpis: {
      totalUsers: 847,
      totalRevenue: 48520,
      activeMembers: 186,
      totalOrders: 1243,
      newUsersThisRange: Math.round(15 + Math.random() * 40),
      avgRevenuePerUser: 57.28
    },
    byBusiness: {
      'accios-core': {
        name: 'ACCIOS CORE',
        color: '#7C3AED',
        icon: 'hub',
        users: 342,
        revenue: 12850,
        collections: { users: 342, businesses: 8, fin_clients: 38, fin_transactions: 210, appointments: 55, quotes: 90 }
      },
      'rush-ride': {
        name: 'Rush Ride Studio',
        color: '#39FF14',
        icon: 'fitness',
        users: 285,
        revenue: 22340,
        activeMembers: 186,
        collections: { users: 285, transactions: 520, reservations: 1200, checkIns: 3400, userMemberships: 186 }
      },
      'xazai': {
        name: 'Xazai',
        color: '#F59E0B',
        icon: 'restaurant',
        users: 220,
        revenue: 13330,
        collections: { customers: 220, orders: 876, sales: 650, inventory: 124, rrhh_collaborators: 12 }
      }
    },
    revenueTrend: trend,
    recentActivity: [
      { type: 'order', business: 'xazai', description: 'Nuevo pedido #1243 - $18.50', date: new Date(now - 1800000).toISOString(), icon: 'receipt' },
      { type: 'checkin', business: 'rush-ride', description: 'Check-in clase Cycling PM', date: new Date(now - 3600000).toISOString(), icon: 'fitness' },
      { type: 'transaction', business: 'accios-core', description: 'Pago recibido - $150.00', date: new Date(now - 7200000).toISOString(), icon: 'payment' },
      { type: 'reservation', business: 'rush-ride', description: 'Reserva clase manana 6AM', date: new Date(now - 10800000).toISOString(), icon: 'calendar' },
      { type: 'sale', business: 'xazai', description: 'Venta mesa #4 - $45.00', date: new Date(now - 14400000).toISOString(), icon: 'storefront' },
      { type: 'membership', business: 'rush-ride', description: 'Nueva membresia Premium', date: new Date(now - 18000000).toISOString(), icon: 'card' },
      { type: 'quote', business: 'accios-core', description: 'Cotizacion enviada - $2,500', date: new Date(now - 21600000).toISOString(), icon: 'document' },
      { type: 'expense', business: 'xazai', description: 'Compra ingredientes - $320', date: new Date(now - 25200000).toISOString(), icon: 'shopping' }
    ]
  };
}

// ─── Real data fetching ─────────────────────────────────────────────
async function fetchAcciosData(db, range) {
  const [usersSnap, bizSnap, clientsSnap, txnSnap, apptsSnap, quotesSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('businesses').get(),
    db.collection('fin_clients').get(),
    db.collection('fin_transactions').get(),
    db.collection('appointments').get(),
    db.collection('quotes').get()
  ]);

  const revenue = txnSnap.docs.reduce((sum, d) => {
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
      fin_transactions: txnSnap.size,
      appointments: apptsSnap.size,
      quotes: quotesSnap.size
    }
  };
}

async function fetchRushData(db, range) {
  const [usersSnap, txnSnap, membersSnap, reservSnap, checkInSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('transactions').get(),
    db.collection('userMemberships').get(),
    db.collection('reservations').get(),
    db.collection('checkIns').get()
  ]);

  const revenue = txnSnap.docs.reduce((sum, d) => {
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
      transactions: txnSnap.size,
      reservations: reservSnap.size,
      checkIns: checkInSnap.size,
      userMemberships: membersSnap.size
    }
  };
}

async function fetchXazaiData(db, range) {
  const [custSnap, ordersSnap, salesSnap, invSnap, staffSnap] = await Promise.all([
    db.collection('customers').get(),
    db.collection('orders').get(),
    db.collection('sales').get(),
    db.collection('inventory').get(),
    db.collection('rrhh_collaborators').get()
  ]);

  const revenue = salesSnap.docs.reduce((sum, d) => {
    const data = d.data();
    sum += (data.total || data.amount || 0);
    return sum;
  }, 0);

  return {
    name: 'Xazai',
    color: '#F59E0B',
    icon: 'restaurant',
    users: custSnap.size,
    revenue: Math.round(revenue * 100) / 100,
    collections: {
      customers: custSnap.size,
      orders: ordersSnap.size,
      sales: salesSnap.size,
      inventory: invSnap.size,
      rrhh_collaborators: staffSnap.size
    }
  };
}

// ─── Handler ────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const range = req.query.range || '30d';

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
      dbAccios ? fetchAcciosData(dbAccios, range).catch(e => { console.error('Accios fetch error:', e.message); return null; }) : null,
      dbRush ? fetchRushData(dbRush, range).catch(e => { console.error('Rush fetch error:', e.message); return null; }) : null,
      dbXazai ? fetchXazaiData(dbXazai, range).catch(e => { console.error('Xazai fetch error:', e.message); return null; }) : null
    ]);

    const [acciosData, rushData, xazaiData] = results;
    const mock = generateMockData(range);

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
      consumptionTrend: realTrends.consumptionTrend,
      recentActivity: mock.recentActivity
    });

  } catch (err) {
    console.error('[command-data] Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
