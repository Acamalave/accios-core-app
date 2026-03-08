const admin = require('firebase-admin');

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

// ─── Helpers ─────────────────────────────────────────────────────
function toDateStr(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val._seconds) return new Date(val._seconds * 1000).toISOString();
  if (val.toDate) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  return '';
}

// Recursively convert Firestore Timestamps to ISO strings
function sanitizeDoc(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj._seconds !== undefined) return toDateStr(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeDoc);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = sanitizeDoc(v);
  }
  return out;
}

// Fields to exclude from the expediente (internal/sensitive)
const SKIP_FIELDS = new Set([
  'pinHash', 'pin', 'password', 'passwordHash', 'token', 'refreshToken',
  '_src', '__v', 'fcmToken', 'deviceToken'
]);

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length >= 8) return '+507' + digits.slice(-8);
  return null;
}

// ─── Mock profile ───────────────────────────────────────────────────
function generateMockProfile(phone) {
  return {
    mock: true,
    unified: {
      name: 'Maria Lopez', phone: phone || '+50761234567',
      email: 'maria.lopez@email.com', firstSeen: '2025-06-15',
      totalSpent: 1875.50, vipScore: 78,
      businesses: ['accios-core', 'rush-ride', 'xazai']
    },
    allFields: [
      { key: 'name', value: 'Maria Lopez', sources: ['accios-core', 'xazai'] },
      { key: 'email', value: 'maria.lopez@email.com', sources: ['accios-core'] },
      { key: 'role', value: 'user', sources: ['accios-core'] },
      { key: 'displayName', value: 'Maria L.', sources: ['rush-ride'] },
      { key: 'totalOrders', value: 23, sources: ['xazai'] },
      { key: 'totalSpent', value: 540.50, sources: ['xazai'] },
      { key: 'businesses', value: ['mdn-podcast', 'gregoria'], sources: ['accios-core'] },
      { key: 'createdAt', value: '2025-06-15', sources: ['accios-core'] }
    ],
    accios: {
      exists: true, role: 'user', businesses: ['mdn-podcast', 'gregoria'],
      transactions: [
        { id: 'txn-1', description: 'Servicio de impresion', amount: 150, status: 'cobrado', date: '2026-02-15' },
        { id: 'txn-2', description: 'Diseno grafico logo', amount: 450, status: 'cobrado', date: '2026-01-20' }
      ],
      quotes: [
        { id: 'qt-1', description: 'Paquete Premium Q2', total: 2500, status: 'pendiente', date: '2026-03-05' }
      ]
    },
    rushRide: {
      exists: true,
      membership: { plan: 'Premium', status: 'active', since: '2025-09-01' },
      totalClasses: 48, thisMonth: 8, lastCheckIn: '2026-03-06',
      recentClasses: [
        { date: '2026-03-06', className: 'Cycling Power', coach: 'Coach Alex', spots: 'B3' },
        { date: '2026-03-04', className: 'Cycling Endurance', coach: 'Coach Sarah', spots: 'A1' }
      ]
    },
    xazai: {
      exists: true, totalOrders: 23, totalSpent: 540.50, lastOrder: '2026-03-05',
      recentOrders: [
        { id: 'xz-1', items: 3, total: 24.50, date: '2026-03-05', status: 'completed' },
        { id: 'xz-2', items: 2, total: 18.00, date: '2026-03-02', status: 'completed' }
      ]
    },
    timeline: [
      { date: '2026-03-06', business: 'rush-ride', type: 'checkin', description: 'Check-in Cycling Power' },
      { date: '2026-03-05', business: 'xazai', type: 'order', description: 'Pedido #1243 - $24.50' },
      { date: '2026-03-05', business: 'accios-core', type: 'quote', description: 'Cotizacion Paquete Premium' }
    ]
  };
}

// ─── Field merge/dedup engine ────────────────────────────────────────
function buildAllFields(sources) {
  // sources: { 'accios-core': {field: val}, 'rush-ride': {...}, 'xazai': {...} }
  const fieldMap = new Map(); // key → [{value, source}]

  for (const [src, fields] of Object.entries(sources)) {
    if (!fields) continue;
    for (const [key, val] of Object.entries(fields)) {
      if (SKIP_FIELDS.has(key)) continue;
      if (val === null || val === undefined || val === '') continue;

      if (!fieldMap.has(key)) fieldMap.set(key, []);
      fieldMap.get(key).push({ value: val, source: src });
    }
  }

  const allFields = [];
  for (const [key, entries] of fieldMap.entries()) {
    // Group by identical values
    const groups = new Map();
    for (const e of entries) {
      const valKey = JSON.stringify(e.value);
      if (!groups.has(valKey)) groups.set(valKey, { value: e.value, sources: [] });
      groups.get(valKey).sources.push(e.source);
    }
    for (const g of groups.values()) {
      allFields.push({ key, value: g.value, sources: g.sources });
    }
  }

  return allFields;
}

// ─── Real profile fetching ──────────────────────────────────────────
async function fetchRealProfile(phone, email, dbAccios, dbRush, dbXazai) {
  const result = {
    mock: false,
    unified: { name: '', phone, email: '', firstSeen: '', totalSpent: 0, vipScore: 0, businesses: [] },
    allFields: [],
    accios: { exists: false },
    rushRide: { exists: false },
    xazai: { exists: false },
    timeline: []
  };

  const rawFields = {};
  let knownEmail = email || '';

  // ─── Accios Core ───────────────────────────────────────────
  if (dbAccios) {
    try {
      let userDoc = await dbAccios.collection('users').doc(phone).get();
      // Fallback: search by email if phone not found
      if (!userDoc.exists && knownEmail) {
        const byEmail = await dbAccios.collection('users').where('email', '==', knownEmail).get();
        if (!byEmail.empty) userDoc = byEmail.docs[0];
      }
      if (userDoc.exists || (userDoc.data && userDoc.data())) {
        const u = sanitizeDoc(userDoc.data());
        rawFields['accios-core'] = u;
        result.accios = { exists: true, ...u };
        result.unified.name = u.name || '';
        result.unified.email = u.email || '';
        if (!knownEmail && u.email) knownEmail = u.email;
        result.unified.businesses.push('accios-core');

        // Subcollections
        const [txnSnap, quotesSnap] = await Promise.all([
          dbAccios.collection('fin_transactions').where('clientPhone', '==', phone).get(),
          dbAccios.collection('quotes').where('clientPhone', '==', phone).get()
        ]);
        result.accios.transactions = txnSnap.docs.map(d => sanitizeDoc({ id: d.id, ...d.data() })).slice(0, 20);
        result.accios.quotes = quotesSnap.docs.map(d => sanitizeDoc({ id: d.id, ...d.data() })).slice(0, 10);

        // Timeline entries
        result.accios.transactions.forEach(t => {
          result.timeline.push({
            date: t.createdAt || t.date || '', business: 'accios-core',
            type: 'transaction', description: `${t.description || 'Transacción'} — $${(t.totalAmount || t.amount || 0).toFixed(2)}`
          });
        });
        result.accios.quotes.forEach(q => {
          result.timeline.push({
            date: q.createdAt || q.date || '', business: 'accios-core',
            type: 'quote', description: `Cotización: ${q.items?.[0]?.description || 'Sin detalle'} — $${(q.total || 0).toFixed(2)}`
          });
        });
      }
    } catch (e) { console.warn('Accios profile error:', e.message); }
  }

  // ─── Rush Ride ─────────────────────────────────────────────
  if (dbRush) {
    try {
      let userSnap = await dbRush.collection('users').where('phone', '==', phone).get();
      // Fallback: search by email
      if (userSnap.empty && knownEmail) {
        userSnap = await dbRush.collection('users').where('email', '==', knownEmail).get();
      }
      if (!userSnap.empty) {
        const rushDoc = userSnap.docs[0];
        const u = sanitizeDoc(rushDoc.data());
        const rushUid = rushDoc.id;
        rawFields['rush-ride'] = u;
        result.rushRide = { exists: true, ...u };
        result.unified.businesses.push('rush-ride');
        if (u.displayName && !result.unified.name) result.unified.name = u.displayName;
        if (u.email && !result.unified.email) result.unified.email = u.email;
        if (!knownEmail && u.email) knownEmail = u.email;

        // Subcollections — memberships, checkIns, reservations
        const [memberSnap, checkInSnap, reservationSnap] = await Promise.all([
          dbRush.collection('userMemberships').where('userId', '==', rushUid).get().catch(() => ({ docs: [] })),
          dbRush.collection('checkIns').where('userId', '==', rushUid).orderBy('date', 'desc').limit(10).get().catch(() => ({ docs: [] })),
          dbRush.collection('reservations').where('userId', '==', rushUid).orderBy('date', 'desc').limit(10).get().catch(() => ({ docs: [] }))
        ]);

        if (memberSnap.docs?.length) {
          const m = sanitizeDoc(memberSnap.docs[0].data());
          result.rushRide.membership = m;
        }

        result.rushRide.recentCheckIns = (checkInSnap.docs || []).map(d => sanitizeDoc({ id: d.id, ...d.data() }));
        result.rushRide.recentReservations = (reservationSnap.docs || []).map(d => sanitizeDoc({ id: d.id, ...d.data() }));
        result.rushRide.totalClasses = result.rushRide.recentCheckIns.length;

        // Timeline entries
        result.rushRide.recentCheckIns.forEach(c => {
          result.timeline.push({
            date: c.date || c.createdAt || '', business: 'rush-ride',
            type: 'checkin', description: `Check-in${c.className ? ': ' + c.className : ''}`
          });
        });
        result.rushRide.recentReservations.forEach(r => {
          result.timeline.push({
            date: r.date || r.createdAt || '', business: 'rush-ride',
            type: 'reservation', description: `Reserva${r.className ? ': ' + r.className : ''}`
          });
        });
      }
    } catch (e) { console.warn('Rush profile error:', e.message); }
  }

  // ─── Xazai ─────────────────────────────────────────────────
  if (dbXazai) {
    try {
      let custData = null, custId = null;
      const byPhone = await dbXazai.collection('customers').where('phone', '==', phone).get();
      if (!byPhone.empty) {
        custData = byPhone.docs[0].data();
        custId = byPhone.docs[0].id;
      } else {
        const byId = await dbXazai.collection('customers').doc(phone).get();
        if (byId.exists) { custData = byId.data(); custId = byId.id; }
        // Fallback: email
        if (!custData && knownEmail) {
          const byEmail = await dbXazai.collection('customers').where('email', '==', knownEmail).get();
          if (!byEmail.empty) { custData = byEmail.docs[0].data(); custId = byEmail.docs[0].id; }
        }
      }
      if (custData) {
        const c = sanitizeDoc(custData);
        rawFields['xazai'] = c;
        result.xazai = { exists: true, ...c };
        result.unified.businesses.push('xazai');
        if (c.name && !result.unified.name) result.unified.name = c.name;
        if (c.email && !result.unified.email) result.unified.email = c.email;

        // Subcollection: orders
        if (custId) {
          try {
            const ordersSnap = await dbXazai.collection('orders').where('customerId', '==', custId).orderBy('createdAt', 'desc').limit(10).get();
            result.xazai.recentOrders = ordersSnap.docs.map(d => sanitizeDoc({ id: d.id, ...d.data() }));
          } catch (_) {
            // orderBy may fail if no composite index — try without order
            try {
              const ordersSnap = await dbXazai.collection('orders').where('customerId', '==', custId).limit(10).get();
              result.xazai.recentOrders = ordersSnap.docs.map(d => sanitizeDoc({ id: d.id, ...d.data() }));
            } catch (__) { result.xazai.recentOrders = []; }
          }
          // Timeline
          (result.xazai.recentOrders || []).forEach(o => {
            result.timeline.push({
              date: o.createdAt || o.date || '', business: 'xazai',
              type: 'order', description: `Pedido #${(o.id || '').slice(-4)} — $${(o.total || o.amount || 0).toFixed(2)}`
            });
          });
        }
      }
    } catch (e) { console.warn('Xazai profile error:', e.message); }
  }

  // ─── Build unified allFields (merge + dedup) ───────────────
  result.allFields = buildAllFields(rawFields);

  // Calculate aggregates for unified
  result.unified.totalSpent = (result.xazai.totalSpent || 0);
  if (result.accios.transactions) {
    result.unified.totalSpent += result.accios.transactions.reduce((s, t) => s + (t.totalAmount || t.amount || 0), 0);
  }

  // First seen = earliest createdAt across sources
  const dates = [rawFields['accios-core']?.createdAt, rawFields['rush-ride']?.createdAt, rawFields['xazai']?.createdAt].filter(Boolean);
  if (dates.length) result.unified.firstSeen = dates.sort()[0];

  // Sort timeline by date descending
  result.timeline.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return result;
}

// ─── Handler ────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const phone = req.query.phone;
  const email = req.query.email || '';
  if (!phone) return res.status(400).json({ error: 'phone parameter required' });

  try {
    const dbAccios = getDb('accios-core', 'FIREBASE_SERVICE_ACCOUNT');
    const dbRush = getDb('rush-ride', 'FIREBASE_SA_RUSH_RIDE');
    const dbXazai = getDb('xazai', 'FIREBASE_SA_XAZAI');

    if (!dbAccios && !dbRush && !dbXazai) {
      return res.status(200).json(generateMockProfile(phone));
    }

    const profile = await fetchRealProfile(phone, email, dbAccios, dbRush, dbXazai);
    res.status(200).json(profile);

  } catch (err) {
    console.error('[command-profile] Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
