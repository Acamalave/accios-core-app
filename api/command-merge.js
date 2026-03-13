const fs = require('fs');
const path = require('path');

const MERGE_FILE = path.join(__dirname, '..', 'data', 'merged-contacts.json');

function readMerges() {
  try {
    const raw = fs.readFileSync(MERGE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { merges: [] };
  }
}

function writeMerges(data) {
  fs.writeFileSync(MERGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — return all merges
  if (req.method === 'GET') {
    return res.status(200).json(readMerges());
  }

  // POST — create a new merge
  if (req.method === 'POST') {
    try {
      const { primaryPhone, primaryEmail, secondaryPhone, secondaryEmail } = req.body || {};
      if (!primaryPhone || !secondaryPhone) {
        return res.status(400).json({ error: 'primaryPhone and secondaryPhone required' });
      }

      const data = readMerges();
      const merge = {
        id: 'merge-' + Date.now(),
        primary: { phone: primaryPhone, email: primaryEmail || '' },
        secondary: { phone: secondaryPhone, email: secondaryEmail || '' },
        createdAt: new Date().toISOString()
      };
      data.merges.push(merge);
      writeMerges(data);

      return res.status(200).json({ success: true, merge, total: data.merges.length });
    } catch (err) {
      console.error('[command-merge] POST error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE — undo a merge by id
  if (req.method === 'DELETE') {
    try {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id parameter required' });

      const data = readMerges();
      data.merges = data.merges.filter(m => m.id !== id);
      writeMerges(data);

      return res.status(200).json({ success: true, total: data.merges.length });
    } catch (err) {
      console.error('[command-merge] DELETE error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
