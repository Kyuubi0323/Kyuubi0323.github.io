const crypto = require('crypto');
const { connectLambda, getStore } = require('@netlify/blobs');

// Must stay the site-wide default scope (no `deployID`) — a deploy-scoped
// store gets wiped on every deploy, which would silently zero all counters.
//
// These functions use the classic Lambda-compatible handler style
// (`exports.handler = async (event) => ...`), so Netlify does NOT
// auto-inject blobs context the way it does for the newer function format —
// `connectLambda(event)` must run first or getStore() throws.
function getViewsStore(event) {
  connectLambda(event);
  return getStore('views');
}

function hashIp(ip) {
  const secret = process.env.IP_HASH_SECRET || '';
  return crypto.createHmac('sha256', secret).update(ip).digest('hex');
}

// Hash both sides first so unequal-length inputs never hit
// timingSafeEqual's length check (which throws instead of returning false).
function safeCompare(a, b) {
  const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(digest(a), digest(b));
}

module.exports = { getViewsStore, hashIp, safeCompare };
