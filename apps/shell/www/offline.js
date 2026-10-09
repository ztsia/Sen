// Try again goes back to the site this build loads, and nowhere else: only an http(s) address the
// shell passed in, never one typed into the page. The shell itself refuses any other origin.
(function () {
  var app = new URLSearchParams(location.search).get('app');
  var ok;
  try {
    var u = new URL(app || '');
    ok = u.protocol === 'https:' || (u.protocol === 'http:' && u.hostname === 'localhost');
  } catch {
    ok = false;
  }
  var retry = document.getElementById('retry');
  if (!ok) {
    document.getElementById('title').textContent = 'This build has no site yet';
    document.getElementById('body').textContent =
      'Its address is set once Sen is published on Vercel. Install a newer build from the link.';
    retry.hidden = true;
    return;
  }
  retry.addEventListener('click', function () {
    location.replace(app);
  });
  // Back online: go straight back, without waiting for a tap.
  window.addEventListener('online', function () {
    location.replace(app);
  });
})();
