# iGEN CAD CAM Designers — website

Static site for iGEN CAD CAM Designers (Tampa, FL): dedicated remote CAD designers
and CNC programmers for stone and countertop fabricators across the United States.

Plain HTML, CSS and JavaScript. No framework, no build step: deploying means pushing
files. Optional Node tooling (partials stamping, image optimization, link checks) lives
in `tools/` and is never required to run or deploy the site.

## Structure

```
index.html            Home
about/index.html      About                (clean URL: /about/)
how-it-works/         How it works
services/             Services, benefits, gallery
faq/                  FAQ
contact/              Contact form
privacy/              Privacy
thank-you/            Form success (noindex)
mybot.html            "Ask iGen" AI assistant (root file; name is fixed)
404.html              Not found (root file; GitHub Pages serves it)
css/                  tokens.css, base.css, layout.css, components.css
js/                   small ES modules
img/                  images (img/brand/ holds the logo copies)
partials/             header/footer sources stamped into pages by tools/partials.js
tools/                optional dev scripts
docs/                 QA checklist, launch plan, chatbot knowledge file
```

Every internal link and asset path is RELATIVE so the same files work under
`https://<user>.github.io/<repo>/` (phase 1) and at the root of `igencad.com` (phase 2).

## Run locally

Any static server at the repo root, for example VS Code "Live Server", or:

```
python3 -m http.server 8080
```

## Deploy to GitHub Pages

The site is plain files, so deploying is pushing to `main`.

1. On GitHub: **New repository** → name `igen-website`, **Public** (required for free Pages),
   no README/.gitignore/license (this repo already has them) → Create.
2. Locally, once:
   ```
   git remote add origin https://github.com/<user>/igen-website.git
   git push -u origin main
   ```
3. On GitHub: repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   Branch `main`, folder `/ (root)` → Save. The `.nojekyll` file in the repo tells GitHub to
   serve the files as-is (no Jekyll processing).
4. Wait for the green check under **Actions** (up to ~10 minutes the first time), then open
   `https://<user>.github.io/igen-website/`.
5. Put that URL in `site.config.json` (`baseUrl`) and run `node tools/partials.js` so
   canonicals, Open Graph tags and the form redirect carry the real address. Commit and push.

Every later change: edit, run `node tools/partials.js` if a partial changed, commit, push.
No custom domain is pointed at GitHub Pages during the assignment period.

## Editing shared parts

`partials/head.html`, `header.html`, `footer.html` (and small ones like `form-redirect.html`)
are stamped into every page between `<!-- partial:NAME -->` markers:

```
node tools/partials.js          # rewrite pages that drifted
node tools/partials.js --check  # CI mode: exit 1 if any page is out of date
```

The committed pages are complete HTML; the script is a convenience, not a build step.

## Dev tools (all optional)

| Script | Purpose |
|---|---|
| `tools/partials.js` | stamp shared partials, write `sitemap.xml` when indexable |
| `tools/brand-assets.py` | trimmed logo copies and the share image from the untracked originals |
| `tools/favicon.py` | the flat favicon set (SVG, PNG, ICO) |

## Phase 2 host

See `docs/launch-plan.md` (written in milestone 4).

---

© iGEN CAD CAM Designers. All rights reserved. No license is granted to copy,
modify or reuse the content, design or code of this site.
