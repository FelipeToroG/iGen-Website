#!/usr/bin/env node
/**
 * Stamps shared partials (partials/*.html) into every page, in place, between
 * marker comments:   <!-- partial:header --> … <!-- /partial:header -->
 *
 * Why this and not a framework or client-side include: the committed HTML must be
 * complete and deployable as-is (push = deploy), crawlable without JS, and the
 * same files must work under /igen-website/ on GitHub Pages and at the root of
 * igencad.com. So every page carries its own copy of the header/footer, and this
 * script is only a convenience to keep those copies identical.
 *
 *   node tools/partials.js            rewrite pages whose stamped blocks drifted
 *   node tools/partials.js --check    exit 1 and list pages that would change (CI)
 *
 * Tokens available inside partials and inside page <head>:
 *   {{root}}        "" for root pages, "../" for folder/index.html pages
 *   {{title}}       the page's own <title> text
 *   {{description}} the page's own <meta name="description"> content
 *   {{canonical}}   baseUrl + clean path (…/about/ , …/mybot.html)
 *   {{robots}}      <meta name="robots" content="noindex"> while site.config.json noindex=true
 *   {{baseUrl}} {{siteName}} {{year}} {{lang}}
 *   {{altHref}}     relative link to the same page in the other language (the switcher)
 *   {{enUrl}} {{esUrl}} absolute URLs for hreflang; {{langPrefix}} "" or "/es"
 * Partials in partials/<lang>/ override the default for pages whose <html lang> matches.
 * Nav links carrying data-nav="x" get aria-current="page" when <body data-page="x">.
 * Pages may force noindex regardless of config with <body data-noindex>. (thank-you, 404)
 *
 * Pages reference partials by name; add partials/foo.html and <!-- partial:foo --> markers.
 * Also writes sitemap.xml (skipping 404 and noindex pages) so the phase-2 flip is one setting.
 * No dependencies. Node 18+.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const baseUrl = config.baseUrl.replace(/\/+$/, '');

// partials/<name>.html is the default; partials/<lang>/<name>.html overrides it for that language.
const LANGS = ['en', 'es'];
const partials = {};
const loadDir = (dir, into) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.isFile() && f.name.endsWith('.html')) into[f.name.replace(/\.html$/, '')] = fs.readFileSync(path.join(dir, f.name), 'utf8').trim();
  }
};
loadDir(path.join(ROOT, 'partials'), partials);
const langPartials = {};
for (const lang of LANGS) {
  const dir = path.join(ROOT, 'partials', lang);
  langPartials[lang] = {};
  if (fs.existsSync(dir)) loadDir(dir, langPartials[lang]);
}

/** Pages = root *.html + <dir>/index.html, one level deep, skipping tooling/private dirs. */
function findPages() {
  const skip = new Set(['node_modules', 'partials', 'tools', 'docs', 'css', 'js', 'img', 'video', '.git', '.github']);
  const pages = [];
  const scan = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('_') || entry.name.startsWith('.') || skip.has(entry.name)) continue;
      if (entry.isFile() && entry.name.endsWith('.html')) pages.push(prefix + entry.name);
      if (entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'index.html'))) pages.push(`${prefix}${entry.name}/index.html`);
    }
  };
  scan(ROOT, '');
  // Language trees mirror the root one level down (es/about/index.html <-> about/index.html).
  for (const lang of LANGS.filter((l) => l !== config.lang)) {
    if (fs.existsSync(path.join(ROOT, lang))) scan(path.join(ROOT, lang), `${lang}/`);
  }
  return pages.sort();
}

function attr(html, re) { const m = html.match(re); return m ? m[1].trim() : ''; }

function stamp(rel, html) {
  const depth = rel.split('/').length - 1;
  const root = '../'.repeat(depth);
  const cleanPath = rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? '/' + rel.replace(/index\.html$/, '') : '/' + rel;
  const pageId = attr(html, /<body[^>]*\sdata-page="([^"]+)"/);
  const lang = attr(html, /<html[^>]*\slang="([a-z-]+)"/) || config.lang;
  // Path of this page inside its language tree, e.g. "about/" or "mybot.html" or "".
  const langPrefix = lang === config.lang ? '' : `/${lang}`;
  const inner = cleanPath.replace(new RegExp(`^${langPrefix}/`), '');
  const urlFor = (l) => baseUrl + (l === config.lang ? '' : `/${l}`) + '/' + inner;
  const altLang = lang === config.lang ? LANGS.find((l) => l !== config.lang) : config.lang;
  const altHref = root + (altLang === config.lang ? '' : `${altLang}/`) + inner;
  const forceNoindex = /<body[^>]*\sdata-noindex[\s>]/.test(html);
  const noindex = config.noindex || forceNoindex;
  const vars = {
    root,
    lang,
    langPrefix,
    altHref,
    enUrl: urlFor('en'),
    esUrl: urlFor('es'),
    ogLocale: lang === 'es' ? 'es_US' : 'en_US',
    title: attr(html, /<title>([^<]*)<\/title>/),
    description: attr(html, /<meta\s+name="description"\s+content="([^"]*)"/),
    canonical: baseUrl + cleanPath,
    robots: noindex ? '<meta name="robots" content="noindex">' : '',
    baseUrl,
    siteName: config.siteName,
    year: String(new Date().getFullYear()),
  };
  const fill = (s) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`));

  let out = html;
  const names = new Set([...Object.keys(partials), ...Object.keys(langPartials[lang] || {})]);
  for (const name of names) {
    const body = (langPartials[lang] && langPartials[lang][name]) || partials[name];
    const re = new RegExp(`(<!-- partial:${name} -->)[\\s\\S]*?(<!-- /partial:${name} -->)`, 'g');
    if (!re.test(out)) continue;
    let block = fill(body);
    if (name === 'header' && pageId) {
      block = block.replace(new RegExp(`(<a href="[^"]*" data-nav="${pageId}")`), '$1 aria-current="page"');
    }
    out = out.replace(re, `$1\n${block}\n$2`);
  }
  // Deliberately NOT filling tokens outside partial blocks: an in-place stamp would destroy
  // the token, so a later baseUrl change could never find it again. Anything that needs the
  // base URL (JSON-LD, the form redirect) lives in its own small partial instead.
  if (/\{\{\w+\}\}/.test(out.replace(/<!-- partial:[\s\S]*?<!-- \/partial:\w+ -->/g, ''))) {
    console.warn(`warning: ${rel} has {{tokens}} outside partial blocks; they will not be filled.`);
  }
  return { out, cleanPath, noindex };
}

const pages = findPages();
const drifted = [];
const sitemap = [];
for (const rel of pages) {
  const file = path.join(ROOT, rel);
  const before = fs.readFileSync(file, 'utf8');
  const { out, cleanPath, noindex } = stamp(rel, before);
  if (rel !== '404.html' && !noindex) sitemap.push(baseUrl + cleanPath);
  if (out !== before) {
    drifted.push(rel);
    if (!CHECK) fs.writeFileSync(file, out);
  }
}

if (!config.noindex) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  const smPath = path.join(ROOT, 'sitemap.xml');
  if (!CHECK && (!fs.existsSync(smPath) || fs.readFileSync(smPath, 'utf8') !== xml)) fs.writeFileSync(smPath, xml);
}

if (CHECK) {
  if (drifted.length) { console.error('Partials drift in:\n  ' + drifted.join('\n  ') + '\nRun: node tools/partials.js'); process.exit(1); }
  console.log(`OK: ${pages.length} pages match their partials.`);
} else {
  console.log(drifted.length ? `Stamped ${drifted.length} page(s): ${drifted.join(', ')}` : `Nothing to do (${pages.length} pages up to date).`);
}
