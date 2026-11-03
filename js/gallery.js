/**
 * Work gallery lightbox.
 *
 * One <dialog> is created per page and reused for every gallery. Native showModal() gives
 * the focus trap, Esc-to-close and inert background for free, so the module only adds
 * prev/next, arrow keys, captions and focus return. Without JS the figure links simply open
 * the full-size JPEG, which is why the markup is <a href="…jpg"><picture>…</picture></a>.
 *
 * Markup contract: <figure class="gallery__item"><a class="gallery__link" href="full.jpg"
 * data-full-webp="full.webp" data-full-avif="full.avif"><picture>…<img alt></picture></a>
 * <figcaption>…</figcaption></figure> inside any element with [data-gallery].
 * Labels come from data attributes on [data-gallery] so the ES pages translate them.
 */
export function initGallery() {
  const galleries = document.querySelectorAll('[data-gallery]');
  if (!galleries.length || typeof HTMLDialogElement !== 'function') return;

  const labels = Object.assign(
    { close: 'Close', prev: 'Previous image', next: 'Next image', of: 'of' },
    galleries[0].dataset
  );

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', labels.dialogLabel || 'Image viewer');
  dialog.innerHTML = `
    <div class="lightbox__frame">
      <picture class="lightbox__picture">
        <source type="image/avif"><source type="image/webp"><img alt="">
      </picture>
      <p class="lightbox__caption"><span class="lightbox__text"></span> <span class="lightbox__count"></span></p>
    </div>
    <button type="button" class="lightbox__btn lightbox__btn--prev" aria-label="${labels.prev}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <button type="button" class="lightbox__btn lightbox__btn--next" aria-label="${labels.next}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    </button>
    <button type="button" class="lightbox__btn lightbox__btn--close" aria-label="${labels.close}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>`;
  document.body.appendChild(dialog);

  const img = dialog.querySelector('img');
  const [srcAvif, srcWebp] = dialog.querySelectorAll('source');
  const text = dialog.querySelector('.lightbox__text');
  const count = dialog.querySelector('.lightbox__count');

  let items = [];
  let index = 0;
  let opener = null;

  function show(i) {
    index = (i + items.length) % items.length;
    const link = items[index];
    const thumb = link.querySelector('img');
    srcAvif.srcset = link.dataset.fullAvif || '';
    srcWebp.srcset = link.dataset.fullWebp || '';
    img.src = link.href;
    img.alt = thumb ? thumb.alt : '';
    const caption = link.closest('figure')?.querySelector('figcaption');
    text.textContent = caption ? caption.textContent : '';
    count.textContent = items.length > 1 ? `${index + 1} ${labels.of} ${items.length}` : '';
    dialog.querySelectorAll('.lightbox__btn--prev, .lightbox__btn--next')
      .forEach((b) => { b.hidden = items.length < 2; });
  }

  function open(gallery, link) {
    items = Array.from(gallery.querySelectorAll('.gallery__link'));
    opener = link;
    show(items.indexOf(link));
    dialog.showModal();
    dialog.querySelector('.lightbox__btn--close').focus();
  }

  galleries.forEach((gallery) => {
    gallery.addEventListener('click', (event) => {
      const link = event.target.closest('.gallery__link');
      if (!link || !gallery.contains(link)) return;
      event.preventDefault();
      open(gallery, link);
    });
  });

  dialog.querySelector('.lightbox__btn--prev').addEventListener('click', () => show(index - 1));
  dialog.querySelector('.lightbox__btn--next').addEventListener('click', () => show(index + 1));
  dialog.querySelector('.lightbox__btn--close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });
  // Click on the backdrop (outside the frame) closes, like Esc does natively.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    img.removeAttribute('src');
    if (opener) opener.focus();
  });
}
