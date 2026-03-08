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

// ─── Firebase helpers (shared pattern) ──────────────────────────────
function getApp(name, envVar) {
  const existing = admin.apps.find(a => a.name === name);
  if (existing) return existing;
  try {
    const sa = JSON.parse(process.env[envVar] || '{}');
    if (!sa.project_id) return null;
    return admin.initializeApp({ credential: admin.credential.cert(sa) }, name);
  } catch (e) { return null; }
}
function getDb(name, envVar) {
  const app = getApp(name, envVar);
  return app ? admin.firestore(app) : null;
}

// ─── Mock users ─────────────────────────────────────────────────────
function generateMockUsers() {
  const names = [
    'Maria Lopez', 'Carlos Rivera', 'Ana Martinez', 'Jose Gonzalez', 'Laura Castillo',
    'Pedro Herrera', 'Sofia Morales', 'Diego Vargas', 'Valentina Rojas', 'Andres Mendoza',
    'Isabella Torres', 'Miguel Angel Ruiz', 'Camila Ortega', 'Fernando Diaz', 'Daniela Perez',
    'Roberto Sanchez', 'Gabriela Nunez', 'Alejandro Castro', 'Paula Jimenez', 'Ricardo Flores',
    'Monica Espinoza', 'Juan Pablo Reyes', 'Natalia Gomez', 'Oscar Delgado', 'Adriana Vega',
    'Eduardo Ramirez', 'Claudia Soto', 'Luis Fernandez', 'Carmen Aguilar', 'Jorge Molina',
    'Elena Paredes', 'Raul Gutierrez', 'Patricia Romero', 'Sergio Campos', 'Diana Cardenas',
    'Manuel Rios', 'Teresa Silva', 'Francisco Mejia', 'Rosa Navarro', 'Alberto Pacheco'
  ];

  const businesses = ['accios-core', 'rush-ride', 'xazai'];
  const now = Date.now();

  return names.map((name, i) => {
    const phone = `+5076${String(1000000 + i * 7919).slice(0, 7)}`;
    const userBiz = [];
    if (Math.random() > 0.2) userBiz.push('accios-core');
    if (Math.random() > 0.4) userBiz.push('rush-ride');
    if (Math.random() > 0.4) userBiz.push('xazai');
    if (userBiz.length === 0) userBiz.push(businesses[i % 3]);

    const totalSpent = Math.round((Math.random() * 3000 + 50) * 100) / 100;
    const daysAgo = Math.floor(Math.random() * 90);
    const lastActive = new Date(now - daysAgo * 86400000).toISOString().slice(0, 10);
    const firstSeen = new Date(now - (180 + Math.random() * 365) * 86400000).toISOString().slice(0, 10);

    return {
      id: `user-${i}`,
      name,
      phone,
      email: name.toLowerCase().replace(/ /g, '.') + '@email.com',
      businesses: userBiz,
      totalSpent,
      lastActive,
      firstSeen,
      vipScore: Math.round(Math.random() * 100),
      ordersCount: Math.floor(Math.random() * 50),
      source: {}
    };
  });
}

// ─── Helpers ────────────────────────────────────────────────────────
function toDateStr(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val._seconds) return new Date(val._seconds * 1000).toISOString();
  if (val.toDate) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  return '';
}

// ─── Real data fetching & unification ───────────────────────────────
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length >= 8) {
    return '+507' + digits.slice(-8);
  }
  return null;
}

async function fetchAndUnifyUsers(dbAccios, dbRush, dbXazai) {
  const userMap = new Map(); // keyed by normalized phone

  // Fetch from all available projects in parallel
  const [acciosUsers, rushUsers, xazaiUsers] = await Promise.all([
    dbAccios ? dbAccios.collection('users').get().then(s => s.docs.map(d => ({ id: d.id, ...d.data(), _src: 'accios-core' }))) : [],
    dbRush ? dbRush.collection('users').get().then(s => s.docs.map(d => ({ id: d.id, ...d.data(), _src: 'rush-ride' }))) : [],
    dbXazai ? dbXazai.collection('customers').get().then(s => s.docs.map(d => ({ id: d.id, ...d.data(), _src: 'xazai' }))) : []
  ]);

  // Merge by phone
  function mergeUser(user) {
    const phone = normalizePhone(user.phone || user.id);
    if (!phone) return;
    if (!userMap.has(phone)) {
      userMap.set(phone, {
        id: phone,
        name: user.name || user.displayName || '',
        phone,
        email: user.email || '',
        businesses: [],
        totalSpent: 0,
        lastActive: '',
        firstSeen: '',
        vipScore: 0,
        ordersCount: 0,
        source: {}
      });
    }
    const merged = userMap.get(phone);
    if (!merged.businesses.includes(user._src)) merged.businesses.push(user._src);
    if (user.name && !merged.name) merged.name = user.name;
    if (user.displayName && !merged.name) merged.name = user.displayName;
    if (user.email && !merged.email) merged.email = user.email;
    merged.totalSpent += (user.totalSpent || 0);
    merged.ordersCount += (user.totalOrders || 0);
    merged.source[user._src] = { docId: user.id, role: user.role };

    const activeDate = toDateStr(user.lastLogin) || toDateStr(user.lastActive) || toDateStr(user.lastOrderDate) || '';
    if (activeDate > merged.lastActive) merged.lastActive = activeDate;
    const firstDate = toDateStr(user.createdAt) || toDateStr(user.firstSeen) || '';
    if (!merged.firstSeen || (firstDate && firstDate < merged.firstSeen)) merged.firstSeen = firstDate;
  }

  acciosUsers.forEach(mergeUser);
  rushUsers.forEach(mergeUser);
  xazaiUsers.forEach(mergeUser);

  // ─── La Colson (CSV static data) ──────────────────────────────
  // Build email→phone index for matching contacts without phone
  const emailToPhone = new Map();
  for (const [phone, u] of userMap.entries()) {
    if (u.email) emailToPhone.set(u.email.toLowerCase(), phone);
  }

  colsonContacts.forEach(c => {
    const phone = normalizePhone(c.phone || '');
    if (phone) {
      mergeUser({ name: c.name || '', phone: c.phone || '', email: c.email || '', createdAt: c.createdAt || '', _src: 'la-colson' });
    } else if (c.email) {
      // No phone — try to match by email to existing user
      const matchedPhone = emailToPhone.get(c.email.toLowerCase());
      if (matchedPhone && userMap.has(matchedPhone)) {
        const merged = userMap.get(matchedPhone);
        if (!merged.businesses.includes('la-colson')) merged.businesses.push('la-colson');
        merged.source['la-colson'] = { docId: c.email };
      } else {
        // New user keyed by email
        const key = 'email:' + c.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: key, name: c.name || '', phone: '', email: c.email,
            businesses: ['la-colson'], totalSpent: 0, lastActive: '',
            firstSeen: c.createdAt || '', vipScore: 0, ordersCount: 0,
            source: { 'la-colson': { docId: c.email } }
          });
        }
      }
    }
  });

  // ─── Resultados Inevitables (CSV static data) ──────────────
  // Rebuild email→phone index after La Colson merge
  emailToPhone.clear();
  for (const [k, u] of userMap.entries()) {
    if (u.email) emailToPhone.set(u.email.toLowerCase(), k);
  }

  resultadosContacts.forEach(c => {
    const phone = normalizePhone(c.phone || '');
    if (phone) {
      mergeUser({ name: c.name || '', phone: c.phone || '', email: c.email || '', createdAt: c.createdAt || '', _src: 'resultados' });
    } else if (c.email) {
      const matchedKey = emailToPhone.get(c.email.toLowerCase());
      if (matchedKey && userMap.has(matchedKey)) {
        const merged = userMap.get(matchedKey);
        if (!merged.businesses.includes('resultados')) merged.businesses.push('resultados');
        merged.source['resultados'] = { docId: c.email };
      } else {
        const key = 'email:' + c.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: key, name: c.name || '', phone: '', email: c.email,
            businesses: ['resultados'], totalSpent: 0, lastActive: '',
            firstSeen: c.createdAt || '', vipScore: 0, ordersCount: 0,
            source: { 'resultados': { docId: c.email } }
          });
        } else {
          const existing = userMap.get(key);
          if (!existing.businesses.includes('resultados')) existing.businesses.push('resultados');
          existing.source['resultados'] = { docId: c.email };
        }
      }
    }
  });

  // ─── Cristian Studio (CSV payments data) ──────────────────
  // Rebuild email→phone index after RI merge
  emailToPhone.clear();
  for (const [k, u] of userMap.entries()) {
    if (u.email) emailToPhone.set(u.email.toLowerCase(), k);
  }

  cristianContacts.forEach(c => {
    const phone = normalizePhone(c.phone || '');
    if (phone) {
      mergeUser({ name: c.name || '', phone: c.phone || '', email: c.email || '', totalSpent: c.totalSpent || 0, createdAt: c.createdAt || '', _src: 'cristian' });
    } else if (c.email) {
      const matchedKey = emailToPhone.get(c.email.toLowerCase());
      if (matchedKey && userMap.has(matchedKey)) {
        const merged = userMap.get(matchedKey);
        if (!merged.businesses.includes('cristian')) merged.businesses.push('cristian');
        merged.totalSpent += (c.totalSpent || 0);
        merged.source['cristian'] = { docId: c.email };
      } else {
        const key = 'email:' + c.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: key, name: c.name || '', phone: '', email: c.email,
            businesses: ['cristian'], totalSpent: c.totalSpent || 0, lastActive: c.lastPayment || '',
            firstSeen: c.createdAt || '', vipScore: 0, ordersCount: c.transactionCount || 0,
            source: { 'cristian': { docId: c.email } }
          });
        } else {
          const existing = userMap.get(key);
          if (!existing.businesses.includes('cristian')) existing.businesses.push('cristian');
          existing.totalSpent += (c.totalSpent || 0);
          existing.source['cristian'] = { docId: c.email };
        }
      }
    }
  });

  // ─── Jesus Tabares Salón (CSV payments data) ──────────────
  emailToPhone.clear();
  for (const [k, u] of userMap.entries()) {
    if (u.email) emailToPhone.set(u.email.toLowerCase(), k);
  }

  tabaresContacts.forEach(c => {
    const phone = normalizePhone(c.phone || '');
    if (phone) {
      mergeUser({ name: c.name || '', phone: c.phone || '', email: c.email || '', totalSpent: c.totalSpent || 0, createdAt: c.createdAt || '', _src: 'tabares' });
    } else if (c.email) {
      const matchedKey = emailToPhone.get(c.email.toLowerCase());
      if (matchedKey && userMap.has(matchedKey)) {
        const merged = userMap.get(matchedKey);
        if (!merged.businesses.includes('tabares')) merged.businesses.push('tabares');
        merged.totalSpent += (c.totalSpent || 0);
        merged.source['tabares'] = { docId: c.email };
      } else {
        const key = 'email:' + c.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: key, name: c.name || '', phone: '', email: c.email,
            businesses: ['tabares'], totalSpent: c.totalSpent || 0, lastActive: c.lastPayment || '',
            firstSeen: c.createdAt || '', vipScore: 0, ordersCount: c.transactionCount || 0,
            source: { 'tabares': { docId: c.email } }
          });
        } else {
          const existing = userMap.get(key);
          if (!existing.businesses.includes('tabares')) existing.businesses.push('tabares');
          existing.totalSpent += (c.totalSpent || 0);
          existing.source['tabares'] = { docId: c.email };
        }
      }
    }
  });

  // ─── Cake Fit (CSV payments data) ──────────────────────────
  emailToPhone.clear();
  for (const [k, u] of userMap.entries()) {
    if (u.email) emailToPhone.set(u.email.toLowerCase(), k);
  }

  cakefitContacts.forEach(c => {
    const phone = normalizePhone(c.phone || '');
    if (phone) {
      mergeUser({ name: c.name || '', phone: c.phone || '', email: c.email || '', totalSpent: c.totalSpent || 0, createdAt: c.createdAt || '', _src: 'cakefit' });
    } else if (c.email) {
      const matchedKey = emailToPhone.get(c.email.toLowerCase());
      if (matchedKey && userMap.has(matchedKey)) {
        const merged = userMap.get(matchedKey);
        if (!merged.businesses.includes('cakefit')) merged.businesses.push('cakefit');
        merged.totalSpent += (c.totalSpent || 0);
        merged.source['cakefit'] = { docId: c.email };
      } else {
        const key = 'email:' + c.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: key, name: c.name || '', phone: '', email: c.email,
            businesses: ['cakefit'], totalSpent: c.totalSpent || 0, lastActive: c.lastPayment || '',
            firstSeen: c.createdAt || '', vipScore: 0, ordersCount: c.transactionCount || 0,
            source: { 'cakefit': { docId: c.email } }
          });
        } else {
          const existing = userMap.get(key);
          if (!existing.businesses.includes('cakefit')) existing.businesses.push('cakefit');
          existing.totalSpent += (c.totalSpent || 0);
          existing.source['cakefit'] = { docId: c.email };
        }
      }
    }
  });

  // ─── Glowin Strong (CSV payments data) ──────────────────────
  emailToPhone.clear();
  for (const [k, u] of userMap.entries()) {
    if (u.email) emailToPhone.set(u.email.toLowerCase(), k);
  }

  glowinContacts.forEach(c => {
    const phone = normalizePhone(c.phone || '');
    if (phone) {
      mergeUser({ name: c.name || '', phone: c.phone || '', email: c.email || '', totalSpent: c.totalSpent || 0, createdAt: c.createdAt || '', _src: 'glowin' });
    } else if (c.email) {
      const matchedKey = emailToPhone.get(c.email.toLowerCase());
      if (matchedKey && userMap.has(matchedKey)) {
        const merged = userMap.get(matchedKey);
        if (!merged.businesses.includes('glowin')) merged.businesses.push('glowin');
        merged.totalSpent += (c.totalSpent || 0);
        merged.source['glowin'] = { docId: c.email };
      } else {
        const key = 'email:' + c.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: key, name: c.name || '', phone: '', email: c.email,
            businesses: ['glowin'], totalSpent: c.totalSpent || 0, lastActive: c.lastPayment || '',
            firstSeen: c.createdAt || '', vipScore: 0, ordersCount: c.transactionCount || 0,
            source: { 'glowin': { docId: c.email } }
          });
        } else {
          const existing = userMap.get(key);
          if (!existing.businesses.includes('glowin')) existing.businesses.push('glowin');
          existing.totalSpent += (c.totalSpent || 0);
          existing.source['glowin'] = { docId: c.email };
        }
      }
    }
  });

  // ─── Hechizos Salón (CSV contacts + payments data) ─────────
  emailToPhone.clear();
  for (const [k, u] of userMap.entries()) {
    if (u.email) emailToPhone.set(u.email.toLowerCase(), k);
  }

  hechizosContacts.forEach(c => {
    const phone = normalizePhone(c.phone || '');
    if (phone) {
      mergeUser({ name: c.name || '', phone: c.phone || '', email: c.email || '', totalSpent: c.totalSpent || 0, createdAt: c.createdAt || '', _src: 'hechizos' });
    } else if (c.email) {
      const matchedKey = emailToPhone.get(c.email.toLowerCase());
      if (matchedKey && userMap.has(matchedKey)) {
        const merged = userMap.get(matchedKey);
        if (!merged.businesses.includes('hechizos')) merged.businesses.push('hechizos');
        merged.totalSpent += (c.totalSpent || 0);
        merged.source['hechizos'] = { docId: c.email };
      } else {
        const key = 'email:' + c.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: key, name: c.name || '', phone: '', email: c.email,
            businesses: ['hechizos'], totalSpent: c.totalSpent || 0, lastActive: c.lastPayment || '',
            firstSeen: c.createdAt || '', vipScore: 0, ordersCount: c.transactionCount || 0,
            source: { 'hechizos': { docId: c.email } }
          });
        } else {
          const existing = userMap.get(key);
          if (!existing.businesses.includes('hechizos')) existing.businesses.push('hechizos');
          existing.totalSpent += (c.totalSpent || 0);
          existing.source['hechizos'] = { docId: c.email };
        }
      }
    }
  });

  // ─── Salón 507 (CSV booking data) ─────────────────────────
  emailToPhone.clear();
  for (const [k, u] of userMap.entries()) {
    if (u.email) emailToPhone.set(u.email.toLowerCase(), k);
  }

  salon507Contacts.forEach(c => {
    const phone = normalizePhone(c.phone || '');
    if (phone) {
      mergeUser({ name: c.name || '', phone: c.phone || '', email: c.email || '', totalSpent: c.totalSpent || 0, createdAt: c.createdAt || '', _src: 'salon507' });
    } else if (c.email) {
      const matchedKey = emailToPhone.get(c.email.toLowerCase());
      if (matchedKey && userMap.has(matchedKey)) {
        const merged = userMap.get(matchedKey);
        if (!merged.businesses.includes('salon507')) merged.businesses.push('salon507');
        merged.source['salon507'] = { docId: c.email };
      } else {
        const key = 'email:' + c.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: key, name: c.name || '', phone: '', email: c.email,
            businesses: ['salon507'], totalSpent: 0, lastActive: '',
            firstSeen: c.createdAt || '', vipScore: 0, ordersCount: 0,
            source: { 'salon507': { docId: c.email } }
          });
        } else {
          const existing = userMap.get(key);
          if (!existing.businesses.includes('salon507')) existing.businesses.push('salon507');
          existing.source['salon507'] = { docId: c.email };
        }
      }
    }
  });

  // ─── Tu Compra Panamá (xlsx casilleros + carga) ───────────
  emailToPhone.clear();
  for (const [k, u] of userMap.entries()) {
    if (u.email) emailToPhone.set(u.email.toLowerCase(), k);
  }

  tcpContacts.forEach(c => {
    const phone = normalizePhone(c.phone || '');
    if (phone) {
      mergeUser({ name: c.name || '', phone: c.phone || '', email: c.email || '', totalSpent: c.totalSpent || 0, createdAt: '', _src: 'tcp' });
    } else if (c.email) {
      const matchedKey = emailToPhone.get(c.email.toLowerCase());
      if (matchedKey && userMap.has(matchedKey)) {
        const merged = userMap.get(matchedKey);
        if (!merged.businesses.includes('tcp')) merged.businesses.push('tcp');
        merged.source['tcp'] = { docId: c.email };
      } else {
        const key = 'email:' + c.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: key, name: c.name || '', phone: '', email: c.email,
            businesses: ['tcp'], totalSpent: 0, lastActive: '',
            firstSeen: '', vipScore: 0, ordersCount: 0,
            source: { 'tcp': { docId: c.email } }
          });
        } else {
          const existing = userMap.get(key);
          if (!existing.businesses.includes('tcp')) existing.businesses.push('tcp');
          existing.source['tcp'] = { docId: c.email };
        }
      }
    }
  });

  // ─── Janelle Innovación (xlsx name + email only) ──────────
  emailToPhone.clear();
  for (const [k, u] of userMap.entries()) {
    if (u.email) emailToPhone.set(u.email.toLowerCase(), k);
  }

  janelleContacts.forEach(c => {
    if (!c.email) return;
    const matchedKey = emailToPhone.get(c.email.toLowerCase());
    if (matchedKey && userMap.has(matchedKey)) {
      const merged = userMap.get(matchedKey);
      if (!merged.businesses.includes('janelle')) merged.businesses.push('janelle');
      merged.source['janelle'] = { docId: c.email };
    } else {
      const key = 'email:' + c.email.toLowerCase();
      if (!userMap.has(key)) {
        userMap.set(key, {
          id: key, name: c.name || '', phone: '', email: c.email,
          businesses: ['janelle'], totalSpent: 0, lastActive: '',
          firstSeen: '', vipScore: 0, ordersCount: 0,
          source: { 'janelle': { docId: c.email } }
        });
      } else {
        const existing = userMap.get(key);
        if (!existing.businesses.includes('janelle')) existing.businesses.push('janelle');
        existing.source['janelle'] = { docId: c.email };
      }
    }
  });

  return Array.from(userMap.values());
}

// ─── Handler ────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const search = (req.query.search || '').toLowerCase().trim();
  const filter = req.query.filter || 'all';
  const sort = req.query.sort || 'name';

  try {
    const dbAccios = getDb('accios-core', 'FIREBASE_SERVICE_ACCOUNT');
    const dbRush = getDb('rush-ride', 'FIREBASE_SA_RUSH_RIDE');
    const dbXazai = getDb('xazai', 'FIREBASE_SA_XAZAI');

    let allUsers;
    const useMock = !dbAccios && !dbRush && !dbXazai;

    if (useMock) {
      allUsers = generateMockUsers();
    } else {
      allUsers = await fetchAndUnifyUsers(dbAccios, dbRush, dbXazai);
    }

    // Apply search
    let filtered = allUsers;
    if (search) {
      filtered = filtered.filter(u =>
        (u.name || '').toLowerCase().includes(search) ||
        (u.phone || '').includes(search) ||
        (u.email || '').toLowerCase().includes(search)
      );
    }

    // Apply filters
    switch (filter) {
      case 'cross_rush':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('rush-ride'));
        break;
      case 'cross_xazai':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('xazai'));
        break;
      case 'cross_colson':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('la-colson'));
        break;
      case 'cross_resultados':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('resultados'));
        break;
      case 'cross_cristian':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('cristian'));
        break;
      case 'cross_tabares':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('tabares'));
        break;
      case 'cross_cakefit':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('cakefit'));
        break;
      case 'cross_glowin':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('glowin'));
        break;
      case 'cross_hechizos':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('hechizos'));
        break;
      case 'cross_salon507':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('salon507'));
        break;
      case 'cross_tcp':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('tcp'));
        break;
      case 'cross_janelle':
        filtered = filtered.filter(u => u.businesses.includes('accios-core') && !u.businesses.includes('janelle'));
        break;
      case 'vip': {
        const sorted = [...filtered].sort((a, b) => b.totalSpent - a.totalSpent);
        const top25 = Math.ceil(sorted.length * 0.25);
        const threshold = sorted[top25 - 1]?.totalSpent || 0;
        filtered = filtered.filter(u => u.totalSpent >= threshold);
        break;
      }
      case 'churn': {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        filtered = filtered.filter(u => !u.lastActive || u.lastActive < thirtyDaysAgo);
        break;
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sort) {
        case 'revenue': return (b.totalSpent || 0) - (a.totalSpent || 0);
        case 'last_active': return (b.lastActive || '').localeCompare(a.lastActive || '');
        default: return (a.name || '').localeCompare(b.name || '');
      }
    });

    // Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const users = filtered.slice(start, start + limit);

    res.status(200).json({ mock: useMock, users, total, page, totalPages, filter, search });

  } catch (err) {
    console.error('[command-users] Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
