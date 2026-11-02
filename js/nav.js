/**
 * Mobile navigation toggle. Progressive enhancement: without JS the list is simply
 * visible (see layout.css). With JS it is collapsed behind a 44px button, closes on
 * Escape and on outside click, and returns focus to the button when closed by keyboard.
 */
export function initNav() {
  const toggle = document.querySelector('.site-nav__toggle');
  const list = document.getElementById('site-nav-list');
  if (!toggle || !list) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    list.classList.toggle('is-open', open);
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!list.classList.contains('is-open')) return;
    if (!e.target.closest('.site-nav')) setOpen(false);
  });

  // Leaving the mobile breakpoint: reset so desktop never inherits a stale "open".
  const mq = window.matchMedia('(min-width: 900px)');
  mq.addEventListener('change', (e) => { if (e.matches) setOpen(false); });
}
