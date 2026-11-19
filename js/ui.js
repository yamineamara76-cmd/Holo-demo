/* HOLO — composants d'interface : icônes, modales, toasts, graphiques, sélecteur produit */
(function () {
  'use strict';
  const UI = {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  UI.$ = $; UI.$$ = $$;

  /* ---------- Icônes (traits fins) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="8" cy="8" r="1.5"/>',
    live: '<circle cx="12" cy="12" r="2.5"/><path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
    wallet: '<path d="M20 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6"/><path d="M17 13.5h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    up: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    arrowR: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    chevU: '<path d="M6 15l6-6 6 6"/>',
    chevD: '<path d="M6 9l6 6 6-6"/>',
    swap: '<path d="M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4"/>',
    receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-1 .7L16 2l-3 2-3-2-3 2-3-2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    store: '<path d="M3 9 4.5 4h15L21 9M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v8h14v-8M10 21v-5h4v5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    trade: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
    split: '<path d="M16 3h5v5M8 3H3v5M21 3l-7 7M3 3l7 7M12 22v-8"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    pin: '<path d="M12 17v5M9 10.8V5h6v5.8l3 3.2H6z"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    bank: '<path d="M3 21h18M4 10h16M5 6l7-3 7 3M6 10v8M10 10v8M14 10v8M18 10v8"/>'
  };
  UI.icon = (n, cls = '') => '<svg class="i i-' + n + ' ' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || '') + '</svg>';

  /* ---------- Vignette produit ---------- */
  const TYPE_GRAD = {
    display: ['#ff7aa8', '#ffb86b'], etb: ['#8b7bff', '#ff8ad8'], booster: ['#43d9ad', '#4fa3ff'], tripack: ['#5fd0ff', '#8b7bff'],
    coffret: ['#ffb14a', '#ff6b6b'], upc: ['#ffd84d', '#ff8ad8'], tin: ['#9aa7b8', '#5b6b82'], card: ['#6ee7b7', '#3b82f6'],
    graded: ['#ffe27a', '#b8a2ff'], lot: ['#ff9ad5', '#6aa9ff'], accessory: ['#a3a3b2', '#6b6a78'], other: ['#8d8b96', '#4b4a55']
  };
  UI.thumb = (p, opts = {}) => {
    if (!p) return '<div class="pthumb"><span class="ph">?</span></div>';
    const g = TYPE_GRAD[p.type] || TYPE_GRAD.other;
    const inner = p.image
      ? '<img src="' + p.image + '" alt="" loading="lazy" onload="UI.aura(this)">'
      : '<div class="ph-tile" style="background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')"><span class="ph">' + U.esc(initials(p.name)) + '</span></div>';
    return '<div class="pthumb' + (p.image ? '' : ' has-aura') + '"' + (p.image ? '' : ' style="--aura:' + g[0] + '"') + '>'
      + '<div class="lev"><div class="tilt">' + inner + '<i class="foil"></i></div></div>' + (opts.extra || '') + '</div>';
  };
  /* Inclinaison 3D + reflet holo qui suit la souris (souris uniquement) */
  if (matchMedia('(hover: hover)').matches) {
    let cur = null;
    const reset = t => { if (t) { t.style.removeProperty('--tx'); t.style.removeProperty('--ty'); t.classList.remove('lit'); } };
    document.addEventListener('pointermove', e => {
      const t = e.pointerType === 'mouse' && e.target.closest ? e.target.closest('.pcard .pthumb, .prod-stage .pthumb') : null;
      if (t !== cur) { reset(cur); cur = t; }
      if (!t) return;
      const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      t.style.setProperty('--tx', x.toFixed(3)); t.style.setProperty('--ty', y.toFixed(3)); t.classList.add('lit');
    }, { passive: true });
    document.addEventListener('pointerleave', () => { reset(cur); cur = null; });
  }
  /* ---------- Image produit : détourage du fond + couleur d'aura ----------
     Le fond uni d'une photo (noir, blanc…) est retiré par remplissage depuis
     les bords ; la couleur dominante de la boîte colore l'aura et le fond. */
  const auraCache = new Map();
  UI.aura = img => {
    if (img.dataset.aura) return;
    img.dataset.aura = '1';
    const src = img.getAttribute('src'), box = img.closest('.pthumb, .ico');
    const apply = r => {
      if (!r) { img.classList.add('plain'); return; }          // image externe illisible : juste centrée
      if (r.color) {
        box.style.setProperty('--aura', r.color); box.classList.add('has-aura');
        const dr = box.closest('.prod-stage') && box.closest('.drawer'); if (dr) dr.style.setProperty('--aura', r.color);
      }
      if (r.url && img.getAttribute('src') === src) img.src = r.url;
      const cut = r.url || (r.cut && src);                     // PNG déjà détouré : utilisé tel quel
      const foil = img.parentElement.querySelector('.foil'); if (foil && cut) foil.style.setProperty('--mask', 'url(' + cut + ')');
      img.classList.add(cut ? 'cut' : 'plain');
    };
    if (auraCache.has(src)) return Promise.resolve(auraCache.get(src)).then(apply);
    const job = new Promise(res => requestAnimationFrame(() => { try { res(analyse(img)); } catch (e) { res(null); } }));
    auraCache.set(src, job);
    job.then(r => { auraCache.set(src, r); apply(r); });
  };
  function analyse(img) {
    const max = 520, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, w, h);
    const id = cx.getImageData(0, 0, w, h), d = id.data;       // lève une erreur si image externe sans CORS
    // Couleur de fond = moyenne du contour
    const border = []; for (let x = 0; x < w; x++) border.push(x, x + (h - 1) * w); for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
    let br = 0, bg = 0, bb = 0, ba = 0;
    border.forEach(i => { br += d[i * 4]; bg += d[i * 4 + 1]; bb += d[i * 4 + 2]; ba += d[i * 4 + 3]; });
    const n = border.length; br /= n; bg /= n; bb /= n; ba /= n;
    const dist = i => Math.hypot(d[i * 4] - br, d[i * 4 + 1] - bg, d[i * 4 + 2] - bb);
    const TOL = 38;
    const uniform = ba > 200 && border.filter(i => dist(i) < TOL).length / n > .7;
    const bgMask = new Uint8Array(w * h);
    if (uniform) {                                              // remplissage depuis les bords
      const q = new Int32Array(w * h); let qh = 0, qt = 0;
      border.forEach(i => { if (!bgMask[i] && dist(i) < TOL) { bgMask[i] = 1; q[qt++] = i; } });
      while (qh < qt) {
        const i = q[qh++], x = i % w;
        const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
        for (const j of nb) if (j >= 0 && j < w * h && !bgMask[j] && dist(j) < TOL) { bgMask[j] = 1; q[qt++] = j; }
      }
      for (let i = 0; i < w * h; i++) {
        if (bgMask[i]) { d[i * 4 + 3] = 0; continue; }
        const x = i % w;                                        // adoucit le bord détouré
        if ((x > 0 && bgMask[i - 1]) || (x < w - 1 && bgMask[i + 1]) || bgMask[i - w] || bgMask[i + w]) d[i * 4 + 3] = Math.min(d[i * 4 + 3], 150 + Math.min(105, dist(i) * 1.2));
      }
    }
    // Couleur dominante : pixels vifs du produit, pondérés par la saturation
    let r = 0, g = 0, b = 0, wt = 0, r2 = 0, g2 = 0, b2 = 0, n2 = 0;
    for (let i = 0; i < w * h; i += 2) {
      if (bgMask[i] || d[i * 4 + 3] < 128) continue;
      const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      r2 += R; g2 += G; b2 += B; n2++;
      const sat = mx ? (mx - mn) / mx : 0;
      if (sat < .25 || mx < 50) continue;
      const q2 = sat * sat * (mx / 255); r += R * q2; g += G * q2; b += B * q2; wt += q2;
    }
    const col = wt > n2 * .01 ? [r / wt, g / wt, b / wt] : n2 ? [r2 / n2, g2 / n2, b2 / n2] : [140, 140, 160];
    const [hh, ss, ll] = rgb2hsl(col);
    const color = 'hsl(' + Math.round(hh) + ' ' + Math.round(wt ? Math.max(ss, 55) : Math.min(ss, 12)) + '% ' + Math.round(Math.min(62, Math.max(48, ll))) + '%)';
    if (!uniform) return { color, cut: ba < 60 };
    cx.putImageData(id, 0, 0);
    return { color, url: cv.toDataURL('image/png') };
  }
  function rgb2hsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
    if (!dd) return [0, 0, l * 100];
    const s = dd / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
    return [(h * 60 + 360) % 360, s * 100, l * 100];
  }
  UI.mini = (p, cls = '') => {
    if (!p) return '<div class="ico ' + cls + '">?</div>';
    if (p.image) return '<div class="ico pico ' + cls + '"><img src="' + p.image + '" alt="" loading="lazy" onload="UI.aura(this)"></div>';
    const g = TYPE_GRAD[p.type] || TYPE_GRAD.other;
    return '<div class="ico ' + cls + '" style="background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ');color:#fff;font:800 12px var(--f-display)">' + U.esc(initials(p.name)) + '</div>';
  };
  /* Chiffres qui défilent jusqu'à leur valeur (entrée de page / fiche) */
  const NF = {};
  UI.countUp = (root, sel = '.kpi-v, .holo-v, .kv .v, .strip .v') => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.querySelectorAll(sel).forEach(el => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node; while ((node = w.nextNode()) && !/\d/.test(node.nodeValue));
      if (!node) return;
      const txt = node.nodeValue, m = txt.match(/\d[\d\s\u202f\u00a0]*(?:,(\d+))?/);
      if (!m) return;
      const dec = m[1] ? m[1].length : 0, to = parseFloat(m[0].replace(/[\s\u202f\u00a0]/g, '').replace(',', '.'));
      if (!to || !isFinite(to)) return;
      const nf = NF[dec] || (NF[dec] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
      const num = m[0].replace(/[\s\u202f\u00a0]+$/, ''), pre = txt.slice(0, m.index), post = txt.slice(m.index + num.length);
      const t0 = performance.now(), dur = 750;
      const step = t => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        node.nodeValue = k < 1 ? pre + nf.format(to * e) + post : txt;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
  function initials(n) {
    const w = String(n || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
    const num = w.find(x => /^\d+$/.test(x));
    if (num && w.length <= 2) return num;
    return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
  }
  UI.pSub = p => [REF.type(p.type).label, p.set, p.lang, p.grader ? p.grader + ' ' + (p.grade || '') : null].filter(Boolean).join(' · ');

  /* ---------- Toast ---------- */
  UI.toast = (msg, opts = {}) => {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span class="ok">' + (opts.icon || '✓') + '</span><span>' + U.esc(msg) + '</span>' + (opts.undo ? '<button>' + (opts.undoLabel || 'Annuler') + '</button>' : '');
    box.appendChild(t);
    if (opts.undo) t.querySelector('button').onclick = () => { opts.undo(); t.remove(); };
    setTimeout(() => { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = 0; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 300); }, opts.undo ? 5000 : 2600);
  };

  /* ---------- Modale / tiroir ---------- */
  const stack = [];
  UI.open = ({ title, body, foot, kind = 'modal', size = '', onMount, onClose }) => {
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    const el = document.createElement('div');
    el.className = kind + (size ? ' ' + size : '');
    el.setAttribute('role', 'dialog');
    el.innerHTML = '<div class="modal-h"><h2>' + title + '</h2><button class="btn btn-ghost btn-icon x" data-close aria-label="Fermer">' + UI.icon('x') + '</button></div>'
      + '<div class="modal-b">' + body + '</div>' + (foot ? '<div class="modal-f">' + foot + '</div>' : '');
    document.body.append(scrim, el);
    requestAnimationFrame(() => { scrim.classList.add('on'); el.classList.add('on'); });
    const close = () => {
      scrim.classList.remove('on'); el.classList.remove('on');
      setTimeout(() => { scrim.remove(); el.remove(); }, 300);
      const i = stack.indexOf(ctx); if (i >= 0) stack.splice(i, 1);
      onClose && onClose();
    };
    const ctx = { el, close };
    stack.push(ctx);
    scrim.onclick = close;
    el.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    onMount && onMount(el, close);
    const f = el.querySelector('[autofocus]'); if (f && window.innerWidth > 860) setTimeout(() => f.focus(), 60);
    return ctx;
  };
  UI.closeTop = () => { const c = stack[stack.length - 1]; if (c) { c.close(); return true; } return false; };
  UI.hasModal = () => stack.length > 0;

  UI.confirm = (msg, { ok = 'Supprimer', danger = true, sub = '' } = {}) => new Promise(res => {
    let done = false;
    const m = UI.open({
      title: msg, size: 'sm',
      body: sub ? '<p class="muted" style="margin:0">' + sub + '</p>' : '<p class="muted" style="margin:0">Cette action est définitive.</p>',
      foot: '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + ok + '</button>',
      onMount: (el, close) => { el.querySelector('[data-ok]').onclick = () => { done = true; res(true); close(); }; },
      onClose: () => { if (!done) res(false); }
    });
  });

  /* ---------- Menu contextuel ---------- */
  UI.menu = (anchor, items) => {
    UI.closeMenu();
    const m = document.createElement('div'); m.className = 'menu';
    m.innerHTML = items.map((it, i) => '<button data-i="' + i + '">' + (it.icon ? '<span class="ico ' + (it.tone || '') + '">' + UI.icon(it.icon) + '</span>' : '') + '<span>' + it.label + '</span>' + (it.kbd ? '<kbd>' + it.kbd + '</kbd>' : '') + '</button>').join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const w = m.offsetWidth, h = m.offsetHeight;
    let x = Math.min(r.right - w, window.innerWidth - w - 10); x = Math.max(10, x);
    let y = r.bottom + 8; if (y + h > window.innerHeight - 10) y = r.top - h - 8;
    m.style.left = x + 'px'; m.style.top = Math.max(10, y) + 'px';
    m.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; UI.closeMenu(); items[+b.dataset.i].run(); };
    setTimeout(() => document.addEventListener('click', UI.closeMenu, { once: true }), 0);
    UI._menu = m;
  };
  UI.closeMenu = () => { if (UI._menu) { UI._menu.remove(); UI._menu = null; } };

  /* ---------- Graphiques SVG ---------- */
  const charts = new Map(); let cid = 0;
  UI.chart = (spec) => { const id = 'ch' + (++cid); charts.set(id, spec); return '<div class="chart" data-chart="' + id + '"></div>'; };
  UI.mountCharts = (root = document) => {
    $$('[data-chart]', root).forEach(el => {
      const spec = charts.get(el.dataset.chart); if (!spec) return;
      charts.delete(el.dataset.chart);
      if (spec.type === 'area') area(el, spec);
      else if (spec.type === 'donut') donut(el, spec);
      else if (spec.type === 'spark') spark(el, spec);
      else if (spec.type === 'bars') bars(el, spec);
    });
  };
  const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  const smooth = pts => {
    if (pts.length < 2) return '';
    let d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const t = .18;
      const c1x = p1[0] + (p2[0] - p0[0]) * t, c1y = p1[1] + (p2[1] - p0[1]) * t;
      const c2x = p2[0] - (p3[0] - p1[0]) * t, c2y = p2[1] - (p3[1] - p1[1]) * t;
      d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d;
  };

  function area(el, s) {
    const W = el.clientWidth || 600, H = s.height || 240, pl = 8, pr = 8, pt = 12, pb = 26, yw = 52;
    const n = s.labels.length;
    const all = s.series.flatMap(x => x.values);
    const maxV = niceMax(Math.max(0, ...all)), minV = Math.min(0, ...all) < 0 ? -niceMax(-Math.min(...all)) : 0;
    const x0 = pl + yw, x1 = W - pr, y0 = pt, y1 = H - pb;
    const X = i => n <= 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1);
    const Y = v => y1 - (y1 - y0) * (v - minV) / (maxV - minV || 1);
    const gid = 'g' + Math.random().toString(36).slice(2, 7);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '"><defs>';
    s.series.forEach((se, k) => { svg += '<linearGradient id="' + gid + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + se.color + '" stop-opacity="' + (se.fill ? .28 : 0) + '"/><stop offset="1" stop-color="' + se.color + '" stop-opacity="0"/></linearGradient>'; });
    svg += '</defs>';
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = minV + (maxV - minV) * i / ticks, y = Y(v);
      svg += '<line class="grid-l" x1="' + x0 + '" x2="' + x1 + '" y1="' + y + '" y2="' + y + '"' + (v === 0 && minV < 0 ? ' style="stroke:var(--line-2)"' : '') + '/>';
      svg += '<text class="axis-t" x="' + (x0 - 10) + '" y="' + (y + 3.5) + '" text-anchor="end">' + (s.fmtAxis || U.eurK)(v) + '</text>';
    }
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((x1 - x0) / 76))));
    s.labels.forEach((l, i) => {
      const last = i === n - 1;
      if (!last && (i % every !== 0 || X(n - 1) - X(i) < 84)) return;
      const anc = n > 1 && i === 0 ? 'start' : n > 1 && last ? 'end' : 'middle';
      svg += '<text class="axis-t" x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="' + anc + '">' + U.esc(l) + '</text>';
    });
    s.series.forEach((se, k) => {
      const pts = se.values.map((v, i) => [X(i), Y(v)]);
      const line = smooth(pts);
      if (se.fill) svg += '<path d="' + line + ' L' + X(n - 1) + ',' + Y(Math.max(minV, 0)) + ' L' + X(0) + ',' + Y(Math.max(minV, 0)) + ' Z" fill="url(#' + gid + k + ')"/>';
      svg += '<path d="' + line + '" fill="none" stroke="' + se.color + '" stroke-width="2" stroke-linecap="round"' + (se.dash ? ' stroke-dasharray="4 4"' : '') + '/>';
    });
    svg += '<line class="xhair" y1="' + y0 + '" y2="' + y1 + '" x1="-10" x2="-10" style="opacity:0"/>';
    s.series.forEach((se, k) => { svg += '<circle class="dot' + k + '" r="4.5" fill="' + se.color + '" stroke="var(--card)" stroke-width="2" cx="-10" cy="-10" style="opacity:0"/>'; });
    svg += '<rect x="' + x0 + '" y="0" width="' + (x1 - x0) + '" height="' + H + '" fill="transparent" class="hit"/></svg>';
    el.innerHTML = svg + '<div class="tip"></div>';
    const sv = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('.xhair');
    const move = e => {
      const r = sv.getBoundingClientRect();
      const px = (e.clientX - r.left) * (W / r.width);
      const i = U.clamp(Math.round((px - x0) / ((x1 - x0) / Math.max(n - 1, 1))), 0, n - 1);
      xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); xh.style.opacity = 1;
      s.series.forEach((se, k) => { const c = sv.querySelector('.dot' + k); c.setAttribute('cx', X(i)); c.setAttribute('cy', Y(se.values[i])); c.style.opacity = 1; });
      tip.innerHTML = '<div class="th">' + U.esc(s.tipLabels ? s.tipLabels[i] : s.labels[i]) + '</div>' + s.series.map(se => '<div class="tr"><i style="background:' + se.color + '"></i>' + se.name + '<b>' + (s.fmt || U.eur)(se.values[i]) + '</b></div>').join('') + (s.extra ? s.extra(i) : '');
      tip.classList.add('on');
      const tx = X(i) * r.width / W;
      tip.style.left = Math.min(Math.max(tx - tip.offsetWidth / 2, 0), r.width - tip.offsetWidth) + 'px';
      tip.style.top = '-8px';
      tip.style.transform = 'translateY(-100%)';
    };
    const leave = () => { tip.classList.remove('on'); xh.style.opacity = 0; s.series.forEach((se, k) => sv.querySelector('.dot' + k).style.opacity = 0); };
    sv.addEventListener('pointermove', move); sv.addEventListener('pointerleave', leave);
  }

  function donut(el, s) {
    const size = s.size || 150, r = size / 2, th = s.thickness || 18, R = r - 2, rr = R - th;
    const tot = U.sum(s.data, d => Math.max(d.value, 0));
    let a = -Math.PI / 2;
    let svg = '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" style="width:' + size + 'px">';
    if (tot <= 0) svg += '<circle cx="' + r + '" cy="' + r + '" r="' + (R - th / 2) + '" fill="none" stroke="var(--card-3)" stroke-width="' + th + '"/>';
    const gap = s.data.filter(d => d.value > 0).length > 1 ? 0.035 : 0;
    s.data.forEach((d, i) => {
      if (d.value <= 0) return;
      const ang = (d.value / tot) * Math.PI * 2;
      const a0 = a + gap / 2, a1 = a + ang - gap / 2; a += ang;
      if (a1 <= a0) return;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (rad, ang) => [r + rad * Math.cos(ang), r + rad * Math.sin(ang)];
      const [xa, ya] = p(R, a0), [xb, yb] = p(R, a1), [xc, yc] = p(rr, a1), [xd, yd] = p(rr, a0);
      const path = ang >= Math.PI * 2 - 0.001
        ? 'M' + (r) + ',' + (r - R) + ' A' + R + ',' + R + ' 0 1 1 ' + (r - 0.01) + ',' + (r - R) + ' L' + (r - 0.01) + ',' + (r - rr) + ' A' + rr + ',' + rr + ' 0 1 0 ' + r + ',' + (r - rr) + 'Z'
        : 'M' + xa + ',' + ya + ' A' + R + ',' + R + ' 0 ' + large + ' 1 ' + xb + ',' + yb + ' L' + xc + ',' + yc + ' A' + rr + ',' + rr + ' 0 ' + large + ' 0 ' + xd + ',' + yd + 'Z';
      svg += '<path d="' + path + '" fill="' + d.color + '" data-i="' + i + '" style="transition:opacity .2s;cursor:pointer"/>';
    });
    svg += '</svg>';
    el.style.width = size + 'px'; el.style.height = size + 'px';
    el.innerHTML = svg + '<div class="donut-center"><div><b>' + (s.center || '') + '</b><span>' + (s.centerLabel || '') + '</span></div></div><div class="tip"></div>';
    const tip = el.querySelector('.tip');
    el.querySelectorAll('path').forEach(pth => {
      pth.addEventListener('pointerenter', () => {
        const d = s.data[+pth.dataset.i];
        el.querySelectorAll('path').forEach(o => o.style.opacity = o === pth ? 1 : .35);
        tip.innerHTML = '<div class="tr"><i style="background:' + d.color + '"></i>' + U.esc(d.label) + '<b>' + (s.fmt || U.eur)(d.value) + '</b></div><div class="tr faint">Part<b>' + U.pct(d.value / tot) + '</b></div>';
        tip.classList.add('on'); tip.style.left = size / 2 - 80 + 'px'; tip.style.top = '-12px'; tip.style.transform = 'translateY(-100%)';
      });
      pth.addEventListener('pointerleave', () => { el.querySelectorAll('path').forEach(o => o.style.opacity = 1); tip.classList.remove('on'); });
    });
  }

  function spark(el, s) {
    const W = 200, H = 46, v = s.values; if (!v.length) return;
    const mx = Math.max(...v), mn = Math.min(...v, 0), rg = mx - mn || 1;
    const pts = v.map((x, i) => [i * W / Math.max(v.length - 1, 1), H - 4 - (H - 10) * (x - mn) / rg]);
    const gid = 'sp' + Math.random().toString(36).slice(2, 7);
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="width:100%;height:100%"><defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + s.color + '" stop-opacity=".25"/><stop offset="1" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient></defs><path d="' + smooth(pts) + ' L' + W + ',' + H + ' L0,' + H + 'Z" fill="url(#' + gid + ')"/><path d="' + smooth(pts) + '" fill="none" stroke="' + s.color + '" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
  }

  function bars(el, s) {
    const W = el.clientWidth || 600, H = s.height || 200, pb = 26, pt = 10, yw = 52;
    const n = s.labels.length;
    const vals = s.values;
    const mx = niceMax(Math.max(0, ...vals)), mn = Math.min(0, ...vals) < 0 ? -niceMax(-Math.min(...vals)) : 0;
    const x0 = yw, x1 = W, y0 = pt, y1 = H - pb;
    const Y = v => y1 - (y1 - y0) * (v - mn) / (mx - mn || 1);
    const bw = Math.min(34, (x1 - x0) / n * .62);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '">';
    for (let i = 0; i <= 4; i++) { const v = mn + (mx - mn) * i / 4, y = Y(v); svg += '<line class="grid-l" x1="' + x0 + '" x2="' + x1 + '" y1="' + y + '" y2="' + y + '"/><text class="axis-t" x="' + (x0 - 10) + '" y="' + (y + 3.5) + '" text-anchor="end">' + U.eurK(v) + '</text>'; }
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((x1 - x0) / 50))));
    vals.forEach((v, i) => {
      const cx = x0 + (x1 - x0) * (i + .5) / n;
      const ya = Y(Math.max(v, 0)), yb = Y(Math.min(v, 0));
      const h = Math.max(yb - ya, v === 0 ? 0 : 2);
      const col = typeof s.color === 'function' ? s.color(v, i) : s.color;
      const rr = Math.min(4, bw / 2, h);
      const path = v >= 0
        ? 'M' + (cx - bw / 2) + ',' + (ya + h) + ' V' + (ya + rr) + ' Q' + (cx - bw / 2) + ',' + ya + ' ' + (cx - bw / 2 + rr) + ',' + ya + ' H' + (cx + bw / 2 - rr) + ' Q' + (cx + bw / 2) + ',' + ya + ' ' + (cx + bw / 2) + ',' + (ya + rr) + ' V' + (ya + h) + 'Z'
        : 'M' + (cx - bw / 2) + ',' + ya + ' V' + (ya + h - rr) + ' Q' + (cx - bw / 2) + ',' + (ya + h) + ' ' + (cx - bw / 2 + rr) + ',' + (ya + h) + ' H' + (cx + bw / 2 - rr) + ' Q' + (cx + bw / 2) + ',' + (ya + h) + ' ' + (cx + bw / 2) + ',' + (ya + h - rr) + ' V' + ya + 'Z';
      svg += '<path d="' + path + '" fill="' + col + '" data-i="' + i + '" style="transition:opacity .2s"/>';
      svg += '<rect x="' + (cx - (x1 - x0) / n / 2) + '" y="0" width="' + ((x1 - x0) / n) + '" height="' + H + '" fill="transparent" data-h="' + i + '"/>';
      if (i === n - 1 || (i % every === 0 && (n - 1 - i) * (x1 - x0) / n >= 44)) svg += '<text class="axis-t" x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle">' + U.esc(s.labels[i]) + '</text>';
    });
    svg += '</svg>';
    el.innerHTML = svg + '<div class="tip"></div>';
    const tip = el.querySelector('.tip'), sv = el.querySelector('svg');
    sv.querySelectorAll('[data-h]').forEach(h => {
      h.addEventListener('pointerenter', () => {
        const i = +h.dataset.h, r = sv.getBoundingClientRect();
        sv.querySelectorAll('path[data-i]').forEach(p => p.style.opacity = +p.dataset.i === i ? 1 : .4);
        tip.innerHTML = '<div class="th">' + U.esc(s.tipLabels ? s.tipLabels[i] : s.labels[i]) + '</div><div class="tr">' + (s.name || 'Valeur') + '<b>' + (s.fmt || U.eur)(vals[i]) + '</b></div>' + (s.extra ? s.extra(i) : '');
        tip.classList.add('on');
        const cx = (x0 + (x1 - x0) * (i + .5) / n) * r.width / W;
        tip.style.left = Math.min(Math.max(cx - tip.offsetWidth / 2, 0), r.width - tip.offsetWidth) + 'px';
        tip.style.top = '-8px'; tip.style.transform = 'translateY(-100%)';
      });
      h.addEventListener('pointerleave', () => { sv.querySelectorAll('path[data-i]').forEach(p => p.style.opacity = 1); tip.classList.remove('on'); });
    });
  }

  /* ---------- Delta ---------- */
  UI.delta = (cur, prev, invert) => {
    if (prev == null || !isFinite(prev)) return '';
    if (prev === 0 && cur === 0) return '<span class="delta flat">=</span>';
    if (prev === 0) return '<span class="delta ' + ((cur > 0) !== !!invert ? 'up' : 'down') + '">nouveau</span>';
    const d = (cur - prev) / Math.abs(prev);
    const up = d >= 0;
    return '<span class="delta ' + (Math.abs(d) < .005 ? 'flat' : (up !== !!invert ? 'up' : 'down')) + '">' + (up ? '↑' : '↓') + ' ' + Math.abs(d * 100).toFixed(0) + ' %</span>';
  };

  /* ---------- Sélecteur de produit (autocomplete) ---------- */
  UI.productPicker = (input, { onPick, allowCreate = true, showStock = true }) => {
    const wrap = input.parentElement;
    let list = null, idx = 0, items = [];
    const close = () => { if (list) { list.remove(); list = null; } };
    const render = () => {
      const q = U.norm(input.value.trim());
      const C = S.calc();
      const prods = S.state.products.filter(p => !p.archived);
      items = prods.map(p => ({ p, s: score(p, q) })).filter(x => x.s > 0 || !q).sort((a, b) => b.s - a.s || (C.prod[b.p.id].qty - C.prod[a.p.id].qty)).slice(0, 30).map(x => x.p);
      close();
      list = document.createElement('div'); list.className = 'picker-list';
      let html = items.map((p, i) => {
        const c = C.prod[p.id];
        return '<div class="picker-item' + (i === idx ? ' on' : '') + '" data-i="' + i + '">' + UI.mini(p) + '<div style="min-width:0"><div class="row-t" style="font-size:13.5px">' + U.esc(p.name) + '</div><div class="row-s">' + U.esc(UI.pSub(p)) + '</div></div>' + (showStock ? '<div class="meta">' + U.n(c.qty) + ' en stock<br>' + U.eur(c.cost) + '</div>' : '') + '</div>';
      }).join('');
      if (allowCreate && input.value.trim()) html += '<div class="picker-item create" data-create="1">' + UI.icon('plus') + ' Créer « ' + U.esc(input.value.trim()) + ' »</div>';
      if (!html) html = '<div class="picker-item faint">Tape un nom pour créer un produit</div>';
      list.innerHTML = html;
      wrap.appendChild(list);
      list.onmousedown = e => {
        e.preventDefault();
        const it = e.target.closest('[data-i]');
        if (it) { pick(items[+it.dataset.i]); return; }
        if (e.target.closest('[data-create]')) create();
      };
    };
    const pick = p => { input.value = p.name; close(); onPick(p); };
    const create = () => {
      const name = input.value.trim(); close();
      window.Forms.product(null, { name, noStock: true, onSaved: p => { input.value = p.name; onPick(p); } });
    };
    input.addEventListener('focus', () => { idx = 0; render(); });
    input.addEventListener('input', () => { idx = 0; render(); });
    input.addEventListener('blur', () => setTimeout(close, 120));
    input.addEventListener('keydown', e => {
      if (!list) return;
      if (e.key === 'ArrowDown') { idx = Math.min(idx + 1, items.length - 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { idx = Math.max(idx - 1, 0); render(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[idx]) pick(items[idx]); else if (allowCreate && input.value.trim()) create(); }
      else if (e.key === 'Escape') { close(); e.stopPropagation(); }
    });
  };
  function score(p, q) {
    if (!q) return 1;
    const hay = U.norm([p.name, p.set, p.sku, p.lang, REF.type(p.type).label].join(' '));
    const words = q.split(/\s+/);
    let s = 0;
    for (const w of words) { const i = hay.indexOf(w); if (i < 0) return 0; s += i === 0 ? 3 : 1; }
    return s;
  }
  UI.score = score;

  /* ---------- Image : redimensionnement ---------- */
  UI.readImage = (file, max = 520) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', .82));
      };
      img.onerror = rej; img.src = fr.result;
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });

  /* ---------- Fichiers ---------- */
  UI.download = (name, content, type = 'application/json') => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  UI.csv = rows => '﻿' + rows.map(r => r.map(v => { const s = v == null ? '' : typeof v === 'number' ? String(U.round2(v)).replace('.', ',') : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n');

  /* ---------- Effet holo (inclinaison + reflet) ---------- */
  UI.bindHolo = root => {
    $$('.holo', root).forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%'); el.style.setProperty('--ga', '1');
        el.style.setProperty('--ry', ((x - .5) * 8).toFixed(2) + 'deg'); el.style.setProperty('--rx', ((.5 - y) * 6).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.style.setProperty('--ga', '0'); });
    });
  };

  window.UI = UI;
})();
