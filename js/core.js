/* HOLO — cœur : utilitaires, données, persistance, moteur de calcul */
(function () {
  'use strict';

  /* ---------- Utilitaires ---------- */
  const U = {};
  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  U.pad = n => String(n).padStart(2, '0');
  U.iso = d => d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  U.today = () => U.iso(new Date());
  U.addDays = (s, n) => { const d = U.toDate(s); d.setDate(d.getDate() + n); return U.iso(d); };
  U.addMonths = (s, n) => { const d = U.toDate(s), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return U.iso(d); };
  U.toDate = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  U.daysBetween = (a, b) => Math.round((U.toDate(b) - U.toDate(a)) / 864e5);
  U.monthKey = s => String(s).slice(0, 7);
  U.num = v => { if (typeof v === 'number') return isFinite(v) ? v : 0; const n = parseFloat(String(v || '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  U.round2 = n => Math.round(n * 100) / 100;
  U.sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
  U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* Liens : seulement http(s), « https:// » ajouté si oublié */
  U.url = v => { let t = String(v || '').trim(); if (!t) return ''; if (!/^[a-z]+:\/\//i.test(t)) t = 'https://' + t; try { const u = new URL(t); return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : ''; } catch (e) { return ''; } };
  U.host = v => { try { return new URL(v).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  U.isCardmarket = v => /(^|\.)cardmarket\.com$/.test(U.host(v));

  const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  U.eur = n => eur.format(U.round2(n || 0)).replace(/ /g, ' ');
  U.eur0 = n => (Math.abs(n) >= 1000 ? eur0.format(n || 0) : eur.format(U.round2(n || 0))).replace(/ /g, ' ');
  U.eurK = n => { const a = Math.abs(n); if (a >= 1e4) return nf.format(n / 1000) + ' k€'; return eur0.format(n || 0).replace(/ /g, ' '); };
  U.n = n => nf.format(n || 0).replace(/ /g, ' ');
  U.pct = (n, d = 1) => (isFinite(n) ? (n * 100).toFixed(d).replace('.', ',') : '—') + ' %';
  U.signed = n => (n > 0 ? '+' : '') + U.eur(n);
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MONTHS_L = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  U.MONTHS = MONTHS; U.MONTHS_L = MONTHS_L;
  U.date = s => { if (!s) return '—'; const d = U.toDate(s); return d.getDate() + ' ' + MONTHS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); };
  U.monthLabel = k => { const [y, m] = k.split('-').map(Number); return MONTHS[m - 1] + (y !== new Date().getFullYear() ? ' ' + String(y).slice(2) : ''); };
  U.monthLong = k => { const [y, m] = k.split('-').map(Number); return MONTHS_L[m - 1] + ' ' + y; };
  U.relDays = s => { const d = U.daysBetween(s, U.today()); if (d === 0) return "aujourd'hui"; if (d === 1) return 'hier'; if (d === -1) return 'demain'; return d > 0 ? 'il y a ' + d + ' j' : 'dans ' + (-d) + ' j'; };
  U.debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

  /* ---------- Référentiels ---------- */
  const REF = {
    types: [
      { id: 'display', label: 'Display', icon: '▦' },
      { id: 'etb', label: 'ETB', icon: '◆' },
      { id: 'booster', label: 'Booster', icon: '▮' },
      { id: 'tripack', label: 'Tripack / Blister', icon: '▯' },
      { id: 'coffret', label: 'Coffret', icon: '▣' },
      { id: 'upc', label: 'Collection Premium / UPC', icon: '✦' },
      { id: 'tin', label: 'Pokébox / Tin', icon: '◉' },
      { id: 'card', label: 'Carte à l’unité', icon: '▭' },
      { id: 'graded', label: 'Carte gradée', icon: '★' },
      { id: 'lot', label: 'Lot', icon: '⧉' },
      { id: 'accessory', label: 'Accessoire', icon: '◌' },
      { id: 'other', label: 'Autre', icon: '·' },
      { id: 'sleeve', label: 'Sleeves / pochettes', icon: '▭', supply: true },
      { id: 'toploader', label: 'Toploaders / protections', icon: '▯', supply: true },
      { id: 'packaging', label: 'Emballages / enveloppes', icon: '✉', supply: true },
      { id: 'supply', label: 'Autre fourniture', icon: '·', supply: true }
    ],
    langs: ['FR', 'EN', 'JP', 'KR', 'CN', 'DE', 'IT', 'ES'],
    conditions: ['Scellé', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'],
    graders: ['PSA', 'CGC', 'PCA', 'BGS', 'Collect Aura', 'Autre'],
    sets: ['30 ans', 'Méga-Évolution', 'Flammes Fantasmagoriques', 'Foudre Noire', 'Flamme Blanche', 'Rivalités Destinées', 'Aventures Ensemble', 'Évolutions Prismatiques', 'Étincelles Déferlantes', 'Couronne Stellaire', 'Mascarade Crépusculaire', 'Forces Temporelles', 'Destinées de Paldea', 'Faille Paradoxe', '151', 'Flammes Obsidiennes', 'Évolutions à Paldea', 'Écarlate et Violet', 'Zénith Suprême', 'Origine Perdue', 'Évolution Céleste'],
    adjKinds: [
      { id: 'giveaway', label: 'Giveaway', out: true, cost: true },
      { id: 'opened', label: 'Ouvert (live / perso)', out: true, cost: true },
      { id: 'loss', label: 'Casse / perte / vol', out: true, cost: true },
      { id: 'perso', label: 'Retiré pour collection perso', out: true, cost: false },
      { id: 'correction', label: 'Correction d’inventaire', out: null, cost: true },
      { id: 'transform', label: 'Éclater (display → boosters…)', out: true, cost: false },
      { id: 'exchange', label: 'Échange', out: true, cost: false },
      { id: 'used', label: 'Fourniture utilisée', out: true, cost: true }
    ],
    expenseCats: ['Emballages & envois', 'Frais de port', 'Protection (sleeves, toploaders)', 'Abonnements & logiciels', 'Matériel (live, éclairage…)', 'Déplacements', 'Publicité', 'Frais bancaires', 'Gradation', 'Salons & events', 'Autre', 'Perso'],   // Perso : sortie d’argent pour soi, hors bénéfice
    saleStatus: { pending: 'À encaisser', paid: 'Encaissé', refunded: 'Annulée / remboursée' },
    purStatus: { received: 'Reçu', ordered: 'Commandé', preorder: 'Précommande' }
  };
  REF.logos = [['revolut', 'Revolut'], ['paypal', 'PayPal'], ['whatnot', 'Whatnot'], ['vinted', 'Vinted'], ['lydia', 'Lydia'], ['bank', 'Banque'], ['wallet', 'Portefeuille'], ['cash', 'Espèces']];
  REF.accLogo = a => {
    if (a.logo) return a.logo;
    const n = (a.name || '').toLowerCase();
    const hit = ['revolut', 'paypal', 'whatnot', 'vinted', 'lydia'].find(k => n.includes(k));
    if (hit) return hit;
    if (/esp[eè]ce|cash|liquide/.test(n) || a.type === 'cash') return 'cash';
    return a.type === 'bank' ? 'bank' : 'wallet';
  };
  REF.accKind = { bank: 'Compte bancaire', wallet: 'Portefeuille', platform: 'Solde plateforme', cash: 'Espèces' };
  REF.isSupply = t => !!(REF.types.find(x => x.id === t) || {}).supply;
  REF.type = id => REF.types.find(t => t.id === id) || REF.types[REF.types.length - 1];
  /* Gamme « 30 ans » (FR) pré-enregistrée dans les produits : [id, nom, type] */
  REF.cat30 = [
    ['p30_etb', 'Coffret Dresseur d’Élite (ETB) 30e Anniversaire', 'etb'],
    ['p30_booster', 'Booster 30e Anniversaire', 'booster'],
    ['p30_bundle', 'Lot de 6 boosters (Bundle) 30e Anniversaire', 'coffret'],
    ['p30_blister', 'Blister 2 boosters 30e Anniversaire – Évoli', 'tripack'],
    ['p30_ko', 'Collection K.O. 30e Anniversaire', 'coffret'],
    ['p30_poster', 'Collection poster 30e Anniversaire', 'coffret'],
    ['p30_nymphali', 'Coffret 30e Anniversaire – Nymphali-ex', 'coffret'],
    ['p30_amphinobi', 'Coffret 30e Anniversaire – Amphinobi-ex', 'coffret'],
    ['p30_sticker_noadkoko', 'Collection autocollant réajustable 30e Anniversaire – Noadkoko d’Alola', 'coffret'],
    ['p30_sticker_lucario', 'Collection autocollant réajustable 30e Anniversaire – Lucario', 'coffret'],
    ['p30_classeur', 'Collection classeur 30e Anniversaire', 'coffret'],
    ['p30_minitin', 'Mini-boîte (Mini Tin) 30e Anniversaire', 'tin'],
    ['p30_deck_mentali', 'Deck Combat 30e Anniversaire – Mentali-ex', 'coffret'],
    ['p30_deck_noctali', 'Deck Combat 30e Anniversaire – Noctali-ex', 'coffret'],
    ['p30_fig_mew', 'Collection avec figurine 30e Anniversaire – Mew', 'coffret'],
    ['p30_fig_mewtwo', 'Collection avec figurine 30e Anniversaire – Mewtwo', 'coffret'],
    ['p30_metamorph', 'Collection Premium Métamorph 30e Anniversaire', 'upc'],
    ['p30_upc_jour', 'Collection Ultra-Premium (UPC) 30e Anniversaire – Journée (Mentali)', 'upc'],
    ['p30_upc_soir', 'Collection Ultra-Premium (UPC) 30e Anniversaire – Soirée (Noctali)', 'upc']
  ];

  /* ---------- État par défaut ---------- */
  function defaults() {
    return {
      v: 1,
      settings: {
        bizName: 'Mon shop', owner: '', theme: 'dark',
        lowStock: 1, dormantDays: 60, lastBackup: null, onboarded: false, gridView: true, recurring: []
      },
      accounts: [
        { id: 'acc_bank', name: 'Banque', type: 'bank', color: '#6aa9ff', initial: 0 },
        { id: 'acc_paypal', name: 'PayPal', type: 'wallet', color: '#8ec5ff', initial: 0 },
        { id: 'acc_whatnot', name: 'Solde Whatnot', type: 'platform', color: '#ffd84d', initial: 0 },
        { id: 'acc_cash', name: 'Espèces', type: 'cash', color: '#6fe0b0', initial: 0 }
      ],
      platforms: [
        { id: 'pf_whatnot', name: 'Whatnot', color: '#ffd84d', commPct: 8, commFixed: 0, payPct: 2.9, payFixed: 0.30, accountId: 'acc_whatnot' },
        { id: 'pf_vinted', name: 'Vinted', color: '#2fc6b4', commPct: 0, commFixed: 0, payPct: 0, payFixed: 0, accountId: 'acc_bank' },
        { id: 'pf_cardmarket', name: 'Cardmarket', color: '#5b8cff', commPct: 5, commFixed: 0, payPct: 0, payFixed: 0, accountId: 'acc_bank' },
        { id: 'pf_ebay', name: 'eBay', color: '#ff7a59', commPct: 0, commFixed: 0, payPct: 0, payFixed: 0, accountId: 'acc_bank' },
        { id: 'pf_lbc', name: 'Leboncoin', color: '#ff9f43', commPct: 0, commFixed: 0, payPct: 0, payFixed: 0, accountId: 'acc_bank' },
        { id: 'pf_hand', name: 'Main propre', color: '#b59cff', commPct: 0, commFixed: 0, payPct: 0, payFixed: 0, accountId: 'acc_cash' }
      ],
      suppliers: [
        { id: 'sp_leclerc', name: 'Leclerc', channel: 'instore' },
        { id: 'sp_carrefour', name: 'Carrefour', channel: 'instore' },
        { id: 'sp_auchan', name: 'Auchan', channel: 'instore' },
        { id: 'sp_cultura', name: 'Cultura', channel: 'instore' },
        { id: 'sp_fnac', name: 'Fnac', channel: 'instore' },
        { id: 'sp_micromania', name: 'Micromania', channel: 'instore' },
        { id: 'sp_joueclub', name: 'JouéClub', channel: 'instore' },
        { id: 'sp_amazon', name: 'Amazon', channel: 'online' },
        { id: 'sp_pkc', name: 'Pokémon Center', channel: 'online' },
        { id: 'sp_cardmarket', name: 'Cardmarket', channel: 'online' },
        { id: 'sp_vinted', name: 'Vinted', channel: 'online' },
        { id: 'sp_lbc', name: 'Leboncoin', channel: 'online' },
        { id: 'sp_private', name: 'Particulier', channel: 'instore' },
        { id: 'sp_wholesale', name: 'Grossiste', channel: 'online' }
      ],
      products: [], purchases: [], sales: [], adjustments: [], expenses: [], transfers: [], lives: [], todos: []
    };
  }

  /* ---------- Persistance (IndexedDB + repli localStorage) ---------- */
  const KEY = 'holo-state-v1';
  const DB = {
    db: null,
    open() {
      return new Promise(res => {
        if (!window.indexedDB) return res(null);
        let req;
        try { req = indexedDB.open('holo', 1); } catch (e) { return res(null); }
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => { DB.db = req.result; res(DB.db); };
        req.onerror = () => res(null);
      });
    },
    async get(key = KEY) {
      if (DB.db) {
        const v = await new Promise(res => {
          const tx = DB.db.transaction('kv', 'readonly').objectStore('kv').get(key);
          tx.onsuccess = () => res(tx.result); tx.onerror = () => res(null);
        });
        if (v) return v;
      }
      try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; }
    },
    async put(val, key = KEY) {
      if (DB.db) {
        await new Promise(res => {
          const tx = DB.db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(val, key);
          tx.oncomplete = res; tx.onerror = res;
        });
        return;
      }
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn('save failed', e); }
    }
  };

  /* ---------- Store ---------- */
  const S = { state: defaults(), version: 0, listeners: [], afterCommit: [], DB };
  S.migrate = st => {
    const d = defaults();
    st = Object.assign({}, d, st);
    st.settings = Object.assign({}, d.settings, st.settings || {});
    ['products', 'purchases', 'sales', 'adjustments', 'expenses', 'transfers', 'lives', 'accounts', 'platforms', 'suppliers', 'todos'].forEach(k => { if (!Array.isArray(st[k])) st[k] = d[k] || []; });
    const bank = st.accounts.find(a => a.id === 'acc_bank');   // compte par défaut → Revolut
    if (bank && bank.name === 'Banque' && !bank.logo) st.accounts = st.accounts.map(a => a === bank ? Object.assign({}, a, { name: 'Revolut', logo: 'revolut', color: '#e8eaf0' }) : a);
    return st;
  };
  S.load = async () => {
    await DB.open();
    const st = await DB.get();
    S.state = S.migrate(st || defaults());
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
    S.version++;
  };
  const saveSoon = U.debounce(() => DB.put(S.state), 250);
  S.commit = () => { S.version++; saveSoon(); S.afterCommit.forEach(f => f()); S.listeners.forEach(f => f()); };
  /* Applique un état venu du cloud (sans le renvoyer au serveur) */
  S.apply = st => { S.state = S.migrate(st); S.version++; saveSoon(); S.listeners.forEach(f => f()); };
  S.saveNow = () => DB.put(S.state);
  S.on = f => S.listeners.push(f);
  S.get = (coll, id) => S.state[coll].find(x => x.id === id);
  /* Duplique n fois un enregistrement (transaction identique, nouvel identifiant) */
  S.duplicate = (coll, id, n = 1) => {
    const src = S.get(coll, id); if (!src) return [];
    n = Math.max(1, Math.min(50, Math.round(U.num(n)) || 1));
    const ids = [];
    for (let i = 0; i < n; i++) { const c = JSON.parse(JSON.stringify(src)); c.id = U.uid(); c.createdAt = Date.now() + i + 1; S.state[coll].push(c); ids.push(c.id); }
    S.commit();
    return ids;
  };

  S.upsert = (coll, obj) => {
    const arr = S.state[coll];
    if (!obj.id) obj.id = U.uid();
    if (!obj.createdAt) obj.createdAt = Date.now();
    const i = arr.findIndex(x => x.id === obj.id);
    if (i >= 0) arr[i] = obj; else arr.push(obj);
    S.commit();
    return obj;
  };
  S.remove = (coll, id) => {
    const i = S.state[coll].findIndex(x => x.id === id);
    let removed = null;
    if (i >= 0) removed = S.state[coll].splice(i, 1)[0];
    S.commit();
    return removed;
  };
  S.replaceAll = st => { S.state = S.migrate(st); S.commit(); };
  /* ---------- Historique (Ctrl+Z) ----------
     Chaque commit est comparé à la photo précédente, élément par élément (id).
     Annuler = remettre les versions « avant » ; fonctionne même après une synchro. */
  const HCOLLS = ['sales', 'purchases', 'expenses', 'transfers', 'adjustments', 'products', 'lives', 'accounts', 'platforms', 'suppliers', 'todos'];
  const HNOUN = { sales: ['Vente', 1], purchases: ['Achat', 0], expenses: ['Dépense', 1], transfers: ['Virement', 0], adjustments: ['Mouvement de stock', 0], products: ['Produit', 0], lives: ['Live', 0], accounts: ['Compte', 0], platforms: ['Plateforme', 1], suppliers: ['Fournisseur', 0], todos: ['Tâche', 1] };
  const HKEY = 'holo-history', HMAX = 40;
  let hsnap = null, hquiet = false;
  S.history = [];
  const hphoto = () => {
    const o = {};
    HCOLLS.forEach(k => { o[k] = new Map((S.state[k] || []).map(x => [x.id, JSON.stringify(x)])); });
    o.settings = JSON.stringify(S.state.settings || {});
    return o;
  };
  const hname = (k, o) => {
    if (!o) return '';
    if (o.name || o.title || o.text) return o.name || o.title || o.text;
    const pid = o.productId || (o.lines && o.lines[0] && o.lines[0].productId);
    const p = pid && S.state.products.find(x => x.id === pid);
    const n = p ? p.name + (o.lines && o.lines.length > 1 ? ' +' + (o.lines.length - 1) : '') : (o.label || o.note || o.category || '');
    return n;
  };
  const hlabel = changes => {
    if (changes.length > 12) return 'Grosse modification · ' + changes.length + ' éléments';
    const main = changes.slice().sort((a, b) => HCOLLS.indexOf(a.k) - HCOLLS.indexOf(b.k))[0];
    if (main.k === 'settings') return 'Réglages modifiés';
    const [noun, fem] = HNOUN[main.k];
    const verb = !main.before ? 'ajouté' : !main.after ? 'supprimé' : 'modifié';
    const n = hname(main.k, main.after || main.before);
    return noun + ' ' + verb + (fem ? 'e' : '') + (n ? ' · ' + n : '');
  };
  const hsave = U.debounce(() => DB.put(S.history, HKEY), 400);
  const hrecord = () => {
    const now = hphoto(), prev = hsnap; hsnap = now;
    if (!prev || hquiet) return;
    const changes = [];
    HCOLLS.forEach(k => {
      const a = prev[k], b = now[k];
      a.forEach((v, id) => { const w = b.get(id); if (w !== v) changes.push({ k, id, before: JSON.parse(v), after: w ? JSON.parse(w) : null }); });
      b.forEach((w, id) => { if (!a.has(id)) changes.push({ k, id, before: null, after: JSON.parse(w) }); });
    });
    const noTheme = j => JSON.stringify(Object.assign({}, JSON.parse(j), { theme: 0 }));
    if (prev.settings !== now.settings && noTheme(prev.settings) !== noTheme(now.settings)) changes.push({ k: 'settings', id: 'settings', before: JSON.parse(prev.settings), after: JSON.parse(now.settings) });
    if (!changes.length) return;
    const last = S.history[0];
    if (last && !last.undone && Date.now() - last.t < 1500) {        // commits en rafale = une seule action
      changes.forEach(c => {
        const o = last.changes.find(x => x.k === c.k && x.id === c.id);
        if (o) o.after = c.after; else last.changes.push(c);
      });
      last.changes = last.changes.filter(c => JSON.stringify(c.before) !== JSON.stringify(c.after));
      if (!last.changes.length) S.history.shift(); else { last.t = Date.now(); last.label = hlabel(last.changes); }
    } else S.history.unshift({ id: U.uid(), t: Date.now(), label: hlabel(changes), changes, undone: false });
    S.history.length = Math.min(S.history.length, HMAX);
    hsave(); S.hlisteners.forEach(f => f());
  };
  S.hlisteners = [];
  const put = (k, id, v) => {
    if (k === 'settings') { S.state.settings = v; return; }
    const arr = S.state[k], i = arr.findIndex(x => x.id === id);
    if (v == null) { if (i >= 0) arr.splice(i, 1); }
    else if (i >= 0) arr[i] = v; else arr.push(v);
  };
  /* undo=true → remet « avant » ; false → remet « après » (rétablir) */
  S.revert = (entryId, undo = true) => {
    const e = entryId ? S.history.find(x => x.id === entryId) : S.history.find(x => !x.undone);
    if (!e || e.undone === undo) return null;
    const list = undo ? e.changes.slice().reverse() : e.changes;
    list.forEach(c => put(c.k, c.id, JSON.parse(JSON.stringify(undo ? c.before : c.after))));
    e.undone = undo;
    hquiet = true; S.commit(); hquiet = false;
    hsave(); S.hlisteners.forEach(f => f());
    return e;
  };
  S.hlastUndone = () => { let r = null; for (const x of S.history) { if (x.undone) r = x; else break; } return r; };
  const commit0 = S.commit, apply0 = S.apply, load0 = S.load;
  S.commit = () => { hrecord(); commit0(); };
  S.apply = st => { apply0(st); hsnap = hphoto(); };
  S.load = async () => { await load0(); hsnap = hphoto(); try { S.history = (await DB.get(HKEY)) || []; } catch (e) { S.history = []; } };

  S.product = id => S.get('products', id);
  /* Nombre de boosters dans un article scellé (0 = ne s'ouvre pas). Réglable par produit (champ « boosters »). */
  S.boostersOf = p => {
    if (!p) return 0;
    if (p.boosters !== undefined && p.boosters !== '' && p.boosters !== null) return Math.max(0, Math.round(U.num(p.boosters)));
    const n = U.norm(p.name || '');
    if (p.type === 'booster') return 1;
    if (/duo/.test(n)) return 2;
    if (p.type === 'tin' || /tin\b/.test(n)) return 2;
    if (p.type === 'etb' || /dresseur d.?elite|\betb\b/.test(n)) return 9;
    if (/lot de 6|bundle/.test(n)) return 6;
    if (p.type === 'tripack' || /tripack/.test(n)) return 3;
    if (p.type === 'display') return 36;
    return 0;
  };
  /* Produit « booster » de la même extension (celui qui reçoit les boosters quand on ouvre l'article) */
  S.boosterFor = p => (p.boosterId && S.product(p.boosterId)) || S.state.products.find(x => x.type === 'booster' && !x.archived && x.set === p.set) || null;
  /* Ajoute (une seule fois) les produits « 30 ans » manquants, à 0 en stock. Renvoie le nombre ajouté. */
  S.img30 = id => 'img/p30/' + id.slice(4) + '.png';
  /* Visuels officiels de la gamme : ajoutés aux produits « 30 ans » sans photo (jamais par-dessus une photo choisie) */
  S.images30 = () => {
    const ids = new Set(REF.cat30.map(c => c[0]));
    const todo = S.state.products.filter(p => ids.has(p.id) && !p.image);
    if (S.state.settings.img30) return 0;                     // une seule fois : une photo retirée ensuite reste retirée
    todo.forEach(p => { p.image = S.img30(p.id); });
    S.state.settings.img30 = 1;
    S.commit();
    return todo.length;
  };
  /* Visuels officiels d'autres produits, reconnus par leur nom (appliqués une fois, jamais par-dessus une photo choisie) */
  S.visuals = [[/boite surprise/, 'img/produits/boite_surprise_ep.png']];
  S.imagesRef = () => {
    const done = S.state.settings.imgRef || 0; if (done >= S.visuals.length) return 0;
    let n = 0;
    S.visuals.slice(done).forEach(([re, img]) => S.state.products.forEach(p => { if (!p.image && re.test(U.norm(p.name))) { p.image = img; n++; } }));
    S.state.settings.imgRef = S.visuals.length;
    S.commit();
    return n;
  };
  S.seed30 = () => {
    const st = S.state; if (st.settings.cat30) return 0;
    const have = new Set(st.products.map(p => U.norm(p.name))), t = Date.now();
    const add = REF.cat30.filter(([id, name]) => !S.product(id) && !have.has(U.norm(name)));
    add.forEach(([id, name, type], i) => st.products.push({
      id, name, type, set: '30 ans', lang: 'FR', condition: 'Scellé', grader: '', grade: '', market: '', target: '',
      minStock: '', sku: '', location: '', cmUrl: '', buyUrl: '', notes: '', archived: false, createdAt: t - i, image: S.img30(id)
    }));
    st.settings.cat30 = 1;
    S.commit();
    return add.length;
  };
  S.platform = id => S.get('platforms', id) || { name: '—', color: '#888' };
  S.account = id => S.get('accounts', id) || { name: '—', color: '#888' };
  S.paidWith = p => p.accountId ? S.account(p.accountId).name : 'Stock de départ';
  /* Les achats déjà saisis deviennent du stock de départ : plus rien n’est déduit des comptes */
  S.purchasesToOpening = () => { const n = S.state.purchases.filter(p => p.accountId).length; S.state.purchases.forEach(p => { p.accountId = ''; }); S.commit(); return n; };
  S.supplier = id => S.get('suppliers', id);

  /* ---------- Frais plateforme ---------- */
  S.feesFor = (pfId, items, shipping) => {
    const p = S.get('platforms', pfId);
    if (!p || items <= 0) return 0;
    const f = items * (U.num(p.commPct) / 100) + U.num(p.commFixed) + (items + U.num(shipping)) * (U.num(p.payPct) / 100) + U.num(p.payFixed);
    return U.round2(f);
  };

  /* ---------- Moteur de calcul (premier entré, premier sorti : chaque sortie prend le coût du lot le plus ancien) ---------- */
  let cache = null, cacheV = -1;
  S.calc = () => {
    if (cacheV === S.version && cache) return cache;
    const st = S.state;
    const C = { prod: {}, sale: {}, adj: {}, pur: {}, acc: {}, pending: 0, stockValue: 0, marketValue: 0, transitValue: 0, transitQty: 0, units: 0, supplyValue: 0, supplyUnits: 0, negatives: [] };
    const P = id => C.prod[id] || (C.prod[id] = { qty: 0, cost: 0, avgDay: 0, transit: 0, soldQty: 0, revenue: 0, profit: 0, cogs: 0, lastIn: null, lastSale: null, firstIn: null, bought: 0, boughtValue: 0, events: [], lots: [] });
    st.products.forEach(p => P(p.id));

    // Achats : coût de revient unitaire (frais répartis au prorata)
    const events = [];
    st.purchases.forEach(pu => {
      const lines = pu.lines || [];
      const base = U.sum(lines, l => U.num(l.qty) * U.num(l.unit));
      const extra = U.num(pu.shipping) + U.num(pu.otherFees) - U.num(pu.discount);
      const landed = lines.map(l => {
        const lv = U.num(l.qty) * U.num(l.unit);
        const share = base > 0 ? extra * (lv / base) : (lines.length ? extra / lines.length : 0);
        const q = U.num(l.qty) || 1;
        return { productId: l.productId, qty: U.num(l.qty), unit: U.num(l.unit), landed: (lv + share) / q };
      });
      C.pur[pu.id] = { total: U.round2(base + extra), base, extra, landed, units: U.sum(lines, l => U.num(l.qty)) };
      if (pu.status === 'received') {
        const d = pu.receivedAt || pu.date;
        landed.forEach((l, i) => events.push({ d, o: 0, c: pu.createdAt || 0, k: 'in', pid: l.productId, qty: l.qty, unit: l.landed, ref: pu, kind: 'purchase' }));
      } else {
        landed.forEach(l => { if (l.productId) { P(l.productId).transit += l.qty; P(l.productId).transitCost = l.landed; C.transitQty += l.qty; C.transitValue += l.qty * l.landed; } });
      }
    });
    st.sales.forEach(s => {
      if (s.status === 'refunded' && !s.keepOut) return;
      (s.lines || []).forEach((l, i) => events.push({ d: s.date, o: 2, c: s.createdAt || 0, k: 'sale', pid: l.productId, qty: U.num(l.qty), ref: s, li: i }));
    });
    st.adjustments.forEach(a => {
      const q = U.num(a.qty);
      if (a.kind === 'transform' || a.kind === 'exchange') {   // échange : même mécanique, le coût suit le produit
        events.push({ d: a.date, o: 1, c: a.createdAt || 0, k: 'transform', pid: a.productId, qty: Math.abs(q), ref: a });
      } else if (a.kind === 'correction' && q > 0) {
        events.push({ d: a.date, o: 1, c: a.createdAt || 0, k: 'in', pid: a.productId, qty: q, unit: a.unitCost != null && a.unitCost !== '' ? U.num(a.unitCost) : null, ref: a, kind: 'adj' });
      } else {
        events.push({ d: a.date, o: 3, c: a.createdAt || 0, k: 'out', pid: a.productId, qty: Math.abs(q), ref: a });
      }
    });
    events.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.o - b.o || a.c - b.c));

    const dayNum = s => Math.floor(U.toDate(s).getTime() / 864e5);
    const addIn = (pid, qty, unit, d, ev) => {
      const p = P(pid);
      const u = unit == null ? p.cost : unit;
      const q0 = Math.max(p.qty, 0);
      const nq = q0 + qty;
      if (nq > 0) p.avgDay = (q0 * p.avgDay + qty * dayNum(d)) / nq;
      const lq = qty + Math.min(p.qty, 0);                      // une partie comble d'abord un stock négatif
      p.qty += qty;
      if (lq > 0) p.lots.push({ qty: lq, unit: u, d, ref: ev && ev.ref, type: ev && ev.type });
      refreshCost(p, u);
      p.lastIn = d; if (!p.firstIn) p.firstIn = d;
      if (ev) p.events.push(ev);
    };
    /* p.cost = coût unitaire de ce qui reste réellement en stock (valeur des lots restants / quantité) ; sert aussi de repli si le stock est à zéro */
    const refreshCost = (p, fallback) => {
      const lq = U.sum(p.lots, l => l.qty);
      if (lq > 1e-9) p.cost = U.sum(p.lots, l => l.qty * l.unit) / lq;
      else if (fallback != null) p.cost = fallback;
    };
    /* Sortie : consomme les lots du plus ancien au plus récent et renvoie le coût réel de ce qui est sorti */
    const takeLots = (p, q, pref) => {
      let cost = 0, last = p.cost;
      /* Lot choisi : une vente peut désigner la boîte réellement vendue (ligne.lotUnit = son prix d'achat) */
      if (pref != null && pref !== '') {
        const i = p.lots.findIndex(l => Math.abs(l.unit - U.num(pref)) < 0.005 && l.qty > 0);
        if (i >= 0) { const l = p.lots[i], t = Math.min(l.qty, q); l.qty -= t; q -= t; cost += t * l.unit; last = l.unit; if (l.qty <= 0) p.lots.splice(i, 1); }
      }
      while (q > 0 && p.lots.length) { const l = p.lots[0], t = Math.min(l.qty, q); l.qty -= t; q -= t; cost += t * l.unit; last = l.unit; if (l.qty <= 0) p.lots.shift(); }
      if (q > 0) cost += q * last;                                 // plus de lot : on garde le dernier coût connu
      refreshCost(p, last);
      return cost;
    };
    events.forEach(e => {
      if (!e.pid) return;
      const p = P(e.pid);
      let outCost = 0, outUnit = p.cost;
      if (e.k !== 'in') { outCost = takeLots(p, e.qty, e.k === 'sale' && e.ref && e.ref.lines && e.ref.lines[e.li] ? e.ref.lines[e.li].lotUnit : null); outUnit = e.qty > 0 ? outCost / e.qty : p.cost; }
      if (e.k !== 'in' && e.qty - p.qty > 1e-9 && !p.early) p.early = e.d;   // sortie datée avant l'entrée en stock
      if (e.k === 'in') {
        addIn(e.pid, e.qty, e.unit, e.d, { d: e.d, type: e.kind === 'purchase' ? 'achat' : 'correction', qty: e.qty, unit: e.unit == null ? p.cost : e.unit, ref: e.ref });
        if (e.kind === 'purchase') { p.bought += e.qty; p.boughtValue += e.qty * e.unit; }
      } else if (e.k === 'sale') {
        const s = e.ref, l = s.lines[e.li];
        const cogs = outCost;
        const age = p.avgDay ? dayNum(e.d) - p.avgDay : null;
        const cs = C.sale[s.id] || (C.sale[s.id] = { lineCogs: [], ages: [] });
        cs.lineCogs[e.li] = cogs; cs.ages[e.li] = age;
        p.qty -= e.qty; p.soldQty += e.qty; p.cogs += cogs;
        p.revenue += e.qty * U.num(l.unit); p.lastSale = e.d;
        p.events.push({ d: e.d, type: 'vente', qty: -e.qty, unit: U.num(l.unit), cost: outUnit, ref: s });
      } else if (e.k === 'out') {
        const cost = outCost;
        C.adj[e.ref.id] = { cost, unit: outUnit };
        p.qty -= e.qty;
        p.events.push({ d: e.d, type: e.ref.kind, qty: -e.qty, unit: outUnit, ref: e.ref });
      } else if (e.k === 'transform') {
        const a = e.ref, cost = outCost;
        const tq = U.num(a.toQty);
        C.adj[a.id] = { cost, unit: outUnit };
        p.qty -= e.qty;
        p.events.push({ d: e.d, type: 'transform', qty: -e.qty, unit: outUnit, ref: a });
        if (a.toProductId && tq > 0) addIn(a.toProductId, tq, cost / tq, e.d, { d: e.d, type: 'transform-in', qty: tq, unit: cost / tq, ref: a });
      }
    });

    // Ventes : totaux
    st.sales.forEach(s => {
      const cs = C.sale[s.id] || (C.sale[s.id] = { lineCogs: [], ages: [] });
      const items = U.sum(s.lines || [], l => U.num(l.qty) * U.num(l.unit));
      const revenue = items + U.num(s.shippingCharged);
      const fees = U.num(s.fees);
      const ship = U.num(s.shippingCost);
      const cogs = U.sum(cs.lineCogs.filter(x => x != null));
      const refunded = s.status === 'refunded';
      Object.assign(cs, {
        items, revenue: refunded ? 0 : revenue, fees: refunded ? 0 : fees, ship: refunded ? 0 : ship,
        cogs: refunded ? (s.keepOut ? cogs : 0) : cogs,
        net: refunded ? 0 : revenue - fees - ship,
        units: U.sum(s.lines || [], l => U.num(l.qty))
      });
      cs.profit = refunded ? -(s.keepOut ? cogs : 0) : revenue - fees - ship - cogs;
      if (s.status === 'pending') C.pending += cs.net;
      (s.lines || []).forEach((l, i) => {
        const p = C.prod[l.productId];
        if (p && !refunded) p.profit += U.num(l.qty) * U.num(l.unit) - (cs.lineCogs[i] || 0) - (items > 0 ? (fees + ship - U.num(s.shippingCharged)) * (U.num(l.qty) * U.num(l.unit)) / items : 0);
      });
    });

    // Stock
    st.products.forEach(pr => {
      const p = C.prod[pr.id];
      p.value = p.lots.length ? U.sum(p.lots, l => l.qty * l.unit) : Math.max(p.qty, 0) * p.cost;   // valeur réelle des lots restants
      p.market = U.num(pr.market) > 0 ? U.num(pr.market) : 0;
      p.marketValue = Math.max(p.qty, 0) * (p.market || p.cost);
      p.age = p.qty > 0 && p.avgDay ? Math.floor(Date.now() / 864e5) - p.avgDay : 0;
      p.dormant = p.qty > 0 && (p.lastSale ? U.daysBetween(p.lastSale, U.today()) : p.age) > st.settings.dormantDays && p.age > st.settings.dormantDays;
      p.supply = REF.isSupply(pr.type);
      if (p.supply) p.dormant = false;
      if (!pr.archived && p.supply) { C.supplyValue += p.value; C.supplyUnits += Math.max(p.qty, 0); }
      p.keep = !!pr.keep;   // collection perso : visible dans le stock, mais pas à vendre ni compté dans la valeur du stock
      if (!pr.archived && !p.supply && p.keep) { C.keepValue = (C.keepValue || 0) + p.value; C.keepUnits = (C.keepUnits || 0) + Math.max(p.qty, 0); }
      if (!pr.archived && !p.supply && !p.keep) {
        C.stockValue += p.value; C.marketValue += p.marketValue; C.units += Math.max(p.qty, 0);
        if (p.qty < 0) C.negatives.push(pr.id);
      }
    });

    // Comptes
    st.accounts.forEach(a => C.acc[a.id] = { balance: U.num(a.initial), in: 0, out: 0, from: a.initialAt || '' });
    /* Une opération datée avant la date du solde de départ ne compte pas : le solde saisi la contient déjà */
    const A = (id, v, d) => { const c = C.acc[id]; if (!c || (c.from && (d || '') < c.from)) return; c.balance += v; if (v > 0) c.in += v; else c.out -= v; };
    st.sales.forEach(s => { if (s.status === 'paid') A(s.accountId, C.sale[s.id].net, s.paidAt || s.date); });
    st.purchases.forEach(p => A(p.accountId, -C.pur[p.id].total, p.date));
    st.expenses.forEach(e => A(e.accountId, -U.num(e.amount), e.date));
    C.transit = {}; C.transitIn = {}; C.transitTotal = 0;      // virements en route : partis d'un compte, pas encore arrivés sur l'autre
    st.transfers.forEach(t => {
      const v = U.num(t.amount);
      if (t.kind === 'deposit' || t.kind === 'income') A(t.to, v, t.date);
      else if (t.kind === 'withdraw') A(t.from, -v, t.date);
      else if (S.inTransit(t)) { A(t.from, -v, t.date); C.transit[t.from] = (C.transit[t.from] || 0) + v; C.transitIn[t.to] = (C.transitIn[t.to] || 0) + v; C.transitTotal += v; }
      else { A(t.from, -v, t.date); A(t.to, v, t.date); }
    });
    C.cash = U.sum(st.accounts, a => C.acc[a.id].balance);
    C.onPlatform = U.sum(st.accounts.filter(a => a.type === 'platform'), a => C.acc[a.id].balance);   // solde Whatnot : en attente de retrait, pas dispo
    C.avail = C.cash - C.onPlatform;

    cache = C; cacheV = S.version;
    return C;
  };

  /* Somme brute des mouvements d'un compte depuis une date (sans la coupure du solde de départ) */
  S.movementsSince = (id, from) => {
    const st = S.state, C = S.calc(); let v = 0;
    const add = (a, x, d) => { if (a === id && (d || '') >= (from || '')) v += x; };
    st.sales.forEach(s => { if (s.status === 'paid') add(s.accountId, C.sale[s.id].net, s.paidAt || s.date); });
    st.purchases.forEach(p => add(p.accountId, -C.pur[p.id].total, p.date));
    st.expenses.forEach(e => add(e.accountId, -U.num(e.amount), e.date));
    st.transfers.forEach(t => {
      const x = U.num(t.amount);
      if (t.kind === 'deposit' || t.kind === 'income') add(t.to, x, t.date);
      else if (t.kind === 'withdraw') add(t.from, -x, t.date);
      else if (S.inTransit(t)) add(t.from, -x, t.date);
      else { add(t.from, -x, t.date); add(t.to, x, t.date); }
    });
    return v;
  };

  /* Virement en route : l'argent a quitté un compte mais n'est pas encore arrivé sur l'autre */
  S.inTransit = t => t.kind === 'transfer' && !!t.pending;
  S.transits = () => S.state.transfers.filter(S.inTransit);
  S.receiveTransfer = (id, date) => {
    const t = S.get('transfers', id); if (!t) return;
    t.pending = false; t.receivedAt = date || U.today();
    S.upsert('transfers', t);
  };

  S.PERSO = 'Perso';
  S.isPerso = e => (e.category || '') === S.PERSO;
  S.INVEST = 'Matériel (live, éclairage…)';
  S.isInvest = e => (e.category || '') === S.INVEST;   // matériel durable : dépense pro, sort du compte, mais pas déduite du bénéfice

  /* ---------- Journal de trésorerie (mouvements unifiés) ---------- */
  S.ledger = () => {
    const st = S.state, C = S.calc(), out = [];
    st.sales.forEach(s => { if (s.status === 'paid') out.push({ d: s.paidAt || s.date, amount: C.sale[s.id].net, acc: s.accountId, label: saleLabel(s), kind: 'sale', ref: s }); });
    st.purchases.forEach(p => { if (p.accountId) out.push({ d: p.date, amount: -C.pur[p.id].total, acc: p.accountId, label: 'Achat · ' + supplierName(p), kind: 'purchase', ref: p }); });   // stock de départ : hors trésorerie
    st.expenses.forEach(e => out.push({ d: e.date, amount: -U.num(e.amount), acc: e.accountId, label: (S.isPerso(e) ? 'Perso · ' : '') + (e.label || e.category) + (U.num(e.months) >= 1 ? ' · abonnement ' + Math.round(U.num(e.months)) + ' mois' : ''), kind: S.isPerso(e) ? 'persoexp' : 'expense', ref: e }));
    st.transfers.forEach(t => {
      const v = U.num(t.amount);
      if (t.kind === 'deposit') out.push({ d: t.date, amount: v, acc: t.to, label: t.label || 'Apport personnel', kind: 'deposit', ref: t });
      else if (t.kind === 'income') out.push({ d: t.date, amount: v, acc: t.to, label: t.label || 'Rentrée d’argent', kind: 'income', ref: t });
      else if (t.kind === 'withdraw') out.push({ d: t.date, amount: -v, acc: t.from, label: t.label || 'Retrait personnel', kind: 'withdraw', ref: t });
      else if (S.inTransit(t)) out.push({ d: t.date, amount: -v, acc: t.from, label: 'Virement en route → ' + S.account(t.to).name, kind: 'transfer', ref: t });
      else {
        out.push({ d: t.date, amount: -v, acc: t.from, label: 'Virement → ' + S.account(t.to).name, kind: 'transfer', ref: t });
        out.push({ d: t.date, amount: v, acc: t.to, label: 'Virement ← ' + S.account(t.from).name, kind: 'transfer', ref: t });
      }
    });
    const ord = r => r.ord != null ? U.num(r.ord) : (r.createdAt || 0);   // ordre choisi à la main dans la journée
    out.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : a.ref.date === b.ref.date ? ord(b.ref) - ord(a.ref) : 0));
    return out.filter(m => { const c = C.acc[m.acc]; return !c || !c.from || (m.d || '') >= c.from; });   // avant la date du solde : hors journal
  };
  function supplierName(p) { const s = S.supplier(p.supplierId); return s ? s.name : (p.supplierName || 'Fournisseur'); }
  function saleLabel(s) {
    const l = (s.lines || [])[0]; const pr = l && S.product(l.productId);
    const more = (s.lines || []).length > 1 ? ' +' + ((s.lines.length) - 1) : '';
    return S.platform(s.platformId).name + ' · ' + (pr ? pr.name : (l && l.name) || 'Vente') + more;
  }
  S.supplierName = supplierName; S.saleLabel = saleLabel;

  /* ---------- Périodes ---------- */
  S.periods = [
    { id: 'month', label: 'Ce mois' }, { id: '30d', label: '30 j' }, { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Année' }, { id: 'all', label: 'Tout' }
  ];
  S.range = (id, ref) => {
    const t = ref ? U.toDate(ref) : new Date();
    const y = t.getFullYear(), m = t.getMonth();
    let a, b = U.iso(t), pa, pb;
    if (id === 'month') { a = U.iso(new Date(y, m, 1)); pa = U.iso(new Date(y, m - 1, 1)); pb = U.iso(new Date(y, m - 1, t.getDate())); }
    else if (id === '30d') { a = U.addDays(b, -29); pa = U.addDays(b, -59); pb = U.addDays(b, -30); }
    else if (id === 'quarter') { const q = Math.floor(m / 3) * 3; a = U.iso(new Date(y, q, 1)); pa = U.iso(new Date(y, q - 3, 1)); pb = U.addDays(a, -1); }
    else if (id === 'year') { a = y + '-01-01'; pa = (y - 1) + '-01-01'; pb = U.iso(new Date(y - 1, m, t.getDate())); }
    else { a = '0000-01-01'; pa = null; pb = null; }
    return { from: a, to: b, prevFrom: pa, prevTo: pb };
  };
  const inR = (d, a, b) => d >= a && d <= b;

  /* ---------- Compte de résultat ---------- */
  S.pnl = (from, to) => {
    const st = S.state, C = S.calc();
    const r = { revenue: 0, items: 0, shipIn: 0, fees: 0, ship: 0, cogs: 0, expenses: 0, adjCost: 0, supplyCost: 0, sales: 0, units: 0, purchases: 0, purchasesUnits: 0, byPlatform: {}, byType: {}, byExpense: {}, cashIn: 0, other: 0, perso: 0, invest: 0, ages: [] };
    st.sales.forEach(s => {
      if (s.status === 'refunded' || !inR(s.date, from, to)) return;
      const c = C.sale[s.id];
      r.revenue += c.revenue; r.items += c.items; r.shipIn += U.num(s.shippingCharged); r.fees += c.fees; r.ship += c.ship; r.cogs += c.cogs; r.sales++; r.units += c.units;
      const bp = r.byPlatform[s.platformId] || (r.byPlatform[s.platformId] = { revenue: 0, profit: 0, sales: 0, fees: 0 });
      bp.revenue += c.revenue; bp.profit += c.profit; bp.sales++; bp.fees += c.fees;
      (s.lines || []).forEach((l, i) => {
        const pr = S.product(l.productId); const t = pr ? pr.type : 'other';
        const bt = r.byType[t] || (r.byType[t] = { revenue: 0, cogs: 0, units: 0 });
        bt.revenue += U.num(l.qty) * U.num(l.unit); bt.cogs += c.lineCogs[i] || 0; bt.units += U.num(l.qty);
        if (c.ages[i] != null) r.ages.push(c.ages[i]);
      });
    });
    st.sales.forEach(s => { if (s.status === 'paid' && inR(s.paidAt || s.date, from, to)) r.cashIn += C.sale[s.id].revenue; });
    st.expenses.forEach(e => {                             // abonnement : coût étalé mois par mois sur sa durée
      const sl = S.expenseSlices(e);
      const perso = S.isPerso(e), invest = S.isInvest(e);   // perso et matériel : sortent du compte mais pas du bénéfice
      sl.forEach(x => { if (!inR(x.d, from, to)) return; if (perso) { r.perso += x.v; return; } if (invest) { r.invest += x.v; return; } r.expenses += x.v; r.byExpense[e.category] = (r.byExpense[e.category] || 0) + x.v; });
    });
    st.adjustments.forEach(a => {
      if (!inR(a.date, from, to)) return;
      const k = REF.adjKinds.find(x => x.id === a.kind);
      if (!k || !k.cost) return;
      if (a.kind === 'correction' && U.num(a.qty) > 0) return;
      const v = (C.adj[a.id] || {}).cost || 0;
      if (a.kind === 'used') r.supplyCost += v; else r.adjCost += v;
    });
    st.purchases.forEach(p => { if (inR(p.date, from, to)) { r.purchases += C.pur[p.id].total; r.purchasesUnits += C.pur[p.id].units; } });
    st.transfers.forEach(t => { if (t.kind === 'income' && inR(t.date, from, to)) r.other += U.num(t.amount); });   // remboursements, cashback… : compte dans le bénéfice
    r.gross = r.revenue - r.fees - r.ship - r.cogs;
    r.net = r.gross - r.expenses - r.adjCost - r.supplyCost + r.other;
    r.margin = r.revenue > 0 ? r.net / r.revenue : NaN;
    r.roi = r.cogs > 0 ? r.net / r.cogs : NaN;
    r.basket = r.sales ? r.revenue / r.sales : 0;
    r.avgAge = r.ages.length ? U.sum(r.ages) / r.ages.length : null;
    return r;
  };

  S.monthly = (n = 12) => {
    const out = []; const t = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
      const k = U.iso(d).slice(0, 7);
      const end = U.iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      const r = S.pnl(k + '-01', end);
      out.push({ key: k, label: U.monthLabel(k), revenue: r.revenue, net: r.net, purchases: r.purchases, sales: r.sales });
    }
    return out;
  };

  /* Solde de trésorerie jour par jour (reconstruit à rebours) */
  /* ---------- Abonnements (Fnac+, Micromania Ultimate…) ---------- */
  S.expenseSlices = e => {
    const m = Math.max(0, Math.round(U.num(e.months))), a = U.num(e.amount);
    if (m < 2) return [{ d: e.date, v: a }];
    return Array.from({ length: m }, (_, i) => ({ d: U.addMonths(e.date, i), v: a / m }));
  };
  S.subUntil = e => U.addDays(U.addMonths(e.date, Math.max(1, Math.round(U.num(e.months)))), -1);
  S.subscriptions = () => {
    const t = U.today();
    return S.state.expenses.filter(e => U.num(e.months) >= 1).map(e => {
      const until = S.subUntil(e), left = U.daysBetween(t, until);
      return { e, until, left, active: left >= 0, monthly: U.num(e.amount) / Math.max(1, Math.round(U.num(e.months))) };
    }).sort((a, b) => a.until < b.until ? -1 : 1);
  };

  /* ---------- Automatismes (mouvement qui se répète chaque mois : bourse, loyer…) ---------- */
  S.recurring = () => (S.state.settings.recurring || []).filter(r => r && r.id);
  S.recurringLabel = r => (r.label || '') + (r.total ? ' (mois ' + (U.num(r.n) + 1) + ' sur ' + r.total + ')' : '');
  /* Crée les mouvements arrivés à échéance (appelé au démarrage et après chaque synchro) */
  S.runRecurring = () => {
    const today = U.today(); let added = 0;
    const seen = new Set(), tr = S.state.transfers;
    for (let i = tr.length - 1; i >= 0; i--) {                   // même mois créé sur deux appareils → on garde un seul
      const t = tr[i]; if (!t.recurringId) continue;
      const k = t.recurringId + '|' + t.date; if (seen.has(k)) { tr.splice(i, 1); added++; } else seen.add(k);
    }
    S.recurring().forEach(r => {
      let guard = 0;
      while (r.next && r.next <= today && (r.left == null || r.left > 0) && guard++ < 120) {
        if (!seen.has(r.id + '|' + r.next)) S.state.transfers.push({ kind: r.kind, date: r.next, from: r.from || null, to: r.to || null, amount: U.num(r.amount), label: S.recurringLabel(r), recurringId: r.id, id: U.uid(), createdAt: Date.now() + added });
        r.n = U.num(r.n) + 1; if (r.left != null) r.left -= 1; r.next = U.addMonths(r.next, 1); added++;
      }
    });
    S.state.settings.recurring = S.recurring().filter(r => r.left == null || r.left > 0);   // terminé → retiré
    if (added) S.commit();
    return added;
  };
  S.recurringStop = id => { S.state.settings.recurring = S.recurring().filter(r => r.id !== id); S.commit(); };

  S.cashSeries = (days = 90) => {
    const C = S.calc(); const L = S.ledger();
    const out = []; let bal = C.cash; const t = U.today();
    let idx = 0;
    for (let i = 0; i < days; i++) {
      const d = U.addDays(t, -i);
      out.unshift({ d, v: bal });
      while (idx < L.length && L[idx].d >= d) { if (L[idx].d === d || L[idx].d > d) bal -= L[idx].amount; idx++; }
    }
    return out;
  };

  window.U = U; window.REF = REF; window.S = S; window.HOLO_defaults = defaults;
})();
