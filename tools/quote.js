#!/usr/bin/env node
/**
 * Quote files (optional dev tool; the site deploys without it).
 *
 *   node tools/quote.js new <slug> --client "Name" --state TX --wage 22 [--id IG-2026-001]
 *                                  [--issued 2026-11-04] [--days 30] [--ft 850,800,750] [--pt 485]
 *   node tools/quote.js check          validate every file in data/quotes/
 *
 * `new` writes data/quotes/<slug>.json, pulling the BLS presets for the state from data/wages.json
 * (a state that is not in that file is refused: wage figures are never invented) and prints the
 * English and Spanish URLs. `check` runs the same validation the page runs, plus the state lookup.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateQuote } from '../js/quote/calc.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUOTES = path.join(ROOT, 'data', 'quotes');
const wages = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'wages.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
for (let i = 0; i < rest.length; i++) if (rest[i].startsWith('--')) { flags[rest[i].slice(2)] = rest[i + 1]; i++; }
const slug = rest.find((a) => !a.startsWith('--') && !Object.values(flags).includes(a));

function fail(msg) { console.error(msg); process.exit(1); }

function presetsFor(state) {
  const s = wages.states[state];
  if (!s) fail(`No wage data for ${state} in data/wages.json. Add p25/median/url for that state first (from O*NET, SOC ${wages.soc}).`);
  return [
    { label: `BLS ${s.name} 25th pct.`, hourly: s.p25 },
    { label: `BLS ${s.name} median`, hourly: s.median },
  ];
}

function urls(slugName) {
  const base = config.baseUrl.replace(/\/+$/, '');
  return [`${base}/quote/?q=${slugName}`, `${base}/es/quote/?q=${slugName}`];
}

if (cmd === 'new') {
  if (!slug || !/^[a-z0-9-]{1,40}$/.test(slug)) fail('Usage: node tools/quote.js new <slug> --client "Name" --state TX --wage 22   (slug: a-z, 0-9, -)');
  if (!flags.client || !flags.state || !flags.wage) fail('--client, --state and --wage are required.');
  const state = flags.state.toUpperCase();
  const issued = flags.issued || new Date().toISOString().slice(0, 10);
  const until = new Date(issued); until.setDate(until.getDate() + Number(flags.days || 30));
  const ft = (flags.ft || '850,800,750').split(',').map(Number);
  const quote = {
    id: flags.id || `IG-${issued.slice(0, 4)}-${String(fs.existsSync(QUOTES) ? fs.readdirSync(QUOTES).length + 1 : 1).padStart(3, '0')}`,
    client: flags.client,
    state,
    issued,
    validUntil: until.toISOString().slice(0, 10),
    pricing: { ft: { 1: ft[0], 2: ft[1], 3: ft[2] }, pt: Number(flags.pt || 485) },
    wages: { custom: Number(flags.wage), presets: presetsFor(state), default: 'custom' },
    defaults: { mode: 'ft', techs: 1 },
  };
  const errors = validateQuote(quote);
  if (errors.length) fail('Not written:\n  ' + errors.join('\n  '));
  fs.mkdirSync(QUOTES, { recursive: true });
  const file = path.join(QUOTES, `${slug}.json`);
  if (fs.existsSync(file) && !flags.force) fail(`${file} exists. Add --force to overwrite.`);
  fs.writeFileSync(file, JSON.stringify(quote, null, 2) + '\n');
  console.log(`Wrote ${path.relative(ROOT, file)}\n${urls(slug).join('\n')}`);
} else if (cmd === 'check') {
  let bad = 0;
  for (const f of fs.readdirSync(QUOTES).filter((n) => n.endsWith('.json')).sort()) {
    const q = JSON.parse(fs.readFileSync(path.join(QUOTES, f), 'utf8'));
    const errors = validateQuote(q);
    if (q.state && !wages.states[q.state]) errors.push(`state ${q.state} is not in data/wages.json`);
    const expired = q.validUntil && Date.parse(q.validUntil) < Date.now();
    console.log(`${errors.length ? 'FAIL' : 'ok  '} ${f}  ${q.id || ''} ${q.client || ''}${expired ? '  (expired)' : ''}`);
    errors.forEach((e) => console.log('       - ' + e));
    if (errors.length) bad++;
  }
  process.exit(bad ? 1 : 0);
} else {
  fail('Commands: new <slug> --client --state --wage [--issued --days --id --ft --pt --force] | check');
}
