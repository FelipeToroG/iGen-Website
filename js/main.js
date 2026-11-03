/** Entry module for every page. Keep it tiny: page-specific modules load themselves. */
import { initNav } from './nav.js';
import { initReveal } from './reveal.js';
import { initTheme } from './theme.js';

initNav();
initReveal();
initTheme();

// Only pages with videos or galleries pay for those modules.
if (document.querySelector('[data-video]')) {
  import('./video.js').then((m) => m.initVideo());
}
if (document.querySelector('[data-gallery]')) {
  import('./gallery.js').then((m) => m.initGallery());
}
