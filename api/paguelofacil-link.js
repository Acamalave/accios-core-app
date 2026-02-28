module.exports = async function handler(req, res) {
  // Explicit CORS headers for Capacitor native app (origin: https://localhost)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, description, clientId, transactionIds } = req.body;

    const CLAVE = process.env.PAGUELOFACIL_CLAVE;
    const TOKEN = process.env.PAGUELOFACIL_TOKEN;

    if (!CLAVE || !TOKEN) {
      return res.status(500).json({ error: 'PagueloFacil credentials not configured' });
    }

    // PagueloFacil API call to create payment link
    const response = await fetch('https://sandbox.paguelofacil.com/link/v2/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        amount: Number(amount).toFixed(2),
        taxAmount: '0.00',
        description: description || 'Pago ACCIOS',
        clientId: clientId || '',
        transactionIds: transactionIds || [],
        cclw: CLAVE,
        returnUrl: 'https://accios-core.vercel.app/#finance/checkout',
        cancelUrl: 'https://accios-core.vercel.app/#finance/checkout'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('PagueloFacil error:', errText);
      return res.status(500).json({ error: 'Error al generar link de pago' });
    }

    const data = await response.json();
    const paymentUrl = data.data?.url || data.url || '';

    res.status(200).json({
      paymentUrl: paymentUrl,
      url: paymentUrl,           // alias for compatibility
      link: paymentUrl,          // alias for compatibility
      linkId: data.data?.id || data.id || ''
    });
  } catch (err) {
    console.error('PagueloFacil error:', err);
    res.status(500).json({ error: 'Error al generar link de pago' });
  }
};
