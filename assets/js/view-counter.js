---
---
(function () {
  var ENDPOINT = '{{ site.view_counter.endpoint | default: "" }}';

  function getCurrentMonth() {
    var meta = document.querySelector('meta[name="current-month"]');
    return meta ? meta.getAttribute('content') : null;
  }

  function hasCounted(month) {
    try {
      return window.localStorage.getItem('viewed_' + month) === '1';
    } catch (e) {
      // localStorage unavailable (private mode, disabled storage, etc.)
      return true;
    }
  }

  function markCounted(month) {
    try {
      window.localStorage.setItem('viewed_' + month, '1');
    } catch (e) {
      // ignore — worst case we re-count next load
    }
  }

  function recordView() {
    var month = getCurrentMonth();
    if (!month || !ENDPOINT) return;
    if (hasCounted(month)) return;

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: month })
    })
      .then(function (res) {
        if (res.ok) markCounted(month);
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
