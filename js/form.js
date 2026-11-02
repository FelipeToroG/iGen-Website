/**
 * Contact form enhancement. The form is a plain POST that works without this file;
 * here we add inline, accessible validation and a fetch submit so the visitor stays
 * on the page if something fails, then redirect to the thank-you page on success.
 *
 * Provider-specific knowledge is confined to this file and js/site-config.js.
 * Web3Forms: POST JSON or FormData to the endpoint with `access_key`; the response
 * is { success: boolean, message: string }. Honeypot field name: `botcheck`.
 */
import { site } from './site-config.js';

const form = document.getElementById('contact-form');
if (form) init(form);

function init(form) {
  const status = document.getElementById('form-status');
  const keyInput = form.querySelector('input[name="access_key"]');
  const redirect = form.querySelector('input[name="redirect"]')?.value || '../thank-you/';

  // Single source of truth for the key; the hidden input is filled from config so the
  // no-JS path and the JS path can never disagree.
  if (keyInput && site.form.accessKey) keyInput.value = site.form.accessKey;
  if (site.form.endpoint) form.action = site.form.endpoint;

  // We validate ourselves so errors are announced next to each field.
  form.setAttribute('novalidate', '');

  const rules = {
    name: (v) => (v.trim() ? '' : 'Please enter your name.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please enter a valid email address.'),
    phone: (v) => (!v.trim() || /^[\d\s()+.-]{7,}$/.test(v) ? '' : 'Please enter a valid phone number, or leave it blank.'),
    message: (v) => (v.trim().length >= 10 ? '' : 'Tell us a little about your shop (at least 10 characters).'),
  };

  const setError = (field, msg) => {
    const el = document.getElementById(`${field.id}-error`);
    if (el) el.textContent = msg;
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  const validate = () => {
    let first = null;
    for (const [name, rule] of Object.entries(rules)) {
      const field = form.elements[name];
      if (!field) continue;
      const msg = rule(field.value);
      setError(field, msg);
      if (msg && !first) first = field;
    }
    return first;
  };

  // Validate a field once the visitor leaves it; re-validate on input only after a first error.
  for (const name of Object.keys(rules)) {
    const field = form.elements[name];
    if (!field) continue;
    field.addEventListener('blur', () => setError(field, rules[name](field.value)));
    field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') setError(field, rules[name](field.value)); });
  }

  const show = (msg, isError) => {
    status.textContent = msg;
    status.hidden = false;
    status.classList.toggle('form__status--error', !!isError);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstInvalid = validate();
    if (firstInvalid) { firstInvalid.focus(); return; }

    if (!keyInput?.value) {
      // Not configured yet (no access key). Honest fallback instead of a silent failure.
      show(`The message form is not connected yet. Please call ${site.phoneDisplay} during office hours.`, true);
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    show('Sending…');
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        window.location.assign(redirect);
        return;
      }
      show(data.message || `Something went wrong. Please try again or call ${site.phoneDisplay}.`, true);
    } catch {
      show(`We couldn't send your message. Please check your connection or call ${site.phoneDisplay}.`, true);
    } finally {
      button.disabled = false;
    }
  });
}
