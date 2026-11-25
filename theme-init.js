// Applies the stored/system theme before first paint (no flash), flags that JS
// is available for progressive-enhancement CSS, and opts into scroll reveals
// when the user allows motion. Loaded synchronously from the document head.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) { /* private mode */ }
  root.dataset.theme = stored === 'light' || stored === 'dark'
    ? stored
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    root.classList.add('motion-ok');
    // Fail-safe: if the reveal module fails to load, un-hide everything.
    setTimeout(function () {
      if (!root.classList.contains('reveal-ready')) root.classList.remove('motion-ok');
    }, 2500);
  }
})();
