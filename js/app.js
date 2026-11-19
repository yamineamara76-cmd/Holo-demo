/* HOLO — routeur, navigation, raccourcis, palette de commandes */
(function () {
  'use strict';
  const { icon } = UI;
  const esc = U.esc;
  const $ = s => document.querySelector(s);

  const ROUTES = [
    { id: 'home', label: 'Accueil', ic: 'home' },
    { id: 'stock', label: 'Stock', ic: 'box' },
    { id: 'todo', label: 'To-do', ic: 'check' },
    { id: 'achats', label: 'Achats', ic: 'cart' },
    { id: 'ventes', label: 'Ventes', ic: 'tag' },
    { id: 'lives', label: 'Lives', ic: 'live' },
    { id: 'treso', label: 'Trésorerie', ic: 'wallet' },
    { id: 'journal', label: 'Transactions', ic: 'list' },
    { id: 'stats', label: 'Statistiques', ic: 'chart' },
    { id: 'reglages', label: 'Réglages', ic: 'cog' }
  ];
  const route = () => { const r = (location.hash || '').replace(/^#\/?/, '').split('?')[0]; return ROUTES.find(x => x.id === r) ? r : 'home'; };
  let lastRoute = null;

  /* ---------- Squelette ---------- */
  function shell() {
    $('#nav').innerHTML = '<div class="nav-label">Pilotage</div>' + ROUTES.slice(0, 3).map(navLink).join('')
      + '<div class="nav-label">Flux</div>' + ROUTES.slice(3, 8).map(navLink).join('')
      + '<div class="nav-label">Analyse</div>' + ROUTES.slice(8).map(navLink).join('');
    $('#bnav').innerHTML = navB('home') + navB('stock') + '<button class="plus" data-act="new-menu" aria-label="Nouveau">' + icon('plus') + '</button>' + navB('ventes') + '<button data-act="more-menu">' + icon('more') + '<span>Plus</span></button>';
  }
  const navLink = r => '<a href="#/' + r.id + '" data-r="' + r.id + '">' + icon(r.ic) + '<span>' + r.label + '</span><span class="cnt hide" data-cnt="' + r.id + '"></span></a>';
  const navB = id => { const r = ROUTES.find(x => x.id === id); return '<a href="#/' + id + '" data-r="' + id + '">' + icon(r.ic) + '<span>' + r.label + '</span></a>'; };

  function chrome() {
    const s = S.state.settings, cur = route();
    document.documentElement.dataset.theme = s.theme || 'dark';
    const tm = document.querySelector('meta[name=theme-color]'); if (tm) tm.content = s.theme === 'light' ? '#f3f1ea' : '#08080c';
    $('#bizname').textContent = s.bizName || 'Mon shop';
    document.querySelectorAll('[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === cur));
    const nav = $('#nav');
    if (nav) {
      let ind = nav.querySelector('.nav-ind');
      if (!ind) { ind = document.createElement('i'); ind.className = 'nav-ind'; nav.prepend(ind); }
      const a = nav.querySelector('a.on');
      if (a) { ind.style.transform = 'translateY(' + a.offsetTop + 'px)'; ind.style.height = a.offsetHeight + 'px'; ind.style.opacity = 1; } else ind.style.opacity = 0;
    }
    const K = V.counts();
    const cnt = { todo: S.state.todos.filter(t => !t.done).length, ventes: K.toShip.length, achats: K.transit.length, stock: K.neg.length + K.low.length };
    document.querySelectorAll('[data-cnt]').forEach(c => { const n = cnt[c.dataset.cnt] || 0; c.textContent = n; c.classList.toggle('hide', !n); });
    syncNote();
  }
  const SYNC = { synced: ['check', 'Synchronisé'], saving: ['clock', 'Enregistrement…'], offline: ['alert', 'Hors ligne · en attente'] };
  function syncNote() {
    const s = S.state.settings, bn = $('#backup');
    if (window.Cloud && Cloud.on) {
      const [ic, t] = SYNC[Cloud.status] || SYNC.saving;
      bn.className = 'backup-note sync-' + Cloud.status;
      bn.innerHTML = icon(ic, 'xs') + '<span>' + t + '</span>';
      const dot = $('#sync-dot'); if (dot) { dot.className = 'sync-dot ' + Cloud.status; dot.title = t; }
      document.documentElement.dataset.sync = Cloud.status;
      return;
    }
    const lb = s.lastBackup, has = S.state.products.length > 0;
    const late = has && (!lb || U.daysBetween(lb, U.today()) > 14);
    bn.className = 'backup-note' + (late ? ' late' : '');
    bn.innerHTML = has ? icon(late ? 'alert' : 'check', 'xs') + '<span>' + (lb ? 'Sauvegardé ' + U.relDays(lb) : 'Jamais sauvegardé') + '</span><button data-act="backup">Sauver</button>' : '';
  }

  /* ---------- Rendu ---------- */
  function render() {
    const cur = route();
    const out = V[cur]();
    const changed = cur !== lastRoute;
    $('#top-t').innerHTML = '<h1>' + out.title + '</h1>' + (out.sub ? '<div class="sub">' + out.sub + '</div>' : '');
    const view = $('#view');
    const y = window.scrollY;
    view.className = changed ? 'page' : '';
    view.innerHTML = out.html;
    UI.mountCharts(view); UI.bindHolo(view);
    if (changed && lastRoute) logoTick();
    if (changed) { UI.countUp(view); window.scrollTo(0, 0); document.title = (ROUTES.find(r => r.id === cur).label) + ' · HOLO'; }
    else window.scrollTo(0, y);
    lastRoute = cur;
    chrome();
    if (V._drawer) V._drawer();
  }
  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };

  /* ---------- Actions ---------- */
  const listFns = { stock: 'stockList', achats: 'achatsList', ventes: 'ventesList', journal: 'journalList' };
  function refreshList(view) {
    const el = document.querySelector('[data-list="' + view + '"]');
    if (el && listFns[view]) { el.innerHTML = V[listFns[view]](); UI.mountCharts(el); } else schedule();
  }

  const newItems = () => [
    { label: 'Vente', icon: 'tag', tone: 'pos', kbd: 'V', run: () => Forms.sale() },
    { label: 'Achat', icon: 'cart', tone: 'info', kbd: 'A', run: () => Forms.purchase() },
    { label: 'Produit', icon: 'box', tone: 'acc', kbd: 'P', run: () => Forms.product() },
    { label: 'Dépense', icon: 'receipt', tone: 'warn', kbd: 'D', run: () => Forms.expense() },
    { label: 'Rentrée d’argent', icon: 'bank', tone: 'pos', run: () => Forms.transfer(null, { kind: 'income' }) },
    { label: 'Virement / versement', icon: 'swap', run: () => Forms.transfer() },
    { label: 'Retrait d’espèces au distributeur', icon: 'wallet', run: () => { const ac = S.state.accounts, c = ac.find(a => a.type === 'cash'), b = ac.find(a => a.type === 'bank') || ac[0]; Forms.transfer(null, { cashOut: true, from: b.id, to: (c || ac[0]).id, label: 'Retrait d’espèces' }); } },
    { label: 'Échange (produit contre produit)', icon: 'trade', tone: 'acc', run: () => Forms.swap() },
    { label: 'Mouvement de stock', icon: 'gift', run: () => Forms.adjust(null, {}) },
    { label: 'Live passé (articles vendus)', icon: 'live', tone: 'neg', kbd: 'L', run: () => Forms.liveRecap() }
  ];

  const open = {
    prod: id => V.productDrawer(id),
    sale: id => { const r = S.get('sales', id); r && Forms.sale(r); },
    pur: id => { const r = S.get('purchases', id); r && Forms.purchase(r); },
    adj: id => { const r = S.get('adjustments', id); r && Forms.adjust(r); },
    exp: id => { const r = S.get('expenses', id); r && Forms.expense(r); },
    trf: id => { const r = S.get('transfers', id); r && Forms.transfer(r); },
    live: id => V.liveDrawer(id),
    acc: id => { const r = S.get('accounts', id); r && Forms.account(r); },
    pf: id => { const r = S.get('platforms', id); r && Forms.platform(r); },
    sup: id => { const r = S.get('suppliers', id); r && Forms.supplier(r); }
  };

  function quick(coll, id, patch, msg) {
    const o = S.get(coll, id); if (!o) return;
    const before = Object.assign({}, o);
    Object.assign(o, patch); S.upsert(coll, o);
    UI.toast(msg, { undo: () => { Object.assign(o, before); S.upsert(coll, o); } });
  }

  async function act(el, e) {
    const a = el.dataset.act, d = el.dataset;
    if (open[a]) { e.stopPropagation(); open[a](d.id); return; }
    switch (a) {
      case 'go':
        if (d.k && V.ui[d.r]) { if (d.r === 'stock' || d.r === 'ventes' || d.r === 'achats') V.ui[d.r].q = ''; V.ui[d.r][d.k] = d.v; }
        if (route() === d.r) { lastRoute = null; render(); } else location.hash = '#/' + d.r;
        break;
      case 'set':
        V.ui[d.view][d.k] = d.v;
        if (listFns[d.view]) {
          schedule();
        } else schedule();
        break;
      case 'period': V.ui.period = d.v; schedule(); break;
      case 'stats-period': V.ui.stats.period = d.v; schedule(); break;
      case 'stock-lots': { const v = d.v ? d.v === 'lot' : S.state.settings.splitLots === false; if (v === (S.state.settings.splitLots !== false)) break; S.state.settings.splitLots = v; S.commit(); break; }
      case 'stock-view': S.state.settings.gridView = d.v === 'grid'; S.commit(); break;
      case 'theme': S.state.settings.theme = d.v; S.commit(); break;
      case 'toggle-theme': S.state.settings.theme = S.state.settings.theme === 'light' ? 'dark' : 'light'; S.commit(); break;
      case 'new-menu': UI.menu(el, newItems()); break;
      case 'more-menu': UI.menu(el, ROUTES.filter(r => !['home', 'stock', 'ventes'].includes(r.id)).map(r => ({ label: r.label, icon: r.ic, run: () => { location.hash = '#/' + r.id; } })).concat([{ label: 'Live passé (articles vendus)', icon: 'live', tone: 'neg', run: () => Forms.liveRecap() }, { label: 'Giveaways & mouvements de stock', icon: 'gift', run: () => movesPanel() }, { label: 'Historique · annuler', icon: 'undo', run: () => historyPanel() }, { label: 'Restaurer une sauvegarde', icon: 'undo', run: () => cloudRestore() }])); break;
      case 'history': historyPanel(); break;
      case 'moves': movesPanel(); break;
      case 'palette': palette(); break;
      case 'new-pur': Forms.purchase(); break;
      case 'new-sale': Forms.sale(); break;
      case 'new-prod': Forms.product(null, route() === 'stock' && V.ui.stock.kind === 'supplies' ? { type: 'sleeve' } : {}); break;
      case 'stock-kind': V.ui.stock.kind = d.v; V.ui.stock.type = 'all'; schedule(); break;
      case 'use-supply': {
        const p = S.product(d.id), q = S.calc().prod[d.id];
        if (!p || !q || q.qty <= 0) { UI.toast('Plus de stock pour cette fourniture'); break; }
        const a = { kind: 'used', productId: p.id, qty: -1, date: U.today(), notes: '' }; S.upsert('adjustments', a);
        UI.toast('1 × ' + p.name + ' utilisé', { undo: () => S.remove('adjustments', a.id) });
        break;
      }
      case 'market-bulk': Forms.marketBulk(); break;
      case 'new-exp': Forms.expense(); break;
      case 'new-sub': Forms.expense(null, { sub: true }); break;
      case 'new-trf': Forms.transfer(null, { kind: d.k || 'transfer' }); break;
      case 'trf-received': {
        const t = S.get('transfers', d.id); if (!t) break;
        if (!(await UI.confirm('L’argent est arrivé sur ' + S.account(t.to).name + ' ?', { ok: 'Oui, reçu', danger: false, sub: U.eur(t.amount) + ' seront ajoutés à ' + S.account(t.to).name + ' aujourd’hui.' }))) return;
        S.receiveTransfer(t.id); UI.toast(U.eur(t.amount) + ' reçus sur ' + S.account(t.to).name, { undo: () => { t.pending = true; t.receivedAt = null; S.upsert('transfers', t); } });
        break;
      }
      case 'new-live': Forms.liveRecap(); break;
      case 'start-live': Live.start(); break;
      case 'new-acc': Forms.account(); break;
      case 'opening-stock': {
        const n = S.state.purchases.filter(p => p.accountId).length;
        if (!(await UI.confirm('Passer ' + n + ' achat(s) en stock de départ ?', { ok: 'Oui, c’est mon stock de départ', sub: 'Ces achats ne seront plus déduits de tes comptes. Le stock et les coûts de revient ne changent pas.' }))) return;
        Cloud.snapshot('avant stock de départ'); S.purchasesToOpening(); UI.toast(n + ' achat(s) passés en stock de départ'); break;
      }
      case 'new-pf': Forms.platform(); break;
      case 'new-sup': Forms.supplier(); break;
      case 'pur-recv': e.stopPropagation(); quick('purchases', d.id, { status: 'received', receivedAt: U.today() }, 'Commande reçue · stock mis à jour'); break;
      case 'sale-paid': e.stopPropagation(); quick('sales', d.id, { status: 'paid', paidAt: U.today() }, 'Paiement encaissé'); break;
      case 'sale-ship': e.stopPropagation(); quick('sales', d.id, { shipped: true }, 'Colis marqué expédié'); break;
      case 'more-ledger': V.ui.treso.limit += 200; schedule(); break;
      case 'rec-stop': { const r = S.recurring().find(x => x.id === d.id); if (!r) break; if (await UI.confirm('Arrêter « ' + r.label + ' » ?', { ok: 'Arrêter', sub: 'Les mouvements déjà créés restent. Plus rien ne sera ajouté les mois suivants.' })) { S.recurringStop(d.id); UI.toast('Automatisme arrêté'); } break; }
      case 'more-journal': V.ui.journal.limit += 200; schedule(); break;
      case 'jr-mode': V.ui.journal.move = !V.ui.journal.move; schedule(); break;
      case 'jr-move': V.journalMove(d.key, +d.dir); break;
      case 'csv': V.csv(d.v); break;
      case 'todo-toggle': {
        const t = S.get('todos', d.id); if (!t) break;
        const row = el.closest('.tdi'); if (row && !t.done) row.classList.add('ticking');
        setTimeout(() => { t.done = !t.done; t.doneAt = t.done ? Date.now() : null; S.upsert('todos', t); if (t.done) UI.toast('Tâche terminée', { undo: () => { t.done = false; t.doneAt = null; S.upsert('todos', t); } }); }, row && !t.done ? 320 : 0);
        break;
      }
      case 'todo-del': { const t = S.remove('todos', d.id); if (t) UI.toast('Tâche supprimée', { undo: () => S.upsert('todos', t) }); break; }
      case 'todo-clear': {
        const done = S.state.todos.filter(t => t.done); if (!done.length) break;
        if (!(await UI.confirm('Effacer ' + done.length + ' tâche' + (done.length > 1 ? 's' : '') + ' terminée' + (done.length > 1 ? 's' : '') + ' ?'))) break;
        S.state.todos = S.state.todos.filter(t => !t.done); S.commit(); UI.toast('Tâches effacées');
        break;
      }
      case 'backup': backup(); break;
      case 'cloud-restore': cloudRestore(); break;
      case 'cloud-devices': cloudDevices(); break;
      case 'cloud-logout': if (await UI.confirm('Se déconnecter ?', { ok: 'Se déconnecter', danger: false, sub: 'Tes données restent en ligne. Il faudra ' + Cloud.bio + ' pour revenir.' })) Cloud.logout(); break;
      case 'import': importFile(); break;
      case 'demo':
        if (S.state.products.length && !(await UI.confirm('Remplacer tes données par la démo ?', { ok: 'Charger la démo', sub: 'Toutes tes données actuelles seront remplacées. Exporte une sauvegarde avant si besoin.' }))) return;
        Cloud.snapshot('avant la démo'); loadDemo(); break;
      case 'reset':
        if (!(await UI.confirm('Tout effacer ?', { ok: 'Tout effacer', sub: 'Produits, achats, ventes, trésorerie… tout sera supprimé de cet appareil. Pense à exporter une sauvegarde avant.' }))) return;
        Cloud.snapshot('avant effacement'); S.replaceAll(HOLO_defaults()); S.seed30(); location.hash = '#/home'; onboarding(); break;
    }
  }
  function loadDemo() {
    const st = HOLO_demo();
    st.settings.theme = S.state.settings.theme || 'dark';
    S.replaceAll(st);
    UI.toast('Données démo chargées ✨');
  }

  function backup() {
    const s = S.state.settings;
    s.lastBackup = U.today();
    UI.download('holo-sauvegarde-' + U.today() + '.json', JSON.stringify(Object.assign({ _app: 'holo', _v: 1 }, S.state)), 'application/json');
    S.commit();
    UI.toast('Sauvegarde téléchargée');
  }
  /* ---------- Liste des mouvements de stock (giveaways, ouvertures…) ---------- */
  function movesPanel() {
    let kf = 'all';
    const list = () => S.state.adjustments.filter(a => a.kind !== 'used' || kf === 'used').slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
    const kinds = () => REF.adjKinds.filter(k => S.state.adjustments.some(a => a.kind === k.id));
    const chipsH = () => '<div class="chips" style="margin-bottom:12px">' + [['all', 'Tous']].concat(kinds().map(k => [k.id, k.label.split(' (')[0]])).map(([v, l]) => '<button class="chip' + (kf === v ? ' on' : '') + '" data-k="' + v + '">' + U.esc(l) + '</button>').join('') + '</div>';
    const rows = () => {
      const arr = list().filter(a => kf === 'all' || a.kind === kf);
      if (!arr.length) return '<div class="empty-mini">Aucun mouvement.</div>';
      return arr.map(a => {
        const p = S.product(a.productId), k = REF.adjKinds.find(x => x.id === a.kind), l = a.liveId && S.get('lives', a.liveId);
        return '<button class="hist-row mv-row" data-id="' + a.id + '"><span class="hist-ic ' + (a.qty > 0 ? 'add' : 'del') + '">' + icon(a.kind === 'giveaway' ? 'gift' : a.kind === 'transform' ? 'split' : a.kind === 'exchange' ? 'trade' : 'box', 'xs') + '</span>'
          + '<span class="grow"><b>' + U.esc(p ? p.name : 'Produit supprimé') + (a.kind === 'exchange' ? ' contre ' + U.esc((S.product(a.toProductId) || {}).name || '?') : '') + '</b><small>' + U.esc(k ? k.label : a.kind) + ' · ' + U.date(a.date) + (l ? ' · ' + U.esc(l.title || 'Live') : '') + '</small></span>'
          + '<span class="mono mv-q ' + (a.qty > 0 ? 'pos' : 'neg') + '">' + (a.qty > 0 ? '+' : '') + a.qty + '</span>' + icon('edit', 'xs') + '</button>';
      }).join('');
    };
    UI.open({
      title: 'Giveaways & mouvements', kind: 'drawer',
      body: '<p class="muted hist-tip">Touche une ligne pour la modifier ou la supprimer — le stock est recalculé tout seul.</p><div data-c>' + chipsH() + '</div><div class="hist-list" data-l>' + rows() + '</div>',
      onMount(el) {
        const draw = () => { el.querySelector('[data-c]').innerHTML = chipsH(); el.querySelector('[data-l]').innerHTML = rows(); };
        el.addEventListener('click', ev => {
          const c = ev.target.closest('[data-k]'); if (c) { kf = c.dataset.k; draw(); return; }
          const r = ev.target.closest('.mv-row'); if (r) { const a = S.get('adjustments', r.dataset.id); if (a) Forms.adjust(a); }
        });
        const off = () => document.body.contains(el) ? draw() : null;
        S.on(off);
      }
    });
  }

  /* ---------- Historique / Ctrl+Z ---------- */
  function undo(id) {
    const e = S.revert(id || null, true);
    if (!e) { UI.toast('Rien à annuler'); return; }
    UI.toast('Annulé · ' + e.label, { icon: '↶', undo: () => S.revert(e.id, false), undoLabel: 'Rétablir' });
  }
  function redo(id) {
    const t = id ? S.history.find(x => x.id === id) : S.hlastUndone();
    const e = t && S.revert(t.id, false);
    if (!e) { UI.toast('Rien à rétablir'); return; }
    UI.toast('Rétabli · ' + e.label, { icon: '↷', undo: () => S.revert(e.id, true) });
  }
  const ago = t => {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'à l’instant';
    if (m < 60) return 'il y a ' + m + ' min';
    const d = new Date(t), today = new Date().toDateString() === d.toDateString();
    return (today ? 'aujourd’hui' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  function historyPanel() {
    const kind = e => { const c = e.changes[0]; return e.changes.every(x => !x.before) ? 'add' : e.changes.every(x => !x.after) ? 'del' : 'edit'; };
    const ic = { add: 'plus', del: 'trash', edit: 'edit' };
    const rows = () => S.history.length ? S.history.map(e => '<div class="hist-row' + (e.undone ? ' undone' : '') + '"><span class="hist-ic ' + kind(e) + '">' + icon(ic[kind(e)] || 'edit', 'xs') + '</span><span class="grow"><b>' + U.esc(e.label) + '</b><small>' + ago(e.t) + (e.undone ? ' · annulé' : '') + (e.changes.length > 1 ? ' · ' + e.changes.length + ' éléments' : '') + '</small></span>'
      + '<button class="btn btn-sm ' + (e.undone ? 'btn-ghost' : '') + '" data-h="' + e.id + '">' + (e.undone ? icon('redo', 'xs') + 'Rétablir' : icon('undo', 'xs') + 'Annuler') + '</button></div>').join('')
      : '<div class="empty-mini">Aucune action pour l’instant. Chaque ajout, modification ou suppression apparaîtra ici.</div>';
    UI.open({
      title: 'Historique des actions', kind: 'drawer',
      body: '<p class="muted hist-tip">Tu t’es trompé ? Annule une action ici, ou fais <kbd>' + (/Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl') + '</kbd> <kbd>Z</kbd>. Les 40 dernières actions sont gardées sur cet appareil.</p><div class="hist-list">' + rows() + '</div>',
      onMount(el) {
        const list = el.querySelector('.hist-list');
        const draw = () => { list.innerHTML = rows(); };
        list.addEventListener('click', ev => {
          const b = ev.target.closest('[data-h]'); if (!b) return;
          const e = S.history.find(x => x.id === b.dataset.h); if (!e) return;
          e.undone ? redo(e.id) : undo(e.id);
          draw();
        });
        const tick = setInterval(() => { if (!document.body.contains(list)) clearInterval(tick); else draw(); }, 30000);
      }
    });
  }

  async function cloudRestore() {
    let list;
    try { list = await Cloud.backups(); } catch (e) { UI.toast('Impossible de charger les copies (hors ligne ?)'); return; }
    if (!list.length) { UI.toast('Aucune copie pour l’instant — la première sera faite demain'); return; }
    const fmt = id => { const [d, ...rest] = id.split(' '); return U.date(d) + (rest.length ? ' · ' + rest.join(' ') : ' · début de journée'); };
    const body = '<p class="muted" style="margin:0 0 12px;font-size:13px">Une copie est faite automatiquement chaque jour, et avant chaque action lourde (import, démo, effacement). Elles sont gardées 120 jours.</p><div class="picker-list">'
      + list.map(id => '<button class="picker-item" data-id="' + U.esc(id) + '"><span class="grow">' + U.esc(fmt(id)) + '</span>' + icon('arrowR', 'xs') + '</button>').join('') + '</div>';
    UI.open({
      title: 'Restaurer une copie', body,
      foot: '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Fermer</button>',
      onMount(el, close) {
        el.querySelectorAll('[data-id]').forEach(b => b.onclick = async () => {
          let data;
          try { data = await Cloud.backup(b.dataset.id); } catch (e) { UI.toast('Copie illisible'); return; }
          if (!(await UI.confirm('Restaurer la copie du ' + fmt(b.dataset.id) + ' ?', { ok: 'Restaurer', danger: false, sub: (data.products || []).length + ' produits, ' + (data.sales || []).length + ' ventes, ' + (data.purchases || []).length + ' achats. L’état actuel est gardé en copie, tu pourras revenir en arrière.' }))) return;
          delete data.savedAt;
          Cloud.snapshot('avant restauration'); S.replaceAll(data); close(); UI.toast('Copie restaurée');
        });
      }
    });
  }
  function cloudDevices() {
    const row = d => '<div class="row" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><div style="flex:1"><div class="row-t">' + U.esc(d.name) + '</div><div class="row-s">Ajouté le ' + U.date(new Date(d.createdAt).toISOString().slice(0, 10)) + (d.lastAt ? ' · dernier déverrouillage ' + U.relDays(new Date(d.lastAt).toISOString().slice(0, 10)) : '') + '</div></div><button class="btn btn-sm btn-ghost" data-rm="' + d.id + '">Retirer</button></div>';
    UI.open({
      title: 'Appareils (' + Cloud.bio + ')',
      body: '<p class="muted" style="font-size:13px;margin:0 0 10px">Chaque appareil se déverrouille avec son Face ID ou Touch ID. Ta clé Apple est partagée par le trousseau iCloud : iPhone et Mac du même compte Apple n’ont besoin que d’un seul enregistrement.</p><div class="dev-list"><div class="muted" style="font-size:13px">Chargement…</div></div>',
      foot: '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Fermer</button><button class="btn btn-primary" data-add>Ajouter cet appareil</button>',
      onMount(el, close) {
        const list = el.querySelector('.dev-list');
        const render = devs => {
          list.innerHTML = devs.length ? devs.map(row).join('') : '<div class="muted" style="font-size:13px">Aucun appareil.</div>';
          list.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
            if (!(await UI.confirm('Retirer cet appareil ?', { ok: 'Retirer', sub: 'Il ne pourra plus déverrouiller HOLO.' }))) return;
            try { render(await Cloud.removeDevice(b.dataset.rm)); UI.toast('Appareil retiré'); } catch (e) { UI.toast(e.message); }
          });
        };
        Cloud.devices().then(render).catch(e => { list.innerHTML = '<div class="muted" style="font-size:13px">' + U.esc(e.message) + '</div>'; });
        el.querySelector('[data-add]').onclick = async () => {
          const b = el.querySelector('[data-add]'); b.disabled = true;
          try { await Cloud.addDevice(); render(await Cloud.devices()); UI.toast('Appareil ajouté'); } catch (e) { UI.toast(e.message); }
          b.disabled = false;
        };
      }
    });
  }
  function importFile() {
    const f = document.createElement('input');
    f.type = 'file'; f.accept = '.json,application/json';
    f.onchange = async () => {
      const file = f.files[0]; if (!file) return;
      let data;
      try { data = JSON.parse(await file.text()); } catch (e) { UI.toast('Fichier illisible'); return; }
      if (!data || !Array.isArray(data.products) || !Array.isArray(data.sales)) { UI.toast('Ce fichier n’est pas une sauvegarde HOLO'); return; }
      if (!(await UI.confirm('Restaurer cette sauvegarde ?', { ok: 'Restaurer', danger: false, sub: data.products.length + ' produits, ' + data.sales.length + ' ventes, ' + (data.purchases || []).length + ' achats. Tes données actuelles seront remplacées.' }))) return;
      delete data._app; delete data._v;
      Cloud.snapshot('avant import'); S.replaceAll(data); UI.toast('Sauvegarde restaurée');
    };
    f.click();
  }

  /* ---------- Palette ⌘K ---------- */
  let pal = null;
  function palette() {
    if (pal) return closePalette();
    const scrim = document.createElement('div'); scrim.className = 'scrim on'; scrim.style.zIndex = 79;
    const el = document.createElement('div'); el.className = 'cmdk';
    el.innerHTML = '<div style="position:relative"><span class="ic">' + icon('search') + '</span><input placeholder="Chercher un produit, un acheteur, une page, une action…" autocomplete="off"></div><div class="cmdk-list"></div>';
    document.body.append(scrim, el);
    pal = { el, scrim, idx: 0, items: [] };
    scrim.onclick = closePalette;
    const inp = el.querySelector('input'), list = el.querySelector('.cmdk-list');
    const draw = () => {
      const q = U.norm(inp.value.trim()), C = S.calc();
      const match = s => !q || q.split(/\s+/).every(w => U.norm(s).includes(w));
      const groups = [];
      const acts = newItems().map(i => ({ label: 'Nouveau : ' + i.label, icon: i.icon, tone: i.tone, run: i.run })).concat([
        { label: 'Exporter une sauvegarde', icon: 'down', run: backup },
        { label: 'Basculer thème clair / sombre', icon: 'moon', run: () => { S.state.settings.theme = S.state.settings.theme === 'light' ? 'dark' : 'light'; S.commit(); } }
      ]).filter(i => match(i.label));
      const pages = ROUTES.filter(r => match(r.label)).map(r => ({ label: r.label, icon: r.ic, meta: 'Aller à', run: () => { location.hash = '#/' + r.id; } }));
      const prods = S.state.products.map(p => ({ p, s: q ? UI.score(p, q) : 0 })).filter(x => q ? x.s > 0 : false).sort((a, b) => b.s - a.s).slice(0, 8)
        .map(({ p }) => ({ html: UI.mini(p), label: esc(p.name), sub: esc(UI.pSub(p)), meta: U.n(C.prod[p.id].qty) + ' en stock', run: () => V.productDrawer(p.id), raw: true }));
      const sales = q ? S.state.sales.filter(s => s.buyer && match(s.buyer)).slice(-5).reverse().map(s => ({ icon: 'tag', tone: 'pos', label: esc(s.buyer) + ' · ' + esc(S.saleLabel(s)), meta: U.date(s.date), run: () => Forms.sale(s), raw: true })) : [];
      if (prods.length) groups.push(['Produits', prods]);
      if (sales.length) groups.push(['Ventes', sales]);
      if (pages.length) groups.push(['Pages', pages]);
      if (acts.length) groups.push(['Actions', acts]);
      pal.items = groups.flatMap(g => g[1]);
      pal.idx = Math.min(pal.idx, Math.max(0, pal.items.length - 1));
      let i = 0;
      list.innerHTML = groups.length ? groups.map(([g, its]) => '<div class="cmdk-g">' + g + '</div>' + its.map(it => {
        const k = i++;
        return '<div class="picker-item' + (k === pal.idx ? ' on' : '') + '" data-k="' + k + '">' + (it.html || '<div class="ico ' + (it.tone || '') + '">' + icon(it.icon) + '</div>') + '<div style="min-width:0"><div class="row-t" style="font-size:13.5px">' + (it.raw ? it.label : esc(it.label)) + '</div>' + (it.sub ? '<div class="row-s">' + it.sub + '</div>' : '') + '</div><div class="meta">' + (it.meta || '') + '</div></div>';
      }).join('')).join('') : '<div class="empty" style="padding:30px"><p>Aucun résultat</p></div>';
      const on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    };
    const run = k => { const it = pal.items[k]; if (!it) return; closePalette(); it.run(); };
    inp.addEventListener('input', () => { pal.idx = 0; draw(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { pal.idx = Math.min(pal.idx + 1, pal.items.length - 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { pal.idx = Math.max(pal.idx - 1, 0); draw(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(pal.idx); }
      else if (e.key === 'Escape') { e.stopPropagation(); closePalette(); }
    });
    list.addEventListener('mousedown', e => { const it = e.target.closest('[data-k]'); if (it) { e.preventDefault(); run(+it.dataset.k); } });
    draw();
    setTimeout(() => inp.focus(), 10);
  }
  function closePalette() { if (!pal) return; pal.el.remove(); pal.scrim.remove(); pal = null; }

  /* ---------- Onboarding ---------- */
  function onboarding() {
    const s = S.state.settings;
    if (s.onboarded || S.state.products.some(p => !/^p30_/.test(p.id))) return;
    const el = document.createElement('div'); el.className = 'onb';
    el.innerHTML = '<div class="onb-in"><div class="brand-mark"><span class="dc"><img src="img/dracaufeu.webp" alt="" draggable="false"><i class="dc-foil"></i><i class="dc-glare"></i></span></div><h1>Ton business Pokémon,<br><em>enfin clair.</em></h1>'
      + '<p>Stock, achats, ventes Whatnot & plateformes, trésorerie, to-do. Tout au même endroit, calculé automatiquement.</p>'
      + '<div class="onb-cards"><button data-o="demo"><b>Explorer la démo</b><span>Un an d’activité fictive pour tout découvrir. Tu pourras tout effacer ensuite.</span></button>'
      + '<button data-o="fresh"><b>Partir de zéro</b><span>Configure tes comptes, puis enregistre ton premier achat.</span></button></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-o]'); if (!b) return;
      el.style.transition = 'opacity .35s'; el.style.opacity = 0; setTimeout(() => el.remove(), 350);
      if (b.dataset.o === 'demo') loadDemo();
      else { S.state.settings.onboarded = true; S.commit(); location.hash = '#/reglages'; UI.toast('Commence par renseigner le solde de départ de tes comptes'); }
    });
  }

  /* ---------- Événements globaux ---------- */
  function bindGlobal() {
    document.addEventListener('click', e => {
      if (e.target.closest('.live, .onb')) return;
      const el = e.target.closest('[data-act]');
      if (el) { if (el.tagName === 'A') e.preventDefault(); act(el, e); }
    });
    document.addEventListener('submit', e => {
      const f = e.target.closest('[data-todo-form]'); if (!f) return;
      e.preventDefault();
      const text = f.text.value.trim(); if (!text) { f.text.focus(); return; }
      S.upsert('todos', { text, due: f.due.value || null, done: false, doneAt: null });
      setTimeout(() => { const n = document.querySelector("[data-todo-form] input[name=text]"); n && n.focus({ preventScroll: true }); }, 60);
    });
    const dSearch = U.debounce(v => refreshList(v), 120);
    document.addEventListener('input', e => {
      const s = e.target.closest('[data-search]');
      if (s) { V.ui[s.dataset.search].q = s.value; dSearch(s.dataset.search); }
    });
    document.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('[data-set]')) { V.ui[t.dataset.set][t.dataset.k] = t.value; schedule(); return; }
      if (t.matches('[data-setting]')) {
        const k = t.dataset.setting, s = S.state.settings;
        if (t.type === 'checkbox') s[k] = t.checked;
        else if (['lowStock', 'dormantDays'].includes(k)) s[k] = U.num(t.value);
        else s[k] = t.value.trim();
        S.commit(); UI.toast('Réglage enregistré');
      }
    });
    document.addEventListener('keydown', e => {
      const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y') && !typing && !document.querySelector('.onb')) {
        e.preventDefault();
        (e.shiftKey || e.key.toLowerCase() === 'y') ? redo() : undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!Live.isOpen()) palette(); return; }
      if (e.key === 'Escape') {
        if (pal) { closePalette(); return; }
        if (UI._menu) { UI.closeMenu(); return; }
        if (UI.closeTop()) return;
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || UI.hasModal() || pal || Live.isOpen() || document.querySelector('.onb')) return;
      const k = e.key.toLowerCase();
      const map = { v: () => Forms.sale(), a: () => Forms.purchase(), p: () => Forms.product(), d: () => Forms.expense(), l: () => Forms.liveRecap(), n: () => UI.menu($('#new-btn'), newItems()), '/': palette };
      if (map[k]) { e.preventDefault(); map[k](); return; }
      if (/^[1-9]$/.test(k)) location.hash = '#/' + ROUTES[+k - 1].id;
    });
    window.addEventListener('hashchange', () => { closePalette(); UI.closeMenu(); render(); });
  }

  /* ---------- Démarrage ---------- */
  async function boot() {
    await S.load();
    /* Version démo : données fictives chargées au premier lancement, rien n'est envoyé en ligne */
    if (!S.state.products.length || S.state.settings.demoV !== 2) { const d = HOLO_demo(); d.settings.theme = S.state.settings.theme || 'dark'; d.settings.demoV = 2; S.replaceAll(d); }
    const old30 = S.state.products.filter(p => /^\s*30\s*$/.test(p.set || ''));   // série « 30 » saisie à la main → « 30 ans »
    if (old30.length) { old30.forEach(p => { p.set = '30 ans'; }); S.commit(); }
    S.seed30(); S.images30(); S.imagesRef();                                                                 // gamme « 30 ans » pré-enregistrée (une fois)
    S.runRecurring(); S.on(() => S.runRecurring());                                             // bourse, loyer… ajoutés à la date prévue
    Cloud.onStatus(syncNote);
    shell();
    bindGlobal();
    S.on(schedule);
    render();
    splashOut();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  /* L'intro du logo se joue au moins une fois en entier, puis s'efface sur l'app déjà prête */
  /* ---------- Logo ---------- */
  const visibleMark = () => [...document.querySelectorAll('.side .brand-mark, .top-logo')].find(m => m.getBoundingClientRect().width > 0);
  function logoTick() {
    const m = visibleMark(); if (!m) return;
    m.classList.remove('tick'); void m.offsetWidth; m.classList.add('tick');
    setTimeout(() => m.classList.remove('tick'), 520);
  }
  /* Fin de l'intro : le logo s'envole vers sa place (barre latérale ou en-tête mobile) */
  function splashOut() {
    const sp = document.getElementById('splash'); if (!sp) return;
    let done = false;
    const go = () => {
      if (done) return; done = true;
      const logo = sp.querySelector('.sp-logo'), mark = visibleMark();
      const hidden = getComputedStyle(sp).visibility === 'hidden' || getComputedStyle(sp).display === 'none';
      if (hidden || !logo || !mark || matchMedia('(prefers-reduced-motion: reduce)').matches) { sp.classList.add('out'); setTimeout(() => sp.remove(), 600); return; }
      const a = logo.getBoundingClientRect(), b = mark.getBoundingClientRect();
      const k = b.width / a.width, dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      mark.style.opacity = '0';
      sp.classList.add('fly');
      logo.classList.add('flying');
      requestAnimationFrame(() => { logo.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')'; });
      setTimeout(() => {
        mark.style.opacity = '';
        mark.classList.add('land');
        sp.remove();
        setTimeout(() => mark.classList.remove('land'), 700);
      }, 760);
    };
    sp.addEventListener('click', go, { once: true });
    setTimeout(go, Math.max(0, 2000 - performance.now()));
  }
  window.App = { render, palette };
  boot();
})();
