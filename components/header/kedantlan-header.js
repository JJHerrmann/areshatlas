// Kedantlan header map: a wide banner over a 4-level tile pyramid, with fog of war outside the surveyed area.
// Vanilla JS, no dependencies. mountKedantlanHeader(root, opts) returns a destroy function.
//
// Tiles: <base>tiles/sat_L{level}_{cx}_{cy}.webp  (level 0 is sharpest). Outline: <base>region.json.
// World units are level-0 pixels: 4440 x 3840, 120 px per degree, top-left at lon -10, lat 52.

const W = 4440, H = 3840, C = 1024;
const LEVELS = [{ nx: 5, ny: 4 }, { nx: 3, ny: 2 }, { nx: 2, ny: 1 }, { nx: 1, ny: 1 }];
const LON0 = -10, LAT0 = 52, PPD = 120;
const FOG = [10, 16, 22];
const FOG_EDGE = 260;      // world px over which fog fades in from the surveyed edge
const PAN_MARGIN = 320;    // how far past the survey the view may drift, into the fog
const MAX_K = 1.5;

const SITES = [{ name: 'Naharapan', lat: 42.93, lon: 9.53 }];

const CSS = `
.kh{position:relative;width:100%;aspect-ratio:3.2/1;min-height:200px;max-height:480px;overflow:hidden;background:rgb(10,16,22);color:#e5eef0;font:500 13px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;border-radius:inherit;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.kh[data-active="true"]{touch-action:none;cursor:grab}
.kh[data-active="true"][data-drag="true"]{cursor:grabbing}
.kh canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.kh-ui{position:absolute;right:10px;bottom:10px;display:flex;gap:6px;align-items:center}
.kh-ui button,.kh-ui a{appearance:none;border:1px solid rgba(255,255,255,.28);background:rgba(10,16,22,.72);color:#e5eef0;border-radius:8px;padding:0 12px;min-height:36px;min-width:36px;font:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.kh-ui button:hover,.kh-ui a:hover{background:rgba(30,46,56,.85)}
.kh-ui button:focus-visible,.kh-ui a:focus-visible,.kh:focus-visible{outline:2px solid #52c4d6;outline-offset:2px}
.kh-ui .kh-z{display:none;gap:6px}
.kh[data-active="true"] .kh-ui .kh-z{display:inline-flex}
.kh-hint{position:absolute;left:12px;bottom:12px;max-width:60%;padding:6px 10px;border-radius:8px;background:rgba(10,16,22,.62);font-size:12.5px;color:#b9c9cf;pointer-events:none}
@media (prefers-reduced-motion:no-preference){.kh-hint{transition:opacity .2s}}
.kh[data-active="true"] .kh-hint{opacity:0}
@media (max-width:560px){.kh-hint{display:none}}
`;

let styled = false;
function injectStyle() {
  if (styled || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.setAttribute('data-kh', '');
  s.textContent = CSS;
  document.head.appendChild(s);
  styled = true;
}

export function mountKedantlanHeader(root, opts = {}) {
  injectStyle();
  const base = (opts.base || '/kedantlan-header/').replace(/\/?$/, '/');
  const label = opts.label || 'Map of Kedantlan and the surrounding lands. The rest of the world is hidden in fog.';
  const showOutline = opts.outline !== false;

  root.classList.add('kh');
  root.setAttribute('data-active', 'false');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', label);
  root.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const ui = document.createElement('div');
  ui.className = 'kh-ui';
  const hint = document.createElement('div');
  hint.className = 'kh-hint';
  hint.textContent = 'Kedantlan. The rest of the world lies in fog.';

  const mk = (txt, aria, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = txt;
    b.setAttribute('aria-label', aria);
    if (cls) b.className = cls;
    return b;
  };
  const zwrap = document.createElement('span');
  zwrap.className = 'kh-z';
  const bIn = mk('+', 'Zoom in'), bOut = mk('−', 'Zoom out'), bReset = mk('Reset', 'Reset the view');
  zwrap.append(bOut, bIn, bReset);
  const bExp = mk('Explore the map', 'Turn on map dragging and zooming');
  bExp.setAttribute('aria-pressed', 'false');
  ui.append(zwrap, bExp);
  if (opts.atlasHref) {
    const a = document.createElement('a');
    a.href = opts.atlasHref;
    a.textContent = opts.atlasLabel || 'Full atlas';
    ui.append(a);
  }
  root.append(canvas, hint, ui);
  const ctx = canvas.getContext('2d');

  // ---- view state: (cx, cy) world centre, k = screen px per world px
  let cw = 0, ch = 0, dpr = 1, k = 0.3, cx = W / 2, cy = 1300, k0 = 0.3, raf = 0, active = false, dead = false;

  function fit() {
    // Fit the map to the full canvas width. A margin here leaves backdrop down
    // each side, invisible on the left where dark ocean meets the dark backdrop
    // but obvious on the right where bright land does.
    k0 = cw / W;
    return k0;
  }
  function clampView() {
    k = Math.min(MAX_K, Math.max(k0, k));
    const vw = cw / k, vh = ch / k;
    const minX = -PAN_MARGIN + vw / 2, maxX = W + PAN_MARGIN - vw / 2;
    const minY = -PAN_MARGIN + vh / 2, maxY = H + PAN_MARGIN - vh / 2;
    cx = minX > maxX ? W / 2 : Math.min(maxX, Math.max(minX, cx));
    cy = minY > maxY ? H / 2 : Math.min(maxY, Math.max(minY, cy));
  }
  function home() {
    fit();
    k = k0;
    cx = W / 2;
    cy = 1300;
    clampView();
  }
  const sx = (wx) => (wx - cx) * k + cw / 2;
  const sy = (wy) => (wy - cy) * k + ch / 2;

  function resize() {
    const r = root.getBoundingClientRect();
    const nw = Math.max(1, Math.round(r.width)), nh = Math.max(1, Math.round(r.height));
    const nd = Math.min(2, window.devicePixelRatio || 1);
    if (nw === cw && nh === ch && nd === dpr) return;
    const first = cw === 0;
    const wasHome = Math.abs(k - k0) < 1e-6;
    cw = nw; ch = nh; dpr = nd;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    fit();
    if (first || wasHome) { k = k0; cx = W / 2; cy = 1300; }
    clampView();
    draw();
  }

  // ---- tiles
  const imgs = new Map();
  function tile(l, tx, ty) {
    const key = l + '_' + tx + '_' + ty;
    let im = imgs.get(key);
    if (!im) {
      im = new Image();
      im.decoding = 'async';
      im.onload = draw;
      im.src = base + 'tiles/sat_L' + key + '.webp';
      imgs.set(key, im);
    }
    return im;
  }
  function drawLevel(l, x0, y0, x1, y1) {
    const lv = LEVELS[l], s = Math.pow(2, l);
    const tx0 = Math.max(0, Math.floor(x0 / (C * s))), tx1 = Math.min(lv.nx - 1, Math.floor(x1 / (C * s)));
    const ty0 = Math.max(0, Math.floor(y0 / (C * s))), ty1 = Math.min(lv.ny - 1, Math.floor(y1 / (C * s)));
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const im = tile(l, tx, ty);
        if (!im.complete || !im.naturalWidth) continue;
        ctx.drawImage(im, sx(tx * C * s), sy(ty * C * s), im.naturalWidth * s * k + 0.6, im.naturalHeight * s * k + 0.6);
      }
    }
  }

  // ---- outline
  let paths = null, pathsState = 0;
  function loadPaths() {
    if (pathsState || !showOutline) return;
    pathsState = 1;
    fetch(base + 'region.json').then((r) => r.json()).then((j) => {
      paths = j.p.map((p) => new Path2D(p));
      draw();
    }).catch(() => {});
  }

  // ---- paint
  function paint() {
    raf = 0;
    if (dead || !cw) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgb(' + FOG.join(',') + ')';
    ctx.fillRect(0, 0, cw, ch);
    ctx.imageSmoothingQuality = 'high';

    const x0 = cx - cw / 2 / k, x1 = cx + cw / 2 / k, y0 = cy - ch / 2 / k, y1 = cy + ch / 2 / k;
    const top = LEVELS.length - 1;
    const l = Math.max(0, Math.min(top, Math.floor(Math.log2(0.7 / k))));
    drawLevel(top, x0, y0, x1, y1);
    if (l < top) drawLevel(Math.min(top, l + 1), x0, y0, x1, y1);
    if (l < top) drawLevel(l, x0, y0, x1, y1);

    // outline of the region
    if (paths) {
      ctx.save();
      ctx.translate(sx(0), sy(0));
      ctx.scale(k, k);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.5 / k;
      ctx.strokeStyle = 'rgba(247,201,72,.55)';
      paths.forEach((p) => ctx.stroke(p));
      ctx.restore();
    }

    // sites
    ctx.font = '600 12px system-ui,-apple-system,"Segoe UI",sans-serif';
    ctx.textBaseline = 'middle';
    SITES.forEach((s) => {
      const px = sx((s.lon - LON0) * PPD), py = sy((LAT0 - s.lat) * PPD);
      if (px < -40 || px > cw + 160 || py < -20 || py > ch + 20) return;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f7c948';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(10,16,22,.85)';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeText(s.name, px + 10, py);
      ctx.fillStyle = '#fff';
      ctx.fillText(s.name, px + 10, py);
    });

    // fog of war: everything outside the survey, plus a soft fade in from its edges
    const L = sx(0), T = sy(0), R = sx(W), B = sy(H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.rect(L, T, R - L, B - T);
    ctx.fillStyle = 'rgb(' + FOG.join(',') + ')';
    ctx.fill('evenodd');
    ctx.restore();
    const f = FOG_EDGE * k;
    const edge = (x, y, w, h, gx0, gy0, gx1, gy1) => {
      const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
      g.addColorStop(0, 'rgba(' + FOG.join(',') + ',1)');
      g.addColorStop(1, 'rgba(' + FOG.join(',') + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(L, T, R - L, B - T);
    ctx.clip();
    edge(L, T, f, B - T, L, 0, L + f, 0);
    edge(R - f, T, f, B - T, R, 0, R - f, 0);
    edge(L, T, R - L, f, 0, T, 0, T + f);
    edge(L, B - f, R - L, f, 0, B, 0, B - f);
    ctx.restore();

    loadPaths();
  }
  function draw() {
    if (!raf && !dead) raf = requestAnimationFrame(paint);
  }

  // ---- interaction (only while the explore toggle is on, so the header never traps page scroll)
  function setActive(on) {
    active = on;
    root.setAttribute('data-active', on ? 'true' : 'false');
    bExp.setAttribute('aria-pressed', on ? 'true' : 'false');
    bExp.textContent = on ? 'Done' : 'Explore the map';
    bExp.setAttribute('aria-label', on ? 'Turn off map dragging and zooming' : 'Turn on map dragging and zooming');
    if (on) root.focus({ preventScroll: true });
  }
  bExp.addEventListener('click', () => setActive(!active));
  function zoomAt(px, py, f) {
    const wx = cx + (px - cw / 2) / k, wy = cy + (py - ch / 2) / k;
    k *= f;
    k = Math.min(MAX_K, Math.max(k0, k));
    cx = wx - (px - cw / 2) / k;
    cy = wy - (py - ch / 2) / k;
    clampView();
    draw();
  }
  bIn.addEventListener('click', () => zoomAt(cw / 2, ch / 2, 1.5));
  bOut.addEventListener('click', () => zoomAt(cw / 2, ch / 2, 1 / 1.5));
  bReset.addEventListener('click', () => { home(); draw(); });

  const ptrs = new Map();
  let pinch = 0;
  const rel = (e) => { const r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  root.addEventListener('pointerdown', (e) => {
    if (!active || e.target.closest('.kh-ui')) return;
    root.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, rel(e));
    root.setAttribute('data-drag', 'true');
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  root.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const p = rel(e), o = ptrs.get(e.pointerId);
    if (ptrs.size === 1) {
      cx -= (p.x - o.x) / k;
      cy -= (p.y - o.y) / k;
      clampView();
      draw();
    } else if (ptrs.size === 2) {
      ptrs.set(e.pointerId, p);
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch);
      pinch = d;
    }
    ptrs.set(e.pointerId, p);
  });
  const up = (e) => {
    ptrs.delete(e.pointerId);
    pinch = 0;
    if (!ptrs.size) root.removeAttribute('data-drag');
  };
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', up);
  root.addEventListener('wheel', (e) => {
    if (!active) return;
    e.preventDefault();
    const p = rel(e);
    zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.04 : 0.0016)));
  }, { passive: false });
  root.addEventListener('dblclick', (e) => {
    if (!active || e.target.closest('.kh-ui')) return;
    const p = rel(e);
    zoomAt(p.x, p.y, e.shiftKey ? 0.5 : 2);
  });
  root.tabIndex = 0;
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active) { setActive(false); return; }
    if (!active) return;
    const step = 80 / k;
    let used = true;
    if (e.key === 'ArrowLeft') cx -= step;
    else if (e.key === 'ArrowRight') cx += step;
    else if (e.key === 'ArrowUp') cy -= step;
    else if (e.key === 'ArrowDown') cy += step;
    else if (e.key === '+' || e.key === '=') { zoomAt(cw / 2, ch / 2, 1.5); return e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { zoomAt(cw / 2, ch / 2, 1 / 1.5); return e.preventDefault(); }
    else if (e.key === '0') home();
    else used = false;
    if (used) { e.preventDefault(); clampView(); draw(); }
  });

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(root); else window.addEventListener('resize', resize);
  resize();

  return function destroy() {
    dead = true;
    if (raf) cancelAnimationFrame(raf);
    if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
    root.innerHTML = '';
    root.classList.remove('kh');
  };
}
