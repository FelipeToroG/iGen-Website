/**
 * Glue between the Ask Axis page and the Botpress Webchat (settings in chat-config.js).
 *
 *  1. Loads the two Botpress scripts in order, here rather than as <script> tags in the HTML, so
 *     one file serves both language pages and nothing Botpress-related exists on any other page.
 *  2. Readiness without a race: listeners are attached to window.botpress as soon as inject.js has
 *     loaded and BEFORE the config script (which calls init) is requested, so `webchat:initialized`
 *     cannot fire unobserved. Two more signals count as initialised in case the event is ever
 *     missed: an `initialized` flag on window.botpress (if Botpress exposes one) and the first
 *     element rendered inside the embed container. The fallback therefore can never cover a chat
 *     that is actually working.
 *  3. Fallback (phone + contact link) when a script fails to load, Botpress reports an error
 *     before initialising, or nothing has happened after the watchdog.
 *  4. Sample questions: disabled until initialised; a click sends the button's own text, so the
 *     Spanish page sends Spanish without any configuration.
 */
import { chat } from './chat-config.js';

const container = document.getElementById(chat.elementId);
const frame = container?.closest('.bot-panel__frame');
const loading = document.getElementById('bot-loading');
const fallback = document.getElementById('bot-fallback');
const buttons = [...document.querySelectorAll('.sample-questions button')];

let initialized = false;
let ready = false;
let watchdog = 0;
let observer = null;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The chat is up: clear every "not yet" state. Safe to call more than once. */
function markInitialized() {
  if (initialized) return;
  initialized = true;
  clearTimeout(watchdog);
  observer?.disconnect();
  if (loading) loading.hidden = true;
  if (fallback) fallback.hidden = true;
  frame?.setAttribute('aria-busy', 'false');
  buttons.forEach((b) => { b.disabled = false; });
  // Embedded mode paints the chat straight away, but `webchat:ready` (which sendMessage needs)
  // is documented to fire only after the first open(). Calling it here has no visible effect
  // and lets the first sample question send without waiting.
  window.botpress?.open?.();
}

/** Never after a successful init: a late error must not hide a working chat. */
function showFallback(reason) {
  if (initialized) return;
  clearTimeout(watchdog);
  observer?.disconnect();
  console.warn('[Axis] webchat unavailable:', reason);
  if (loading) loading.hidden = true;
  if (fallback) fallback.hidden = false;
  frame?.setAttribute('aria-busy', 'false');
}

/**
 * Append a classic script and resolve when it has run. Injected scripts are async by default and
 * `defer` has no effect on them, so order comes from awaiting each one before adding the next.
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => resolve(src);
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function subscribe(bp) {
  bp.on('webchat:initialized', markInitialized);
  bp.on('webchat:ready', () => { ready = true; markInitialized(); });
  // Errors before init mean the bot cannot start (bad ids, quota, network). After init the
  // webchat shows its own error screen and the fallback stays out of the way.
  bp.on('error', (err) => showFallback(err?.message || err));
}

function watchContainer() {
  if (!container || typeof MutationObserver !== 'function') return;
  observer = new MutationObserver(() => {
    if (container.firstElementChild) markInitialized();
  });
  observer.observe(container, { childList: true });
  if (container.firstElementChild) markInitialized();
}

async function boot() {
  if (!container) return;
  buttons.forEach((b) => { b.disabled = true; });
  frame?.setAttribute('aria-busy', 'true');
  watchdog = setTimeout(() => showFallback(`no webchat:initialized within ${chat.watchdogMs} ms`), chat.watchdogMs);

  const [inject, config] = chat.scripts;
  try {
    await loadScript(inject);
    const bp = window.botpress;
    if (!bp || typeof bp.on !== 'function') throw new Error('inject.js loaded but window.botpress is missing');
    subscribe(bp);          // before init() can possibly run
    watchContainer();
    await loadScript(config);
    if (bp.initialized === true) markInitialized();
  } catch (e) {
    showFallback(e.message);
  }
}

/** Resolve on `webchat:ready`, or reject after chat.readyMs so a click never hangs silently. */
function whenReady(bp) {
  if (ready) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { off?.(); reject(new Error('webchat:ready did not fire')); }, chat.readyMs);
    const off = bp.on('webchat:ready', () => { clearTimeout(timer); ready = true; resolve(); });
  });
}

buttons.forEach((btn) => {
  btn.addEventListener('click', async () => {
    const bp = window.botpress;
    if (!bp || !initialized) return;
    const text = btn.textContent.trim();
    btn.disabled = true;                       // one send per click
    try {
      // The embedded window is already open, but open() is the documented trigger for
      // `webchat:ready`, which sendMessage() needs the first time.
      if (!ready) { bp.open?.(); await whenReady(bp); }
      await bp.sendMessage(text);
      frame?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
    } catch (e) {
      console.warn('[Axis] could not send the sample question:', e.message);
    } finally {
      btn.disabled = false;
    }
  });
});

boot();
