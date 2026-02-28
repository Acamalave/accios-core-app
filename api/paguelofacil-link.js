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

    // Convert return URL to hex as required by PagueloFacil
    const returnUrl = 'https://accios-core-acamalave.vercel.app/#finance/checkout';
    const returnUrlHex = Buffer.from(returnUrl, 'utf8').toString('hex');

    // Build form-encoded parameters for LinkDeamon.cfm
    const params = new URLSearchParams();
    params.append('CCLW', CLAVE);
    params.append('CMTN', Number(amount).toFixed(2));
    params.append('CDSC', description || 'Pago ACCIOS');
    params.append('RETURN_URL', returnUrlHex);
    params.append('EXPIRES_IN', '3600'); // 1 hour expiry

    console.log('PagueloFacil request:', params.toString().replace(CLAVE, '***'));

    // PagueloFacil API call to create payment link via LinkDeamon
    const response = await fetch('https://secure.paguelofacil.com/LinkDeamon.cfm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: params.toString()
    });

    const responseText = await response.text();
    console.log('PagueloFacil response status:', response.status);
    console.log('PagueloFacil response:', responseText);

    if (!response.ok) {
      return res.status(500).json({
        error: 'Error al generar link de pago',
        detail: `PagueloFacil responded ${response.status}: ${responseText.substring(0, 500)}`
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({
        error: 'Respuesta invalida de PagueloFacil',
        detail: responseText.substring(0, 500)
      });
    }

    // Check PagueloFacil success flag
    if (!data.success && data.headerStatus?.code !== 200) {
      return res.status(500).json({
        error: 'PagueloFacil rechazó la solicitud',
        detail: data.message || data.headerStatus?.description || JSON.stringify(data)
      });
    }

    const paymentUrl = data.data?.url || data.url || '';

    res.status(200).json({
      paymentUrl: paymentUrl,
      url: paymentUrl,
      link: paymentUrl,
      linkId: data.data?.id || data.id || '',
      raw: data
    });
  } catch (err) {
    console.error('PagueloFacil error:', err);
    res.status(500).json({
      error: 'Error al generar link de pago',
      detail: err.message
    });
  }
};
