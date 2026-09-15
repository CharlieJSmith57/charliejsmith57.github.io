/* Charlie Smith — portfolio
   Theme (System / Light / Dark), nav, page transitions, scroll reveals,
   counters, compare wipe, network canvas, spotlight cards, filters. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const readPref = () => { try { return localStorage.getItem('theme') || 'system'; } catch (e) { return 'system'; } };
  const applyTheme = (pref, animate) => {
    const dark = pref === 'dark' || (pref === 'system' && mql.matches);
    if (animate && !reduced) {
      root.classList.add('theme-fade');
      setTimeout(() => root.classList.remove('theme-fade'), 480);
    }
    if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    document.querySelectorAll('.seg [data-theme-set]').forEach(b => {
      b.setAttribute('aria-pressed', b.dataset.themeSet === pref ? 'true' : 'false');
    });
  };
  applyTheme(readPref(), false);
  mql.addEventListener('change', () => { if (readPref() === 'system') applyTheme('system', true); });
  document.querySelectorAll('.seg [data-theme-set]').forEach(b => {
    b.addEventListener('click', () => {
      const pref = b.dataset.themeSet;
      try { localStorage.setItem('theme', pref); } catch (e) {}
      applyTheme(pref, true);
    });
  });

  /* ---------- nav ---------- */
  const burger = document.getElementById('hamburger');
  const links = document.querySelector('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false');
    }));
  }
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
    const pages = a.dataset.page.split(',');
    a.classList.toggle('active', pages.includes(here));
  });

  /* ---------- page transitions (fallback when the browser lacks cross-document view transitions) ---------- */
  const hasVT = 'startViewTransition' in document && CSS.supports('view-transition-name: x') && window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  if (!hasVT) {
    document.body.classList.add('no-vt', 'entering');
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      if (!/\.html?$|\/$/.test(url.pathname)) return;
      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(() => { location.href = url.href; }, reduced ? 0 : 180);
    });
    window.addEventListener('pageshow', e => { if (e.persisted) document.body.classList.remove('leaving'); });
  }

  /* ---------- scroll reveal (staggered) ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------- count-up numbers ---------- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const fmt = (n, dec) => n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const run = el => {
      const target = parseFloat(el.dataset.count);
      const dec = (el.dataset.count.split('.')[1] || '').length;
      if (reduced) { el.textContent = fmt(target, dec); return; }
      const t0 = performance.now(), dur = 1400;
      const step = t => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * e, dec);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const cio = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { run(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach(el => cio.observe(el));
  }

  /* ---------- hero tilt / parallax ---------- */
  const heroVis = document.querySelector('.hero-visual');
  const heroFrame = document.querySelector('.hero-frame');
  if (heroVis && heroFrame && !reduced && window.matchMedia('(hover: hover)').matches) {
    heroVis.addEventListener('pointermove', e => {
      const r = heroVis.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      heroFrame.style.setProperty('--tx', (x * 6).toFixed(2));
      heroFrame.style.setProperty('--ty', (-y * 6).toFixed(2));
    });
    heroVis.addEventListener('pointerleave', () => { heroFrame.style.setProperty('--tx', 0); heroFrame.style.setProperty('--ty', 0); });
  }

  /* ---------- spotlight cards ---------- */
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  });

  /* ---------- compare wipe ---------- */
  document.querySelectorAll('.compare').forEach(cmp => {
    const range = cmp.querySelector('input[type=range]');
    if (!range) return;
    const set = v => cmp.style.setProperty('--pos', v + '%');
    set(range.value);
    range.addEventListener('input', () => set(range.value));
    // gentle idle sweep until the visitor touches it
    let touched = false, dir = 1, v = parseFloat(range.value);
    ['pointerdown', 'focus', 'touchstart'].forEach(ev => range.addEventListener(ev, () => { touched = true; }, { passive: true }));
    if (!reduced) {
      const tick = () => {
        if (touched) return;
        v += 0.08 * dir; if (v > 68 || v < 32) dir *= -1;
        range.value = v; set(v.toFixed(2));
        requestAnimationFrame(tick);
      };
      const vio = new IntersectionObserver(en => { if (en[0].isIntersecting) { requestAnimationFrame(tick); vio.disconnect(); } });
      vio.observe(cmp);
    }
  });

  /* ---------- network canvas (LinkedIn+) ---------- */
  document.querySelectorAll('canvas.netcanvas').forEach(cv => {
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1), nodes = [], raf = 0, running = false;
    const css = () => getComputedStyle(root);
    const colorOf = k => ({ b: css().getPropertyValue('--blueprint').trim(), m: css().getPropertyValue('--moss').trim(), r: css().getPropertyValue('--brass').trim(), i: css().getPropertyValue('--iron').trim() })[k];
    const hex2rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
    const resize = () => {
      const r = cv.getBoundingClientRect(); w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(28, Math.min(70, Math.round(w * h / 9000)));
      nodes = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: i % 9 === 0 ? 4.5 : 2 + Math.random() * 1.5, k: i % 9 === 0 ? 'r' : (i % 3 === 0 ? 'm' : (i % 5 === 0 ? 'i' : 'b'))
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const ink = css().getPropertyValue('--blueprint').trim();
      const link = 110;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < link) { ctx.strokeStyle = hex2rgba(ink, 0.55 * (1 - d / link)); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
      }
      nodes.forEach(n => {
        ctx.fillStyle = colorOf(n.k); ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
        if (!reduced) { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > w) n.vx *= -1; if (n.y < 0 || n.y > h) n.vy *= -1; }
      });
      if (running && !reduced) raf = requestAnimationFrame(draw);
    };
    resize(); draw();
    new ResizeObserver(() => { resize(); if (!running) draw(); }).observe(cv);
    new IntersectionObserver(en => {
      running = en[0].isIntersecting;
      if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
    }).observe(cv);
    new MutationObserver(() => { if (!running) draw(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  });

  /* ---------- device pivot: tilt toward the viewer as it scrolls into view ---------- */
  const devices = document.querySelectorAll('.device');
  if (devices.length && !reduced) {
    let ticking = false;
    const pivot = () => {
      ticking = false;
      const vh = innerHeight;
      devices.forEach(d => {
        const r = d.getBoundingClientRect();
        const t = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / (vh / 2)));
        const max = parseFloat(d.dataset.pivot || 14);
        const yaw = parseFloat(d.dataset.yaw || 0);
        d.style.setProperty('--rx', (-t * max).toFixed(2) + 'deg');
        d.style.setProperty('--ry', (t * yaw).toFixed(2) + 'deg');
      });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(pivot); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    pivot();
  }

  /* ---------- reading progress ---------- */
  const prog = document.querySelector('.progress i');
  if (prog) {
    const upd = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      prog.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* ---------- project filters ---------- */
  const chips = document.querySelectorAll('.filters .chip');
  if (chips.length) {
    const cards = document.querySelectorAll('.list-grid .card');
    chips.forEach(ch => ch.addEventListener('click', () => {
      chips.forEach(c => c.setAttribute('aria-pressed', c === ch ? 'true' : 'false'));
      const f = ch.dataset.filter;
      cards.forEach((card, i) => {
        const show = f === 'all' || (card.dataset.kind || '').split(' ').includes(f);
        card.classList.toggle('is-hidden', !show);
        if (show) { card.classList.remove('in'); card.style.setProperty('--i', i % 6); requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('in'))); }
      });
    }));
  }
})();
