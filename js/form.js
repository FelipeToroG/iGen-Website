/**
 * Contact form enhancement. The form is a plain POST that works without this file;
 * here we add inline, accessible validation and a fetch submit so the visitor stays
 * on the page if something fails, then redirect to the thank-you page on success.
 *
 * Provider-specific knowledge is confined to this file and partials/form-hidden.html (the
 * access key and redirect). Web3Forms: POST FormData to the form's action with `access_key`;
 * the response is { success: boolean, message: string }. Honeypot field name: `botcheck`.
 */
import { site } from './site-config.js';

const form = document.getElementById('contact-form');
if (form) init(form);

function init(form) {
  const status = document.getElementById('form-status');
  // The access key lives in the HTML (partials/form-hidden.html), so the no-JS POST and this
  // fetch path can never disagree. An empty value means the form is not connected yet.
  const keyInput = form.querySelector('input[name="access_key"]');
  const redirect = form.querySelector('input[name="redirect"]')?.value || '../thank-you/';

  // We validate ourselves so errors are announced next to each field.
  form.setAttribute('novalidate', '');

  // Copy per language; the page says which with data-lang on the form (default English).
  const T = {
    en: {
      name: 'Please enter your name.',
      email: 'Please enter a valid email address.',
      phone: 'Please enter a valid phone number, or leave it blank.',
      message: 'Tell us a little about your shop (at least 10 characters).',
      notConfigured: (phone) => `The message form is not connected yet. Please call ${phone} during office hours.`,
      sending: 'Sending…',
      failed: (phone) => `Something went wrong. Please try again or call ${phone}.`,
      offline: (phone) => `We couldn't send your message. Please check your connection or call ${phone}.`,
    },
    es: {
      name: 'Por favor escriba su nombre.',
      email: 'Por favor escriba un correo electrónico válido.',
      phone: 'Por favor escriba un teléfono válido, o déjelo en blanco.',
      message: 'Cuéntenos un poco sobre su taller (al menos 10 caracteres).',
      notConfigured: (phone) => `El formulario aún no está conectado. Por favor llame al ${phone} en horario de oficina.`,
      sending: 'Enviando…',
      failed: (phone) => `Algo salió mal. Intente de nuevo o llame al ${phone}.`,
      offline: (phone) => `No pudimos enviar su mensaje. Revise su conexión o llame al ${phone}.`,
    },
  };
  const t = T[form.dataset.lang] || T.en;
  const rules = {
    name: (v) => (v.trim() ? '' : t.name),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : t.email),
    phone: (v) => (!v.trim() || /^[\d\s()+.-]{7,}$/.test(v) ? '' : t.phone),
    message: (v) => (v.trim().length >= 10 ? '' : t.message),
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
      show(t.notConfigured(site.phoneDisplay), true);
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    show(t.sending);
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
      show(data.message || t.failed(site.phoneDisplay), true);
    } catch {
      show(t.offline(site.phoneDisplay), true);
    } finally {
      button.disabled = false;
    }
  });
}
