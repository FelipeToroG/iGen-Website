# QA checklist

Run before each milestone is called done, and in full before the demo recording and before
the phase-2 launch. Tick in a copy; keep this file as the template.

## Build integrity
- [ ] `node tools/partials.js --check` passes (header/footer/head identical on every page).
- [ ] No email address anywhere in the repo:
      `grep -rnE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}" --exclude-dir=_project-docs --exclude-dir=.git --exclude-dir=node_modules .`
      must print nothing.
- [ ] `grep -rn "PLACEHOLDER" --include='*.html' .` matches PLACEHOLDERS.md (nothing forgotten, nothing invented).
- [ ] `_project-docs/` and `_preview/` are not in `git status` (ignored).
- [ ] No secrets: only the Web3Forms public access key is in the repo.

## Relative paths (the GitHub Pages subpath)
- [ ] Serve the repo under a subfolder (e.g. `python3 -m http.server` from a parent folder that
      contains a symlink named `iGen-Website`) and open `/iGen-Website/`: every page, CSS, image
      and script loads. Then open the same from `/` to confirm root hosting also works.
- [ ] 404 page: open `/iGen-Website/does-not-exist/` on the LIVE github.io URL. Styles load and
      the "home" button goes to `/iGen-Website/`.

## Links and navigation
- [ ] Every nav and footer link resolves on the live URL (no 404s). Home anchors to
      `services/#benefits`, `faq/#pricing` etc. land on the right section.
- [ ] `tel:` link dials (813) 781-6255 on a phone.
- [ ] Instagram and LinkedIn links open the right profiles.

## Contact form
- [ ] With JS: empty submit shows inline errors on Name, Email, Message; invalid email is caught;
      valid submit redirects to `/thank-you/` and the email arrives.
- [ ] Without JS (disable JavaScript in DevTools): plain submit redirects to the thank-you page
      and the email arrives.
- [ ] Honeypot: ticking the hidden `botcheck` box (via DevTools) produces no email.
- [ ] Thank-you page carries `<meta name="robots" content="noindex">`.

## mybot.html (assignment critical)
- [ ] Botpress snippet pasted at the marked slot in BOTH `mybot.html` and `es/mybot.html`, Chat interface = Embedded, Element ID =
      `bp-embedded-webchat`, bot published.
- [ ] On the LIVE github.io URL: the chat renders inside the panel, answers a question from the
      knowledge base, and refuses to quote a price.
- [ ] Sample-question buttons become enabled when the bot loads and send their text.
- [ ] Fallback: temporarily break the snippet URL → after ~12 s the fallback (phone + contact)
      appears. Restore afterwards.
- [ ] Works in an incognito window (no cached session) and on a phone.

## Accessibility and keyboard
- [ ] Tab from the top: skip link appears first and jumps to main content.
- [ ] Every interactive element is reachable and shows the focus ring; mobile menu opens with
      Enter/Space, closes with Escape and returns focus to the button.
- [ ] Form errors are announced (screen reader) and associated with their fields.
- [ ] Images have alt text; decorative SVGs are `aria-hidden`.
- [ ] Reduced motion (macOS: Accessibility > Display > Reduce motion): nothing animates and
      nothing stays invisible.
- [ ] Zoom to 200%: no horizontal scroll, nothing overlaps.

## Dark mode
- [ ] With the device set to dark (macOS: System Settings > Appearance), every page switches: all-gold
      logo in the header, readable text, amber links, visible focus rings, the contact band still reads
      as a band, form fields and the bot panel legible.
- [ ] The header toggle (sun/moon) flips the theme, the choice survives a reload and a visit to another
      page, and the logo follows the manual choice (gold on dark, full colour on light).
- [ ] Theme toggle is reachable by keyboard, has a visible focus ring and announces its state.
- [ ] 404 page respects the theme (inline fallback styles use the tokens).

## Video and gallery
- [ ] Home and About hero videos play muted and loop; the Play/Pause button works by mouse and keyboard
      and the label changes; no sound ever.
- [ ] With Reduce Motion on, the videos do not autoplay; the poster shows with a Play button.
- [ ] Gallery: click or Enter on a thumbnail opens the lightbox; Tab stays inside it; Left/Right move
      between images; Esc and the close button close it and focus returns to the thumbnail.
- [ ] Without JS the thumbnails open the full-size JPEG in the tab.
- [ ] No customer names, remote-access IDs or license banners visible in any image or video frame
      (`tools/images.py` crops, `tools/video.sh` crops).

## Spanish
- [ ] EN/ES switch on every page lands on the same page in the other language (not the home page).
- [ ] `es/` pages show the Spanish header/footer and `<html lang="es">`; hreflang tags present.
- [ ] Spanish contact form shows Spanish validation messages and redirects to `es/thank-you/`.

## Devices
- [ ] Real iPhone (Safari) and real Android (Chrome): home, services, contact, mybot.
- [ ] Narrow (320–390 px): no sideways scroll; header shows the mark and the menu button.

## Performance and SEO
- [ ] Lighthouse (mobile, incognito) on every page: Performance, Accessibility, Best Practices,
      SEO all ≥ 90. Record scores in the milestone notes.
- [ ] Each page has a unique `<title>` and `<meta name="description">`; canonical and og:url
      match the page; og:image resolves.
- [ ] While on github.io: every page has `<meta name="robots" content="noindex">`; `robots.txt` allows crawling.
- [ ] Structured data: paste the home page URL into Google's Rich Results Test; LocalBusiness
      validates with no email.
- [ ] Favicon shows in the tab (Safari and Chrome), apple-touch-icon shows when added to an iPhone home screen.

## Demo-day check (before recording the 2-minute video)
- [ ] Live URL loads in a fresh incognito window on the recording machine.
- [ ] Bot answers 2–3 planned questions and declines a pricing question gracefully.
- [ ] Browser zoom at 100%, notifications off, bookmarks bar hidden.
- [ ] Record: home page → nav to Ask Axis → ask questions → show the fallback/about panel → done.
- [ ] Keep the GitHub Pages URL unchanged until the grade is in.
