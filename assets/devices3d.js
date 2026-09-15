/* Interactive 3D devices (three.js): a MacBook showing Plenum and an iPhone showing Cairn.
   Solid rounded bodies, screens as textures, drag to spin with inertia, hover to tilt,
   idle sway and a scroll tilt. Falls back to the flat image if WebGL is unavailable. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hoverable = matchMedia('(hover: hover)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isDark = () => root.getAttribute('data-theme') === 'dark';

const PALETTE = {
  light: { alu: 0xd3cec4, aluDark: 0xb8b2a7, key: 0x2b2823, deck: 0xcfc9be, bg: 0xfaf8f4, hemiSky: 0xfaf8f4, hemiGround: 0x9a9284 },
  dark:  { alu: 0x7d776d, aluDark: 0x5a554c, key: 0x14120f, deck: 0x6f6960, bg: 0x1c1a17, hemiSky: 0xd9d4ca, hemiGround: 0x2a2723 }
};

function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
/* five-bar discipline mark, drawn on the lid back */
function drawMark(ctx, cx, cy, s) {
  const bars = [['#8f89ad', 0.5], ['#7e9b73', 0.4], ['#6a97b8', 0.3], ['#d4914f', 0.55], ['#d8664f', 0.25]];
  ctx.strokeStyle = 'rgba(35,31,25,0.55)'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - s / 2, cy - s / 2); ctx.lineTo(cx + s / 2, cy - s / 2); ctx.moveTo(cx - s / 2, cy + s / 2); ctx.lineTo(cx + s / 2, cy + s / 2); ctx.stroke();
  bars.forEach(([col, h], i) => {
    const bw = s * 0.11, gap = (s - bw * 5) / 4, x = cx - s / 2 + i * (bw + gap), bh = s * 0.72 * h;
    ctx.fillStyle = col; roundRect(ctx, x, cy + s / 2 - s * 0.14 - bh, bw, bh, bw / 2); ctx.fill();
  });
}

/* ---------- MacBook ---------- */
async function buildMac(screenSrc, pal) {
  const g = new THREE.Group();
  const W = 312, D = 221, T = 15, LID_H = 214, LID_T = 6;
  const alu = new THREE.MeshStandardMaterial({ color: pal.alu, metalness: 0.55, roughness: 0.45 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, T, D, 4, 3), alu);
  base.position.y = T / 2; g.add(base);
  // deck: keys + trackpad drawn onto a texture laid on the base top
  const deckTex = canvasTexture(1248, 884, (ctx, w, h) => {
    ctx.fillStyle = '#' + pal.deck.toString(16).padStart(6, '0'); ctx.fillRect(0, 0, w, h);
    const kx = w * 0.075, ky = h * 0.07, kw = w * 0.85, kh = h * 0.42, cols = 14, rows = 6;
    const cw = kw / cols, ch = kh / rows;
    ctx.fillStyle = 'rgba(35,31,25,0.10)'; roundRect(ctx, kx - 8, ky - 8, kw + 16, kh + 16, 10); ctx.fill();
    ctx.fillStyle = '#' + pal.key.toString(16).padStart(6, '0');
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const wide = r === rows - 1 && c > 3 && c < 9; if (wide && c !== 4) continue;
      const kwid = wide ? cw * 5 - 6 : cw - 6;
      roundRect(ctx, kx + c * cw + 3, ky + r * ch + 3, kwid, ch - 6, 5); ctx.fill();
    }
    ctx.fillStyle = 'rgba(35,31,25,0.08)'; roundRect(ctx, w * 0.35, h * 0.56, w * 0.3, h * 0.36, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(35,31,25,0.18)'; ctx.lineWidth = 2; roundRect(ctx, w * 0.35, h * 0.56, w * 0.3, h * 0.36, 12); ctx.stroke();
  });
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(W - 4, D - 4), new THREE.MeshStandardMaterial({ map: deckTex, metalness: 0.3, roughness: 0.6 }));
  deck.rotation.x = -Math.PI / 2; deck.position.y = T + 0.5; g.add(deck);
  // lid, hinged at the back edge of the base
  const lid = new THREE.Group(); lid.position.set(0, T, -D / 2 + LID_T / 2); lid.rotation.x = -THREE.MathUtils.degToRad(13);
  const lidBody = new THREE.Mesh(new RoundedBoxGeometry(W, LID_H, LID_T, 4, 3), alu); lidBody.position.y = LID_H / 2; lid.add(lidBody);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 5, LID_H - 5), new THREE.MeshStandardMaterial({ color: 0x14120f, metalness: 0.2, roughness: 0.5 }));
  bezel.position.set(0, LID_H / 2, LID_T / 2 + 0.6); lid.add(bezel);
  const img = await loadImage(screenSrc);
  const screenTex = new THREE.Texture(img); screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.needsUpdate = true; screenTex.anisotropy = 8;
  const sw = W - 18, sh = sw * 10 / 16;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.position.set(0, LID_H / 2 + 1.5, LID_T / 2 + 1.1); lid.add(screen);
  // back of the lid: the five-bar mark
  const backTex = canvasTexture(1024, 702, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); drawMark(ctx, w / 2, h / 2, 130); });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 6, LID_H - 6), new THREE.MeshStandardMaterial({ map: backTex, transparent: true, metalness: 0.4, roughness: 0.5 }));
  back.position.set(0, LID_H / 2, -LID_T / 2 - 0.6); back.rotation.y = Math.PI; lid.add(back);
  g.add(lid);
  g.position.y = -95;  // centre the assembly around the origin for a nicer spin
  return { group: g, mats: { alu }, deckTex, camera: { pos: [0, 150, 700], look: [0, 0, 0], fov: 26 } };
}

/* ---------- iPhone ---------- */
async function buildPhone(screenSrc) {
  const g = new THREE.Group();
  const W = 71.6, H = 146.6, T = 8.3, R = 11;
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, T, 6, R), new THREE.MeshStandardMaterial({ color: 0x2a2723, metalness: 0.6, roughness: 0.4 }));
  g.add(body);
  const img = await loadImage(screenSrc);
  const screenTex = canvasTexture(786, 1704, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h); roundRect(ctx, 0, 0, w, h, 96); ctx.clip(); ctx.drawImage(img, 0, 0, w, h);
    ctx.fillStyle = '#0b0a08'; roundRect(ctx, w * 0.34, h * 0.03, w * 0.32, h * 0.035, 40); ctx.fill();   // dynamic island
  });
  const sw = W - 5.2, sh = sw * 1704 / 786;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: screenTex, transparent: true }));
  screen.position.z = T / 2 + 0.5; g.add(screen);
  // matte back with the camera plateau
  const backMat = new THREE.MeshStandardMaterial({ color: 0x35312b, metalness: 0.35, roughness: 0.7 });
  const backPlate = new THREE.Mesh(new THREE.PlaneGeometry(W - 3, H - 3), backMat); backPlate.position.z = -T / 2 - 0.5; backPlate.rotation.y = Math.PI; g.add(backPlate);
  const plateau = new THREE.Mesh(new RoundedBoxGeometry(30, 30, 2.6, 4, 7), new THREE.MeshStandardMaterial({ color: 0x1c1a17, metalness: 0.5, roughness: 0.45 }));
  plateau.position.set(-W / 2 + 18.5, H / 2 - 18.5, -T / 2 - 1.2); g.add(plateau);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x0b0a08, metalness: 0.8, roughness: 0.2 });
  const ring = new THREE.MeshStandardMaterial({ color: 0x4e4941, metalness: 0.7, roughness: 0.3 });
  [[-7, 6.5], [-7, -6.5], [5.5, 0]].forEach(([x, y]) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 1.2, 32), ring); r.rotation.x = Math.PI / 2; r.position.set(plateau.position.x + x, plateau.position.y + y, -T / 2 - 3); g.add(r);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.6, 32), lensMat); l.rotation.x = Math.PI / 2; l.position.set(plateau.position.x + x, plateau.position.y + y, -T / 2 - 3.9); g.add(l);
  });
  return { group: g, mats: {}, camera: { pos: [0, 0, 470], look: [0, 0, 0], fov: 22 } };
}

/* ---------- rig: renderer + pointer interaction ---------- */
function rig(stage, built, opts) {
  const { group, camera: camSpec } = built;
  const canvas = stage.querySelector('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch (e) { return false; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(camSpec.fov, 1, 120, 2400); cam.position.set(...camSpec.pos); cam.lookAt(...camSpec.look);
  const pal = () => PALETTE[isDark() ? 'dark' : 'light'];
  const hemi = new THREE.HemisphereLight(pal().hemiSky, pal().hemiGround, 1.15); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(220, 380, 420); scene.add(key);
  const fill = new THREE.DirectionalLight(0xfaf8f4, 0.7); fill.position.set(-360, 120, 200); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5); rim.position.set(0, 200, -500); scene.add(rim);
  const pivot = new THREE.Group(); pivot.add(group); scene.add(pivot);
  stage.classList.add('gl');

  const state = { yaw: opts.restYaw, pitch: opts.restPitch, vy: 0, vp: 0, dragging: false, hovering: false, hx: 0, hy: 0, lastX: 0, lastY: 0, moved: 0, phase: Math.random() * 6.28, visible: true };
  const size = () => {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  size(); new ResizeObserver(size).observe(stage);
  new IntersectionObserver(en => { state.visible = en[0].isIntersecting; }, { rootMargin: '200px' }).observe(stage);
  new MutationObserver(() => { const p = pal(); hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); if (built.mats.alu) built.mats.alu.color.set(p.alu); })
    .observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    state.dragging = true; state.moved = 0; state.lastX = e.clientX; state.lastY = e.clientY; state.vy = 0; state.vp = 0;
    stage.classList.add('dragging'); stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (state.dragging) {
      const dx = e.clientX - state.lastX, dy = e.clientY - state.lastY;
      if (e.pointerType !== 'mouse' && state.moved < 8) { state.moved += Math.abs(dx) + Math.abs(dy); if (Math.abs(dy) > Math.abs(dx)) return; }
      state.lastX = e.clientX; state.lastY = e.clientY;
      state.vy = dx * 0.0085; state.vp = -dy * 0.005;
      state.yaw += state.vy; state.pitch = clamp(state.pitch + state.vp, -0.6, 0.6);
    } else if (hoverable) {
      const r = stage.getBoundingClientRect(); state.hovering = true;
      state.hx = (e.clientX - r.left) / r.width - 0.5; state.hy = (e.clientY - r.top) / r.height - 0.5;
    }
  });
  const release = () => { state.dragging = false; stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release);
  stage.addEventListener('pointerleave', () => { state.hovering = false; if (state.dragging) release(); });

  let last = performance.now();
  const frame = now => {
    requestAnimationFrame(frame);
    const dt = Math.min(48, now - last) / 16.67; last = now;
    if (!state.visible) return;
    if (!state.dragging) {
      state.yaw += state.vy * dt; state.pitch = clamp(state.pitch + state.vp * dt, -0.6, 0.6);
      state.vy *= Math.pow(0.93, dt); state.vp *= Math.pow(0.9, dt);
      if (Math.abs(state.vy) < 0.0004 && Math.abs(state.vp) < 0.0004) {
        const r = stage.getBoundingClientRect();
        const t = clamp(((r.top + r.height / 2) - innerHeight / 2) / (innerHeight / 2), -1, 1);
        const scrollTilt = reduced ? 0 : -t * 0.16;
        const sway = reduced ? 0 : Math.sin(now / 2600 + state.phase) * opts.sway;
        const ty = opts.restYaw + sway + (state.hovering ? state.hx * 0.5 : 0);
        const tp = opts.restPitch + scrollTilt + (state.hovering ? -state.hy * 0.22 : 0);
        let dy = ((ty - state.yaw) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        state.yaw += dy * 0.06 * dt; state.pitch += (tp - state.pitch) * 0.08 * dt;
      }
    }
    pivot.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
    renderer.render(scene, cam);
  };
  requestAnimationFrame(frame);
  return true;
}

(async () => {
  const macStage = document.querySelector('.stage[data-device="mac"]');
  const phoneStage = document.querySelector('.stage[data-device="phone"]');
  try {
    if (macStage) rig(macStage, await buildMac(macStage.dataset.screen, PALETTE[isDark() ? 'dark' : 'light']), { restYaw: -0.32, restPitch: 0.16, sway: 0.12 });
    if (phoneStage) rig(phoneStage, await buildPhone(phoneStage.dataset.screen), { restYaw: 0.34, restPitch: 0.06, sway: 0.16 });
  } catch (e) { console.warn('3D devices unavailable, keeping flat fallback', e); }
})();
