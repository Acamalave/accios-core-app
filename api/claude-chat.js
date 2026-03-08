module.exports = async function handler(req, res) {
  // Explicit CORS headers for Capacitor native app (origin: https://localhost)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, systemPrompt } = req.body;

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt || 'Eres un asistente útil. Responde en español.',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('Claude API error:', JSON.stringify(data));
      return res.status(apiResponse.status).json({ error: data.error?.message || 'API error' });
    }

    const content = data.content?.[0]?.text || '';
    res.status(200).json({ content });
  } catch (err) {
    console.error('Claude API error:', err.message || err);
    res.status(500).json({ error: err.message || 'Error al comunicarse con Claude' });
  }
};
