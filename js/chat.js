/**
 * Glue between the page and the Botpress Webchat. Botpress is the only third-party
 * runtime on the site and loads on this page only. Responsibilities:
 *  1. Watchdog: if the webchat never initializes (blocked CDN, bad snippet, offline),
 *     swap the "loading" state for a fallback with the phone number and contact link.
 *  2. Sample questions: clicking one opens the chat and sends it, once the bot is ready.
 * Everything here is read-only against window.botpress; the snippet owns init().
 */
import { chat } from './chat-config.js';

const loading = document.getElementById('bot-loading');
const fallback = document.getElementById('bot-fallback');
const buttons = document.querySelectorAll('.sample-questions button');

let ready = false;
let initialized = false;

function showFallback() {
  if (initialized) return;
  loading.hidden = true;
  fallback.hidden = false;
}

function wire() {
  const bp = window.botpress;
  if (!bp || typeof bp.on !== 'function') return false;
  bp.on('webchat:initialized', () => {
    initialized = true;
    loading.hidden = true;
    fallback.hidden = true;
    buttons.forEach((b) => (b.disabled = false));
  });
  bp.on('webchat:ready', () => { ready = true; });
  bp.on('error', (err) => { console.error('[Axis] Botpress error', err); showFallback(); });
  return true;
}

// inject.js is loaded with plain <script> tags in the page, so window.botpress may
// not exist yet when this module runs. Poll briefly rather than racing script order.
const started = Date.now();
const poll = setInterval(() => {
  if (wire()) clearInterval(poll);
  else if (Date.now() - started > chat.watchdogMs) { clearInterval(poll); showFallback(); }
}, 200);
setTimeout(showFallback, chat.watchdogMs);

buttons.forEach((btn) => {
  btn.disabled = true;
  btn.addEventListener('click', async () => {
    const bp = window.botpress;
    if (!bp) return;
    try {
      if (!ready) { await bp.open(); await new Promise((r) => bp.on('webchat:ready', r)); ready = true; }
      await bp.sendMessage(btn.textContent.trim());
      document.getElementById(chat.elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { console.error('[Axis] could not send sample question', e); }
  });
});
