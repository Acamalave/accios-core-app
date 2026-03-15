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

  try {
    const { transcript, participantName } = req.body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    const systemPrompt = `Eres un asistente profesional que genera minutas de reuniones para ACCIOS CORE, un ecosistema digital premium.

Genera un resumen ejecutivo de la siguiente videollamada. Incluye:

1. **Resumen General** (2-3 oraciones concisas)
2. **Puntos Clave Discutidos** (lista con bullets)
3. **Acuerdos y Compromisos** (si los hay)
4. **Próximos Pasos** (si se mencionaron)

Mantén un tono profesional pero accesible. Responde en español.
Si la transcripción es muy corta o no tiene contenido sustancial, indica que la reunión fue breve y resume lo poco que se dijo.

Participantes: SuperAdmin y ${participantName || 'Participante'}.`;

    const fullTranscript = transcript.map(l =>
      `[${new Date(l.timestamp).toLocaleTimeString('es-PA')}] ${l.text}`
    ).join('\n');

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Transcripción de la videollamada:\n\n${fullTranscript}`
        }]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('Claude API error:', JSON.stringify(data));
      return res.status(apiResponse.status).json({ error: data.error?.message || 'API error' });
    }

    const summary = data.content?.[0]?.text || '';
    res.status(200).json({ summary });
  } catch (err) {
    console.error('Summarize call error:', err.message || err);
    res.status(500).json({ error: err.message || 'Error al generar resumen' });
  }
};
