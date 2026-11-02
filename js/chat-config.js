/**
 * Settings for the "Ask Axis" page (mybot.html). The Botpress snippet itself is
 * pasted into mybot.html at the marked slot; this file only describes how the page
 * should treat it. Botpress Deploy Settings must be set to Chat interface: Embedded,
 * with the element id below, so the chat renders inside the page panel instead of
 * as a floating bubble.
 */
export const chat = {
  // Must match the Element ID in Botpress > Webchat > Deploy Settings (Embedded).
  elementId: 'bp-embedded-webchat',

  // If Botpress has not reported `webchat:initialized` by then, show the fallback
  // (phone + contact form). Generous because the CDN script and the bot config load in series.
  watchdogMs: 12000,

  // Sample questions a visitor can click. Sent to the bot once it is ready.
  sampleQuestions: [
    'What does iGEN do?',
    'How does the first week work?',
    'Can I hire a part-time CAD technician?',
    'What are the benefits of a dedicated remote tech?',
    'What are your hours?',
    'How do I get started?',
  ],
};
