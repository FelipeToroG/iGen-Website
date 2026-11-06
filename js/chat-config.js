/**
 * Botpress settings for the "Ask Axis" pages (mybot.html and es/mybot.html). This is the ONLY
 * place the embed code lives: chat.js reads it and injects the two scripts, in order, on those
 * two pages. If Botpress regenerates the embed code (Workspace > bot > Webchat > Deploy Settings),
 * replace the two URLs below and nothing else. They are public by design: the config file holds
 * the bot and client ids that any visitor's browser downloads anyway.
 *
 * Why Botpress runs only on the mybot pages: it is the one third-party runtime on the site, so
 * every other page stays free of it (performance), and every page that initialises the webchat
 * can start a conversation against the free plan's monthly quota.
 *
 * Why "Embedded" mode: Deploy Settings has Chat interface = Embedded with the element id below,
 * so the webchat renders inside our panel (no floating bubble) and fits the page design.
 */
export const chat = {
  // Must equal the Element ID in Botpress > Webchat > Deploy Settings (Embedded).
  elementId: 'bp-embedded-webchat',

  // Loaded in this order: inject.js defines window.botpress; the second file is Axis's generated
  // config and calls window.botpress.init(). The `defer` in the pasted snippet only orders the
  // scripts when they sit in the HTML, which is why chat.js chains them explicitly.
  scripts: [
    'https://cdn.botpress.cloud/webchat/v3.7/inject.js',
    'https://files.bpcontent.cloud/2026/10/11/15/20261011155146-4VV9LFBN.js',
  ],

  // No `webchat:initialized` by then (blocked CDN, offline, bad snippet) → show the fallback.
  // Generous because the two scripts and the bot config load in series on a cold cache.
  watchdogMs: 12000,

  // How long a sample question waits for `webchat:ready` after open() before giving up.
  readyMs: 6000,
};
