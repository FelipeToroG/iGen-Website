/** Entry module for every page. Keep it tiny: page-specific modules load themselves. */
import { initNav } from './nav.js';
import { initReveal } from './reveal.js';

initNav();
initReveal();
