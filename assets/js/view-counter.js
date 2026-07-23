---
---
(function () {
  var ENDPOINT = '{{ site.view_counter.endpoint | default: "" }}';

  function getCurrentMonth() {
    var meta = document.querySelector('meta[name="current-month"]');
    return meta ? meta.getAttribute('content') : null;
  }

  function dedupKey(month, path) {
    return 'viewed_' + month + '_' + path;
  }

  function hasCounted(key) {
    try {
      return window.sessionStorage.getItem(key) === '1';
    } catch (e) {
      // sessionStorage unavailable (private mode, disabled storage, etc.)
      return true;
    }
  }

  function markCounted(key) {
    try {
      window.sessionStorage.setItem(key, '1');
    } catch (e) {
      // ignore — worst case we re-count later in the same session
    }
  }

  function recordView() {
    var month = getCurrentMonth();
    var path = window.location.pathname;
    if (!month || !ENDPOINT) return;

    var key = dedupKey(month, path);
    if (hasCounted(key)) return;

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path })
    })
      .then(function (res) {
        if (res.ok) markCounted(key);
      })
      .catch(function () {
        // network/CORS failure — fail silently, retry on next page load
      });
  }

  try {
    recordView();
  } catch (e) {
    // never let the counter break the page
  }
})();
