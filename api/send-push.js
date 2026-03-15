module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokens, title, body, url } = req.body;

  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ error: 'No tokens provided' });
  }

  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    return res.status(500).json({ error: 'FCM not configured — FCM_SERVER_KEY missing' });
  }

  const results = [];

  for (const token of tokens) {
    try {
      const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${serverKey}`
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: title || 'ACCIOS CORE',
            body: body || 'Tienes una nueva notificación',
            icon: '/assets/icons/icon-192.png',
          },
          data: {
            url: url || '/',
          }
        })
      });
      const data = await fcmRes.json();
      results.push({
        token: token.slice(0, 12) + '...',
        success: data.success === 1,
      });
    } catch (err) {
      results.push({
        token: token.slice(0, 12) + '...',
        success: false,
        error: err.message,
      });
    }
  }

  res.status(200).json({
    sent: results.filter(r => r.success).length,
    total: results.length,
    results,
  });
};
