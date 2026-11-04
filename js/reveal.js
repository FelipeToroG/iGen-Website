/**
 * Subtle scroll reveal for elements with .reveal. Respects prefers-reduced-motion
 * (nothing animates and nothing is hidden) and degrades to "just visible" when
 * IntersectionObserver is missing.
 */
export function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  // Anything already on screen is shown synchronously, so there is no first-frame flash even if
  // the observer's first callback lands a frame later.
  const vh = window.innerHeight || document.documentElement.clientHeight;
  items.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) el.classList.add('is-visible'); });
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  items.forEach((el) => { if (!el.classList.contains('is-visible')) io.observe(el); });
}
