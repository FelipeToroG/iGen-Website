// Run with `npm test` (node --test). Expected values were derived by hand from the formulas in
// js/quote/calc.js and the Stoneworks pricing, not copied from the code's output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FT_MULT, PT_MULT, WEEKS, clampWage, option, allOptions, optionIndex, perMonth, perYear, per5y, money, validateQuote,
} from '../js/quote/calc.js';

const PRICING = { ft: { 1: 850, 2: 800, 3: 750 }, pt: 485 };
const round = (n) => Math.round(n);

test('multipliers come from the BLS ECEC figures, not rounded constants', () => {
  assert.ok(Math.abs(FT_MULT - 1.4025) < 0.0001);
  assert.ok(Math.abs(PT_MULT - 1.0982) < 0.0001);
  assert.equal(WEEKS.year, 52);
  assert.equal(WEEKS.fiveYears, 260);
  assert.ok(Math.abs(WEEKS.month - 4.3333) < 0.001);
});

test('full-time, 1 technician at $22.00/h', () => {
  const o = option(PRICING, 'ft', 1, 22);
  assert.equal(o.igen, 850);
  assert.equal(o.rate, 850);
  assert.equal(o.house.toFixed(2), '1234.18');
  assert.equal(round(perMonth(o.save)), 1665);
  assert.equal(round(perYear(o.save)), 19977);
  assert.equal(round(per5y(o.save)), 99886);
});

test('full-time, 2 technicians at $22.00/h', () => {
  const o = option(PRICING, 'ft', 2, 22);
  assert.equal(o.rate, 800);
  assert.equal(o.igen, 1600);
  assert.equal(o.house.toFixed(2), '2468.35');
  assert.equal(round(perMonth(o.save)), 3763);
});

test('full-time, 3 technicians at $22.00/h', () => {
  const o = option(PRICING, 'ft', 3, 22);
  assert.equal(o.rate, 750);
  assert.equal(o.igen, 2250);
  assert.equal(round(o.house), 3703);
  assert.equal(round(perMonth(o.save)), 6294);
});

test('part-time at $22.00/h is honestly negative against wages plus taxes alone', () => {
  const o = option(PRICING, 'pt', 3, 22);
  assert.equal(o.techs, 1, 'part-time is always one technician');
  assert.equal(o.igen, 485);
  assert.equal(o.house.toFixed(2), '483.20');
  assert.ok(o.save < 0);
  assert.equal(round(perMonth(o.save)), -8);
});

test('BLS 25th percentile preset ($28.00/h): full-time 1 technician saves $3,123 a month', () => {
  const o = option(PRICING, 'ft', 1, 28);
  assert.equal(round(perMonth(o.save)), 3123);
});

test('allOptions order and selection index', () => {
  const all = allOptions(PRICING, 22);
  assert.deepEqual(all.map((o) => [o.mode, o.techs]), [['pt', 1], ['ft', 1], ['ft', 2], ['ft', 3]]);
  assert.equal(optionIndex('pt', 2), 0);
  assert.equal(optionIndex('ft', 3), 3);
});

test('clampWage never returns NaN and falls back to the quote default', () => {
  assert.equal(clampWage('', 22), 22);
  assert.equal(clampWage('abc', 22), 22);
  assert.equal(clampWage('5', 22), 22);
  assert.equal(clampWage('200', 22), 22);
  assert.equal(clampWage('31.5', 22), 31.5);
  assert.equal(clampWage('$28.00', 22), 28);
  assert.equal(clampWage(undefined, 22), 22);
  assert.ok(!Number.isNaN(clampWage(NaN, 22)));
});

test('money formats whole dollars with a real minus sign', () => {
  assert.equal(money(3123.4), '$3,123');
  assert.equal(money(-7.8), '−$8');
  assert.equal(money(-0.2), '$0');
});

test('validateQuote accepts the Stoneworks schema and reports gaps', () => {
  const good = {
    id: 'IG-2026-001', client: 'Stoneworks', state: 'TX', issued: '2026-11-04', validUntil: '2026-12-04',
    pricing: PRICING,
    wages: { custom: 22, presets: [{ label: 'BLS Texas 25th pct.', hourly: 28 }, { label: 'BLS Texas median', hourly: 33.44 }], default: 'custom' },
  };
  assert.deepEqual(validateQuote(good), []);
  const bad = { ...good, state: 'Texas', wages: { custom: 500, presets: [] } };
  const errors = validateQuote(bad);
  assert.ok(errors.some((e) => e.includes('state')));
  assert.ok(errors.some((e) => e.includes('wages.custom')));
  assert.ok(errors.some((e) => e.includes('presets')));
});
