const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

// Must stay the site-wide default scope (no `deployID`) — a deploy-scoped
// store gets wiped on every deploy, which would silently zero all counters.
function getViewsStore() {
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
