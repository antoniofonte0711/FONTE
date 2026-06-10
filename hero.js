/* ============================================
   FONTE — Hero JS
   Canvas particle system + scroll cue
   ============================================ */

(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Particle factory
  function createParticle() {
    return {
      x: Math.random() * W,
      y: H * 0.5 + Math.random() * H * 0.5,   // start bottom half
      size: 0.8 + Math.random() * 1.4,
      speed: 0.25 + Math.random() * 0.5,
      opacity: 0,
      maxOpacity: 0.25 + Math.random() * 0.4,
      life: 0,
      maxLife: 160 + Math.random() * 120,
      drift: (Math.random() - 0.5) * 0.4,
    };
  }

  // Seed initial particles
  for (let i = 0; i < 35; i++) {
    const p = createParticle();
    p.life = Math.random() * p.maxLife; // stagger start
    particles.push(p);
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);

    // Spawn new particles gradually
    if (particles.length < 50 && Math.random() < 0.08) {
      particles.push(createParticle());
    }

    particles = particles.filter(p => p.life < p.maxLife);

    particles.forEach(p => {
      p.life++;
      p.y    -= p.speed;
      p.x    += p.drift;

      // Fade in / fade out
      const progress = p.life / p.maxLife;
      p.opacity = progress < 0.15
        ? (progress / 0.15) * p.maxOpacity
        : progress > 0.75
          ? ((1 - progress) / 0.25) * p.maxOpacity
          : p.maxOpacity;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      // Gold colour: hsl ~42°
      ctx.fillStyle = `rgba(201, 168, 76, ${p.opacity})`;
      ctx.fill();
    });

    requestAnimationFrame(tick);
  }

  tick();

  // ---- Scroll cue: hide when user starts scrolling ----
  const scrollCue = document.getElementById('scroll-cue');
  if (scrollCue) {
    window.addEventListener('scroll', () => {
      scrollCue.style.opacity = window.scrollY > 80 ? '0' : '';
      scrollCue.style.pointerEvents = window.scrollY > 80 ? 'none' : '';
    }, { passive: true });
  }
})();
