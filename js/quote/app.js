/**
 * Interactive quote page. Reads ?q=<slug>, loads data/quotes/<slug>.json (and data/wages.json for the
 * state name and source link), builds the controls and re-renders every figure on each input.
 * Nothing the visitor changes is stored or sent anywhere. The maths lives in calc.js.
 */
import {
  FT_MULT, PT_MULT, FT_HOURS, PT_HOURS, clampWage, option, allOptions, optionIndex,
  perMonth, perYear, per5y, money, validateQuote,
} from './calc.js';

const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
const LOCALE = lang === 'es' ? 'es-US' : 'en-US';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

// Only the strings the script composes at runtime; everything static is in the HTML.
const STR = {
  en: {
    ptLabel: 'Part-time · 1 tech',
    ftLabel: (n) => `Full-time · ${n} tech${n > 1 ? 's' : ''}`,
    perTech: (rate, n) => `${money(rate)} per technician × ${n}`,
    ptPer: 'One technician, 4 h/day',
    houseNote: (w, h, m, n) => `$${w.toFixed(2)}/h × ${h} h × ${m.toFixed(2)}${n > 1 ? ` × ${n} techs` : ''} × 52 weeks`,
    saves: (client) => `What ${client} saves`,
    savesNeg: 'Compared with wages and taxes alone',
    note: 'Compared with employing the same number of in-house CNC programmers at the wage selected above. Recruiting, training, equipment and supervision time are not counted, so actual savings are likely higher.',
    noteNeg: (w, extra) => `At $${w.toFixed(2)}/h, this option costs ${money(extra)} more per week than an in-house wage plus payroll taxes. It also covers hiring, training, a supervisor and cover for absences, which that comparison leaves out.`,
    keep: 'You keep', keepNeg: 'Difference', aYear: 'a year',
    sub: (m, y5) => `${money(m)} every month · ${money(y5)} over 5 years`,
    subNeg: (w) => `Against wages plus payroll taxes only, at $${w.toFixed(2)}/h. See the note below.`,
    hlHouse: (n, w, mode) => mode === 'pt' ? `1 part-time CNC programmer at $${w.toFixed(2)}/h, wages and taxes` : `${n} in-house CNC programmer${n > 1 ? 's' : ''} at $${w.toFixed(2)}/h, fully loaded`,
    hlIgen: (n, mode) => mode === 'pt' ? '1 dedicated technician, 4 h/day' : `${n} dedicated technician${n > 1 ? 's' : ''}, full-time`,
    barScn: (mode, n) => mode === 'pt' ? 'Part-time, 1 tech' : `Full-time, ${n} tech${n > 1 ? 's' : ''}`,
    barSave: 'saved a month', barSaveNeg: 'more a month',
    preset: (p) => `$${p.hourly.toFixed(2)}/h · ${p.label}`,
    expired: 'This quote has expired',
    date: (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  },
  es: {
    ptLabel: 'Medio tiempo · 1 técnico',
    ftLabel: (n) => `Tiempo completo · ${n} técnico${n > 1 ? 's' : ''}`,
    perTech: (rate, n) => `${money(rate, 'es-US')} por técnico × ${n}`,
    ptPer: 'Un técnico, 4 h al día',
    houseNote: (w, h, m, n) => `$${w.toFixed(2)}/h × ${h} h × ${m.toFixed(2)}${n > 1 ? ` × ${n} técnicos` : ''} × 52 semanas`,
    saves: (client) => `Lo que ${client} ahorra`,
    savesNeg: 'Comparado solo con salario e impuestos',
    note: 'Comparado con emplear la misma cantidad de programadores CNC internos al salario seleccionado arriba. No se cuentan reclutamiento, capacitación, equipos ni tiempo de supervisión, así que el ahorro real probablemente sea mayor.',
    noteNeg: (w, extra) => `A $${w.toFixed(2)}/h, esta opción cuesta ${money(extra, 'es-US')} más por semana que un salario interno más impuestos de nómina. También cubre contratación, capacitación, un supervisor y reemplazo por ausencias, que esa comparación no incluye.`,
    keep: 'Usted conserva', keepNeg: 'Diferencia', aYear: 'al año',
    sub: (m, y5) => `${money(m, 'es-US')} cada mes · ${money(y5, 'es-US')} en 5 años`,
    subNeg: (w) => `Frente a salario más impuestos de nómina únicamente, a $${w.toFixed(2)}/h. Vea la nota más abajo.`,
    hlHouse: (n, w, mode) => mode === 'pt' ? `1 programador CNC de medio tiempo a $${w.toFixed(2)}/h, salario e impuestos` : `${n} programador${n > 1 ? 'es' : ''} CNC interno${n > 1 ? 's' : ''} a $${w.toFixed(2)}/h, costo total`,
    hlIgen: (n, mode) => mode === 'pt' ? '1 técnico dedicado, 4 h al día' : `${n} técnico${n > 1 ? 's' : ''} dedicado${n > 1 ? 's' : ''}, tiempo completo`,
    barScn: (mode, n) => mode === 'pt' ? 'Medio tiempo, 1 técnico' : `Tiempo completo, ${n} técnico${n > 1 ? 's' : ''}`,
    barSave: 'de ahorro al mes', barSaveNeg: 'más al mes',
    preset: (p) => `$${p.hourly.toFixed(2)}/h · ${p.label}`,
    expired: 'Esta cotización venció',
    date: (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' }),
  },
}[lang];

const fmt = (n) => money(n, LOCALE);

/* ---------- loading ---------- */

function slug() {
  const q = new URLSearchParams(location.search).get('q') || '';
  return /^[a-z0-9-]{1,40}$/.test(q) ? q : '';
}

async function load() {
  const s = slug();
  if (!s) return inactive();
  // Relative to the page folder (quote/ or es/quote/); the site has no fixed root.
  const base = lang === 'es' ? '../../data/' : '../data/';
  try {
    const [qRes, wRes] = await Promise.all([fetch(`${base}quotes/${s}.json`), fetch(`${base}wages.json`)]);
    if (!qRes.ok) return inactive();
    const quote = await qRes.json();
    const wages = wRes.ok ? await wRes.json() : { states: {} };
    if (validateQuote(quote).length) return inactive();
    if (Date.parse(quote.validUntil + 'T23:59:59') < Date.now()) return inactive(STR.expired);
    start(quote, wages);
  } catch (e) {
    inactive();
  }
}

function inactive(reason) {
  const box = $('q-inactive');
  if (reason) box.querySelector('h1').textContent = reason;
  box.hidden = false;
  $('q-page').hidden = true;
}

/* ---------- setup ---------- */

let quote, state;

function start(q, wages) {
  quote = q;
  state = (wages.states && wages.states[q.state]) || { name: q.state };
  document.title = document.title.replace('{client}', q.client);

  $('q-client').textContent = q.client;
  $('q-id').textContent = q.id;
  $('q-state').textContent = state.name;
  $('q-issued').textContent = STR.date(q.issued);
  $('q-until').textContent = STR.date(q.validUntil);
  $('h-save').dataset.label = STR.saves(q.client);

  // Wage presets from the quote file; "Your wage" is first and selected unless the file says otherwise.
  const presets = q.wages.presets.map((p, i) => `
    <input type="radio" name="wage" id="w-p${i}" value="${Number(p.hourly)}"${q.wages.default === i ? ' checked' : ''}>
    <label for="w-p${i}">${STR.preset(p)}</label>`).join('');
  $('wage-presets').insertAdjacentHTML('beforeend', presets);
  if (q.wages.default !== 'custom' && Number.isInteger(q.wages.default)) $('w-own').checked = false;
  const own = $('own-wage');
  own.value = Number(q.wages.custom).toFixed(2);
  own.placeholder = Number(q.wages.custom).toFixed(2);

  // "How the numbers work", item 1: the figures and link come from the data, not the HTML.
  $('hn-custom').textContent = `$${Number(q.wages.custom).toFixed(2)}/h`;
  document.querySelectorAll('.hn-state').forEach((el) => { el.textContent = state.name; });
  const p25 = q.wages.presets[0], med = q.wages.presets[1];
  if (p25) $('hn-p25').textContent = `$${Number(p25.hourly).toFixed(2)}/h`;
  if (med) $('hn-med').textContent = `$${Number(med.hourly).toFixed(2)}/h`;
  if (state.url) $('hn-link').href = state.url;

  // Defaults from the file, then wire everything.
  const d = q.defaults || {};
  if (d.mode === 'pt') $('mode-pt').checked = true;
  if ([1, 2, 3].includes(Number(d.techs))) $(`t${Number(d.techs)}`).checked = true;

  document.querySelectorAll('#q-page input').forEach((el) => el.addEventListener('input', render));
  // Typing a wage implies the client wants to use it, so select that option for them.
  own.addEventListener('focus', () => { $('w-own').checked = true; render(); });
  own.addEventListener('blur', () => { own.value = wage().toFixed(2); render(); });

  // The language switch must keep the quote.
  document.querySelectorAll('.site-nav__lang').forEach((a) => { a.href = a.getAttribute('href').split('?')[0] + location.search; });

  $('q-inactive').hidden = true;
  render();
  watchBar();
}

function wage() {
  const pick = document.querySelector('input[name="wage"]:checked');
  if (pick && pick.value !== 'own') return clampWage(pick.value, Number(quote.wages.custom));
  return clampWage($('own-wage').value, Number(quote.wages.custom));
}

/* ---------- render ---------- */

let prev = {};   // last value per id, for the count-up
let anim = {};   // running animation per id, so a new value cancels the old tween

function setMoney(id, value) {
  const el = $(id);
  const from = prev[id] ?? value;
  prev[id] = value;
  if (anim[id]) { cancelAnimationFrame(anim[id].raf); clearTimeout(anim[id].timer); delete anim[id]; }
  if (reduceMotion || from === value || Math.abs(from - value) < 1) { el.textContent = fmt(value); return; }
  const t0 = performance.now(), dur = 550;
  const done = () => { el.textContent = fmt(value); delete anim[id]; };
  const step = (t) => {
    // Frame timestamps can precede t0 by a few ms; clamp so the value never overshoots backwards.
    const k = Math.max(0, Math.min(1, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
    if (k >= 1) { done(); return; }
    el.textContent = fmt(from + (value - from) * e);
    anim[id].raf = requestAnimationFrame(step);
  };
  // Background tabs get no frames; the timer lands the final value anyway.
  anim[id] = { raf: requestAnimationFrame(step), timer: setTimeout(() => { if (anim[id]) { cancelAnimationFrame(anim[id].raf); done(); } }, dur + 80) };
}

function render() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  // Part-time is one technician only: lock the headcount control rather than hide it, so the
  // layout does not jump and the reason stays visible.
  document.querySelectorAll('input[name="techs"]').forEach((r) => { r.disabled = mode === 'pt'; });
  $('techs-set').classList.toggle('is-locked', mode === 'pt');
  if (mode === 'pt') $('t1').checked = true;
  const techs = Number(document.querySelector('input[name="techs"]:checked').value);
  const w = wage();
  const o = option(quote.pricing, mode, techs, w);
  const neg = o.save < 0;
  const mult = mode === 'pt' ? PT_MULT : FT_MULT;

  // Headline card: the in-house figure is the anchor; iGen sits next to it; the bar shows the ratio.
  setMoney('hl-house', perYear(o.house));
  setMoney('hl-igen', perYear(o.igen));
  $('hl-house-note').textContent = STR.hlHouse(o.techs, w, mode);
  $('hl-igen-note').textContent = STR.hlIgen(o.techs, mode);
  const ratio = Math.max(0.04, Math.min(1, o.igen / Math.max(o.igen, o.house)));
  $('hl-bar-igen').style.width = `${(ratio * 100).toFixed(1)}%`;
  $('headline').classList.toggle('neg', neg);
  $('hl-keep-label').textContent = neg ? STR.keepNeg : STR.keep;
  setMoney('hl-keep', perYear(Math.abs(o.save)));
  $('hl-sub').textContent = neg ? STR.subNeg(w) : STR.sub(perMonth(o.save), per5y(o.save));

  // Price cells.
  setMoney('p-week', o.igen);
  $('p-per').textContent = mode === 'pt' ? STR.ptPer : STR.perTech(o.rate, o.techs);
  setMoney('p-month', perMonth(o.igen));
  setMoney('p-year', perYear(o.igen));
  setMoney('h-year', perYear(o.house));
  $('h-note').textContent = STR.houseNote(w, mode === 'pt' ? PT_HOURS : FT_HOURS, mult, o.techs);

  // Savings panel; a negative result is shown honestly, with the copy saying what the extra buys.
  $('save').classList.toggle('neg', neg);
  $('h-save').textContent = neg ? STR.savesNeg : STR.saves(quote.client);
  setMoney('s-month', perMonth(o.save));
  setMoney('s-year', perYear(o.save));
  setMoney('s-5y', per5y(o.save));
  $('s-note').textContent = neg ? STR.noteNeg(w, -o.save) : STR.note;

  // Table and chart share one list so they cannot disagree.
  const all = allOptions(quote.pricing, w);
  const sel = optionIndex(mode, techs);
  const label = (r) => (r.mode === 'pt' ? STR.ptLabel : STR.ftLabel(r.techs));
  $('opts').innerHTML = all.map((r, i) => {
    const c = r.save < 0 ? 'neg' : 'pos';
    return `<tr${i === sel ? ' class="sel" aria-current="true"' : ''}><th scope="row">${label(r)}</th><td>${fmt(r.rate)}</td><td>${fmt(r.igen)}</td><td>${fmt(r.house)}</td>` +
      `<td class="${c}">${fmt(perMonth(r.save))}</td><td class="${c}">${fmt(perYear(r.save))}</td><td class="${c}">${fmt(per5y(r.save))}</td></tr>`;
  }).join('');
  drawChart(all, sel, label);

  // Sticky bar.
  $('qbar-scn').textContent = STR.barScn(mode, o.techs);
  $('qbar-save').textContent = fmt(perMonth(Math.abs(o.save)));
  $('qbar-save-label').textContent = neg ? STR.barSaveNeg : STR.barSave;
  $('qbar').classList.toggle('neg', neg);
}

/* Hand-drawn SVG keeps the page dependency-free; one linear scale drives bars, ticks and labels. */
function drawChart(rows, sel, label) {
  const W = 720, H = 300, L = 170, R = 24, T = 10, B = 34;
  const max = Math.max(...rows.map((r) => Math.max(r.igen, r.house) * 52));
  const step = max > 200000 ? 50000 : max > 80000 ? 20000 : 10000;
  const top = Math.ceil(max / step) * step;
  const x = (v) => L + (v / top) * (W - L - R);
  const band = (H - T - B) / rows.length, bh = Math.min(18, band / 3);
  let s = '';
  for (let v = 0; v <= top; v += step) {
    s += `<line x1="${x(v)}" x2="${x(v)}" y1="${T}" y2="${H - B}" class="chart__grid"/>`;
    s += `<text x="${x(v)}" y="${H - B + 18}" text-anchor="middle" class="chart__tick">${v === 0 ? '$0' : '$' + v / 1000 + 'k'}</text>`;
  }
  rows.forEach((r, i) => {
    const y = T + i * band + band / 2;
    const cls = i === sel ? ' chart__lab--sel' : '';
    s += `<text class="chart__lab${cls}" x="${L - 12}" y="${y + 4}" text-anchor="end">${label(r)}</text>`;
    s += `<rect class="chart__bar chart__bar--igen" x="${L}" y="${y - bh - 2}" width="${Math.max(0, x(r.igen * 52) - L)}" height="${bh}" rx="4"/>`;
    s += `<rect class="chart__bar chart__bar--house" x="${L}" y="${y + 2}" width="${Math.max(0, x(r.house * 52) - L)}" height="${bh}" rx="4"/>`;
    if (i === sel) s += `<rect class="chart__sel" x="${L - 160}" y="${y - band / 2 + 2}" width="${W - L - R + 160}" height="${band - 4}" rx="8"/>`;
  });
  $('chart').innerHTML = s;
}

/* The sticky bar appears once the headline card has scrolled away, and hides near the CTA. */
function watchBar() {
  const bar = $('qbar');
  if (!('IntersectionObserver' in window)) { bar.hidden = false; return; }
  let heroOut = false, ctaIn = false;
  const update = () => { bar.hidden = !(heroOut && !ctaIn); };
  new IntersectionObserver(([e]) => { heroOut = !e.isIntersecting && e.boundingClientRect.top < 0; update(); }).observe($('headline'));
  new IntersectionObserver(([e]) => { ctaIn = e.isIntersecting; update(); }).observe($('q-cta'));
}

load();
