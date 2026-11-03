/**
 * Dark mode: follows the device setting until the visitor picks one with the toggle; the pick
 * is stored and wins from then on. A tiny inline script in <head> applies the stored pick
 * before first paint, so this module only has to wire the button and keep three things in
 * step with the active theme:
 *   1. data-theme on <html> (the CSS reads it),
 *   2. the two <meta name="theme-color"> tags (browser chrome colour),
 *   3. the header logo <picture> sources: the charcoal lockup vanishes on dark, so the
 *      all-gold version is served. Each <source> carries data-theme="light|dark" and
 *      data-media (its size condition); media is rewritten so a manual pick overrides
 *      prefers-color-scheme.
 */
const STORAGE_KEY = 'theme';
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function stored() {
  try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
}

function effective() {
  const s = stored();
  if (s === 'dark' || s === 'light') return s;
  return systemDark.matches ? 'dark' : 'light';
}

function render() {
  const theme = effective();
  const explicit = stored() === 'dark' || stored() === 'light';
  const root = document.documentElement;

  if (explicit) root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');

  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const forDark = (meta.getAttribute('data-theme') || 'light') === 'dark';
    meta.setAttribute('media', explicit ? ((forDark === (theme === 'dark')) ? 'all' : 'not all')
      : `(prefers-color-scheme: ${forDark ? 'dark' : 'light'})`);
  });

  document.querySelectorAll('picture source[data-theme]').forEach((source) => {
    const forDark = source.dataset.theme === 'dark';
    const size = source.dataset.media || '';
    let media;
    if (explicit) media = (forDark === (theme === 'dark')) ? (size || 'all') : 'not all';
    else media = [`(prefers-color-scheme: ${forDark ? 'dark' : 'light'})`, size].filter(Boolean).join(' and ');
    source.setAttribute('media', media);
  });

  document.querySelectorAll('.theme-toggle').forEach((button) => {
    const dark = theme === 'dark';
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.setAttribute('aria-label', dark ? button.dataset.labelLight : button.dataset.labelDark);
    button.title = button.getAttribute('aria-label');
  });
}

export function initTheme() {
  document.querySelectorAll('.theme-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const next = effective() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* private mode: still toggles for this page */ }
      if (!stored()) document.documentElement.setAttribute('data-theme', next);
      render();
    });
  });
  systemDark.addEventListener('change', render);
  render();
}
