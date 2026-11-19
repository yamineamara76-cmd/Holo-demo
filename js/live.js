/* HOLO — mode live : on note ce qui sort pendant le live, on entre ce qu'on a touché à la fin, HOLO enregistre tout */
(function () {
  'use strict';
  const { icon } = UI;
  const esc = U.esc;
  let st = null; // { id, el, sel, q, filter, timer, phase: 'live' | 'recap' }

  const live = () => st && S.get('lives', st.id);
  const queue = l => (l && Array.isArray(l.queue) ? l.queue : []);
  const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return U.pad(Math.floor(s / 3600)) + ':' + U.pad(Math.floor(s / 60) % 60) + ':' + U.pad(s % 60); };
  const pname = id => (S.product(id) || {}).name || 'Article supprimé';
  const short = n => String(n || '').replace(/\s*30e Anniversaire\s*/i, ' 30 ans ').replace(/\s+/g, ' ').trim();

  /* Démarre un nouveau live et ouvre le mode plein écran */
  function start() {
    const d = new Date();
    const l = S.upsert('lives', { date: U.today(), platformId: 'pf_whatnot', title: 'Live du ' + U.date(U.today()), pins: [], queue: [], startedAt: Date.now(), start: U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()) });
    open(l.id);
  }

  function open(id, phase) {
    close(true);
    const l = S.get('lives', id); if (!l) return;
    if (!Array.isArray(l.pins)) l.pins = [];
    if (!Array.isArray(l.queue)) l.queue = [];
    const el = document.createElement('div');
    el.className = 'live';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    st = { id, el, sel: null, q: '', filter: l.pins.length ? 'pins' : 'all', timer: null, phase: phase || (l.endedAt && l.queue.length ? 'recap' : 'live') };
    bind();
    render();
    st.timer = setInterval(tick, 1000); tick();
  }

  function tick() {
    const l = live(); if (!l || !st) return;
    const t = st.el.querySelector('[data-timer]');
    if (t) t.textContent = l.startedAt && !l.endedAt ? hms(Date.now() - l.startedAt) : U.date(l.date) + (l.start ? ' · ' + l.start : '');
  }

  /* Quantités déjà sorties pendant ce live (pas encore validées) */
  function reserved(l) {
    const r = {}, seen = new Set();
    if (l.validated) return r;
    queue(l).forEach(x => { if (seen.has(x.g)) return; seen.add(x.g); r[x.pid] = (r[x.pid] || 0) + 1; });
    return r;
  }

  /* Date du plus vieil achat reçu de chaque produit : on vend dans l'ordre de la liste d'achat */
  function buyOrder() {
    const o = {};
    S.state.purchases.forEach(pu => { if (pu.status !== 'received') return; const d = (pu.receivedAt || pu.date || '') + (pu.createdAt || ''); (pu.lines || []).forEach(x => { if (!o[x.productId] || d < o[x.productId]) o[x.productId] = d; }); });
    return o;
  }

  function products() {
    const C = S.calc(), l = live(), q = U.norm(st.q.trim()), r = reserved(l);
    const left = p => C.prod[p.id].qty - (r[p.id] || 0);
    let list = S.state.products.filter(p => !p.archived && !p.keep && !REF.isSupply(p.type) && (left(p) > 0 || l.pins.includes(p.id)));
    if (st.filter === 'pins' && !q) list = list.filter(p => l.pins.includes(p.id));
    if (q) list = S.state.products.filter(p => !p.archived && !p.keep && !REF.isSupply(p.type) && UI.score(p, q) > 0).sort((a, b) => UI.score(b, q) - UI.score(a, q));
    else { const o = buyOrder(); list.sort((a, b) => (l.pins.includes(b.id) - l.pins.includes(a.id)) || (o[a.id] || '9') .localeCompare(o[b.id] || '9') || left(b) - left(a)); }
    return list.slice(0, 120).map(p => ({ p, left: left(p) }));
  }

  /* ---------- Pendant le live ---------- */
  function frameLive() {
    return '<div class="live-top"><div class="rec"><span class="live-dot"></span>EN LIVE</div>'
      + '<div><div class="title" data-title></div><div class="mono faint" style="font-size:12px" data-timer>—</div></div>'
      + '<div class="live-stats" data-stats></div>'
      + '<button class="btn btn-primary" data-a="end">' + icon('stop') + 'Terminer</button></div>'
      + '<div class="live-body"><div class="live-left">'
      + '<div class="toolbar"><label class="input-search">' + icon('search') + '<input type="search" data-q placeholder="Chercher un produit…"></label><div class="seg" data-filters></div></div>'
      + '<div class="lgrid" data-grid></div></div>'
      + '<div class="live-right"><div class="sell-box" data-sell></div><div class="live-feed" data-feed></div></div></div>';
  }

  function stats(l) {
    const qu = queue(l), it = (k, v) => '<div><div class="l">' + k + '</div><div class="v">' + v + '</div></div>';
    return it('Articles', new Set(qu.map(x => x.g)).size) + it('Lignes', qu.length) + it('Sans n° enchère', qu.filter(x => !x.give && !String(x.auc || '').trim()).length);
  }

  function grid() {
    const l = live(), list = products();
    if (!list.length) return '<div class="empty" style="grid-column:1/-1"><div class="em">☆</div><h4>' + (st.filter === 'pins' && !st.q ? 'Aucun produit épinglé' : 'Aucun produit') + '</h4><p>' + (st.filter === 'pins' && !st.q ? 'Épingle (★) les produits que tu vas vendre ce soir pour les retrouver en un clic.' : 'Essaie un autre mot-clé.') + '</p></div>';
    return list.map(({ p, left }) => {
      const pin = l.pins.includes(p.id), nb = S.boostersOf(p);
      return '<button class="ltile' + (st.sel === p.id ? ' on' : '') + '" data-p="' + p.id + '">'
        + '<span class="pin' + (pin ? ' on' : '') + '" data-pin="' + p.id + '" title="Épingler">' + (pin ? '★' : '☆') + '</span>'
        + '<div style="display:flex;gap:10px;align-items:center">' + UI.mini(p) + '</div>'
        + '<div class="n">' + esc(p.name) + '</div>'
        + '<div class="m"><span class="' + (left <= 0 ? 'neg' : '') + '">×' + U.n(left) + '</span><span>' + (nb > 1 ? nb + ' boosters' : '') + '</span></div></button>';
    }).join('');
  }

  function sellBox() {
    const l = live(), p = st.sel && S.product(st.sel);
    const head = '<div style="display:flex;justify-content:space-between;align-items:center"><span class="label" style="margin:0">Ce qui sort</span>' + V.pfTag(l.platformId) + '</div>';
    if (!p) return head + '<div class="prod"><span class="faint" style="font-weight:500">Touche un article à gauche</span></div>'
      + '<div class="faint" style="font-size:12.5px;line-height:1.5">Pendant le live, tu notes juste ce qui sort. À la fin, tu entres ce que tu as touché pour chaque ligne, dans l’ordre des ventes Whatnot.</div>'
      + '<button class="btn btn-sm" data-a="exp">' + icon('receipt') + 'Dépense du live</button>';
    const nb = S.boostersOf(p), canOpen = nb > 1 || p.type !== 'booster', bp = canOpen ? S.boosterFor(p) : null;
    return head + '<div class="prod">' + esc(p.name) + '</div>'
      + (canOpen
        ? '<div class="open-row"><button class="btn btn-primary sold-btn" data-a="open">' + icon('sparkle') + 'Ouvert</button><label class="open-n"><input type="number" min="1" max="60" inputmode="numeric" data-opn value="' + (nb > 1 ? nb : '') + '" placeholder="?"><span>entrées</span></label></div>'
          + '<div class="faint" style="font-size:12px;margin-top:-4px">1 entrée par booster vendu, avec n° d’enchère et pseudo' + (bp ? '' : ' · le produit « Booster ' + esc(p.set || '') + ' » sera créé') + '</div>'
          + '<button class="btn btn-block" data-a="whole">' + icon('tag') + 'Vendu entier</button>'
        : '<button class="btn btn-primary btn-block sold-btn" data-a="whole">' + icon('tag') + 'Vendu</button>')
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      + '<button class="btn btn-sm" data-a="give">' + icon('gift') + 'Giveaway' + (nb > 1 ? ' entier' : '') + '</button>'
      + '<button class="btn btn-sm" data-a="exp">' + icon('receipt') + 'Dépense</button></div>';
  }

  /* Liste des lignes dans l'ordre, groupées par article */
  function groups(l) {
    const out = [];
    queue(l).forEach((x, i) => { let g = out[out.length - 1]; if (!g || g.g !== x.g) out.push(g = { g: x.g, pid: x.pid, mode: x.mode, lines: [] }); g.lines.push(Object.assign({ i }, x)); });
    return out;
  }
  const gLabel = g => short(pname(g.pid)) + (g.mode === 'open' ? ' · ouvert' : '');

  function feed() {
    const l = live(), gs = groups(l);
    let num = 0;
    return '<div class="label" style="padding:16px 22px 8px;margin:0">Dans l’ordre · ' + queue(l).length + ' ligne' + (queue(l).length > 1 ? 's' : '') + '</div>'
      + (gs.length ? gs.map(g => { const a = num + 1; num += g.lines.length; return '<div class="feed-g"><div class="feed-r"><span>' + icon(g.mode === 'open' ? 'sparkle' : g.lines[0].give ? 'gift' : 'tag', 'xs') + ' ' + esc(gLabel(g)) + (g.lines[0].give ? ' <span class="faint">· giveaway</span>' : '') + '</span><span class="num faint">' + (g.lines.length > 1 ? '#' + a + '–' + num : '#' + a) + '</span><button class="x" data-ungroup="' + g.g + '" title="Retirer">' + icon('undo') + '</button></div>'
        + (g.lines[0].give ? '' : '<div class="feed-auc">' + g.lines.map(x => '<div class="fa-r"><span class="fa-k">' + (g.mode === 'open' ? 'B' + x.k : 'Vente') + '</span><label><input inputmode="numeric" data-auc="' + x.id + '" placeholder="n°" value="' + esc(String(x.auc || '')) + '" autocomplete="off"></label><label><input data-pseudo="' + x.id + '" placeholder="pseudo" value="' + esc(x.pseudo || '') + '" autocomplete="off" autocapitalize="off" spellcheck="false"></label></div>').join('') + '</div>') + '</div>'; }).reverse().join('')
        : '<div class="faint" style="padding:6px 22px;font-size:13px">Rien pour l’instant.</div>')
      + expList(l);
  }
  const expList = l => S.state.expenses.filter(e => e.liveId === l.id).map(e => '<div class="feed-r"><span>' + icon('receipt', 'xs') + ' ' + esc(e.label || e.category) + '</span><span class="num neg">−' + U.eur(e.amount) + '</span><button class="x" data-undo="expenses:' + e.id + '" title="Annuler">' + icon('undo') + '</button></div>').join('');

  function add(mode, give) {
    const l = live(), p = st.sel && S.product(st.sel);
    if (!p) { UI.toast('Choisis d’abord un produit'); return; }
    const left = S.calc().prod[p.id].qty - (reserved(l)[p.id] || 0);
    if (left <= 0) { UI.toast('Plus de stock pour ' + p.name); return; }
    let n = 1;
    if (mode === 'open') {
      const c = st.el.querySelector('[data-opn]'); n = Math.round(U.num(c ? c.value : '') || S.boostersOf(p));
      if (!(n >= 1)) { UI.toast('Mets le nombre d’entrées (boosters dedans)'); if (c) c.focus(); return; }
      if (n !== S.boostersOf(p)) { p.boosters = n; S.upsert('products', p); }
    }
    const g = U.uid();
    for (let k = 1; k <= n; k++) l.queue.push({ id: U.uid(), g, pid: p.id, mode, k, n, amt: '', auc: '', pseudo: '', give: !!give });
    if (left - 1 <= 0) st.sel = null;
    S.upsert('lives', l);
    flash();
    if (!give) { const f = st.el.querySelector('[data-auc="' + l.queue[l.queue.length - n].id + '"]'); if (f) f.focus(); }
    UI.toast(mode === 'open' ? p.name + ' ouvert · ' + n + ' lignes' : (give ? 'Giveaway · ' : 'Vendu · ') + p.name, { undo: () => ungroup(g) });
  }
  function ungroup(g) { const l = live(); if (!l) return; l.queue = queue(l).filter(x => x.g !== g); S.upsert('lives', l); }
  function flash() {
    const b = st.el.querySelector('.sold-btn'); if (!b) return;
    b.animate([{ transform: 'scale(1)', boxShadow: '0 0 0 0 var(--accent)' }, { transform: 'scale(1.03)', boxShadow: '0 0 0 14px transparent' }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
  }

  /* ---------- Fin du live : les montants ---------- */
  const aucN = x => { const m = String(x.auc || '').match(/\d+/); return m ? +m[0] : null; };
  const answered = x => x.give || (x.amt !== '' && x.amt != null);
  /* Lignes dans l'ordre des enchères (celles sans numéro à la fin, dans l'ordre du live) */
  function ordered(l) {
    return queue(l).map((x, i) => ({ x, i })).sort((a, b) => { const na = aucN(a.x), nb = aucN(b.x); return (na == null) - (nb == null) || (na || 0) - (nb || 0) || a.i - b.i; }).map(o => o.x);
  }
  const lineLab = x => x.mode === 'open' ? 'booster ' + x.k + '/' + x.n : 'vendu entier';

  function frameRecap() {
    const l = live(), wn = l.platformId === 'pf_whatnot';
    return '<div class="live-top"><div class="rec">' + icon('check') + 'FIN DU LIVE</div>'
      + '<div><div class="title" data-title></div><div class="mono faint" style="font-size:12px" data-timer>—</div></div>'
      + '<div class="live-stats" data-rstats></div>'
      + '<button class="btn btn-ghost" data-a="later">Plus tard</button></div>'
      + '<div class="recap"><div class="recap-in">'
      + '<div data-ask></div>'
      + '<div class="label" style="margin:22px 0 8px">Toutes les lignes</div>'
      + '<div data-rlist></div>'
      + '<div class="recap-f">' + (wn ? '<label class="chk-paid"><input type="checkbox" data-paid' + (l.paidNow === false ? '' : ' checked') + '><span>Compter tout de suite sur le solde Whatnot</span></label>' : '')
      + '<span class="grow"></span><button class="btn" data-a="back">' + icon('undo') + 'Retour au live</button><button class="btn btn-primary" data-a="validate">' + icon('check') + 'Valider le live</button></div>'
      + '</div></div>';
  }

  function curLine(l) {
    const o = ordered(l);
    if (st.cur && o.some(x => x.id === st.cur)) return st.cur;
    const f = o.find(x => !answered(x));
    return f ? f.id : null;
  }
  function ask() {
    const l = live(), o = ordered(l), id = curLine(l), x = o.find(y => y.id === id);
    const done = o.filter(answered).length, bar = '<div class="ask-p"><span>' + done + ' / ' + o.length + ' remplies</span><div class="bar holo-bar" style="height:5px;flex:1"><i style="width:' + (o.length ? done / o.length * 100 : 0) + '%"></i></div></div>';
    if (!o.length) return '';
    if (!x) return '<div class="ask ask-done">' + bar + '<div class="ask-q">C’est tout bon</div><div class="ask-s">' + U.eur(U.sum(o, y => y.give ? 0 : U.num(y.amt))) + ' touchés sur ' + o.length + ' lignes. Vérifie la liste puis valide.</div>'
      + '<button class="btn btn-primary btn-block sold-btn" data-a="validate">' + icon('check') + 'Valider le live</button></div>';
    const n = aucN(x);
    return '<div class="ask">' + bar
      + '<div class="ask-q">' + (n != null ? 'Enchère <b>' + n + '</b>' : 'Ligne sans numéro') + '</div>'
      + '<div class="ask-s">' + (x.pseudo ? '<b>' + esc(x.pseudo) + '</b> · ' : '') + esc(short(pname(x.pid))) + ' · ' + lineLab(x) + '</div>'
      + '<div class="ask-l">Tu perçois combien ?</div>'
      + '<label class="rl-in ask-in"><input inputmode="decimal" data-ask="' + x.id + '" placeholder="0,00" value="' + (x.give ? '' : esc(String(x.amt === '' || x.amt == null ? '' : x.amt).replace('.', ','))) + '" autocomplete="off"><span>€</span></label>'
      + '<div class="ask-b"><button class="btn" data-a="prev">Précédent</button><button class="btn" data-a="askgive">' + icon('gift') + 'Giveaway</button><button class="btn btn-primary" data-a="next">Suivant ↵</button></div>'
      + '<div class="faint" style="font-size:12px">0 = giveaway. Entrée passe à l’enchère suivante.</div></div>';
  }
  function rlist() {
    const l = live(), cur = curLine(l), byAuc = ordered(l), order = {};
    byAuc.forEach((x, i) => order[x.id] = i);
    return groups(l).map(g => '<div class="rg"><div class="rg-h">' + UI.mini(S.product(g.pid)) + '<b>' + esc(gLabel(g)) + '</b></div>'
      + g.lines.map(x => '<div class="rl' + (x.give ? ' give' : '') + (x.id === cur ? ' cur' : '') + '" data-line="' + x.id + '">'
        + '<label class="rl-a"><span>#</span><input inputmode="numeric" data-auc="' + x.id + '" value="' + esc(String(x.auc || '')) + '" placeholder="—" autocomplete="off"></label>'
        + '<span class="rl-l" data-pick="' + x.id + '">' + (g.mode === 'open' ? 'Booster ' + x.k + '/' + x.n : 'Vendu entier') + (x.pseudo ? ' <span class="faint">· ' + esc(x.pseudo) + '</span>' : '') + '</span>'
        + '<label class="rl-in"><input inputmode="decimal" data-amt="' + x.id + '" placeholder="' + (x.give ? 'offert' : '0,00') + '" value="' + (x.give ? '' : esc(String(x.amt === '' || x.amt == null ? '' : x.amt).replace('.', ','))) + '"' + (x.give ? ' disabled' : '') + ' autocomplete="off"><span>€</span></label>'
        + '<button class="btn btn-sm' + (x.give ? ' on' : '') + '" data-give="' + x.id + '">' + icon('gift') + '<span class="t">Giveaway</span></button></div>').join('') + '</div>').join('')
      || '<div class="faint" style="padding:20px;text-align:center">Aucune ligne. Retourne au live pour noter ce qui est sorti.</div>';
  }
  function rstats() {
    const l = live(), qu = queue(l);
    const got = U.sum(qu, x => x.give ? 0 : U.num(x.amt)), done = qu.filter(answered).length;
    const it = (k, v) => '<div><div class="l">' + k + '</div><div class="v">' + v + '</div></div>';
    return it('Touché', U.eur(got)) + it('Remplies', done + '/' + qu.length);
  }
  /* Redessine la question et la liste */
  function rrefresh(focus) {
    if (!st || st.phase !== 'recap') return;
    const E = st.el;
    E.querySelector('[data-ask]').innerHTML = ask();
    E.querySelector('[data-rlist]').innerHTML = rlist();
    E.querySelector('[data-rstats]').innerHTML = rstats();
    if (focus) { const f = E.querySelector('[data-ask]') .querySelector('input'); if (f) { f.focus(); f.select(); } }
  }
  /* Enregistre la réponse de la question en cours puis passe à la suivante */
  function answer(move) {
    const l = live(), inp = st.el.querySelector('input[data-ask]');
    if (inp) { const x = queue(l).find(y => y.id === inp.dataset.ask); if (x && !x.give) x.amt = inp.value.trim() === '' ? '' : U.num(inp.value); }
    const o = ordered(l), i = o.findIndex(y => y.id === (inp ? inp.dataset.ask : curLine(l)));
    if (move < 0) st.cur = i > 0 ? o[i - 1].id : i < 0 ? (o[o.length - 1] || {}).id : o[0].id;
    else { const nx = o.slice(i + 1).find(y => !answered(y)) || o.find(y => !answered(y)); st.cur = nx ? nx.id : null; }
    saveSoon(); rrefresh(true);
  }

  let saveT = null;
  const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(() => { const l = live(); if (l) S.upsert('lives', l); }, 600); };

  async function validate() {
    const l = live(); if (!l) return;
    const qu = queue(l);
    if (!qu.length) { UI.toast('Aucune ligne à valider'); return; }
    if (l.validated) { UI.toast('Ce live est déjà validé'); return; }
    const empty = qu.filter(x => !x.give && !(U.num(x.amt) > 0)).length;
    const got = U.sum(qu, x => x.give ? 0 : U.num(x.amt));
    const pf = S.get('platforms', l.platformId) || {}, whatnot = l.platformId === 'pf_whatnot', date = l.date || U.today();
    const now = !whatnot || l.paidNow !== false, accId = pf.accountId || S.state.accounts[0].id, acc = S.get('accounts', accId) || {};
    if (!(await UI.confirm('Valider le live ?', { ok: 'Valider', sub: U.eur(got) + ' touchés sur ' + qu.length + ' lignes.' + (empty ? ' ' + empty + ' giveaway' + (empty > 1 ? 's' : '') + ' (0 € ou vide).' : '') + ' Le stock sort tout de suite' + (now ? ' et ' + U.eur(got) + ' vont sur ' + (acc.name || 'le compte') + '.' : '. Les ventes restent « à encaisser ».') }))) return;
    clearTimeout(saveT);
    const sale = (pid, amt, x) => S.upsert('sales', { date, platformId: l.platformId, status: now ? 'paid' : 'pending', paidAt: now ? date : null, accountId: accId, lines: [{ productId: pid, qty: 1, unit: U.round2(amt) }], shippingCharged: 0, shippingCost: 0, fees: 0, feesAuto: false, shipped: false, buyer: (x.pseudo || '').trim(), notes: aucN(x) != null ? 'Enchère ' + aucN(x) : '', auction: aucN(x), liveId: l.id });
    const give = (pid, x) => S.upsert('adjustments', { date, kind: 'giveaway', productId: pid, qty: -1, liveId: l.id, notes: (aucN(x) != null ? 'Enchère ' + aucN(x) : '') + (x.pseudo ? (aucN(x) != null ? ' · ' : '') + x.pseudo : '') });
    groups(l).forEach(g => {
      const p = S.product(g.pid); if (!p) return;
      let target = g.pid;
      if (g.mode === 'open') {
        let bp = S.boosterFor(p);
        if (!bp) bp = S.upsert('products', { name: 'Booster ' + (p.set || p.name), type: 'booster', set: p.set || '', lang: p.lang || 'FR', condition: p.condition || 'Scellé', boosters: '', archived: false });
        S.upsert('adjustments', { date, kind: 'transform', productId: p.id, qty: -1, toProductId: bp.id, toQty: g.lines.length, unitCost: '', liveId: l.id, notes: 'Ouvert en live' });
        target = bp.id;
      }
      g.lines.forEach(x => { const a = U.num(x.amt); if (!x.give && a > 0) sale(target, a, x); else give(target, x); });
    });
    l.validated = Date.now();
    S.upsert('lives', l);
    close(true);
    summary(S.get('lives', l.id));
    if (window.App) App.render();
  }

  /* ---------- Rendu ---------- */
  function render() {
    if (!st) return;
    const l = live(); if (!l) return close(true);
    const E = st.el;
    if (E.dataset.phase !== st.phase) { E.dataset.phase = st.phase; E.innerHTML = st.phase === 'recap' ? frameRecap() : frameLive(); tick(); if (st.phase === 'recap') { st.cur = null; rrefresh(window.innerWidth > 860); } }
    E.querySelector('[data-title]').textContent = l.title || 'Live';
    if (st.phase === 'recap') { E.querySelector('[data-rstats]').innerHTML = rstats(); return; }
    E.querySelector('[data-stats]').innerHTML = stats(l);
    E.querySelector('[data-filters]').innerHTML = [['pins', '★ Épinglés'], ['all', 'Tout le stock']].map(([v, t]) => '<button class="' + (st.filter === v ? 'on' : '') + '" data-f="' + v + '">' + t + '</button>').join('');
    E.querySelector('[data-grid]').innerHTML = grid();
    E.querySelector('[data-feed]').innerHTML = feed();
    E.querySelector('[data-sell]').innerHTML = sellBox();
  }

  function bind() {
    const E = st.el;
    E.addEventListener('click', e => {
      const pin = e.target.closest('[data-pin]');
      if (pin) {
        e.stopPropagation();
        const l = live(), id = pin.dataset.pin;
        l.pins = l.pins.includes(id) ? l.pins.filter(x => x !== id) : l.pins.concat(id);
        S.upsert('lives', l); return;
      }
      const t = e.target.closest('[data-p]'); if (t) { st.sel = t.dataset.p; render(); if (window.innerWidth <= 860) E.querySelector('[data-sell]').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
      const f = e.target.closest('[data-f]'); if (f) { st.filter = f.dataset.f; render(); return; }
      const ug = e.target.closest('[data-ungroup]'); if (ug) { const l = live(), keep = queue(l).filter(x => x.g === ug.dataset.ungroup); ungroup(ug.dataset.ungroup); UI.toast('Retiré', { undo: () => { const l2 = live(); l2.queue = queue(l2).concat(keep); S.upsert('lives', l2); } }); return; }
      const u = e.target.closest('[data-undo]');
      if (u) { const [coll, id] = u.dataset.undo.split(':'); const obj = S.get(coll, id); if (obj) { S.remove(coll, id); UI.toast('Annulé', { undo: () => S.upsert(coll, obj) }); } return; }
      const pk = e.target.closest('[data-pick]'); if (pk) { st.cur = pk.dataset.pick; rrefresh(true); st.el.querySelector('[data-ask]').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
      const gv = e.target.closest('[data-give]');
      if (gv) {
        const l = live(), x = queue(l).find(y => y.id === gv.dataset.give); if (!x) return;
        x.give = !x.give; if (x.give) x.amt = '';
        const row = gv.closest('.rl'), inp = row.querySelector('[data-amt]');
        row.classList.toggle('give', x.give); gv.classList.toggle('on', x.give);
        inp.disabled = x.give; inp.value = ''; inp.placeholder = x.give ? 'offert' : '0,00';
        saveSoon(); rrefresh(); if (!x.give) { const f = E.querySelector('[data-amt="' + x.id + '"]'); if (f) f.focus(); } return;
      }
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'open') add('open');
      else if (k === 'whole') add('unit');
      else if (k === 'give') add('unit', true);
      else if (k === 'exp') Forms.expense(null, { liveId: st.id });
      else if (k === 'end') end();
      else if (k === 'back') { st.phase = 'live'; render(); }
      else if (k === 'later') { clearTimeout(saveT); const l = live(); if (l) S.upsert('lives', l); close(); UI.toast('Montants gardés. Reprends depuis l’onglet Lives.'); }
      else if (k === 'validate') validate();
      else if (k === 'next') answer(1);
      else if (k === 'prev') answer(-1);
      else if (k === 'askgive') { const l = live(), x = queue(l).find(y => y.id === curLine(l)); if (x) { x.give = true; x.amt = ''; } answer(1); }
    });
    E.addEventListener('input', e => {
      if (e.target.matches('[data-q]')) { st.q = e.target.value; E.querySelector('[data-grid]').innerHTML = grid(); }
      if (e.target.matches('[data-amt]')) { const l = live(), x = queue(l).find(y => y.id === e.target.dataset.amt); if (x) { x.amt = e.target.value.trim() === '' ? '' : U.num(e.target.value); E.querySelector('[data-rstats]').innerHTML = rstats(); E.querySelector('[data-ask]').innerHTML = ask(); saveSoon(); } }
      if (e.target.matches('[data-ask]')) { const l = live(), x = queue(l).find(y => y.id === e.target.dataset.ask); if (x && !x.give) { x.amt = e.target.value.trim() === '' ? '' : U.num(e.target.value); E.querySelector('[data-rstats]').innerHTML = rstats(); const r = E.querySelector('[data-amt="' + x.id + '"]'); if (r) r.value = e.target.value; saveSoon(); } }
      if (e.target.matches('[data-auc]')) { const l = live(), x = queue(l).find(y => y.id === e.target.dataset.auc); if (x) { x.auc = e.target.value.replace(/[^\d]/g, ''); if (st.phase === 'live') E.querySelector('[data-stats]').innerHTML = stats(l); saveSoon(); } }
      if (e.target.matches('[data-pseudo]')) { const l = live(), x = queue(l).find(y => y.id === e.target.dataset.pseudo); if (x) { x.pseudo = e.target.value; saveSoon(); } }
      if (e.target.matches('[data-paid]')) { const l = live(); if (l) { l.paidNow = e.target.checked; saveSoon(); } }
    });
    E.addEventListener('change', e => { if (e.target.matches('[data-auc]') && st.phase === 'recap') { const q = st.el.querySelector('[data-ask]'); if (!q.contains(document.activeElement)) q.innerHTML = ask(); } });
    E.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      if (e.target.matches('[data-ask]')) { e.preventDefault(); answer(1); return; }
      if (e.target.matches('[data-pseudo]')) {
        e.preventDefault();
        const r = e.target.closest('.fa-r'), nr = r.nextElementSibling;
        if (!nr) { e.target.blur(); return; }
        const cur = r.querySelector('[data-auc]'), nx = nr.querySelector('[data-auc]');
        if (!nx.value && cur.value) { nx.value = String(+cur.value + 1); nx.dispatchEvent(new Event('input', { bubbles: true })); }
        nx.focus(); nx.select(); return;
      }
      if (e.target.matches('[data-opn]')) { e.preventDefault(); add('open'); return; }
      if (e.target.matches('[data-auc]')) {
        e.preventDefault();
        const all = [...E.querySelectorAll('[data-auc]')], i = all.indexOf(e.target);
        if (st.phase === 'live') { const ps = e.target.closest('.fa-r').querySelector('[data-pseudo]'); ps.focus(); ps.select(); }
        else { if (st.phase === 'recap') rrefresh(); const n = E.querySelectorAll('[data-auc]')[i + 1]; if (n) n.focus(); }
        return;
      }
      if (e.target.matches('[data-q]')) {
        const first = products()[0];
        if (first) { st.sel = first.p.id; st.q = ''; e.target.value = ''; render(); }
        e.preventDefault();
      } else if (e.target.matches('[data-amt]')) {
        e.preventDefault();
        const all = [...E.querySelectorAll('[data-amt]:not([disabled])')], nx = all[all.indexOf(e.target) + 1];
        if (nx) nx.focus(); else E.querySelector('[data-a=validate]').focus();
      }
    });
  }

  async function end() {
    const l = live(); if (!l) return close();
    if (l.startedAt && !l.endedAt) {
      if (!(await UI.confirm('Terminer le live ?', { ok: 'Terminer', sub: 'Tu passes ensuite aux montants, ligne par ligne.' }))) return;
      const d = new Date();
      l.endedAt = Date.now(); l.end = U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
      S.upsert('lives', l);
    }
    st.phase = 'recap'; render();
  }

  function summary(l) {
    const s = V.liveStats(l);
    UI.open({
      title: 'Bilan du live', size: 'sm',
      body: '<div class="holo" style="min-height:0"><span class="holo-tag">GG</span><div class="kpi-l">Bénéfice net du live</div><div class="holo-v">' + U.eur(s.net) + '</div><div style="font-size:13px;opacity:.75">' + esc(l.title || '') + (s.mins ? ' · ' + Math.round(s.mins) + ' min' : '') + '</div></div>'
        + '<div class="kv"><div><div class="l">Touché</div><div class="v">' + U.eur(s.rev) + '</div></div><div><div class="l">Ventes</div><div class="v">' + s.sales.length + '</div></div><div><div class="l">Giveaways</div><div class="v">' + U.eur(s.give) + '</div></div></div>'
        + (s.sales.length && l.platformId === 'pf_whatnot' ? '<div class="faint" style="font-size:12.5px">' + (l.paidNow === false ? 'Tout est enregistré. Les ventes sont « à encaisser » jusqu’au versement Whatnot.' : 'Tout est enregistré. Le stock est à jour et le solde Whatnot aussi.') + '</div>' : ''),
      foot: '<span style="flex:1"></span><button class="btn btn-primary" data-close>Super !</button>'
    });
  }

  function close(silent) {
    if (!st) return;
    clearInterval(st.timer); clearTimeout(saveT);
    st.el.remove();
    st = null;
    document.body.style.overflow = '';
    if (!silent && window.App) App.render();
  }

  S.on(() => { if (st && !(st.el.contains(document.activeElement) && document.activeElement.matches('[data-amt],[data-ask],[data-auc],[data-pseudo],[data-opn]'))) render(); });
  window.Live = { start, open, close, isOpen: () => !!st, render };
})();
