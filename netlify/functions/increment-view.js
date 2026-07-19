// Netlify Function: proxies a page-view "tick" from the browser into a
// repository_dispatch event, which .github/workflows/increment-views.yml
// picks up to bump _data/views.yml. Keeps the GitHub PAT server-side only.

const ALLOWED_ORIGIN = 'https://kyuubi0323.github.io';

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

  const githubPat = process.env.GITHUB_PAT;
  const githubRepo = process.env.GITHUB_REPO; // e.g. "Kyuubi0323/Kyuubi0323.github.io"

  if (!githubPat || !githubRepo) {
    console.error('increment-view: missing GITHUB_PAT or GITHUB_REPO env var');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${githubRepo}/dispatches`, {
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
