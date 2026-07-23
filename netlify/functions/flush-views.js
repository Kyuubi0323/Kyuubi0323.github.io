// Netlify Function: called by .github/workflows/flush-views.yml. Tallies up
// every pending view event written by increment-view.js, deletes them, and
// returns the tally so the workflow can commit it to _data/views.yml and
// _data/page_views.yml in a single batched commit.

const { getViewsStore, safeCompare } = require('./lib/blobs-store');

const EVENT_PREFIX = 'views/';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const secret = process.env.FLUSH_SECRET;
  const provided = event.headers['x-flush-secret'];
  if (!secret || !provided || !safeCompare(provided, secret)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const store = getViewsStore(event);
    // list() with no `paginate` option auto-fetches every page (up to 1000
    // entries/page) internally — no manual cursor loop needed.
    const { blobs } = await store.list({ prefix: EVENT_PREFIX });
    const keys = blobs.map((blob) => blob.key);

    let total = 0;
    const pages = {};
    for (const key of keys) {
      const entry = await store.get(key, { type: 'json' });
      if (!entry || typeof entry.path !== 'string') continue;
      total += 1;
      pages[entry.path] = (pages[entry.path] || 0) + 1;
    }

    await Promise.all(keys.map((key) => store.delete(key)));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total, pages })
    };
  } catch (err) {
    console.error('flush-views: unexpected error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
