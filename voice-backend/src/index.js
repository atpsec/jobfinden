function headers(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS || 'https://atpsec.github.io')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const result = { 'Content-Type': 'application/json', Vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    result['Access-Control-Allow-Origin'] = origin;
    result['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS';
    result['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return result;
}

function json(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(request, env) });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(request, env) });
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json(request, env, { ok: true, service: 'jobfinden-voice-worker' });
    }
    if (request.method !== 'POST' || url.pathname !== '/realtime/session') {
      return json(request, env, { error: 'not_found' }, 404);
    }
    if (!env.OPENAI_API_KEY) return json(request, env, { error: 'voice_worker_not_configured' }, 503);

    let body = {};
    try { body = await request.json(); } catch (_) {}
    const question = typeof body.question === 'string' ? body.question.slice(0, 1000) : '';
    const instructions = [
      'Du bist ein ruhiger deutschsprachiger Vorstellungsgespräch-Coach für eine türkischsprachige lernende Person.',
      'Erkläre technische Schritte auf einfachem Türkisch, stelle die Frage auf Deutsch und gib kurze, freundliche Korrekturen.',
      'Frage nur nach dem aktuellen Lernschritt und gib keine langen Vorträge.',
      question ? `Aktuelle Frage: ${question}` : '',
    ].filter(Boolean).join(' ');

    try {
      const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: { type: 'realtime', model: 'gpt-realtime', instructions } }),
      });
      const result = await upstream.json().catch(() => ({}));
      return json(request, env, result, upstream.status);
    } catch (_) {
      return json(request, env, { error: 'openai_unreachable' }, 502);
    }
  },
};
