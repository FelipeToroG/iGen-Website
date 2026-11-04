/**
 * Dark mode: follows the device setting until the visitor picks one with the toggle; the pick
 * is kept in memory for this page and stored when storage allows (private mode may refuse), so
 * the button works either way. A tiny inline script in <head> applies the stored pick
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

// The visitor's pick for this page view; null = follow the device.
let choice = ['dark', 'light'].includes(stored()) ? stored() : null;

function effective() {
  return choice || (systemDark.matches ? 'dark' : 'light');
}

function render() {
  const theme = effective();
  const explicit = choice !== null;
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

  // A toggle button with a fixed label ("Dark mode"); aria-pressed carries the state.
  document.querySelectorAll('.theme-toggle').forEach((button) => {
    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  });
}

export function initTheme() {
  document.querySelectorAll('.theme-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      choice = effective() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) { /* storage blocked: the pick still holds for this page */ }
      render();
    });
  });
  systemDark.addEventListener('change', render);
  render();
}
