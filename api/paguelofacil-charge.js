module.exports = async function handler(req, res) {
  // CORS headers for Capacitor native app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { amount, description, email, phone, cardNumber, expMonth, expYear, cvv, firstName, lastName, cardType } = req.body;

    const CLAVE = process.env.PAGUELOFACIL_CLAVE;
    const TOKEN = process.env.PAGUELOFACIL_TOKEN;

    if (!CLAVE || !TOKEN) {
      return res.status(500).json({ success: false, message: 'Credenciales no configuradas' });
    }

    if (!cardNumber || !expMonth || !expYear || !cvv) {
      return res.status(400).json({ success: false, message: 'Datos de tarjeta incompletos' });
    }

    const body = {
      cclw: CLAVE,
      amount: Number(amount),
      taxAmount: 0.00,
      email: email || 'cobro@accios.app',
      phone: phone || '68204698',
      concept: description || 'Cobro ACCIOS',
      description: description || 'Cobro ACCIOS',
      lang: 'ES',
      cardInformation: {
        cardNumber: String(cardNumber).replace(/\s/g, ''),
        expMonth: String(expMonth),
        expYear: String(expYear),
        cvv: String(cvv),
        firstName: firstName || 'Cliente',
        lastName: lastName || 'ACCIOS',
        cardType: (cardType || 'VISA').toUpperCase()
      }
    };

    console.log('PagueloFacil AUTH_CAPTURE:', JSON.stringify({
      ...body,
      cardInformation: { ...body.cardInformation, cardNumber: '****', cvv: '***' }
    }));

    // Direct charge via PagueloFacil REST API (no Bearer prefix)
    const response = await fetch('https://secure.paguelofacil.com/rest/processTx/AUTH_CAPTURE', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKEN
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    console.log('PagueloFacil charge response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: 'Respuesta invalida del procesador',
        detail: responseText.substring(0, 500)
      });
    }

    if (data.success && (data.headerStatus?.code === 200 || data.headerStatus?.code === 201)) {
      return res.status(200).json({
        success: true,
        message: data.message || 'Transaccion exitosa',
        codOper: data.data?.codOper || '',
        displayNum: data.data?.displayNum || '',
        totalPay: data.data?.totalPay || '',
        cardType: data.data?.cardType || '',
        date: data.data?.date || '',
      });
    } else {
      return res.status(200).json({
        success: false,
        message: data.message || data.headerStatus?.description || 'Transaccion denegada',
        code: data.headerStatus?.code || 0,
      });
    }
  } catch (err) {
    console.error('PagueloFacil charge error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al procesar cobro',
      detail: err.message
    });
  }
};
