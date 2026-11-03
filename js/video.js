/**
 * Hero / inline videos: screen recordings with no speech.
 *
 * Rules baked in here:
 *  - Autoplay only when the visitor has not asked for reduced motion and is not on a
 *    data-saver connection. Otherwise the poster stays and the button says "Play".
 *  - Anything that moves for more than 5 s needs a pause control the visitor can reach
 *    (WCAG 2.2.2), so every video gets a visible Play/Pause button, even when autoplaying.
 *  - Below-the-fold videos are marked data-video="lazy": nothing downloads until they are
 *    near the viewport (IntersectionObserver), then they behave like the others.
 *
 * Markup contract: <div class="video" data-video[="lazy"]><video muted loop playsinline poster
 * preload="metadata|none"><source src=… type="video/mp4"></video><button class="video__control"
 * data-play="Play" data-pause="Pause" …></button></div>. The muted attribute is required for
 * autoplay on iOS and Chrome; the pages also set it in HTML so no-JS behaves.
 */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const saveData = navigator.connection && navigator.connection.saveData === true;

function setLabel(button, playing) {
  button.textContent = playing ? button.dataset.pause : button.dataset.play;
  button.setAttribute('aria-pressed', playing ? 'true' : 'false');
}

function wire(wrapper) {
  const video = wrapper.querySelector('video');
  const button = wrapper.querySelector('.video__control');
  if (!video || !button) return;

  const wantsAutoplay = !reduceMotion.matches && !saveData;

  const play = () => video.play().then(() => setLabel(button, true)).catch(() => setLabel(button, false));
  const pause = () => { video.pause(); setLabel(button, false); };

  button.addEventListener('click', () => (video.paused ? play() : pause()));
  video.addEventListener('play', () => setLabel(button, true));
  video.addEventListener('pause', () => setLabel(button, false));

  const start = () => {
    if (video.preload === 'none') video.preload = 'metadata';
    if (wantsAutoplay) play(); else setLabel(button, false);
  };

  if (wrapper.dataset.video === 'lazy' && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
    }, { rootMargin: '200px 0px' });
    io.observe(wrapper);
  } else {
    start();
  }

  // Pause off-screen autoplaying videos so a looping hero does not burn CPU under the fold.
  if (wantsAutoplay && 'IntersectionObserver' in window) {
    let userPaused = false;
    button.addEventListener('click', () => { userPaused = video.paused; });
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting && !video.paused) video.pause();
        else if (e.isIntersecting && video.paused && !userPaused) play();
      });
    }, { threshold: 0.2 }).observe(wrapper);
  }
}

export function initVideo() {
  document.querySelectorAll('[data-video]').forEach(wire);
}
