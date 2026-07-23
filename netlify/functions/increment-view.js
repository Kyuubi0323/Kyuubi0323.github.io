// Netlify Function: proxies a page-view "tick" from the browser into a
// repository_dispatch event, which .github/workflows/increment-views.yml
// picks up to bump _data/views.yml. Keeps the GitHub PAT server-side only.

const ALLOWED_ORIGIN = 'https://kyuubi0323.github.io';
// Not a secret — it's this repo's own public owner/name, only used to build
// the GitHub API URL. Kept as a constant (not an env var) so Netlify's
// build-time secret scanner doesn't flag it wherever it naturally shows up
// in the site's own pages (canonical links, "edit on GitHub", etc).
const GITHUB_REPO = 'Kyuubi0323/Kyuubi0323.github.io';

function getGeo(event) {
  try {
    const raw = event.headers['x-nf-geo'];
    if (!raw) return null;
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    return null;
  }
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

  const githubPat = process.env.GITHUB_PAT;

  if (!githubPat) {
    console.error('increment-view: missing GITHUB_PAT env var');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'view-counter-function'
      },
      body: JSON.stringify({ event_type: 'increment_view' })
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('increment-view: GitHub dispatch failed', res.status, detail);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Upstream dispatch failed' }) };
    }

    return { statusCode: 204, headers, body: '' };
  } catch (err) {
    console.error('increment-view: unexpected error', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
