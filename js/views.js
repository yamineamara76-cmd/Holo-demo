/* HOLO — vues : accueil, stock, achats, ventes, lives, trésorerie, stats, réglages */
(function () {
  'use strict';
  const V = {};
  const { icon } = UI;
  const esc = U.esc;
  const set = () => S.state.settings;

  /* ---------- État d'interface (filtres) ---------- */
  V.ui = {
    period: 'month',
    stock: { q: '', type: 'all', status: 'all', sort: 'recent', kind: 'items' },
    achats: { q: '', status: 'all', channel: 'all' },
    ventes: { q: '', status: 'all', pf: 'all' },
    treso: { acc: 'all', kind: 'all', limit: 120 },
    journal: { q: '', type: 'all', limit: 200, move: false },
    stats: { period: 'year' }
  };

  /* ---------- Helpers ---------- */
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const light = () => document.documentElement.dataset.theme === 'light';
  V.pal = () => light()
    ? { rev: '#2f6fd6', profit: '#b07d00', cash: '#7a52d6', pos: css('--pos'), neg: css('--neg') }
    : { rev: '#8fd3ff', profit: '#ffd84d', cash: '#b8a2ff', pos: css('--pos'), neg: css('--neg') };
  const pfTag = id => { const p = S.platform(id); return '<span class="pf"><i style="background:' + esc(p.color) + '"></i>' + esc(p.name) + '</span>'; };
  const accTag = id => { const a = S.account(id); return '<span class="pf"><i style="background:' + esc(a.color) + '"></i>' + esc(a.name) + '</span>'; };
  const signCls = v => v > 0.004 ? 'pos' : v < -0.004 ? 'neg' : 'faint';
  const kpi = o => '<div class="card kpi' + ((o.color || o.c) ? ' glow' : '') + (o.act ? '" data-act="' + o.act + '" data-r="' + (o.r || '')  : '') + '" style="' + (o.act ? 'cursor:pointer;' : '') + ((o.color || o.c) ? '--c:' + (o.color || o.c) : '') + '">'
    + '<div class="kpi-l">' + icon(o.ic) + o.l + '</div><div class="kpi-v">' + o.v + '</div><div class="kpi-f">' + (o.f || '') + '</div>'
    + (o.spark ? '<div class="spark">' + UI.chart({ type: 'spark', values: o.spark, color: o.color }) + '</div>' : '') + '</div>';
  const empty = (em, title, text, btn) => '<div class="empty"><div class="em">' + em + '</div><h4>' + title + '</h4><p>' + text + '</p>' + (btn || '') + '</div>';
  const seg = (items, cur, act, extra = '') => '<div class="seg">' + items.map(([v, l]) => '<button class="' + (v === cur ? 'on' : '') + '" data-act="' + act + '" data-v="' + v + '"' + extra + '>' + l + '</button>').join('') + '</div>';
  const chips = (items, cur, view, key) => '<div class="chips">' + items.map(([v, l, dot]) => '<button class="chip' + (v === cur ? ' on' : '') + '" data-act="set" data-view="' + view + '" data-k="' + key + '" data-v="' + esc(v) + '">' + (dot ? '<i class="dot" style="background:' + esc(dot) + '"></i>' : '') + l + '</button>').join('') + '</div>';
  const search = (view, ph) => '<label class="input-search">' + icon('search') + '<input type="search" data-search="' + view + '" placeholder="' + ph + '" value="' + esc(V.ui[view].q) + '"></label>';
  const accLogo = (a, cls) => '<img class="acc-logo' + (cls ? ' ' + cls : '') + '" src="img/brands/' + REF.accLogo(a) + '.png?v=4" alt="" width="40" height="40">';
  const moneySplit = v => { const s = U.eur(v); const m = s.match(/^(.*),(\d{2})\s*€$/); return m ? m[1] + '<span class="c">,' + m[2] + ' €</span>' : s; };
  const periodSeg = cur => seg(S.periods.map(p => [p.id, p.label]), cur, 'period');
  const inR = (d, a, b) => d >= a && d <= b;
  V.pfTag = pfTag; V.accTag = accTag;

  function groupByMonth(items, dateOf, head, rowFn) {
    let out = '', cur = null, bucket = [];
    const flush = () => { if (bucket.length) out += '<div class="month-h"><b>' + U.monthLong(cur) + '</b><span>' + head(bucket) + '</span></div>' + bucket.map(rowFn).join(''); };
    items.forEach(it => { const k = U.monthKey(dateOf(it)); if (k !== cur) { flush(); cur = k; bucket = []; } bucket.push(it); });
    flush();
    return out;
  }
  const minStock = p => p.minStock !== '' && p.minStock != null ? U.num(p.minStock) : U.num(set().lowStock);

  function saleTitle(s) {
    const l = (s.lines || [])[0], p = l && S.product(l.productId);
    const units = U.sum(s.lines || [], x => U.num(x.qty));
    return (p ? p.name : 'Vente') + ((s.lines || []).length > 1 ? ' <span class="faint">+ ' + (s.lines.length - 1) + (s.lines.length > 2 ? ' autres' : ' autre') + '</span>' : units > 1 ? ' <span class="faint">×' + units + '</span>' : '');
  }
  function purTitle(p) {
    const l = (p.lines || [])[0], pr = l && S.product(l.productId);
    return (pr ? pr.name : 'Achat') + ((p.lines || []).length > 1 ? ' <span class="faint">+ ' + (p.lines.length - 1) + (p.lines.length > 2 ? ' autres' : ' autre') + '</span>' : '');
  }
  function saleBadges(s) {
    let b = '';
    if (s.status === 'pending') b += '<span class="badge warn"><i class="dot"></i>À encaisser</span>';
    if (s.status === 'refunded') b += '<span class="badge neg">Remboursée</span>';
    if (s.status !== 'refunded' && !s.shipped && s.platformId !== 'pf_hand') b += '<span class="badge info">' + icon('truck', 'xs') + 'À expédier</span>';
    return b;
  }
  function purBadge(p) {
    if (p.status === 'ordered') return '<span class="badge info">' + icon('truck', 'xs') + 'Commandé' + (p.expectedAt ? ' · ' + U.date(p.expectedAt) : '') + '</span>';
    if (p.status === 'preorder') return '<span class="badge acc">' + icon('clock', 'xs') + 'Précommande' + (p.expectedAt ? ' · ' + U.date(p.expectedAt) : '') + '</span>';
    return '';
  }

  /* ---------- Compteurs pour le menu et la to-do ---------- */
  V.counts = () => {
    const st = S.state, C = S.calc();
    const toShip = st.sales.filter(s => s.status !== 'refunded' && !s.shipped && s.platformId !== 'pf_hand');
    const pending = st.sales.filter(s => s.status === 'pending');
    const transit = st.purchases.filter(p => p.status !== 'received');
    const late = transit.filter(p => p.expectedAt && p.expectedAt < U.today());
    const act = st.products.filter(p => !p.archived);
    const low = act.filter(p => { const c = C.prod[p.id]; return c.qty > 0 && c.qty <= minStock(p) && c.bought > 1; });
    const dormant = act.filter(p => C.prod[p.id].dormant);
    const neg = act.filter(p => C.prod[p.id].qty < 0);
    const early = act.filter(p => C.prod[p.id].early && C.prod[p.id].qty >= 0 && !C.prod[p.id].supply);
    const noMarket = act.filter(p => C.prod[p.id].qty > 0 && !U.num(p.market) && !C.prod[p.id].supply);
    return { toShip, pending, transit, late, low, dormant, neg, early, noMarket };
  };

  /* ======================= ACCUEIL ======================= */
  V.home = () => {
    const st = S.state, C = S.calc(), pal = V.pal();
    const R = S.range(V.ui.period);
    const r = S.pnl(R.from, R.to);
    const pv = R.prevFrom ? S.pnl(R.prevFrom, R.prevTo) : null;
    const M = S.monthly(12);
    const K = V.counts();
    const hasData = st.sales.length + st.purchases.length + st.products.length > 0;
    const perLabel = (S.periods.find(p => p.id === V.ui.period) || {}).label.toLowerCase();

    /* Trésorerie holo */
    const holo = '<div class="holo" data-act="go" data-r="treso" style="cursor:pointer"><span class="holo-tag">TRÉSO</span>'
      + '<div class="kpi-l">' + icon('wallet') + 'Trésorerie disponible</div>'
      + '<div class="holo-v">' + moneySplit(C.avail) + '</div>'
      + (C.onPlatform > 0 ? '<div class="pending-pill">' + icon('clock') + '+ ' + U.eur(C.onPlatform) + ' en attente de retrait : ' + S.state.accounts.filter(a => a.type === 'platform' && C.acc[a.id].balance > 0.004).map(a => a.name.replace(/^Solde /, '') + ' ' + U.eur(C.acc[a.id].balance)).join(' · ') + '</div>' : '')
      + (C.pending > 0 ? '<div class="pending-pill">' + icon('clock') + '+ ' + U.eur(C.pending) + ' en attente de versement</div>' : '<div style="font-size:12.5px;opacity:.6">Tous tes paiements sont encaissés</div>')
      + '<div class="holo-accs">' + st.accounts.map(a => '<div class="holo-acc">' + accLogo(a, 'xs') + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(a.name) + '</span><b>' + U.eur0(C.acc[a.id].balance) + '</b></div>').join('')
      + S.transits().map(t => '<div class="holo-acc holo-transit" data-act="trf" data-id="' + t.id + '">' + icon('clock', 'xs') + '<span>' + U.eur(t.amount) + ' en route de ' + esc(S.account(t.from).name) + ' vers ' + esc(S.account(t.to).name) + ' · lancé le ' + U.date(t.date) + '</span></div>').join('')
      + '</div></div>';

    const kCA = kpi({ ic: 'tag', l: 'Chiffre d’affaires · ' + perLabel, v: U.eur0(r.revenue), f: (pv ? UI.delta(r.revenue, pv.revenue) : '') + '<span>' + r.sales + ' vente' + (r.sales > 1 ? 's' : '') + ' · ' + U.n(r.units) + ' articles</span>', spark: M.map(m => m.revenue), color: pal.rev });
    const kNet = kpi({ ic: 'sparkle', l: 'Bénéfice net · ' + perLabel, v: '<span class="' + (r.net < 0 ? 'neg' : '') + '">' + U.eur0(r.net) + '</span>', f: (pv ? UI.delta(r.net, pv.net) : '') + '<span>marge ' + U.pct(r.margin, 0) + '</span>', spark: M.map(m => m.net), color: pal.profit });

    const latent = C.marketValue - C.stockValue;
    const kpis = '<div class="kpis">'
      + kpi({ ic: 'box', c: pal.cash, l: 'Valeur du stock (prix d’achat)', v: U.eur0(C.stockValue), f: U.n(C.units) + ' articles' + (C.transitQty ? ' · <span class="muted">+' + U.n(C.transitQty) + ' en transit</span>' : ''), act: 'go', r: 'stock' })
      + kpi({ ic: 'chart', c: pal.rev, l: 'Valeur marché du stock', v: U.eur0(C.marketValue), f: '<span class="delta ' + (latent >= 0 ? 'up' : 'down') + '">' + U.signed(latent).replace(/,\d\d/, '') + '</span> plus-value latente', act: 'go', r: 'stock' })
      + kpi({ ic: 'percent', c: pal.pos, l: 'Retour sur investissement', v: isFinite(r.roi) ? U.pct(r.roi, 0).replace(' ', '<small>') + '</small>' : '—', f: 'Panier moyen ' + U.eur(r.basket) })
      + kpi({ ic: 'cart', c: pal.profit, l: 'Achats · ' + perLabel, v: U.eur0(r.purchases), f: (pv ? UI.delta(r.purchases, pv.purchases, true) : '') + '<span>' + U.n(r.purchasesUnits) + ' articles achetés</span>', act: 'go', r: 'achats' })
      + '</div>';

    /* Bénéfice vs argent réel : où passe le bénéfice ? */
    const reste = r.net - r.perso - r.invest;
    const where = '<div class="card"><div class="card-h"><h3>Bénéfice et argent réel</h3><div class="right faint" style="font-size:12px">' + perLabel + '</div></div><div class="card-b" style="padding-top:6px"><table class="t pl"><tbody>'
      + '<tr><td>Bénéfice de l’activité <span class="faint">(ventes − achats − frais)</span></td><td class="r num ' + signCls(r.net) + '">' + U.signed(r.net) + '</td></tr>'
      + '<tr><td>Dépenses perso <span class="faint">(repas, courses… sorties de tes comptes)</span></td><td class="r num neg">' + U.signed(-r.perso) + '</td></tr>'
      + (r.invest ? '<tr><td>Matériel pro <span class="faint">(imprimante, éclairage… investissement, pas dans le bénéfice)</span></td><td class="r num neg">' + U.signed(-r.invest) + '</td></tr>' : '')
      + '<tr class="pl-strong"><td><b>Ce qu’il te reste vraiment</b></td><td class="r num ' + signCls(reste) + '"><b>' + U.signed(reste) + '</b></td></tr>'
      + '</tbody></table><div class="faint" style="font-size:12px;margin-top:10px">Le bénéfice, c’est ce que la revente rapporte. Les dépenses perso baissent tes comptes mais ne comptent pas dedans. Le reste est sur tes comptes ou dans le stock acheté.</div></div></div>';

    /* Graphique 12 mois */
    const chart = '<div class="card"><div class="card-h"><h3>12 derniers mois</h3><div class="right legend"><span><i class="line" style="background:' + pal.rev + '"></i>CA</span><span><i class="line" style="background:' + pal.profit + '"></i>Bénéfice net</span></div></div><div class="card-b">'
      + UI.chart({ type: 'area', labels: M.map(m => m.label), tipLabels: M.map(m => U.monthLong(m.key)), height: 250, series: [{ name: 'CA', color: pal.rev, values: M.map(m => m.revenue), fill: true }, { name: 'Bénéfice', color: pal.profit, values: M.map(m => m.net), fill: true }], extra: i => '<div class="tr faint">Ventes<b>' + M[i].sales + '</b></div>' })
      + '</div></div>';

    /* Donut plateformes */
    const pfs = Object.entries(r.byPlatform).sort((a, b) => b[1].revenue - a[1].revenue);
    const donut = '<div class="card"><div class="card-h"><h3>Par plateforme</h3></div><div class="card-b">' + (pfs.length
      ? '<div class="donut-wrap">' + UI.chart({ type: 'donut', size: 150, thickness: 16, data: pfs.map(([id, v]) => ({ label: S.platform(id).name, value: v.revenue, color: S.platform(id).color })), center: U.eurK(r.revenue), centerLabel: 'CA' })
      + '<div class="dl">' + pfs.map(([id, v]) => '<div class="dl-r"><i style="background:' + esc(S.platform(id).color) + '"></i><span>' + esc(S.platform(id).name) + '<small>' + v.sales + '</small></span><b>' + U.eur0(v.revenue) + '</b></div>').join('') + '</div></div>'
      : empty('∅', 'Aucune vente', 'Pas de vente sur la période.')) + '</div></div>';

    /* À faire */
    const todos = [];
    const td = (ic, tone, t, s, n, act) => todos.push('<div class="todo" ' + act + '><div class="ico ' + tone + '">' + icon(ic) + '</div><div><div class="t">' + t + '</div><div class="s">' + s + '</div></div><div class="n">' + n + '</div></div>');
    if (K.toShip.length) td('truck', 'info', 'Colis à expédier', 'Ventes non marquées comme envoyées', K.toShip.length, 'data-act="go" data-r="ventes" data-k="status" data-v="toship"');
    if (K.pending.length) td('clock', 'warn', 'Paiements en attente', U.eur(C.pending) + ' à recevoir', K.pending.length, 'data-act="go" data-r="ventes" data-k="status" data-v="pending"');
    if (K.late.length) td('alert', 'neg', 'Commandes en retard', 'Date de réception dépassée', K.late.length, 'data-act="go" data-r="achats" data-k="status" data-v="transit"');
    else if (K.transit.length) td('box', 'info', 'Commandes à recevoir', U.eur(C.transitValue) + ' en transit', K.transit.length, 'data-act="go" data-r="achats" data-k="status" data-v="transit"');
    if (K.neg.length) td('alert', 'neg', 'Stock négatif', 'Un achat a sûrement été oublié', K.neg.length, 'data-act="go" data-r="stock" data-k="status" data-v="neg"');
    if (K.early.length) td('alert', 'warn', 'Dates à vérifier', 'Vendu ou sorti avant la date de l’achat', K.early.length, 'data-act="go" data-r="stock" data-k="status" data-v="early"');
    if (K.low.length) td('down', 'warn', 'Stock bas', 'Produits à réapprovisionner', K.low.length, 'data-act="go" data-r="stock" data-k="status" data-v="low"');
    if (K.dormant.length) td('clock', 'acc', 'Stock dormant', 'Pas vendu depuis +' + set().dormantDays + ' jours', K.dormant.length, 'data-act="go" data-r="stock" data-k="status" data-v="dormant"');
    if (K.noMarket.length) td('percent', '', 'Prix marché manquants', 'Pour estimer la valeur de ton stock', K.noMarket.length, 'data-act="go" data-r="stock" data-k="status" data-v="nomarket"');
    const lb = set().lastBackup;
    if (hasData && !(window.Cloud && Cloud.on) && (!lb || U.daysBetween(lb, U.today()) > 14)) td('down', 'warn', 'Sauvegarde conseillée', lb ? 'Dernière : ' + U.relDays(lb) : 'Jamais sauvegardé', '', 'data-act="backup"');
    const mine = openTodos(), minesh = mine.slice(0, 5);
    const todo = '<div class="card todo-card"><div class="card-h"><h3>À faire</h3><div class="right"><a class="link-sm" href="#/todo">Tout voir' + (mine.length ? ' · ' + mine.length : '') + '</a></div></div>'
      + '<div class="tdl-dash">' + todoForm(true) + (minesh.length ? '<div class="tdl">' + minesh.map(todoRow).join('') + '</div>' : '') + (mine.length > 5 ? '<a class="tdl-more" href="#/todo">+ ' + (mine.length - 5) + ' autre' + (mine.length - 5 > 1 ? 's' : '') + '</a>' : '') + '</div>'
      + (todos.length ? '<div class="todo-sep">Rappels automatiques</div><div style="padding:2px 0 10px">' + todos.join('') + '</div>' : (mine.length ? '' : '<div style="padding:0 0 10px">' + empty('✓', 'Tout est à jour', 'Ajoute une tâche ci-dessus.') + '</div>')) + '</div>';

    /* Top produits */
    const top = {};
    st.sales.forEach(s => {
      if (s.status === 'refunded' || !inR(s.date, R.from, R.to)) return;
      const cs = C.sale[s.id], items = cs.items || 0;
      s.lines.forEach((l, i) => {
        const rev = U.num(l.qty) * U.num(l.unit);
        const share = items > 0 ? (cs.fees + cs.ship - U.num(s.shippingCharged)) * rev / items : 0;
        const t = top[l.productId] || (top[l.productId] = { profit: 0, units: 0, rev: 0 });
        t.profit += rev - (cs.lineCogs[i] || 0) - share; t.units += U.num(l.qty); t.rev += rev;
      });
    });
    const tops = Object.entries(top).filter(([id]) => S.product(id)).sort((a, b) => b[1].profit - a[1].profit).slice(0, 5);
    const maxP = Math.max(1, ...tops.map(t => Math.abs(t[1].profit)));
    const topCard = '<div class="card"><div class="card-h"><h3>Top bénéfices</h3><div class="right faint" style="font-size:12px">' + perLabel + '</div></div><div class="card-b">' + (tops.length
      ? '<div class="hbars">' + tops.map(([id, t]) => { const p = S.product(id); return '<div class="hbar" data-act="prod" data-id="' + id + '" style="cursor:pointer"><span class="t">' + esc(p.name) + ' <span class="faint">×' + U.n(t.units) + '</span></span><span class="v ' + signCls(t.profit) + '">' + U.signed(t.profit) + '</span><div class="bar holo-bar"><i style="width:' + (Math.max(t.profit, 0) / maxP * 100) + '%"></i></div></div>'; }).join('') + '</div>'
      : empty('★', 'Pas encore de ventes', 'Tes meilleurs produits apparaîtront ici.')) + '</div></div>';

    /* Activité récente */
    const acts = [].concat(
      st.sales.map(s => ({ t: s.createdAt, html: actRow('tag', 'pos', saleTitle(s), pfTag(s.platformId) + ' · ' + U.date(s.date), '<span class="num">' + U.eur(C.sale[s.id].revenue) + '</span>', 'data-act="sale" data-id="' + s.id + '"') })),
      st.purchases.map(p => ({ t: p.createdAt, html: actRow('cart', 'info', purTitle(p), esc(S.supplierName(p)) + ' · ' + U.date(p.date), '<span class="num">−' + U.eur(C.pur[p.id].total) + '</span>', 'data-act="pur" data-id="' + p.id + '"') })),
      st.adjustments.map(a => { const p = S.product(a.productId), k = REF.adjKinds.find(x => x.id === a.kind); return { t: a.createdAt, html: actRow(a.kind === 'giveaway' ? 'gift' : a.kind === 'transform' ? 'split' : a.kind === 'exchange' ? 'trade' : 'box', 'acc', esc(k ? k.label : 'Mouvement') + ' · ' + esc(p ? p.name : ''), U.date(a.date), '<span class="num faint">' + (U.num(a.qty) > 0 ? '+' : '') + U.n(a.qty) + '</span>', 'data-act="adj" data-id="' + a.id + '"') }; }),
      st.expenses.map(e => ({ t: e.createdAt, html: actRow('receipt', 'warn', esc(e.label || e.category), esc(e.category) + ' · ' + U.date(e.date), '<span class="num">−' + U.eur(e.amount) + '</span>', 'data-act="exp" data-id="' + e.id + '"') }))
    ).sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 6);
    const actCard = '<div class="card"><div class="card-h"><h3>Activité récente</h3></div><div class="rows" style="padding:8px 0">' + (acts.length ? acts.map(a => a.html).join('') : empty('◇', 'Rien pour l’instant', 'Tes dernières opérations apparaîtront ici.')) + '</div></div>';

    return {
      title: 'Bonjour' + (set().owner ? ' ' + esc(set().owner) : '') + ' 👋',
      sub: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + esc(set().bizName),
      html: '<div class="toolbar" style="margin-bottom:16px">' + periodSeg(V.ui.period) + '</div>'
        + '<div class="grid dash-a">' + holo + kCA + kNet + '</div>'
        + '<div style="height:16px"></div>' + kpis
        + '<div style="height:16px"></div>' + where
        + '<div style="height:16px"></div><div class="grid dash-b">' + chart + donut + '</div>'
        + '<div style="height:16px"></div><div class="grid dash-c">' + todo + topCard + actCard + '</div>'
    };
  };
  function actRow(ic, tone, t, s, right, attrs) {
    return '<div class="row" ' + attrs + '><div class="ico ' + tone + '">' + icon(ic) + '</div><div style="min-width:0"><div class="row-t">' + t + '</div><div class="row-s">' + s + '</div></div><div class="row-r">' + right + '</div></div>';
  }

  /* ======================= TO-DO ======================= */
  const byDue = (a, b) => (a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : (b.createdAt || 0) - (a.createdAt || 0);
  function openTodos() { return S.state.todos.filter(t => !t.done).sort(byDue); }
  function dueLabel(t) {
    if (!t.due) return '';
    const n = U.daysBetween(U.today(), t.due);
    const cls = t.done ? '' : n < 0 ? 'late' : n === 0 ? 'today' : '';
    const txt = n === 0 ? 'Aujourd’hui' : n === 1 ? 'Demain' : n === -1 ? 'Hier' : U.date(t.due);
    return '<span class="tdi-due ' + cls + '">' + icon('clock', 'xs') + txt + '</span>';
  }
  function todoRow(t) {
    return '<div class="tdi' + (t.done ? ' done' : '') + '" data-tid="' + t.id + '">'
      + '<button class="tdi-check" data-act="todo-toggle" data-id="' + t.id + '" aria-label="' + (t.done ? 'Rouvrir' : 'Terminer') + '">' + icon('check') + '</button>'
      + '<div class="tdi-b"><div class="tdi-t">' + esc(t.text) + '</div>' + dueLabel(t) + '</div>'
      + '<button class="tdi-del" data-act="todo-del" data-id="' + t.id + '" aria-label="Supprimer">' + icon('x', 'xs') + '</button></div>';
  }
  function todoForm(compact) {
    return '<form class="tdl-add' + (compact ? ' compact' : '') + '" data-todo-form autocomplete="off">'
      + '<span class="tdl-plus">' + icon('plus', 'xs') + '</span>'
      + '<input name="text" type="text" placeholder="Nouvelle tâche…" maxlength="200" enterkeyhint="done" aria-label="Nouvelle tâche">'
      + '<input name="due" type="date" aria-label="Échéance" title="Échéance (optionnel)">'
      + '<button class="btn btn-primary btn-sm" type="submit">Ajouter</button></form>';
  }
  V.todo = () => {
    const all = S.state.todos, open = openTodos();
    const done = all.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const late = open.filter(t => t.due && t.due < U.today()).length;
    const today = open.filter(t => t.due === U.today()).length;
    return {
      title: 'To-do',
      sub: open.length ? open.length + ' tâche' + (open.length > 1 ? 's' : '') + ' en cours' + (late ? ' · ' + late + ' en retard' : today ? ' · ' + today + ' pour aujourd’hui' : '') : 'Rien en cours',
      html: '<div class="todo-page">'
        + '<div class="card card-pad">' + todoForm(false) + '</div>'
        + '<div class="card tdl-card">' + (open.length ? '<div class="tdl">' + open.map(todoRow).join('') + '</div>' : empty('✓', 'Rien à faire', 'Ajoute ta première tâche : commande à passer, colis à envoyer, live à préparer…')) + '</div>'
        + (done.length ? '<div class="section-title tdl-h">Terminées <span class="faint">' + done.length + '</span><button class="btn btn-sm btn-ghost" data-act="todo-clear">' + icon('trash', 'xs') + 'Effacer</button></div>'
          + '<div class="card tdl-card"><div class="tdl">' + done.slice(0, 50).map(todoRow).join('') + '</div></div>' : '')
        + '</div>'
    };
  };

  /* ======================= STOCK ======================= */
  function stockFiltered() {
    const f = V.ui.stock, C = S.calc(), q = U.norm(f.q.trim());
    const sup = f.kind === 'supplies';
    let list = S.state.products.filter(p => (f.status === 'archived' ? p.archived : !p.archived) && REF.isSupply(p.type) === sup);
    if (f.type !== 'all') list = list.filter(p => p.type === f.type);
    if (q) list = list.filter(p => UI.score(p, q) > 0);
    const st = f.status, hideOut = S.state.settings.hideOut && !q && !['out', 'neg', 'archived', 'transit'].includes(st);   // une recherche retrouve tout
    list = list.filter(p => {
      const c = C.prod[p.id];
      if (hideOut && c.qty <= 0 && !c.transit) return false;   // réglage : produits épuisés masqués
      if (st === 'instock') return c.qty > 0;
      if (st === 'low') return c.qty > 0 && c.qty <= minStock(p);
      if (st === 'out') return c.qty <= 0;
      if (st === 'dormant') return c.dormant;
      if (st === 'transit') return c.transit > 0;
      if (st === 'neg') return c.qty < 0;
      if (st === 'early') return c.early && c.qty >= 0;
      if (st === 'nomarket') return c.qty > 0 && !U.num(p.market);
      return true;
    });
    const by = {
      recent: (a, b) => (C.prod[b.id].lastIn || b.createdAt || '') > (C.prod[a.id].lastIn || a.createdAt || '') ? 1 : -1,
      name: (a, b) => a.name.localeCompare(b.name, 'fr'),
      qty: (a, b) => C.prod[b.id].qty - C.prod[a.id].qty,
      value: (a, b) => C.prod[b.id].value - C.prod[a.id].value,
      gain: (a, b) => (C.prod[b.id].marketValue - C.prod[b.id].value) - (C.prod[a.id].marketValue - C.prod[a.id].value),
      age: (a, b) => C.prod[b.id].age - C.prod[a.id].age,
      profit: (a, b) => C.prod[b.id].profit - C.prod[a.id].profit
    };
    list.sort((a, b) => { const qa = C.prod[a.id].qty > 0 ? 0 : 1, qb = C.prod[b.id].qty > 0 ? 0 : 1; return f.sort === 'recent' || f.sort === 'name' ? (qa - qb || by[f.sort](a, b)) : by[f.sort](a, b); });
    return list;
  }
  /* Lots encore en stock : regroupés par fournisseur + prix unitaire */
  function lotsOf(p) {
    const c = S.calc().prod[p.id], m = new Map();
    (c.lots || []).forEach(l => {
      const who = l.type === 'achat' ? S.supplierName(l.ref) : l.type === 'transform-in' ? (l.ref && l.ref.kind === 'exchange' ? 'Échange' : 'Éclatement') : 'Correction';
      const k = who + '|' + U.round2(l.unit);
      const g = m.get(k) || m.set(k, { who, unit: l.unit, qty: 0, d: l.d }).get(k);
      g.qty += l.qty; if (l.d > g.d) g.d = l.d;
    });
    return [...m.values()].filter(l => l.qty > 0);
  }
  V.lotsOf = lotsOf;
  function pcard(p, i, lot) {
    const c0 = S.calc().prod[p.id];
    const c = lot ? Object.assign({}, c0, { qty: lot.qty, cost: lot.unit, transit: 0 }) : c0;
    const qc = c.qty <= 0 ? 'zero' : c.qty <= minStock(p) ? 'low' : '';
    const tags = [p.lang && p.lang !== 'FR' ? '<span>' + esc(p.lang) + '</span>' : '', p.grader ? '<span class="grade">' + esc(p.grader + ' ' + (p.grade || '')) + '</span>' : ''].join('');
    const extra = '<span class="qty ' + qc + '">×' + U.n(c.qty) + '</span>' + (tags ? '<div class="tags">' + tags + '</div>' : '') + (c.transit ? '<span class="transit">+' + U.n(c.transit) + ' en route</span>' : '');
    const mk = c.market, cost = c.cost || (c.qty <= 0 && !lot && c.transitCost) || 0;   // pas encore reçu : prix payé de la commande en route
    if (c0.supply) return '<div class="card pcard sup' + (c.qty <= 0 ? ' out' : '') + '" style="--i:' + Math.min(i || 0, 14) + '" data-act="prod" data-id="' + p.id + '">' + UI.thumb(p, { extra })
      + '<div class="pbody"><div class="n">' + esc(p.name) + (p.keep ? ' <span class="badge">Collection · pas à vendre</span>' : '') + '</div><div class="s">' + esc(REF.type(p.type).label) + '</div>'
      + '<div class="pprice"><div><div class="l">Coût / u.</div><div class="v">' + (c.cost ? U.eur(c.cost) : '—') + '</div></div>'
      + '<button class="btn btn-sm use-btn" data-act="use-supply" data-id="' + p.id + '"' + (c.qty <= 0 ? ' disabled' : '') + ' title="Retirer 1 du stock">−1 utilisé</button></div></div></div>';
    return '<div class="card pcard' + (c.qty <= 0 ? ' out' : '') + '" style="--i:' + Math.min(i || 0, 14) + '" data-act="prod" data-id="' + p.id + '">' + UI.thumb(p, { extra })
      + '<div class="pbody"><div class="n">' + esc(p.name) + '</div><div class="s">' + (lot ? '<span class="lot-tag">' + icon('cart', 'xs') + esc(lot.who) + '</span> · ' + U.date(lot.d) : esc([REF.type(p.type).label, p.set].filter(Boolean).join(' · '))) + '</div>'
      + '<div class="pprice"><div><div class="l">Coût</div><div class="v">' + (cost ? U.eur(cost) : '—') + '</div></div>'
      + '<div style="text-align:right"><div class="l">Marché</div><div class="v ' + (mk && cost ? (mk >= cost ? 'pos' : 'neg') : 'faint') + '">' + (mk ? U.eur(mk) : '—') + '</div></div></div></div></div>';
  }
  function stockTable(list) {
    const C = S.calc();
    return '<div class="card table-wrap"><table class="t"><thead><tr><th>Produit</th><th class="r">Qté</th><th class="r">Coût / u.</th><th class="r">Valeur</th><th class="r">Prix marché</th><th class="r">Plus-value</th><th class="r">Vendus</th><th class="r">Âge</th></tr></thead><tbody>'
      + list.map(p => {
        const c = C.prod[p.id], g = c.marketValue - c.value;
        return '<tr data-act="prod" data-id="' + p.id + '"><td><div class="pname">' + UI.mini(p) + '<div><b>' + esc(p.name) + '</b>' + (p.keep ? ' <span class="badge">Collection · pas à vendre</span>' : '') + '<small>' + esc(UI.pSub(p)) + '</small></div></div></td>'
          + '<td class="r num ' + (c.qty <= 0 ? 'neg' : '') + '">' + U.n(c.qty) + (c.transit ? ' <span class="faint">+' + U.n(c.transit) + '</span>' : '') + '</td><td class="r num">' + (c.cost ? U.eur(c.cost) : '—') + '</td><td class="r num">' + U.eur(c.value) + '</td>'
          + '<td class="r num">' + (c.market ? U.eur(c.market) : '<span class="faint">—</span>') + '</td><td class="r num ' + (c.market ? signCls(g) : 'faint') + '">' + (c.market && c.qty > 0 ? U.signed(g) : '—') + '</td>'
          + '<td class="r num">' + U.n(c.soldQty) + '</td><td class="r num ' + (c.dormant ? 'warn' : 'faint') + '">' + (c.qty > 0 ? c.age + ' j' : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  V.stockList = () => {
    const list = stockFiltered();
    if (!list.length && V.ui.stock.kind === 'supplies' && !V.ui.stock.q && V.ui.stock.type === 'all') return empty('✉', 'Aucune fourniture', 'Ajoute tes sleeves, toploaders, enveloppes… Enregistre-les comme un achat : leur coût passera en charge au fur et à mesure que tu les utilises.', '<button class="btn btn-primary" data-act="new-prod">' + icon('plus') + 'Ajouter une fourniture</button>');
    if (!list.length) return S.state.products.length ? empty('?', 'Aucun produit', 'Aucun produit ne correspond à ces filtres.') : empty('HOLO', 'Ton stock est vide', 'Ajoute tes produits ou enregistre directement un achat : les produits se créent au passage.', '<button class="btn btn-primary" data-act="new-pur">' + icon('cart') + 'Enregistrer un achat</button> <button class="btn" data-act="new-prod">' + icon('plus') + 'Nouveau produit</button>');
    if (set().gridView === false) return stockTable(list);
    const split = set().splitLots !== false;
    let i = 0;
    return '<div class="pgrid">' + list.map(p => {
      const lots = split ? lotsOf(p) : [];
      return lots.length > 1 ? lots.map(l => pcard(p, i++, l)).join('') : pcard(p, i++);
    }).join('') + '</div>';
  };
  V.stock = () => {
    const C = S.calc(), f = V.ui.stock, st = S.state, sup = f.kind === 'supplies';
    const all = st.products.filter(p => !p.archived);
    const act = all.filter(p => REF.isSupply(p.type) === sup);
    const refs = act.filter(p => C.prod[p.id].qty > 0).length;
    const nSup = all.filter(p => REF.isSupply(p.type)).length;
    const typeCounts = {}; act.forEach(p => typeCounts[p.type] = (typeCounts[p.type] || 0) + 1);
    const types = [['all', 'Tous']].concat(REF.types.filter(t => typeCounts[t.id]).map(t => [t.id, t.label + ' <span class="faint">' + typeCounts[t.id] + '</span>']));
    const lat = C.marketValue - C.stockValue;
    const kindSeg = '<div class="seg kind-seg">' + [['items', 'Items', all.length - nSup], ['supplies', 'Fournitures', nSup]].map(([v, l, n]) => '<button class="' + (f.kind === v ? 'on' : '') + '" data-act="stock-kind" data-v="' + v + '">' + l + ' <span class="faint">' + n + '</span></button>').join('') + '</div>';
    const lowSup = sup ? act.filter(p => { const c = C.prod[p.id]; return c.qty <= minStock(p); }).length : 0;
    const usedM = sup ? U.sum(st.adjustments.filter(a => a.kind === 'used' && (a.date || '').slice(0, 7) === U.today().slice(0, 7)), a => (C.adj[a.id] || {}).cost || 0) : 0;
    const strip = sup
      ? '<div class="strip">'
        + '<div><div class="l">Fournitures en stock</div><div class="v">' + U.n(C.supplyUnits) + ' <small>' + refs + ' réf.</small></div></div>'
        + '<div><div class="l">Valeur</div><div class="v">' + U.eur0(C.supplyValue) + '</div></div>'
        + '<div><div class="l">Utilisé ce mois</div><div class="v">' + U.eur(usedM) + '</div></div>'
        + '<div><div class="l">À racheter</div><div class="v ' + (lowSup ? 'warn' : '') + '">' + U.n(lowSup) + '</div></div></div>'
      : '<div class="psum">'
        + (() => {
          const paid = C.stockValue, sell = C.marketValue, gain = sell - paid, pct = paid > 0 ? Math.round(gain / paid * 100) : 0;
          const wPaid = sell > 0 ? Math.max(4, Math.min(100, paid / Math.max(sell, paid) * 100)) : 100;
          const noPrice = act.filter(p => C.prod[p.id].qty > 0 && !U.num(p.market) && !C.prod[p.id].keep).length;
          const blk = (l, v, sub, cls) => '<div class="ps-b"><div class="ps-l">' + l + '</div><div class="ps-v ' + (cls || '') + '">' + v + '</div><div class="ps-s">' + sub + '</div></div>';
          return '<div class="ps-grid">'
            + blk('Tu as payé', U.eur0(paid), U.n(C.units) + ' articles en stock')
            + blk('Tu vas encaisser', U.eur0(sell), 'si tout part à tes prix de revente')
            + blk('Bénéfice probable', U.signed(gain).replace(/,\d\d/, ''), (gain >= 0 ? '+' : '') + pct + ' % sur ce que tu as payé', gain >= 0 ? 'pos' : 'neg')
            + '</div>'
            + '<div class="ps-bar"><span class="ps-paid" style="width:' + wPaid.toFixed(1) + '%"></span><span class="ps-gain"></span></div>'
            + '<div class="ps-leg"><span><i class="ps-dot paid"></i>Ce que tu as payé</span><span><i class="ps-dot gain"></i>Ton bénéfice</span>'
            + (C.transitQty ? '<span>' + U.n(C.transitQty) + ' en route · ' + U.eur0(C.transitValue) + '</span>' : '')
            + (noPrice ? '<span class="ps-warn">' + noPrice + (noPrice > 1 ? ' produits sans prix de revente, comptés' : ' produit sans prix de revente, compté') + ' au prix payé</span>' : '')
            + '</div></div>';
        })();
    return {
      title: 'Stock', sub: sup ? refs + ' fournitures en stock' : refs + ' références en stock · ' + U.n(C.units) + ' articles',
      html: kindSeg + strip
        + '<div class="toolbar">' + search('stock', sup ? 'Chercher une fourniture…' : 'Chercher un produit, une extension, un SKU…')
        + '<select data-set="stock" data-k="status" style="width:auto">' + [['all', 'Tous les produits'], ['instock', 'En stock'], ['low', 'Stock bas'], ['out', 'Épuisés'], ['dormant', 'Dormants'], ['transit', 'En transit'], ['nomarket', 'Sans prix marché'], ['neg', 'Stock négatif'], ['early', 'Dates à vérifier'], ['archived', 'Archivés']].map(([v, l]) => Forms.opt(v, l, f.status)).join('') + '</select>'
        + '<select data-set="stock" data-k="sort" style="width:auto">' + [['recent', 'Récents'], ['name', 'Nom'], ['qty', 'Quantité'], ['value', 'Valeur'], ['gain', 'Plus-value'], ['profit', 'Bénéfice réalisé'], ['age', 'Ancienneté']].map(([v, l]) => Forms.opt(v, 'Tri : ' + l, f.sort)).join('') + '</select>'
        + '<span class="grow"></span>' + (set().gridView !== false && !sup ? '<div class="seg seg-lots" title="Par lot : un même produit acheté à des prix différents apparaît en plusieurs cartes. Par produit : une seule carte par produit.">' + [['prod', 'Par produit'], ['lot', 'Par lot']].map(([v, l]) => '<button class="' + ((set().splitLots !== false) === (v === 'lot') ? 'on' : '') + '" data-act="stock-lots" data-v="' + v + '">' + l + '</button>').join('') + '</div>' : '') + seg([['grid', icon('grid')], ['list', icon('list')]], set().gridView !== false ? 'grid' : 'list', 'stock-view')
        + '<button class="btn btn-ghost" data-act="moves" title="Giveaways, ouvertures, pertes, corrections…">' + icon('gift') + '<span class="t">Mouvements</span></button>'
        + (sup ? '' : '<button class="btn btn-ghost" data-act="market-bulk" title="Mettre à jour prix & liens Cardmarket">' + icon('link') + '<span class="t">Prix & liens</span></button>')
        + '<button class="btn" data-act="new-prod">' + icon('plus') + '<span class="t">' + (sup ? 'Fourniture' : 'Produit') + '</span></button></div>'
        + '<div style="margin:-6px 0 18px">' + chips(types, f.type, 'stock', 'type') + '</div>'
        + '<div data-list="stock">' + V.stockList() + '</div>'
    };
  };

  /* ---------- Fiche produit (tiroir) ---------- */
  V.productDrawer = id => {
    let ctx;
    const body = () => {
      const p = S.product(id); if (!p) return '<p>Produit supprimé.</p>';
      const c = S.calc().prod[id];
      const g = c.marketValue - c.value;
      const margin = c.revenue ? c.profit / c.revenue : NaN;
      const lots = c.qty > 0 ? lotsOf(p) : [];
      const evLabel = e => {
        const r = e.ref;
        if (e.type === 'achat') return 'Achat · ' + esc(S.supplierName(r));
        if (e.type === 'vente') return 'Vente · ' + pfTag(r.platformId) + (r.buyer ? ' <span class="faint">' + esc(r.buyer) + '</span>' : '');
        if (e.type === 'transform') { const t = S.product(r.toProductId); return (r.kind === 'exchange' ? 'Échangé contre ' : 'Éclaté → ') + esc(t ? t.name : '?') + ' ×' + U.n(r.toQty); }
        if (e.type === 'transform-in') { const t = S.product(r.productId); return (r.kind === 'exchange' ? 'Reçu en échange de ' : 'Issu de ') + esc(t ? t.name : '?'); }
        const k = REF.adjKinds.find(x => x.id === e.type); return esc(k ? k.label : 'Correction');
      };
      const evAct = e => e.type === 'achat' ? 'pur' : e.type === 'vente' ? 'sale' : 'adj';
      const lastPur = c.events.slice().reverse().find(e => e.type === 'achat' && e.ref.url);
      const buyUrl = U.url(p.buyUrl) || (lastPur ? U.url(lastPur.ref.url) : '');
      const badges = (p.keep ? ' <span class="badge">Collection · pas à vendre</span>' : '') + (p.condition ? '<span class="badge">' + esc(p.condition) + '</span>' : '') + (p.location ? '<span class="badge">' + icon('pin', 'xs') + esc(p.location) + '</span>' : '') + (p.sku ? '<span class="badge mono">' + esc(p.sku) + '</span>' : '') + (c.dormant ? '<span class="badge warn">Dormant · ' + c.age + ' j</span>' : '') + (p.archived ? '<span class="badge">Archivé</span>' : '');
      return '<div class="prod-stage' + (c.qty <= 0 ? ' out' : '') + '">' + UI.thumb(p) + '</div>'
        + '<div class="prod-head"><div class="label">' + esc(REF.type(p.type).label) + '</div><h3>' + esc(p.name) + '</h3><div class="muted" style="font-size:13px">' + esc(UI.pSub(p)) + '</div>'
        + (badges ? '<div class="prod-badges">' + badges + '</div>' : '') + '</div>'
        + '<div class="prod-acts"><button class="btn btn-primary" data-d="sell">' + icon('tag') + 'Vendre</button><button class="btn" data-d="buy">' + icon('cart') + 'Acheter</button><button class="btn" data-d="adj">' + icon('swap') + 'Mouvement</button>' + (['display', 'etb', 'coffret', 'upc', 'tripack', 'lot', 'tin'].includes(p.type) ? '<button class="btn" data-d="split">' + icon('split') + 'Éclater</button>' : '') + '<button class="btn" data-d="edit">' + icon('edit') + 'Modifier</button>'
        + '</div>'
        + '<div class="prod-links">'
        + (p.cmUrl ? '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + esc(U.url(p.cmUrl)) + '">' + icon('link') + 'Cardmarket</a>' : '<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="' + esc(Forms.cmSearch(p)) + '">' + icon('search') + 'Chercher sur Cardmarket</a>')
        + (buyUrl ? '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + esc(buyUrl) + '">' + icon('cart') + 'Page d’achat <span class="faint">' + esc(U.host(buyUrl)) + '</span></a>' : '')
        + '<button class="btn btn-sm btn-ghost" data-d="links">' + icon('edit') + (p.cmUrl || buyUrl ? 'Modifier les liens' : 'Ajouter des liens') + '</button></div>'
        + '<div class="kv prod-kv">'
        + '<div><div class="l">En stock</div><div class="v ' + (c.qty < 0 ? 'neg' : '') + '">' + U.n(c.qty) + (c.transit ? ' <small class="faint">+' + U.n(c.transit) + '</small>' : '') + '</div></div>'
        + '<div><div class="l">Coût / u.</div><div class="v">' + U.eur(c.cost) + '</div></div>'
        + '<div><div class="l">Valeur</div><div class="v">' + U.eur(c.value) + '</div></div>'
        + '<div><div class="l">Vendus</div><div class="v">' + U.n(c.soldQty) + '</div></div>'
        + '<div><div class="l">Bénéfice réalisé</div><div class="v ' + signCls(c.profit) + '">' + U.signed(c.profit) + '</div></div>'
        + '<div><div class="l">Marge</div><div class="v">' + U.pct(margin, 0) + '</div></div></div>'
        + (lots.length ? '<div><div class="label" style="margin-bottom:8px">Lots en stock</div><div class="lots">' + lots.map(l => '<div class="lot"><span class="lot-q">×' + U.n(l.qty) + '</span><div style="min-width:0"><div class="row-t">' + esc(l.who) + '</div><div class="row-s">' + U.date(l.d) + '</div></div><div class="num">' + U.eur(l.unit) + '<small class="faint"> /u</small></div></div>').join('') + '</div></div>' : '')
        + '<div class="card card-pad" style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end;background:var(--card-2)"><label class="field"><span>Prix marché actuel' + (p.marketAt ? ' <span class="faint">· MAJ ' + U.date(p.marketAt) + '</span>' : '') + '</span><input type="text" inputmode="decimal" data-market value="' + (p.market ? String(p.market).replace('.', ',') : '') + '" placeholder="ex. 64,90"></label><button class="btn" data-d="market">' + icon('check') + 'Mettre à jour</button>'
        + (c.market && c.qty > 0 ? '<div class="faint" style="grid-column:1/-1;font-size:12.5px">Plus-value latente sur ton stock : <b class="' + signCls(g) + ' mono">' + U.signed(g) + '</b>' + (p.target ? ' · prix visé ' + U.eur(p.target) : '') + '</div>' : '') + '</div>'
        + (p.notes ? '<div class="muted" style="font-size:13px;white-space:pre-wrap">' + esc(p.notes) + '</div>' : '')
        + '<div><div class="label" style="margin-bottom:6px">Historique</div><div class="timeline">' + (c.events.length ? c.events.slice().reverse().map(e => '<div class="tl" data-ev="' + evAct(e) + '" data-id="' + e.ref.id + '" style="cursor:pointer"><span class="d">' + U.date(e.d) + '</span><span>' + evLabel(e) + '</span><span class="num ' + (e.qty > 0 ? 'pos' : '') + '">' + (e.qty > 0 ? '+' : '') + U.n(e.qty) + ' <span class="faint">@ ' + U.eur(e.unit) + '</span></span></div>').join('') : '<div class="faint" style="font-size:13px">Aucun mouvement.</div>') + '</div></div>';
    };
    ctx = UI.open({
      title: 'Fiche produit', kind: 'drawer', size: 'prod', body: body(),
      onMount(el) {
        const b = el.querySelector('.modal-b');
        const tint = () => { const t = b.querySelector('.prod-stage .pthumb.has-aura'); el.style.setProperty('--aura', (t && t.style.getPropertyValue('--aura')) || '#8d8b96'); };
        V._drawer = () => { b.innerHTML = body(); tint(); };
        tint();
        b.classList.add('intro'); UI.countUp(b);
        setTimeout(() => b.classList.remove('intro'), 1100);
        b.addEventListener('click', e => {
          const d = e.target.closest('[data-d]'), ev = e.target.closest('[data-ev]');
          const p = S.product(id);
          if (ev) { const coll = { pur: 'purchases', sale: 'sales', adj: 'adjustments' }[ev.dataset.ev]; const r = S.get(coll, ev.dataset.id); if (r) ({ pur: Forms.purchase, sale: Forms.sale, adj: Forms.adjust })[ev.dataset.ev](r); return; }
          if (!d || !p) return;
          const k = d.dataset.d;
          if (k === 'sell') Forms.sale(null, { productId: id });
          else if (k === 'buy') Forms.purchase(null, { productId: id });
          else if (k === 'adj') Forms.adjust(null, { productId: id });
          else if (k === 'split') Forms.adjust(null, { productId: id, kind: 'transform' });
          else if (k === 'edit') Forms.product(p);
          else if (k === 'links') Forms.links(p);
          else if (k === 'market') {
            const v = U.num(b.querySelector('[data-market]').value);
            p.market = v || ''; p.marketAt = U.today(); S.upsert('products', p); UI.toast('Prix marché mis à jour');
          }
        });
        b.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-market]')) b.querySelector('[data-d=market]').click(); });
      },
      onClose() { V._drawer = null; }
    });
  };

  /* ======================= ACHATS ======================= */
  function purFiltered() {
    const f = V.ui.achats, q = U.norm(f.q.trim());
    return S.state.purchases.filter(p => {
      if (f.status === 'received' && p.status !== 'received') return false;
      if (f.status === 'transit' && p.status === 'received') return false;
      const sp = S.supplier(p.supplierId);
      if (f.channel !== 'all' && (sp ? sp.channel : 'instore') !== f.channel) return false;
      if (q) { const hay = U.norm(S.supplierName(p) + ' ' + (p.ref || '') + ' ' + (p.notes || '') + ' ' + p.lines.map(l => (S.product(l.productId) || {}).name).join(' ')); if (!q.split(/\s+/).every(w => hay.includes(w))) return false; }
      return true;
    }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0)));
  }
  V.achatsList = () => {
    const C = S.calc(), list = purFiltered();
    if (!list.length) return '<div class="card">' + (S.state.purchases.length ? empty('?', 'Aucun achat', 'Aucun achat ne correspond à ces filtres.') : empty('€', 'Aucun achat enregistré', 'Enregistre tes achats en magasin ou en ligne : ton stock et ton coût de revient se calculent tout seuls.', '<button class="btn btn-primary" data-act="new-pur">' + icon('plus') + 'Nouvel achat</button>')) + '</div>';
    // une ligne par unité achetée, comme dans Transactions (frais répartis comme dans le coût de revient), même ordre à la main
    const rows = [];
    list.forEach(p => {
      const L = p.lines || [], pc = C.pur[p.id], qs = L.map(l => Math.max(1, Math.round(U.num(l.qty)))), units = U.sum(qs, q => q);
      let left = pc.total, n = 0;
      L.forEach((l, i) => {
        const ords = Array.isArray(l.ords) ? l.ords : [];
        for (let u = 0; u < qs[i]; u++) {
          n++;
          const amt = n === units ? U.round2(left) : U.round2(pc.landed[i].landed); left -= amt;
          rows.push({ p, pr: S.product(l.productId), n, units, amt, c: ords[u] != null ? U.num(ords[u]) : (l.ord != null ? U.num(l.ord) : ordOf(p) - i * 1e-3) - u * 1e-5 });
        }
      });
    });
    rows.sort((a, b) => (a.p.date < b.p.date ? 1 : a.p.date > b.p.date ? -1 : b.c - a.c));
    return '<div class="card" style="overflow:clip">' + groupByMonth(rows, r => r.p.date, b => U.n(b.length) + ' art. · ' + U.eur(U.sum(b, r => r.amt)), r => {
      const p = r.p, sp = S.supplier(p.supplierId), online = sp && sp.channel === 'online';
      return '<div class="row" data-act="pur" data-id="' + p.id + '"><div class="ico ' + (online ? 'info' : 'acc') + '">' + icon(online ? 'globe' : 'store') + '</div>'
        + '<div style="min-width:0"><div class="row-t">' + esc(r.pr ? r.pr.name : 'Article') + '</div><div class="row-s">' + esc(S.supplierName(p)) + ' · ' + U.date(p.date) + ' · ' + esc(S.paidWith(p)) + (r.units > 1 ? ' · ' + r.n + ' sur ' + r.units : '') + '</div></div>'
        + '<div class="row-r qa">' + purBadge(p) + (p.status !== 'received' ? '<button class="btn btn-sm" data-act="pur-recv" data-id="' + p.id + '" title="' + (r.units > 1 ? 'Marquer toute la commande reçue' : 'Marquer reçu') + '">' + icon('check') + '<span class="t">Reçu</span></button>' : '') + '<div class="num">' + U.eur(r.amt) + '</div></div></div>';
    }) + '</div>';
  };
  V.achats = () => {
    const f = V.ui.achats, C = S.calc();
    const list = purFiltered();
    const y = String(new Date().getFullYear());
    const yl = S.state.purchases.filter(p => p.date.startsWith(y));
    const inst = U.sum(yl.filter(p => (S.supplier(p.supplierId) || {}).channel !== 'online'), p => C.pur[p.id].total);
    const onl = U.sum(yl.filter(p => (S.supplier(p.supplierId) || {}).channel === 'online'), p => C.pur[p.id].total);
    const fees = U.sum(yl, p => U.num(p.shipping) + U.num(p.otherFees));
    return {
      title: 'Achats', sub: list.length + ' achat' + (list.length > 1 ? 's' : '') + ' · ' + U.eur(U.sum(list, p => C.pur[p.id].total)),
      html: '<div class="strip">'
        + '<div><div class="l">Achats ' + y + '</div><div class="v">' + U.eur0(inst + onl) + '</div></div>'
        + '<div><div class="l">En magasin</div><div class="v">' + U.eur0(inst) + '</div></div>'
        + '<div><div class="l">En ligne</div><div class="v">' + U.eur0(onl) + '</div></div>'
        + '<div><div class="l">Frais de port & annexes</div><div class="v">' + U.eur0(fees) + '</div></div>'
        + '<div><div class="l">En transit</div><div class="v">' + U.eur0(C.transitValue) + ' <small>' + U.n(C.transitQty) + ' art.</small></div></div></div>'
        + '<div class="toolbar">' + search('achats', 'Fournisseur, produit, n° de commande…')
        + chips([['all', 'Tous'], ['received', 'Reçus'], ['transit', 'À recevoir']], f.status, 'achats', 'status')
        + chips([['all', 'Tous canaux'], ['instore', 'Magasin'], ['online', 'En ligne']], f.channel, 'achats', 'channel')
        + '<span class="grow"></span><button class="btn btn-primary" data-act="new-pur">' + icon('plus') + '<span class="t">Nouvel achat</span></button></div>'
        + '<div data-list="achats">' + V.achatsList() + '</div>'
    };
  };

  /* ======================= VENTES ======================= */
  function salesFiltered() {
    const f = V.ui.ventes, q = U.norm(f.q.trim());
    return S.state.sales.filter(s => {
      if (f.pf !== 'all' && s.platformId !== f.pf) return false;
      if (f.status === 'pending' && s.status !== 'pending') return false;
      if (f.status === 'toship' && (s.status === 'refunded' || s.shipped || s.platformId === 'pf_hand')) return false;
      if (f.status === 'refunded' && s.status !== 'refunded') return false;
      if (q) { const hay = U.norm((s.buyer || '') + ' ' + (s.tracking || '') + ' ' + (s.notes || '') + ' ' + S.platform(s.platformId).name + ' ' + s.lines.map(l => (S.product(l.productId) || {}).name).join(' ')); if (!q.split(/\s+/).every(w => hay.includes(w))) return false; }
      return true;
    }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0)));
  }
  V.ventesList = () => {
    const C = S.calc(), list = salesFiltered();
    if (!list.length) return '<div class="card">' + (S.state.sales.length ? empty('?', 'Aucune vente', 'Aucune vente ne correspond à ces filtres.') : empty('€', 'Aucune vente enregistrée', 'Enregistre une vente ou lance le mode live pour saisir tes ventes Whatnot en un clic.', '<button class="btn btn-primary" data-act="new-sale">' + icon('plus') + 'Nouvelle vente</button> <button class="btn" data-act="new-live">' + icon('live') + 'Live passé</button>')) + '</div>';
    const shown = list.slice(0, 400);
    return '<div class="card" style="overflow:clip">' + groupByMonth(shown, s => s.date, b => b.length + ' ventes · ' + U.eur(U.sum(b, s => C.sale[s.id].revenue)) + ' · <b class="' + signCls(U.sum(b, s => C.sale[s.id].profit)) + '" style="font:inherit">' + U.signed(U.sum(b, s => C.sale[s.id].profit)) + '</b>', s => {
      const cs = C.sale[s.id], p = S.product((s.lines[0] || {}).productId);
      return '<div class="row" data-act="sale" data-id="' + s.id + '">' + UI.mini(p)
        + '<div style="min-width:0"><div class="row-t">' + saleTitle(s) + '</div><div class="row-s">' + pfTag(s.platformId) + ' · ' + U.date(s.date) + (s.buyer ? ' · ' + esc(s.buyer) : '') + '</div></div>'
        + '<div class="row-r qa">' + saleBadges(s)
        + (s.status === 'pending' ? '<button class="btn btn-sm" data-act="sale-paid" data-id="' + s.id + '" title="Marquer encaissé">' + icon('wallet') + '<span class="t">Encaissé</span></button>' : '')
        + (s.status !== 'refunded' && !s.shipped && s.platformId !== 'pf_hand' ? '<button class="btn btn-sm" data-act="sale-ship" data-id="' + s.id + '" title="Marquer expédié">' + icon('truck') + '<span class="t">Expédié</span></button>' : '')
        + '<div style="min-width:78px"><div class="num">' + U.eur(cs.revenue) + '</div><div class="num ' + signCls(cs.profit) + '" style="font-size:12px">' + U.signed(cs.profit) + '</div></div></div></div>';
    }) + (list.length > shown.length ? '<div class="faint" style="padding:14px 22px;font-size:12.5px">+ ' + (list.length - shown.length) + ' ventes plus anciennes (affine la recherche)</div>' : '') + '</div>';
  };
  V.ventes = () => {
    const f = V.ui.ventes, C = S.calc();
    const list = salesFiltered().filter(s => s.status !== 'refunded');
    const rev = U.sum(list, s => C.sale[s.id].revenue), prof = U.sum(list, s => C.sale[s.id].profit), fees = U.sum(list, s => C.sale[s.id].fees);
    const K = V.counts();
    const used = new Set(S.state.sales.map(s => s.platformId));
    return {
      title: 'Ventes', sub: list.length + ' vente' + (list.length > 1 ? 's' : '') + ' affichée' + (list.length > 1 ? 's' : ''),
      html: '<div class="strip">'
        + '<div><div class="l">Chiffre d’affaires</div><div class="v">' + U.eur0(rev) + '</div></div>'
        + '<div><div class="l">Bénéfice</div><div class="v ' + signCls(prof) + '">' + U.eur0(prof) + '</div></div>'
        + '<div><div class="l">Marge</div><div class="v">' + U.pct(rev ? prof / rev : NaN, 1) + '</div></div>'
        + '<div><div class="l">Frais plateformes</div><div class="v">' + U.eur0(fees) + ' <small>' + U.pct(rev ? fees / rev : NaN, 1) + '</small></div></div>'
        + '<div><div class="l">À encaisser</div><div class="v warn">' + U.eur0(C.pending) + '</div></div></div>'
        + '<div class="toolbar">' + search('ventes', 'Acheteur, produit, n° de suivi…')
        + chips([['all', 'Toutes'], ['pending', 'À encaisser <span class="faint">' + K.pending.length + '</span>'], ['toship', 'À expédier <span class="faint">' + K.toShip.length + '</span>'], ['refunded', 'Remboursées']], f.status, 'ventes', 'status')
        + '<span class="grow"></span><button class="btn" data-act="new-live">' + icon('live') + '<span class="t">Live passé</span></button><button class="btn btn-primary" data-act="new-sale">' + icon('plus') + '<span class="t">Nouvelle vente</span></button></div>'
        + '<div style="margin:-6px 0 18px">' + chips([['all', 'Toutes plateformes']].concat(S.state.platforms.filter(p => used.has(p.id)).map(p => [p.id, esc(p.name), p.color])), f.pf, 'ventes', 'pf') + '</div>'
        + '<div data-list="ventes">' + V.ventesList() + '</div>'
    };
  };

  /* ======================= LIVES ======================= */
  V.liveStats = l => {
    const st = S.state, C = S.calc();
    const sales = st.sales.filter(s => s.liveId === l.id && s.status !== 'refunded');
    const adjs = st.adjustments.filter(a => a.liveId === l.id);
    const exps = st.expenses.filter(e => e.liveId === l.id);
    const rev = U.sum(sales, s => C.sale[s.id].revenue), prof = U.sum(sales, s => C.sale[s.id].profit);
    const give = U.sum(adjs.filter(a => a.kind === 'giveaway' || a.kind === 'opened'), a => (C.adj[a.id] || {}).cost || 0);
    const exp = U.sum(exps, e => U.num(e.amount));
    let mins = 0;
    if (l.startedAt && l.endedAt) mins = (l.endedAt - l.startedAt) / 6e4;
    else if (l.start && l.end) { const [a, b] = [l.start, l.end].map(t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; }); mins = b >= a ? b - a : b + 1440 - a; }
    const net = prof - give - exp;
    return { sales, adjs, exps, rev, prof, give, exp, net, mins, perH: mins >= 15 ? net / (mins / 60) : null, units: U.sum(sales, s => C.sale[s.id].units) };
  };
  const dur = m => m ? (m >= 60 ? Math.floor(m / 60) + ' h ' + U.pad(Math.round(m % 60)) : Math.round(m) + ' min') : '—';
  V.lives = () => {
    const lives = S.state.lives.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0)));
    const all = lives.map(l => ({ l, s: V.liveStats(l) }));
    const tot = { rev: U.sum(all, x => x.s.rev), net: U.sum(all, x => x.s.net), give: U.sum(all, x => x.s.give), mins: U.sum(all, x => x.s.mins) };
    const maxRev = Math.max(1, ...all.map(x => x.s.rev));
    return {
      title: 'Lives', sub: lives.length + ' session' + (lives.length > 1 ? 's' : ''),
      html: '<div class="strip">'
        + '<div><div class="l">CA en live</div><div class="v">' + U.eur0(tot.rev) + '</div></div>'
        + '<div><div class="l">Bénéfice net</div><div class="v ' + signCls(tot.net) + '">' + U.eur0(tot.net) + '</div></div>'
        + '<div><div class="l">CA moyen / live</div><div class="v">' + U.eur0(lives.length ? tot.rev / lives.length : 0) + '</div></div>'
        + '<div><div class="l">Giveaways & ouvertures</div><div class="v">' + U.eur0(tot.give) + '</div></div>'
        + '<div><div class="l">Bénéfice / heure</div><div class="v">' + (tot.mins ? U.eur0(tot.net / (tot.mins / 60)) : '—') + '</div></div></div>'
        + '<div class="toolbar"><span class="grow"></span><button class="btn" data-act="new-live">' + icon('plus') + 'Live passé</button><button class="btn btn-primary" data-act="start-live">' + icon('live') + 'Lancer un live</button></div>'
        + (all.length ? '<div class="live-cards">' + all.map(({ l, s }) => '<div class="card live-card glow" data-act="live" data-id="' + l.id + '" style="--c:' + esc(S.platform(l.platformId).color) + '">'
          + '<div class="lc-h"><div><div class="lc-d">' + U.date(l.date) + ' · ' + pfTag(l.platformId) + '</div><div class="lc-t">' + esc(l.title || 'Live') + '</div></div><div class="lc-dur">' + icon('clock', 'xs') + dur(s.mins) + '</div></div>'
          + '<div class="lc-big"><span class="num">' + U.eur0(s.rev) + '</span><span class="num ' + signCls(s.net) + '">' + U.signed(s.net).replace(/,\d\d/, '') + '</span></div>'
          + '<div class="bar holo-bar" style="height:5px"><i style="width:' + (s.rev / maxRev * 100) + '%"></i></div>'
          + '<div class="lc-f"><span>' + s.sales.length + ' ventes</span><span>' + U.n(s.units) + ' art.</span><span>' + (s.give ? icon('gift', 'xs') + ' ' + U.eur0(s.give) : '') + '</span><span>' + (s.perH != null ? U.eur0(s.perH) + '/h' : '') + '</span></div></div>').join('') + '</div>'
          : '<div class="card">' + empty('●', 'Aucun live', 'Lance un live : tu touches ce qui sort pendant le stream, puis à la fin tu entres ce que tu as touché pour chaque booster. HOLO enregistre tout.', '<button class="btn btn-primary" data-act="start-live">' + icon('live') + 'Lancer un live</button>') + '</div>')
    };
  };
  V.liveDrawer = id => {
    const body = () => {
      const l = S.get('lives', id); if (!l) return '<p>Live supprimé.</p>';
      const s = V.liveStats(l), C = S.calc();
      return '<div><div class="muted" style="font-size:13px">' + U.date(l.date) + ' · ' + pfTag(l.platformId) + (l.start ? ' · ' + esc(l.start) + (l.end ? '–' + esc(l.end) : '') : '') + '</div><h3 style="font:700 20px var(--f-display);margin:6px 0 0">' + esc(l.title || 'Live') + '</h3></div>'
        + ((l.startedAt || (l.queue || []).length) && !l.validated ? '<button class="btn btn-primary btn-block" data-d="resume">' + icon('live') + ((l.queue || []).length && l.endedAt ? 'Entrer les montants · ' + l.queue.length + ' lignes' : 'Reprendre le live') + '</button>' : '')
        + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm" data-d="recap">' + icon('plus') + 'Ajouter des articles vendus</button><button class="btn btn-sm" data-d="give">' + icon('gift') + 'Giveaway</button><button class="btn btn-sm" data-d="exp">' + icon('receipt') + 'Dépense</button><button class="btn btn-sm" data-d="edit">' + icon('edit') + 'Modifier</button></div>'
        + '<div class="kv"><div><div class="l">CA</div><div class="v">' + U.eur(s.rev) + '</div></div><div><div class="l">Bénéfice ventes</div><div class="v ' + signCls(s.prof) + '">' + U.signed(s.prof) + '</div></div><div><div class="l">Bénéfice net</div><div class="v ' + signCls(s.net) + '">' + U.signed(s.net) + '</div></div>'
        + '<div><div class="l">Giveaways</div><div class="v">' + U.eur(s.give) + '</div></div><div><div class="l">Durée</div><div class="v">' + dur(s.mins) + '</div></div><div><div class="l">Par heure</div><div class="v">' + (s.perH != null ? U.eur0(s.perH) : '—') + '</div></div></div>'
        + (l.notes ? '<div class="muted" style="font-size:13px;white-space:pre-wrap">' + esc(l.notes) + '</div>' : '')
        + '<div><div class="label" style="margin-bottom:6px">Ventes (' + s.sales.length + ')</div><div class="timeline">' + (s.sales.length ? s.sales.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(x => '<div class="tl" data-ev="sale" data-id="' + x.id + '" style="cursor:pointer;grid-template-columns:1fr auto auto"><span>' + saleTitle(x) + (x.buyer ? ' <span class="faint">· ' + esc(x.buyer) + '</span>' : x.notes ? ' <span class="faint">· ' + esc(x.notes) + '</span>' : '') + '</span><span class="num">' + U.eur(C.sale[x.id].revenue) + '</span><span class="num ' + signCls(C.sale[x.id].profit) + '" style="min-width:70px;text-align:right">' + U.signed(C.sale[x.id].profit) + '</span></div>').join('') : '<div class="faint" style="font-size:13px">Aucune vente liée.</div>') + '</div></div>'
        + (s.adjs.length ? '<div><div class="label" style="margin-bottom:6px">Giveaways & mouvements</div><div class="timeline">' + s.adjs.map(a => { const p = S.product(a.productId), k = REF.adjKinds.find(x => x.id === a.kind); return '<div class="tl" data-ev="adj" data-id="' + a.id + '" style="cursor:pointer;grid-template-columns:1fr auto"><span>' + esc(k ? k.label : '') + ' · ' + esc(p ? p.name : '?') + ' ×' + U.n(Math.abs(a.qty)) + '</span><span class="num neg">−' + U.eur((C.adj[a.id] || {}).cost || 0) + '</span></div>'; }).join('') + '</div></div>' : '')
        + (s.exps.length ? '<div><div class="label" style="margin-bottom:6px">Dépenses</div><div class="timeline">' + s.exps.map(e => '<div class="tl" data-ev="exp" data-id="' + e.id + '" style="cursor:pointer;grid-template-columns:1fr auto"><span>' + esc(e.label || e.category) + '</span><span class="num neg">−' + U.eur(e.amount) + '</span></div>').join('') + '</div></div>' : '');
    };
    UI.open({
      title: 'Session live', kind: 'drawer', body: body(),
      onMount(el, close) {
        const b = el.querySelector('.modal-b');
        V._drawer = () => { b.innerHTML = body(); };
        b.addEventListener('click', e => {
          const ev = e.target.closest('[data-ev]');
          if (ev) { const m = { sale: ['sales', Forms.sale], adj: ['adjustments', Forms.adjust], exp: ['expenses', Forms.expense] }[ev.dataset.ev]; const r = S.get(m[0], ev.dataset.id); if (r) m[1](r); return; }
          const d = e.target.closest('[data-d]'); if (!d) return;
          const l = S.get('lives', id); if (!l) return;
          const k = d.dataset.d;
          if (k === 'resume') { close(); Live.open(id); }
          else if (k === 'recap') Forms.liveRecap(l);
          else if (k === 'sale') Forms.sale(null, { liveId: id, platformId: l.platformId });
          else if (k === 'give') Forms.adjust(null, { liveId: id, kind: 'giveaway' });
          else if (k === 'exp') Forms.expense(null, { liveId: id });
          else if (k === 'edit') Forms.live(l);
        });
      },
      onClose() { V._drawer = null; }
    });
  };

  /* ======================= TRÉSORERIE ======================= */
  V.treso = () => {
    const st = S.state, C = S.calc(), pal = V.pal(), f = V.ui.treso;
    const series = S.cashSeries(90);
    const L = S.ledger().filter(m => (f.acc === 'all' || m.acc === f.acc) && (f.kind === 'all' || m.kind === f.kind || (f.kind === 'perso' && (m.kind === 'deposit' || m.kind === 'withdraw'))));
    const y = String(new Date().getFullYear());
    const ry = S.pnl(y + '-01-01', y + '-12-31');
    const cats = Object.entries(ry.byExpense).sort((a, b) => b[1] - a[1]);
    const maxC = Math.max(1, ...cats.map(c => c[1]));
    const withdrawn = U.sum(st.transfers.filter(t => t.kind === 'withdraw' && t.date.startsWith(y)), t => U.num(t.amount));
    const kindIc = { sale: ['tag', 'pos'], purchase: ['cart', 'info'], expense: ['receipt', 'warn'], persoexp: ['wallet', 'acc'], transfer: ['swap', ''], income: ['bank', 'pos'], deposit: ['bank', 'acc'], withdraw: ['wallet', 'acc'] };
    const shown = L.slice(0, f.limit);
    const cs0 = series[0] ? series[0].v : 0, csN = series.length ? series[series.length - 1].v : 0;
    return {
      title: 'Trésorerie', sub: 'Solde total ' + U.eur(C.cash) + (C.pending ? ' · ' + U.eur(C.pending) + ' à encaisser' : ''),
      html: '<div class="toolbar"><span class="grow"></span><button class="btn" data-act="new-exp">' + icon('receipt') + '<span class="t">Dépense</span></button><button class="btn" data-act="new-sub">' + icon('clock') + '<span class="t">Abonnement</span></button><button class="btn" data-act="new-trf" data-k="income">' + icon('bank') + '<span class="t">Rentrée d’argent</span></button><button class="btn" data-act="new-trf" data-k="withdraw">' + icon('wallet') + '<span class="t">Me verser</span></button><button class="btn btn-primary" data-act="new-trf" data-k="transfer">' + icon('swap') + '<span class="t">Virement / versement</span></button></div>'
        + '<div class="acc-grid">'
        + '<div class="holo" style="min-height:180px"><span class="holo-tag">TOTAL</span><div class="kpi-l">' + icon('wallet') + 'Trésorerie disponible</div><div class="holo-v">' + moneySplit(C.avail) + '</div>' + (C.onPlatform > 0 ? '<div class="pending-pill">' + icon('clock') + '+ ' + U.eur(C.onPlatform) + ' en attente de retrait : ' + S.state.accounts.filter(a => a.type === 'platform' && C.acc[a.id].balance > 0.004).map(a => a.name.replace(/^Solde /, '') + ' ' + U.eur(C.acc[a.id].balance)).join(' · ') + '</div>' : '') + (C.pending > 0 ? '<div class="pending-pill">' + icon('clock') + '+ ' + U.eur(C.pending) + ' en attente</div>' : '') + (C.transitTotal > 0 ? '<div class="pending-pill" style="margin-top:8px">' + icon('clock') + '+ ' + U.eur(C.transitTotal) + ' en route entre tes comptes</div>' : '') + '<div style="margin-top:auto;padding-top:14px;font-size:12.5px;opacity:.7">Dispo + plateformes + à encaisser' + (C.transitTotal > 0 ? ' + en route' : '') + ' : <b class="mono" style="color:#fff">' + U.eur(C.cash + C.pending + C.transitTotal) + '</b></div></div>'
        + st.accounts.map(a => { const c = C.acc[a.id]; return '<div class="card acc-card' + (f.acc === a.id ? ' on' : '') + '" data-act="set" data-view="treso" data-k="acc" data-v="' + (f.acc === a.id ? 'all' : a.id) + '" style="--c:' + esc(a.color) + '">'
          + '<div class="acc-top">' + accLogo(a) + '<div class="acc-id"><b>' + esc(a.name) + '</b><small>' + (REF.accKind[a.type] || '') + '</small></div><button class="btn btn-ghost btn-icon btn-sm acc-edit" data-act="acc" data-id="' + a.id + '" title="Modifier">' + icon('edit') + '</button></div>'
          + '<div class="acc-v num ' + (c.balance < 0 ? 'neg' : '') + '">' + moneySplit(c.balance) + '</div>'
          + '<div class="acc-f"><span class="acc-in">↓ ' + U.eur0(c.in) + '</span><span class="acc-out">↑ ' + U.eur0(c.out) + '</span></div>'
          + S.transits().filter(t => t.from === a.id).map(t => '<div class="acc-transit">' + icon('clock', 'xs') + '<span>' + U.eur(t.amount) + ' en route vers ' + esc(S.account(t.to).name) + ' · lancé le ' + U.date(t.date) + '</span><button class="btn btn-sm" data-act="trf-received" data-id="' + t.id + '" title="L’argent est arrivé">' + icon('check', 'xs') + 'Reçu</button></div>').join('')
          + S.transits().filter(t => t.to === a.id).map(t => '<div class="acc-transit in">' + icon('clock', 'xs') + '<span>+ ' + U.eur(t.amount) + ' en route depuis ' + esc(S.account(t.from).name) + ' · pas encore sur ce compte</span></div>').join('')
          + '</div>'; }).join('')
        + '</div>'
        + '<div style="height:16px"></div><div class="grid dash-b">'
        + '<div class="card"><div class="card-h"><h3>Solde · 90 jours</h3><div class="right"><span class="delta ' + (csN >= cs0 ? 'up' : 'down') + '">' + U.signed(csN - cs0).replace(/,\d\d/, '') + '</span></div></div><div class="card-b">' + UI.chart({ type: 'area', height: 220, labels: series.map(p => U.date(p.d)), series: [{ name: 'Trésorerie', color: pal.cash, values: series.map(p => p.v), fill: true }] }) + '</div></div>'
        + (() => { const subs = S.subscriptions(); if (!subs.length) return ''; return '<div class="card"><div class="card-h"><h3>Abonnements</h3><div class="right"><button class="btn btn-sm" data-act="new-sub">' + icon('plus') + 'Abonnement</button></div></div><div class="rows">'
          + subs.map(x => '<div class="row" data-act="exp" data-id="' + x.e.id + '"><div class="ico ' + (x.active ? (x.left <= 30 ? 'warn' : 'acc') : '') + '">' + icon('receipt') + '</div><div style="min-width:0"><div class="row-t">' + esc(x.e.label || x.e.category) + '</div><div class="row-s">' + U.eur(x.e.amount) + ' · ' + U.eur(x.monthly) + '/mois · ' + (x.active ? 'jusqu’au ' + U.date(x.until) : 'terminé le ' + U.date(x.until)) + '</div></div><div class="row-r">' + (x.active ? (x.left <= 30 ? '<span class="badge warn">' + (x.left ? 'expire dans ' + x.left + ' j' : 'expire aujourd’hui') + '</span>' : '<span class="badge pos">actif</span>') : '<span class="badge">à renouveler</span>') + '</div></div>').join('')
          + '</div><div class="faint" style="font-size:12px;padding:10px 22px 14px">Comptés dans le bilan mois par mois sur toute leur durée.</div></div>'; })()
        + (() => { const recs = S.recurring(); if (!recs.length) return ''; const kl = { transfer: 'Virement', income: 'Rentrée d’argent', deposit: 'Apport perso', withdraw: 'Retrait perso' }; return '<div class="card"><div class="card-h"><h3>Automatismes</h3></div><div class="rows">'
          + recs.map(r => '<div class="row"><div class="ico acc">' + icon('clock') + '</div><div style="min-width:0"><div class="row-t">' + esc(r.label) + '</div><div class="row-s">' + (kl[r.kind] || '') + ' · ' + U.eur(r.amount) + (r.to ? ' → ' + esc(S.account(r.to).name) : '') + ' · prochain le ' + U.date(r.next) + (r.total ? ' · reste ' + r.left + ' sur ' + r.total : ' · sans fin') + '</div></div><div class="row-r"><button class="btn btn-sm btn-ghost" data-act="rec-stop" data-id="' + r.id + '">Arrêter</button></div></div>').join('')
          + '</div><div class="faint" style="font-size:12px;padding:10px 22px 14px">Ajoutés tout seuls chaque mois à la date prévue.</div></div>'; })()
        + '<div class="card"><div class="card-h"><h3>Dépenses de l’activité ' + y + '</h3><div class="right num faint" style="font-size:12.5px">' + U.eur0(ry.expenses) + '</div></div><div class="card-b">' + (cats.length ? '<div class="hbars">' + cats.map(([k, v]) => '<div class="hbar"><span class="t">' + esc(k) + '</span><span class="v">' + U.eur(v) + '</span><div class="bar"><i style="width:' + (v / maxC * 100) + '%;background:var(--warn)"></i></div></div>').join('') + '</div>' : empty('∅', 'Aucune dépense', 'Emballages, abonnements, matériel… tout ce qui n’est pas du stock.')) + '<div class="faint" style="font-size:12px;margin-top:16px;padding-top:12px;border-top:1px solid var(--line)">Rémunération versée en ' + y + ' : <b class="mono" style="color:var(--tx)">' + U.eur(withdrawn) + '</b><br>Dépenses perso en ' + y + ' (repas, courses… hors bénéfice) : <b class="mono" style="color:var(--tx)">' + U.eur(ry.perso) + '</b></div></div></div>'
        + '</div>'
        + '<div class="section-title">Journal des mouvements</div>'
        + '<div class="toolbar">' + chips([['all', 'Tous']].concat(st.accounts.map(a => [a.id, esc(a.name), a.color])), f.acc, 'treso', 'acc') + '<span class="grow"></span>'
        + '<select data-set="treso" data-k="kind" style="width:auto">' + [['all', 'Tous les types'], ['sale', 'Ventes encaissées'], ['purchase', 'Achats'], ['expense', 'Dépenses de l’activité'], ['persoexp', 'Dépenses perso'], ['transfer', 'Virements internes'], ['income', 'Rentrées d’argent'], ['perso', 'Apports / retraits']].map(([v, l]) => Forms.opt(v, l, f.kind)).join('') + '</select></div>'
        + (shown.length ? '<div class="card" style="overflow:clip">' + groupByMonth(shown, m => m.d, b => { const v = U.sum(b, m => m.amount); return '<span class="' + signCls(v) + '">' + U.signed(v) + '</span>'; }, m => {
          const [ic, tone] = kindIc[m.kind] || ['wallet', ''];
          const act = { sale: 'sale', purchase: 'pur', expense: 'exp', persoexp: 'exp', transfer: 'trf', income: 'trf', deposit: 'trf', withdraw: 'trf' }[m.kind];
          return '<div class="row" data-act="' + act + '" data-id="' + m.ref.id + '"><div class="ico ' + tone + '">' + icon(ic) + '</div><div style="min-width:0"><div class="row-t">' + esc(m.label) + '</div><div class="row-s">' + U.date(m.d) + ' · ' + accTag(m.acc) + '</div></div><div class="row-r"><span class="num ' + (m.amount >= 0 ? 'pos' : '') + '">' + U.signed(m.amount) + '</span></div></div>';
        }) + (L.length > shown.length ? '<div style="padding:14px 22px"><button class="btn btn-sm" data-act="more-ledger">Afficher plus (' + (L.length - shown.length) + ')</button></div>' : '') + '</div>'
          : '<div class="card">' + empty('∅', 'Aucun mouvement', 'Les ventes encaissées, achats, dépenses et virements apparaîtront ici.') + '</div>')
    };
  };

  /* ======================= TRANSACTIONS (tout confondu) ======================= */
  // Détail d'une vente ou d'un achat à plusieurs articles : « 1 × Nom · 2 × Nom »
  const itemsLine = lines => (lines || []).length > 1 ? lines.map(l => { const p = S.product(l.productId); return U.n(U.num(l.qty)) + ' × ' + esc(p ? p.name : l.name || 'Article'); }).join(' · ') : '';
  const ordOf = r => r.ord != null ? U.num(r.ord) : (r.createdAt || 0);   // ordre choisi à la main dans la journée, sinon ordre de saisie
  function journalRows() {
    const st = S.state, C = S.calc(), out = [];
    const names = lines => (lines || []).map(l => (S.product(l.productId) || {}).name || '').join(' ');
    const accName = id => id ? S.account(id).name : '';
    st.sales.forEach(s => {
      const refunded = s.status === 'refunded', pending = s.status === 'pending';
      out.push({ d: s.date, c: ordOf(s), coll: 'sales', g: 'sale', act: 'sale', id: s.id, ic: 'tag', tone: 'pos', title: saleTitle(s), more: itemsLine(s.lines),
        sub: 'Vente · ' + pfTag(s.platformId) + (s.buyer ? ' · ' + esc(s.buyer) : ''),
        badge: refunded ? '<span class="badge neg">Remboursée</span>' : pending ? '<span class="badge warn"><i class="dot"></i>À encaisser</span>' : '',
        amount: refunded ? 0 : C.sale[s.id].net, cash: !refunded && !pending,
        hay: 'vente ' + (s.buyer || '') + ' ' + S.platform(s.platformId).name + ' ' + names(s.lines) + ' ' + (s.notes || '') });
    });
    st.purchases.forEach(p => {
      const L = p.lines || [], qs = L.map(l => Math.max(1, Math.round(U.num(l.qty)))), units = U.sum(qs, q => q);
      if (units > 1) {   // plusieurs unités : une ligne par unité achetée, frais répartis comme dans le coût de revient
        const land = C.pur[p.id].landed; let left = C.pur[p.id].total, n = 0;
        L.forEach((l, i) => {
          const pr = S.product(l.productId), ords = Array.isArray(l.ords) ? l.ords : [];
          for (let u = 0; u < qs[i]; u++) {
            n++;
            const amt = n === units ? U.round2(left) : U.round2(land[i].landed); left -= amt;
            const c = ords[u] != null ? U.num(ords[u]) : (l.ord != null ? U.num(l.ord) : ordOf(p) - i * 1e-3) - u * 1e-5;
            out.push({ d: p.date, c, key: 'purchases:' + p.id + ':' + i + ':' + u, setOrd: v => { if (!Array.isArray(l.ords)) l.ords = []; l.ords[u] = v; }, parent: p,
              g: 'purchase', act: 'pur', id: p.id, ic: 'cart', tone: 'info', title: esc(pr ? pr.name : 'Article'),
              sub: (p.accountId ? 'Achat · ' + esc(S.supplierName(p)) + ' · ' + accTag(p.accountId) : 'Stock de départ · aucun argent sorti') + ' · ' + n + ' sur ' + units,
              badge: purBadge(p), amount: p.accountId ? -amt : null, cash: !!p.accountId,
              hay: 'achat ' + S.supplierName(p) + ' ' + accName(p.accountId) + ' ' + (pr ? pr.name : '') + ' ' + (p.notes || '') });
          }
        });
        return;
      }
      out.push({ d: p.date, c: ordOf(p), coll: 'purchases', g: 'purchase', act: 'pur', id: p.id, ic: 'cart', tone: 'info', title: purTitle(p),
        sub: (p.accountId ? 'Achat · ' + esc(S.supplierName(p)) + ' · ' + accTag(p.accountId) : 'Stock de départ · aucun argent sorti'),
        badge: purBadge(p), amount: p.accountId ? -C.pur[p.id].total : null, cash: !!p.accountId,
        hay: 'achat ' + S.supplierName(p) + ' ' + accName(p.accountId) + ' ' + names(p.lines) + ' ' + (p.notes || '') });
    });
    st.expenses.forEach(e => {
      out.push({ d: e.date, c: ordOf(e), coll: 'expenses', g: 'expense', act: 'exp', id: e.id, ic: 'receipt', tone: 'warn', title: esc(e.label || e.category),
        sub: (S.isPerso(e) ? 'Dépense perso · hors bénéfice' : S.isInvest(e) ? 'Matériel pro · hors bénéfice' : 'Dépense · ' + esc(e.category || '')) + (e.accountId ? ' · ' + accTag(e.accountId) : ''), badge: '', amount: -U.num(e.amount), cash: true,
        hay: 'depense ' + (e.label || '') + ' ' + (e.category || '') + ' ' + accName(e.accountId) });
    });
    const tk = {
      transfer: ['swap', '', 'Virement'], income: ['bank', 'pos', 'Rentrée d’argent'], deposit: ['bank', 'acc', 'Apport perso'], withdraw: ['wallet', 'acc', 'Retrait perso']
    };
    st.transfers.forEach(t => {
      const [ic, tone, lab] = tk[t.kind] || tk.transfer, v = U.num(t.amount), isT = !tk[t.kind] || t.kind === 'transfer';
      const transit = S.inTransit(t);
      out.push({ d: t.date, c: ordOf(t), coll: 'transfers', g: 'money', act: 'trf', id: t.id, ic: transit ? 'clock' : ic, tone: transit ? 'warn' : tone, title: esc(t.label || lab),
        sub: isT ? lab + (transit ? ' en route' : t.receivedAt ? ' · reçu le ' + U.date(t.receivedAt) : '') + ' · ' + accTag(t.from) + ' vers ' + accTag(t.to) : lab + ' · ' + accTag(t.kind === 'withdraw' ? t.from : t.to),
        badge: transit ? '<span class="badge warn">en route</span>' : '', amount: isT ? v : t.kind === 'withdraw' ? -v : v, neutral: isT, cash: !isT,
        hay: lab + ' virement ' + (t.label || '') + ' ' + accName(t.from) + ' ' + accName(t.to) });
    });
    st.adjustments.forEach(a => {
      if (a.kind === 'used') return;                                  // fournitures consommées : pas une transaction
      const p = S.product(a.productId), to = S.product(a.toProductId), k = REF.adjKinds.find(x => x.id === a.kind), lab = k ? k.label.split(' (')[0] : 'Mouvement';
      const two = a.kind === 'exchange' || a.kind === 'transform';
      out.push({ d: a.date, c: ordOf(a), coll: 'adjustments', g: 'stock', act: 'adj', id: a.id, ic: a.kind === 'giveaway' ? 'gift' : a.kind === 'transform' ? 'split' : a.kind === 'exchange' ? 'trade' : 'box', tone: 'acc',
        title: esc(p ? p.name : 'Produit supprimé'),
        sub: esc(lab) + (two && to ? (a.kind === 'exchange' ? ' contre ' : ' en ') + U.n(a.toQty) + ' × ' + esc(to.name) : ''),
        badge: '', qty: U.num(a.qty), amount: null, cash: false,
        hay: lab + ' stock ' + (p ? p.name : '') + ' ' + (to ? to.name : '') + ' ' + (a.notes || '') });
    });
    out.forEach(r => { if (!r.key) { r.key = r.coll + ':' + r.id; const o = S.get(r.coll, r.id); r.setOrd = v => { if (o) o.ord = v; }; } });
    out.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.c - a.c));
    return out;
  }
  function journalFilter(all) {
    const f = V.ui.journal, q = U.norm(f.q.trim());
    return all.filter(r => (f.type === 'all' || r.g === f.type) && (!q || q.split(/\s+/).every(w => U.norm(r.hay).includes(w))));
  }
  /* Déplace une ligne d'un cran parmi celles du même jour (dir −1 = vers le haut) */
  /* Renumérote un jour entier d'après l'ordre d'affichage (achat entier = son article le plus haut, pour le journal de trésorerie) */
  const renumberDay = day => {
    const seen = new Set();
    day.forEach((x, k) => {
      x.setOrd(day.length - k);
      if (x.parent && !seen.has(x.parent)) { seen.add(x.parent); x.parent.ord = day.length - k; }
    });
  };
  const plain = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' ').trim(); };
  /* Les opérations déjà saisies un jour donné, dans l'ordre affiché, regroupées par opération (un achat de 4 unités = 1 choix) */
  V.journalDay = (d, excludeId) => {
    const out = [], seen = new Map();
    journalRows().filter(r => r.d === d && r.id !== excludeId).forEach(r => {
      let o = seen.get(r.id);
      if (!o) { o = { id: r.id, title: plain(r.title), n: 0, amount: 0, cash: false }; seen.set(r.id, o); out.push(o); }
      o.n++; if (r.amount != null) { o.amount += r.amount; o.cash = true; }
    });
    return out.map(o => ({ id: o.id, label: o.title + (o.n > 1 ? ' + ' + (o.n - 1) + (o.n > 2 ? ' autres' : ' autre') : '') + (o.cash ? ' · ' + U.signed(o.amount) : '') }));
  };
  /* Place une opération fraîchement enregistrée dans la liste de son jour : 'top', 'bottom' ou 'after:<id>' */
  V.journalPlace = (obj, where) => {
    if (!obj || !where || where === 'top') return;
    const all = journalRows(), day = all.filter(x => x.d === obj.date);
    const mine = day.filter(x => x.id === obj.id); if (!mine.length) return;
    const rest = day.filter(x => x.id !== obj.id);
    let at = rest.length;
    if (where.startsWith('after:')) {
      const id = where.slice(6); let last = -1;
      rest.forEach((x, k) => { if (x.id === id) last = k; });
      if (last < 0) return;
      at = last + 1;
    }
    rest.splice(at, 0, ...mine);
    renumberDay(rest);
    S.commit();
  };
  V.journalMove = (key, dir) => {
    const all = journalRows(), vis = journalFilter(all);
    const i = vis.findIndex(r => r.key === key), r = vis[i], n = vis[i + dir];
    if (!r || !n || n.d !== r.d) return;
    const day = all.filter(x => x.d === r.d), a = day.indexOf(r);
    day.splice(a, 1); day.splice(day.indexOf(n) + (dir > 0 ? 1 : 0), 0, r);
    renumberDay(day);
    S.commit();
  };
  V.journalList = () => {
    const f = V.ui.journal, all = journalRows(), list = journalFilter(all);
    if (!list.length) return '<div class="card">' + (all.length ? empty('?', 'Rien ne correspond', 'Aucune transaction avec ces filtres.') : empty('∅', 'Aucune transaction', 'Tes ventes, achats, dépenses, virements et mouvements de stock apparaîtront ici, du plus récent au plus ancien.')) + '</div>';
    const shown = list.slice(0, f.limit);
    return '<div class="card" style="overflow:clip">' + groupByMonth(shown, r => r.d, b => {
      const m = b.filter(r => r.cash), i = U.sum(m.filter(r => r.amount > 0), r => r.amount), o = U.sum(m.filter(r => r.amount < 0), r => r.amount);
      return b.length + ' ligne' + (b.length > 1 ? 's' : '') + (i ? ' · <b class="pos" style="font:inherit">' + U.signed(i) + '</b>' : '') + (o ? ' · ' + U.signed(o) : '');
    }, (r, k, arr) => '<div class="row' + (f.move ? ' jr-moving"' : '" data-act="' + r.act + '"') + ' data-id="' + r.id + '"><div class="ico ' + r.tone + '">' + icon(r.ic) + '</div>'
      + '<div style="min-width:0"><div class="row-t">' + r.title + '</div><div class="row-s">' + U.date(r.d) + ' · ' + r.sub + '</div>' + (r.more ? '<div class="row-s row-more">' + r.more + '</div>' : '') + '</div>'
      + '<div class="row-r" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' + (r.qty != null ? '<span class="num faint">' + (r.qty > 0 ? '+' : '') + U.n(r.qty) + ' u</span>'
        : r.amount == null ? '' : r.neutral ? '<span class="num faint">' + U.eur(r.amount) + '</span>' : '<span class="num ' + (r.amount > 0 ? 'pos' : '') + '">' + U.signed(r.amount) + '</span>') + r.badge + '</div>'
      + (f.move ? '<div class="jr-mv">' + [[-1, 'chevU', 'Monter'], [1, 'chevD', 'Descendre']].map(([dir, ic, lab]) => '<button class="btn btn-icon btn-sm" data-act="jr-move" data-key="' + r.key + '" data-dir="' + dir + '" aria-label="' + lab + '" title="' + lab + '"' + (arr[k + dir] && arr[k + dir].d === r.d ? '' : ' disabled') + '>' + icon(ic) + '</button>').join('') + '</div>' : '') + '</div>')
      + (list.length > shown.length ? '<div style="padding:14px 22px"><button class="btn btn-sm" data-act="more-journal">Afficher plus (' + (list.length - shown.length) + ')</button></div>' : '') + '</div>';
  };
  V.journal = () => {
    const f = V.ui.journal, n = journalRows().length;
    return {
      title: 'Transactions', sub: n + ' transaction' + (n > 1 ? 's' : '') + ' · tout confondu, du plus récent au plus ancien',
      html: '<div class="toolbar">' + search('journal', 'Produit, fournisseur, libellé, compte…')
        + chips([['all', 'Tout'], ['sale', 'Ventes'], ['purchase', 'Achats'], ['expense', 'Dépenses'], ['money', 'Virements & rentrées'], ['stock', 'Stock & échanges']], f.type, 'journal', 'type')
        + '<span class="grow"></span><button class="btn' + (f.move ? ' btn-primary' : '') + '" data-act="jr-mode">' + icon(f.move ? 'check' : 'swap') + '<span>' + (f.move ? 'Terminé' : 'Changer l’ordre') + '</span></button></div>'
        + (f.move ? '<p class="faint" style="margin:-6px 0 14px;font-size:12.5px">Les flèches montent ou descendent une ligne parmi celles du même jour. Le plus récent est en haut. Ça ne change aucun calcul.</p>' : '')
        + '<div data-list="journal">' + V.journalList() + '</div>'
    };
  };

  /* ======================= STATS ======================= */
  V.stats = () => {
    const st = S.state, C = S.calc(), pal = V.pal();
    const R = S.range(V.ui.stats.period);
    const r = S.pnl(R.from, R.to);
    const M = S.monthly(12);
    const pc = v => r.revenue ? '<span class="faint">' + U.pct(v / r.revenue, 0) + '</span>' : '';
    const line = (l, v, cls = '', strong) => '<tr class="' + (strong ? 'pl-strong' : '') + '"><td>' + l + '</td><td class="r num ' + cls + '">' + (typeof v === 'number' ? (strong ? U.eur(v) : U.eur(v)) : v) + '</td><td class="r">' + (typeof v === 'number' ? pc(Math.abs(v)) : '') + '</td></tr>';
    const pnl = '<div class="card"><div class="card-h"><h3>Compte de résultat</h3></div><div class="card-b" style="padding-top:6px"><table class="t pl"><tbody>'
      + line('Ventes d’articles', r.items) + line('Port facturé aux acheteurs', r.shipIn)
      + line('<b>Chiffre d’affaires</b>', r.revenue, '', true)
      + line('Frais de plateformes', -r.fees, 'neg') + line('Frais d’envoi', -r.ship, 'neg') + line('Coût d’achat des articles vendus', -r.cogs, 'neg')
      + line('<b>Marge brute</b>', r.gross, signCls(r.gross), true)
      + line('Dépenses (emballages, abonnements…)', -r.expenses, 'neg') + line('Giveaways, ouvertures, pertes', -r.adjCost, 'neg') + (r.supplyCost ? line('Fournitures utilisées (sleeves, emballages…)', -r.supplyCost, 'neg') : '') + (r.other ? line('Autres rentrées (remboursements, cashback…)', r.other, 'pos') : '')
      + line('<b>Bénéfice net</b>', r.net, signCls(r.net), true)
      + (r.invest ? line('<span class="faint">Matériel pro (investissement, pas dans le bénéfice)</span>', -r.invest, 'faint') : '')
      + (r.perso ? line('<span class="faint">Dépenses perso (sorties des comptes, pas dans le bénéfice)</span>', -r.perso, 'faint') : '')
      + (r.perso || r.invest ? line('<span class="faint">Ce qu’il te reste après perso et matériel</span>', r.net - r.perso - r.invest, 'faint ' + signCls(r.net - r.perso - r.invest)) : '')
      + '</tbody></table></div></div>';

    const ratios = '<div class="kpis kpis-5" style="margin-bottom:16px">'
      + kpi({ ic: 'percent', c: pal.pos, l: 'Marge nette', v: U.pct(r.margin, 1).replace(' ', '<small>') + '</small>', f: 'Brute ' + U.pct(r.revenue ? r.gross / r.revenue : NaN, 0) })
      + kpi({ ic: 'sparkle', c: pal.profit, l: 'ROI sur le stock vendu', v: U.pct(r.roi, 0).replace(' ', '<small>') + '</small>', f: 'bénéfice / coût d’achat' })
      + kpi({ ic: 'tag', c: pal.rev, l: 'Panier moyen', v: U.eur(r.basket), f: r.sales + ' ventes · ' + U.n(r.units) + ' art.' })
      + kpi({ ic: 'clock', c: pal.cash, l: 'Délai moyen de vente', v: r.avgAge != null ? Math.round(r.avgAge) + '<small>j</small>' : '—', f: 'entre achat et vente' })
      + kpi({ ic: 'receipt', c: pal.neg, l: 'Frais plateformes', v: U.pct(r.revenue ? r.fees / r.revenue : NaN, 1).replace(' ', '<small>') + '</small>', f: U.eur(r.fees) + ' payés' })
      + '</div>';

    const bars = '<div class="card"><div class="card-h"><h3>Bénéfice net par mois</h3></div><div class="card-b">' + UI.chart({ type: 'bars', height: 230, labels: M.map(m => m.label), tipLabels: M.map(m => U.monthLong(m.key)), values: M.map(m => m.net), name: 'Bénéfice net', color: v => v >= 0 ? pal.pos : pal.neg, extra: i => '<div class="tr faint">CA<b>' + U.eur(M[i].revenue) + '</b></div><div class="tr faint">Achats<b>' + U.eur(M[i].purchases) + '</b></div>' }) + '</div></div>';

    const pfs = Object.entries(r.byPlatform).sort((a, b) => b[1].revenue - a[1].revenue);
    const pfTable = '<div class="card table-wrap"><div class="card-h"><h3>Par plateforme</h3></div><table class="t" style="margin-top:8px"><thead><tr><th>Plateforme</th><th class="r">Ventes</th><th class="r">CA</th><th class="r">Frais</th><th class="r">Bénéfice</th><th class="r">Marge</th></tr></thead><tbody>'
      + (pfs.length ? pfs.map(([id, v]) => '<tr data-act="go" data-r="ventes" data-k="pf" data-v="' + id + '"><td>' + pfTag(id) + '</td><td class="r num">' + v.sales + '</td><td class="r num">' + U.eur(v.revenue) + '</td><td class="r num faint">' + U.eur(v.fees) + '</td><td class="r num ' + signCls(v.profit) + '">' + U.signed(v.profit) + '</td><td class="r num">' + U.pct(v.revenue ? v.profit / v.revenue : NaN, 0) + '</td></tr>').join('') : '<tr><td colspan="6" class="faint">Aucune vente sur la période.</td></tr>')
      + '</tbody></table></div>';

    const types = Object.entries(r.byType).sort((a, b) => (b[1].revenue - b[1].cogs) - (a[1].revenue - a[1].cogs));
    const maxT = Math.max(1, ...types.map(t => t[1].revenue));
    const typeCard = '<div class="card"><div class="card-h"><h3>Par type de produit</h3></div><div class="card-b">' + (types.length ? '<div class="hbars">' + types.map(([t, v]) => { const m = v.revenue ? (v.revenue - v.cogs) / v.revenue : 0; return '<div class="hbar"><span class="t">' + esc(REF.type(t).label) + ' <span class="faint">×' + U.n(v.units) + '</span></span><span class="v">' + U.eur0(v.revenue) + ' <span class="' + signCls(m) + '" style="font-size:11.5px">' + U.pct(m, 0) + '</span></span><div class="bar"><i style="width:' + (v.revenue / maxT * 100) + '%"></i></div></div>'; }).join('') + '</div><div class="faint" style="font-size:11.5px;margin-top:14px">% = marge sur coût d’achat, avant frais.</div>' : empty('∅', 'Pas de données', 'Aucune vente sur la période.')) + '</div></div>';

    const sup = {};
    st.purchases.forEach(p => { if (!inR(p.date, R.from, R.to)) return; const k = p.supplierId || 'x'; const o = sup[k] || (sup[k] = { total: 0, units: 0, n: 0, name: S.supplierName(p), ch: (S.supplier(p.supplierId) || {}).channel }); o.total += C.pur[p.id].total; o.units += C.pur[p.id].units; o.n++; });
    const sups = Object.values(sup).sort((a, b) => b.total - a.total);
    const supCard = '<div class="card table-wrap"><div class="card-h"><h3>Par fournisseur</h3></div><table class="t" style="margin-top:8px"><thead><tr><th>Fournisseur</th><th class="r">Achats</th><th class="r">Articles</th><th class="r">Total</th></tr></thead><tbody>'
      + (sups.length ? sups.map(s => '<tr><td>' + icon(s.ch === 'online' ? 'globe' : 'store', 'xs') + ' ' + esc(s.name) + '</td><td class="r num">' + s.n + '</td><td class="r num">' + U.n(s.units) + '</td><td class="r num">' + U.eur(s.total) + '</td></tr>').join('') : '<tr><td colspan="4" class="faint">Aucun achat sur la période.</td></tr>') + '</tbody></table></div>';

    const exp = '<div class="card card-pad"><div class="kpi-l" style="margin-bottom:14px">' + icon('down') + 'Exports comptables (CSV, compatibles Excel / Numbers)</div><div class="exports">'
      + '<button class="btn" data-act="csv" data-v="recettes">' + icon('receipt') + 'Livre des recettes</button>'
      + '<button class="btn" data-act="csv" data-v="achats">' + icon('cart') + 'Registre des achats</button>'
      + '<button class="btn" data-act="csv" data-v="ventes">' + icon('tag') + 'Ventes détaillées</button>'
      + '<button class="btn" data-act="csv" data-v="stock">' + icon('box') + 'Inventaire du stock</button>'
      + '<button class="btn" data-act="csv" data-v="depenses">' + icon('wallet') + 'Dépenses</button></div></div>';

    return {
      title: 'Statistiques', sub: R.from === '0000-01-01' ? 'Depuis le début' : 'Du ' + U.date(R.from) + ' au ' + U.date(R.to),
      html: '<div class="toolbar">' + seg(S.periods.map(p => [p.id, p.label]), V.ui.stats.period, 'stats-period') + '</div>'
        + ratios
        + '<div class="grid dash-b">' + pnl + '<div class="grid" style="align-content:start">' + bars + typeCard + '</div></div>'
        + '<div style="height:16px"></div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">' + pfTable + supCard + '</div>'
        + '<div class="section-title">Exports</div>' + exp
    };
  };

  /* ---------- Exports CSV ---------- */
  V.csv = kind => {
    const st = S.state, C = S.calc(), d = U.today();
    let rows, name;
    if (kind === 'recettes') {
      name = 'livre-des-recettes';
      rows = [['Date d’encaissement', 'Référence', 'Client', 'Nature de la vente', 'Plateforme', 'Mode de règlement', 'Montant encaissé (€)']].concat(
        st.sales.filter(s => s.status === 'paid').sort((a, b) => ((a.paidAt || a.date) > (b.paidAt || b.date) ? 1 : -1)).map(s => [s.paidAt || s.date, s.id, s.buyer || '', s.lines.map(l => U.n(l.qty) + ' × ' + ((S.product(l.productId) || {}).name || '')).join(' + '), S.platform(s.platformId).name, S.account(s.accountId).name, C.sale[s.id].revenue]));
    } else if (kind === 'achats') {
      name = 'registre-des-achats';
      rows = [['Date', 'Fournisseur', 'N° de commande', 'Détail', 'Frais de port', 'Autres frais', 'Remise', 'Montant total (€)', 'Mode de règlement', 'Statut']].concat(
        st.purchases.slice().sort((a, b) => (a.date > b.date ? 1 : -1)).map(p => [p.date, S.supplierName(p), p.ref || '', p.lines.map(l => U.n(l.qty) + ' × ' + ((S.product(l.productId) || {}).name || '') + ' @ ' + U.num(l.unit)).join(' + '), U.num(p.shipping), U.num(p.otherFees), U.num(p.discount), C.pur[p.id].total, S.paidWith(p), REF.purStatus[p.status]]));
    } else if (kind === 'ventes') {
      name = 'ventes-detaillees';
      rows = [['Date', 'Plateforme', 'Acheteur', 'Produit', 'Qté', 'Prix unitaire', 'Port facturé', 'Frais plateforme', 'Coût envoi', 'Coût d’achat', 'Bénéfice', 'Statut', 'Expédié']];
      st.sales.slice().sort((a, b) => (a.date > b.date ? 1 : -1)).forEach(s => s.lines.forEach((l, i) => rows.push([s.date, S.platform(s.platformId).name, s.buyer || '', (S.product(l.productId) || {}).name || '', U.num(l.qty), U.num(l.unit), i ? '' : U.num(s.shippingCharged), i ? '' : U.num(s.fees), i ? '' : U.num(s.shippingCost), C.sale[s.id].lineCogs[i] || 0, i ? '' : C.sale[s.id].profit, REF.saleStatus[s.status], s.shipped ? 'oui' : 'non'])));
    } else if (kind === 'stock') {
      name = 'inventaire';
      rows = [['Produit', 'Type', 'Extension', 'Langue', 'État', 'SKU', 'Emplacement', 'Quantité', 'Coût / u.', 'Valeur', 'Prix marché', 'Valeur marché', 'En transit']].concat(
        st.products.filter(p => !p.archived).map(p => { const c = C.prod[p.id]; return [p.name, REF.type(p.type).label, p.set || '', p.lang || '', p.condition || '', p.sku || '', p.location || '', c.qty, c.cost, c.value, c.market || '', c.marketValue, c.transit]; }));
    } else {
      name = 'depenses';
      rows = [['Date', 'Catégorie', 'Libellé', 'Montant (€)', 'Compte']].concat(st.expenses.slice().sort((a, b) => (a.date > b.date ? 1 : -1)).map(e => [e.date, e.category, e.label || '', U.num(e.amount), S.account(e.accountId).name]));
    }
    UI.download('holo-' + name + '-' + d + '.csv', UI.csv(rows), 'text/csv;charset=utf-8');
    UI.toast('Export téléchargé');
  };

  /* ======================= RÉGLAGES ======================= */
  V.reglages = () => {
    const s = set(), st = S.state;
    const inp = (k, v, attrs = '') => '<input type="text" data-setting="' + k + '" value="' + esc(v == null ? '' : v) + '" ' + attrs + '>';
    const f = Forms.field;
    return {
      title: 'Réglages', sub: 'Ton activité, tes comptes, tes plateformes',
      html: '<div class="set-grid">'
        + '<div class="card card-pad set-card"><h4>' + icon('store') + 'Ton activité</h4>'
        + '<div class="grid-2">' + f('Nom du shop', inp('bizName', s.bizName)) + f('Ton prénom', inp('owner', s.owner, 'placeholder="pour le bonjour"')) + '</div>'
        + '<div class="field"><span>Apparence</span>' + seg([['dark', icon('moon') + 'Sombre'], ['light', icon('sun') + 'Clair']], s.theme, 'theme') + '</div>'
        + '<label class="opt-row"><div><div class="row-t">Masquer les produits épuisés</div><div class="row-s">Le stock n’affiche que ce que tu as vraiment. Les épuisés restent visibles avec le filtre « Épuisés ».</div></div><span class="switch"><input type="checkbox" data-setting="hideOut"' + (s.hideOut ? ' checked' : '') + '><i></i></span></label></div>'

        + '<div class="card card-pad set-card"><h4>' + icon('alert') + 'Alertes</h4>'
        + '<div class="grid-2">' + f('Seuil de stock bas', inp('lowStock', s.lowStock, 'inputmode="decimal"'), '', 'Modifiable produit par produit') + f('Stock dormant après (jours)', inp('dormantDays', s.dormantDays, 'inputmode="decimal"')) + '</div></div>'

        + '<div class="card card-pad set-card"><h4>' + icon('down') + 'Sauvegarde & données</h4>'
        + (window.Cloud && Cloud.on
          ? '<p class="muted" style="font-size:13px;margin:0">Tes données sont enregistrées en ligne à chaque modification et synchronisées sur tous tes appareils. Une copie de sécurité est faite chaque jour et avant chaque action lourde, gardée 120 jours.</p>'
            + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm" data-act="cloud-restore">' + icon('undo') + 'Restaurer une copie</button>' + (Cloud.open ? '' : '<button class="btn btn-sm" data-act="cloud-devices">' + icon('edit') + 'Appareils (' + Cloud.bio + ')</button><button class="btn btn-sm btn-ghost" data-act="cloud-logout">Se déconnecter</button>') + '</div>'
            + '<div class="faint" style="font-size:12.5px;padding-top:12px;border-top:1px solid var(--line)">Export manuel (fichier sur ton ordi) — dernier : ' + (s.lastBackup ? U.date(s.lastBackup) : 'jamais') + '</div>'
          : '<p class="muted" style="font-size:13px;margin:0">Tes données restent sur cet appareil (dans le navigateur). Exporte une sauvegarde régulièrement pour ne rien perdre, et pour les transférer sur un autre appareil.</p>'
            + '<div class="faint" style="font-size:12.5px">Dernière sauvegarde : ' + (s.lastBackup ? U.date(s.lastBackup) + ' (' + U.relDays(s.lastBackup) + ')' : 'jamais') + '</div>')
        + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" data-act="backup">' + icon('down') + 'Exporter une sauvegarde</button><button class="btn" data-act="import">' + icon('up') + 'Importer</button></div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--line)"><button class="btn btn-sm" data-act="demo">' + icon('sparkle') + 'Charger les données démo</button><button class="btn btn-sm btn-danger" data-act="reset">' + icon('trash') + 'Tout effacer</button></div></div>'
        + '</div>'

        + '<div class="section-title">Comptes de trésorerie</div>'
        + '<div class="card rows" style="overflow:hidden">' + st.accounts.map(a => '<div class="row" data-act="acc" data-id="' + a.id + '">' + accLogo(a, 'lg') + '<div><div class="row-t">' + esc(a.name) + '</div><div class="row-s">Solde de départ ' + U.eur(a.initial) + (a.initialAt ? ' au ' + U.date(a.initialAt) : '') + (S.calc().transit[a.id] ? ' · ' + U.eur(S.calc().transit[a.id]) + ' en route vers un autre compte' : '') + '</div></div><div class="row-r num">' + U.eur(S.calc().acc[a.id].balance) + '</div></div>').join('')
        + '<div class="row" data-act="new-acc"><div class="ico acc">' + icon('plus') + '</div><div class="row-t">Ajouter un compte</div><div></div></div></div>'
        + (st.purchases.some(p => p.accountId) ? '<div class="card card-pad" style="margin-top:12px"><div class="row-t">Tes achats déjà saisis sont ton stock de départ ?</div><div class="row-s" style="white-space:normal;margin:4px 0 10px">Ils ne seront plus déduits de tes comptes. Tu pourras ensuite mettre le vrai solde de chaque compte (carte, espèces, ce que tu attends de Whatnot). Les nouveaux achats resteront payés avec un compte.</div><button class="btn btn-sm" data-act="opening-stock">' + icon('box') + 'Passer ' + st.purchases.filter(p => p.accountId).length + ' achat(s) en stock de départ</button></div>' : '')

        + '<div class="section-title">Plateformes de vente & frais</div>'
        + '<div class="card rows" style="overflow:hidden">' + st.platforms.map(p => '<div class="row" data-act="pf" data-id="' + p.id + '"><div class="ico" style="background:' + esc(p.color) + '22;color:' + esc(p.color) + '">' + icon('tag') + '</div><div style="min-width:0"><div class="row-t">' + esc(p.name) + '</div><div class="row-s">' + feeText(p) + ' · encaissé sur ' + esc(S.account(p.accountId).name) + '</div></div><div class="row-r faint num" style="font-size:12px">sur 50 € : ' + U.eur(S.feesFor(p.id, 50, 0)) + '</div></div>').join('')
        + '<div class="row" data-act="new-pf"><div class="ico acc">' + icon('plus') + '</div><div class="row-t">Ajouter une plateforme</div><div></div></div></div>'

        + '<div class="section-title">Fournisseurs & magasins</div>'
        + '<div class="card card-pad"><div class="chips">' + st.suppliers.map(sp => '<button class="chip" data-act="sup" data-id="' + sp.id + '">' + icon(sp.channel === 'online' ? 'globe' : 'store', 'xs') + esc(sp.name) + '</button>').join('') + '<button class="chip" data-act="new-sup" style="border-style:dashed">' + icon('plus', 'xs') + 'Ajouter</button></div></div>'
        + '<p class="faint" style="font-size:12px;text-align:center;margin-top:40px">HOLO · fait pour les revendeurs Pokémon · données stockées localement</p>'
    };
  };
  function feeText(p) {
    const parts = [];
    if (U.num(p.commPct) || U.num(p.commFixed)) parts.push('commission ' + [U.num(p.commPct) ? String(p.commPct).replace('.', ',') + ' %' : '', U.num(p.commFixed) ? U.eur(p.commFixed) : ''].filter(Boolean).join(' + '));
    if (U.num(p.payPct) || U.num(p.payFixed)) parts.push('paiement ' + [U.num(p.payPct) ? String(p.payPct).replace('.', ',') + ' %' : '', U.num(p.payFixed) ? U.eur(p.payFixed) : ''].filter(Boolean).join(' + '));
    return parts.length ? parts.join(' · ') : 'sans frais';
  }

  window.V = V;
})();
