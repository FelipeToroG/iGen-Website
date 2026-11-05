/**
 * Quote pricing engine. Pure functions, no DOM: the quote page and the Node tests share it, so the
 * headline, the table, the chart and the tests can never disagree.
 *
 * Every figure is PER WEEK unless a helper says otherwise. Money is left unrounded here; the page
 * rounds when it prints.
 *
 * In-house cost multipliers come from the BLS Employer Costs for Employee Compensation release for
 * the West South Central division (June 2026): total compensation $40.84/h against wages and
 * salaries $29.12/h, so a full-time employee costs about 1.40 x wage once benefits and payroll
 * taxes are counted.
 *
 * Part-time deliberately does NOT use 1.40. A part-timer rarely gets the benefits package (health,
 * retirement, paid leave) that makes up most of that 40%; what an employer cannot avoid are the
 * legally required costs (Social Security, Medicare, unemployment and workers' compensation), which
 * the same release puts at 7.0% of total compensation, i.e. 0.070 / 0.713 = 9.8% on top of wages.
 * Using 1.40 for part-time would overstate the in-house cost and the savings; using 1.10 keeps the
 * comparison honest, and the page says so when the result turns negative.
 */
export const FT_MULT = 40.84 / 29.12;          // ~1.4025, shown as 1.40
export const PT_MULT = 1 + 0.070 / 0.713;      // ~1.0982, shown as 1.10
export const FT_HOURS = 40;
export const PT_HOURS = 20;                    // one technician, four consecutive hours a day
export const WEEKS = { month: 52 / 12, year: 52, fiveYears: 260 };

export const WAGE_MIN = 10;
export const WAGE_MAX = 150;

/**
 * A typed wage, guarded. Anything empty, non-numeric or outside 10–150 $/h falls back to the
 * quote's own default so the page never shows NaN or a wage nobody pays.
 */
export function clampWage(value, fallback) {
  const v = typeof value === 'number' ? value : parseFloat(String(value).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(v) || v < WAGE_MIN || v > WAGE_MAX) return fallback;
  return v;
}

/**
 * One option of the quote. pricing = { ft: { 1: 850, 2: 800, 3: 750 }, pt: 485 } (dollars per week).
 * mode = 'ft' | 'pt'; techs = 1..3 (ignored for part-time, which is one technician only).
 * Returns weekly figures: rate (per technician), igen (total), house (in-house equivalent), save.
 */
export function option(pricing, mode, techs, wage) {
  if (mode === 'pt') {
    const igen = Number(pricing.pt);
    const house = wage * PT_HOURS * PT_MULT;
    return { mode, techs: 1, rate: igen, igen, house, save: house - igen };
  }
  const n = Math.min(3, Math.max(1, Number(techs) || 1));
  const rate = Number(pricing.ft[n]);
  const igen = rate * n;
  const house = wage * FT_HOURS * FT_MULT * n;
  return { mode: 'ft', techs: n, rate, igen, house, save: house - igen };
}

/** Every option in display order: part-time, then full-time 1, 2 and 3 technicians. */
export function allOptions(pricing, wage) {
  return [option(pricing, 'pt', 1, wage), option(pricing, 'ft', 1, wage), option(pricing, 'ft', 2, wage), option(pricing, 'ft', 3, wage)];
}

/** Index of an option inside allOptions(): 0 for part-time, 1..3 for full-time by headcount. */
export function optionIndex(mode, techs) {
  return mode === 'pt' ? 0 : Math.min(3, Math.max(1, Number(techs) || 1));
}

export const perMonth = (weekly) => weekly * WEEKS.month;
export const perYear = (weekly) => weekly * WEEKS.year;
export const per5y = (weekly) => weekly * WEEKS.fiveYears;

/** Whole dollars, en-US grouping, a real minus sign for negatives: "$3,123", "−$8". */
export function money(n, locale = 'en-US') {
  const abs = Math.round(Math.abs(n));
  return (n < 0 && abs > 0 ? '−' : '') + '$' + abs.toLocaleString(locale);
}

/** Validate a quote file. Returns a list of problems; empty means usable. */
export function validateQuote(q) {
  const errors = [];
  const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
  if (!q || typeof q !== 'object') return ['quote is not an object'];
  if (!q.id) errors.push('missing id');
  if (!q.client) errors.push('missing client');
  if (!q.state || !/^[A-Z]{2}$/.test(q.state)) errors.push('state must be a two-letter code');
  if (!isDate(q.issued)) errors.push('issued must be YYYY-MM-DD');
  if (!isDate(q.validUntil)) errors.push('validUntil must be YYYY-MM-DD');
  const p = q.pricing || {};
  for (const n of [1, 2, 3]) if (!(Number(p.ft?.[n]) > 0)) errors.push(`pricing.ft.${n} must be a positive number`);
  if (!(Number(p.pt) > 0)) errors.push('pricing.pt must be a positive number');
  const w = q.wages || {};
  if (clampWage(w.custom, null) === null) errors.push(`wages.custom must be ${WAGE_MIN}–${WAGE_MAX}`);
  if (!Array.isArray(w.presets) || w.presets.length === 0) errors.push('wages.presets must be a non-empty list');
  else w.presets.forEach((pr, i) => {
    if (!pr.label) errors.push(`wages.presets[${i}].label missing`);
    if (clampWage(pr.hourly, null) === null) errors.push(`wages.presets[${i}].hourly must be ${WAGE_MIN}–${WAGE_MAX}`);
  });
  if (w.default !== undefined && w.default !== 'custom' && !(Number.isInteger(w.default) && w.presets?.[w.default])) errors.push('wages.default must be "custom" or a preset index');
  return errors;
}
