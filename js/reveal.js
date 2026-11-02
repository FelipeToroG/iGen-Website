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
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  items.forEach((el) => io.observe(el));
}
