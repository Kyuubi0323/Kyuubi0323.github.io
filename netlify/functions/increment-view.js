// Netlify Function: records a page-view "tick" from the browser as a small
// event in Netlify Blobs. .github/workflows/flush-views.yml periodically
// pulls these events (via the flush-views function) and batches them into a
// single commit to _data/views.yml / _data/page_views.yml, instead of one
// commit per view.

const crypto = require('crypto');
const { getViewsStore, hashIp } = require('./lib/blobs-store');

const ALLOWED_ORIGIN = 'https://kyuubi0323.github.io';
const RATE_LIMIT_MS = 30 * 60 * 1000; // one counted view per IP+path per 30 min
const MAX_PATH_LENGTH = 200;

function getGeo(event) {
  try {
    const raw = event.headers['x-nf-geo'];
    if (!raw) return null;
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function getClientIp(event) {
  const direct = event.headers['x-nf-client-connection-ip'];
  if (direct) return direct;
  const forwarded = event.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
  if (origin && origin.toLowerCase() === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const headers = corsHeaders(origin);
  const originAllowed = origin.toLowerCase() === ALLOWED_ORIGIN;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: originAllowed ? 204 : 403, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST, OPTIONS' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  if (!originAllowed) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  // Just for curiosity — visible in Netlify's function logs, no pipeline needed.
  const geo = getGeo(event);
  console.log('increment-view: visitor', {
    country: geo?.country?.name,
    city: geo?.city,
    timezone: geo?.timezone
  });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const path = body.path;
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > MAX_PATH_LENGTH) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid path' }) };
  }

  try {
    const store = getViewsStore();
    const ipHash = hashIp(getClientIp(event));
    const rateLimitKey = `ratelimit:${ipHash}:${path}`;

    const lastSeen = await store.get(rateLimitKey);
    const now = Date.now();
    if (lastSeen && now - Number(lastSeen) < RATE_LIMIT_MS) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too Many Requests' }) };
    }

    await store.set(rateLimitKey, String(now));
    await store.setJSON(`views/${now}-${crypto.randomUUID()}`, { path, ts: now });

    return { statusCode: 204, headers, body: '' };
  } catch (err) {
    console.error('increment-view: unexpected error', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
