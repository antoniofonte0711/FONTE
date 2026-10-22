// FONTE DPE — script condiviso da tutte le pagine
document.documentElement.classList.add('js');

(function () {
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const menuBtn = document.querySelector('.menu-btn');
  const sheet = document.querySelector('.sheet');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header: pieno dopo il primo scroll, si nasconde scendendo e torna risalendo
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-solid', y > 24);
      header.classList.toggle('is-hidden', y > 400 && y > lastY && !root.classList.contains('menu-open'));
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Leggero movimento delle immagini allo scroll (parallax)
  const parallax = document.querySelectorAll('[data-parallax]');
  if (parallax.length && !reduceMotion) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      parallax.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }


  // Menu mobile
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
    sheet.setAttribute('aria-hidden', !open);
  }
  if (menuBtn && sheet) {
    menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
    sheet.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1024) setMenu(false); });
  }

  // Comparsa allo scroll
  const items = document.querySelectorAll('[data-reveal], .reveal-lines, .hero-full');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    items.forEach(el => io.observe(el));
  } else {
    items.forEach(el => el.classList.add('is-in'));
  }

  // Anno nel footer
  document.querySelectorAll('.js-year').forEach(el => { el.textContent = new Date().getFullYear(); });
})();

