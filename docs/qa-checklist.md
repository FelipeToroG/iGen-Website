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
      contains a symlink named `igen-website`) and open `/igen-website/`: every page, CSS, image
      and script loads. Then open the same from `/` to confirm root hosting also works.
- [ ] 404 page: open `/igen-website/does-not-exist/` on the LIVE github.io URL. Styles load and
      the "home" button goes to `/igen-website/`.

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
- [ ] Botpress snippet pasted at the marked slot, Chat interface = Embedded, Element ID =
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
