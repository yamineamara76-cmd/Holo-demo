/* HOLO — données de démonstration réalistes (12 mois d'activité) */
(function () {
  'use strict';

  window.HOLO_demo = () => {
    let seed = 42;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const r2 = U.round2;
    const today = U.today();
    const st = HOLO_defaults();
    st.settings.bizName = 'Holo Cards';
    st.settings.owner = '';
    st.settings.onboarded = true;
    st.settings.cat30 = 1;
    st.accounts.forEach(a => { a.initial = a.id === 'acc_bank' ? 1500 : a.id === 'acc_cash' ? 120 : 0; });
    let t0 = Date.now() - 400 * 864e5;
    const ts = d => U.toDate(d).getTime() + (t0++ % 86400000);

    /* Catalogue : [nom, type, extension, coût, marché, lang, poids de vente] */
    const cat = [
      ['Display Évolutions Prismatiques', 'display', 'Évolutions Prismatiques', 165, 235, 'FR', 3],
      ['ETB Évolutions Prismatiques', 'etb', 'Évolutions Prismatiques', 54.9, 89, 'FR', 5],
      ['Booster Évolutions Prismatiques', 'booster', 'Évolutions Prismatiques', 5.9, 9.5, 'FR', 10],
      ['Display Rivalités Destinées', 'display', 'Rivalités Destinées', 139, 185, 'FR', 2],
      ['ETB Rivalités Destinées', 'etb', 'Rivalités Destinées', 49.9, 72, 'FR', 4],
      ['Booster Rivalités Destinées', 'booster', 'Rivalités Destinées', 5.5, 7.9, 'FR', 9],
      ['Display Flammes Fantasmagoriques', 'display', 'Flammes Fantasmagoriques', 149, 199, 'FR', 2],
      ['Booster Flammes Fantasmagoriques', 'booster', 'Flammes Fantasmagoriques', 5.9, 8.5, 'FR', 8],
      ['ETB Méga-Évolution', 'etb', 'Méga-Évolution', 54.9, 79, 'FR', 4],
      ['Tripack Foudre Noire', 'tripack', 'Foudre Noire', 18.9, 27, 'FR', 5],
      ['Tripack Flamme Blanche', 'tripack', 'Flamme Blanche', 18.9, 26, 'FR', 5],
      ['Coffret Dracaufeu ex Premium', 'upc', '151', 89, 139, 'FR', 2],
      ['Pokébox Évoli', 'tin', 'Évolutions Prismatiques', 22.9, 34, 'FR', 4],
      ['Display 151 JP', 'display', '151', 95, 149, 'JP', 2],
      ['Booster Terastal Festival JP', 'booster', 'Évolutions Prismatiques', 4.2, 7.5, 'JP', 7],
      ['Dracaufeu ex SIR 151', 'card', '151', 85, 120, 'FR', 1],
      ['Pikachu ex SIR Étincelles', 'card', 'Étincelles Déferlantes', 150, 210, 'FR', 1],
      ['Mentali ex SIR PSA 10', 'graded', 'Évolutions Prismatiques', 380, 520, 'FR', 1],
      ['Lot 50 cartes holo', 'lot', 'Écarlate et Violet', 12, 25, 'FR', 4],
      ['Protège-cartes Ultra Pro x100', 'accessory', '', 3.2, 6.5, 'FR', 3],
      ['Coffret Ligue de Combat', 'coffret', 'Mascarade Crépusculaire', 26, 39, 'FR', 2],
      ['ETB Couronne Stellaire', 'etb', 'Couronne Stellaire', 49.9, 64, 'FR', 2]
    ];
    const P = cat.map(([name, type, set, cost, market, lang, w], i) => ({
      id: 'demo_p' + i, name, type, set, lang, condition: type === 'card' ? 'Near Mint' : type === 'graded' ? 'Mint' : 'Scellé',
      grader: type === 'graded' ? 'PSA' : '', grade: type === 'graded' ? '10' : '', market, marketAt: U.addDays(today, -ri(0, 20)),
      target: r2(market * 1.05), minStock: '', sku: '', location: pick(['Étagère A', 'Étagère B', 'Carton 1', 'Classeur', '']), notes: '', archived: false,
      createdAt: t0++, _cost: cost, _w: w
    }));
    st.products = P.map(p => { const o = Object.assign({}, p); delete o._cost; delete o._w; return o; });
    const qty = {}, got = {}; P.forEach(p => { qty[p.id] = 0; got[p.id] = 0; });
    const keep = p => Math.floor(got[p.id] * 0.22);
    st.platforms.forEach(pf => { if (pf.id === 'pf_ebay' || pf.id === 'pf_cardmarket') pf.accountId = 'acc_paypal'; });

    const instore = ['sp_leclerc', 'sp_carrefour', 'sp_auchan', 'sp_cultura', 'sp_fnac', 'sp_micromania', 'sp_joueclub'];
    const online = ['sp_amazon', 'sp_pkc', 'sp_cardmarket', 'sp_wholesale'];
    const buyers = ['dresseur_33', 'kev.tcg', 'LunaCards', 'sacha.collec', 'max_pkm', 'NinaHolo', 'bulbi.fan', 'jojo75', 'ptitcollec', 'mewtwo.fr', 'Rayquazza', 'cardlover13'];
    const whatnotNet = {};

    for (let m = 11; m >= 0; m--) {
      const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() - m);
      const mEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      const lastDay = m === 0 ? U.toDate(today).getDate() : mEnd.getDate();
      const day = d => U.iso(new Date(base.getFullYear(), base.getMonth(), Math.min(d, lastDay)));
      const growth = 0.55 + (11 - m) * 0.06;

      /* Achats du mois */
      const nPur = ri(4, 7);
      for (let k = 0; k < nPur; k++) {
        const on = rnd() < 0.4;
        const d = day(ri(1, Math.max(1, lastDay - 4)));
        const lines = [];
        const nl = on ? ri(1, 3) : ri(1, 2);
        for (let j = 0; j < nl; j++) {
          const p = P[Math.floor(Math.pow(rnd(), 1.3) * P.length)];
          if (lines.find(l => l.productId === p.id)) continue;
          const q = p._cost > 100 ? ri(1, 2) : p._cost > 40 ? ri(1, 4) : ri(3, on ? 24 : 10);
          lines.push({ productId: p.id, qty: q, unit: r2(p._cost * (0.93 + rnd() * 0.12)) });
        }
        const inTransit = m === 0 && on && k === 0;
        const pu = {
          id: U.uid(), date: d, supplierId: on ? pick(online) : pick(instore), accountId: rnd() < 0.88 ? 'acc_bank' : 'acc_paypal', lines,
          shipping: on ? pick([0, 4.9, 6.9, 9.9]) : 0, otherFees: 0, discount: !on && rnd() < 0.2 ? 10 : 0,
          status: inTransit ? 'ordered' : 'received', expectedAt: inTransit ? U.addDays(today, 3) : '', ref: on ? 'CMD-' + ri(10000, 99999) : '', notes: '',
          receivedAt: inTransit ? null : d, createdAt: ts(d)
        };
        pu.channel = on ? 'online' : 'instore';
        st.purchases.push(pu);
        if (!inTransit) lines.forEach(l => { qty[l.productId] += l.qty; got[l.productId] += l.qty; });
      }

      /* Lives Whatnot (3 derniers mois : chaque semaine) */
      const liveDays = [];
      if (m <= 3) for (let d = 5; d <= lastDay - 1; d += 7) liveDays.push(d);
      const lives = liveDays.map((d, i) => {
        const date = day(d);
        const l = { id: U.uid(), date, platformId: 'pf_whatnot', title: pick(['Mardi Display Night', 'Live ouverture ETB', 'Enchères à 1 €', 'Soirée cartes rares', 'Live Prismatiques']), start: '20:30', end: pick(['22:00', '22:30', '23:00']), notes: '', pins: [], createdAt: ts(date) };
        st.lives.push(l); return l;
      });

      /* Ventes du mois */
      const nSales = Math.round(ri(10, 16) * growth);
      const totalW = U.sum(P, p => p._w);
      const sellOne = (d, pf, liveId) => {
        let p, tries = 0;
        do { let r = rnd() * totalW; p = P.find(x => (r -= x._w) < 0) || P[0]; tries++; } while (qty[p.id] <= keep(p) && tries < 30);
        if (qty[p.id] <= keep(p)) return;
        const q = p.type === 'booster' && !liveId ? Math.min(qty[p.id], ri(1, 3)) : 1;
        const unit = r2(p.market * (liveId ? 0.8 + rnd() * 0.45 : 0.92 + rnd() * 0.16));
        const items = unit * q;
        const shipIn = pf === 'pf_hand' || liveId ? 0 : pick([0, 3.9, 4.9]);
        const fees = S.feesFor(pf, items, shipIn);
        const recent = U.daysBetween(d, today) < 6;
        const status = pf === 'pf_whatnot' && recent ? 'pending' : 'paid';
        const paidAt = status === 'paid' ? (pf === 'pf_whatnot' ? (U.addDays(d, 4) > today ? today : U.addDays(d, 4)) : d) : null;
        const pfo = st.platforms.find(x => x.id === pf);
        st.sales.push({
          id: U.uid(), date: d, platformId: pf, status, paidAt, accountId: pf === 'pf_hand' ? 'acc_cash' : pfo.accountId,
          lines: [{ productId: p.id, qty: q, unit }], shippingCharged: shipIn, shippingCost: shipIn ? r2(shipIn + rnd() * 1.5) : 0, fees, feesAuto: true,
          shipped: !(recent && rnd() < 0.5) || pf === 'pf_hand', buyer: pick(buyers), tracking: '', notes: '', liveId: liveId || '', createdAt: ts(d)
        });
        qty[p.id] -= q;
        if (pf === 'pf_whatnot' && status === 'paid') { const k = paidAt.slice(0, 7); whatnotNet[k] = (whatnotNet[k] || 0) + items + shipIn - fees; }
      };
      for (let k = 0; k < nSales; k++) {
        const d = day(ri(3, lastDay));
        const pf = pick(['pf_whatnot', 'pf_whatnot', 'pf_vinted', 'pf_vinted', 'pf_cardmarket', 'pf_ebay', 'pf_lbc', 'pf_hand']);
        sellOne(d, pf);
      }
      lives.forEach(l => {
        const n = ri(9, 18);
        for (let k = 0; k < n; k++) sellOne(l.date, 'pf_whatnot', l.id);
        const gp = P.find(p => p.type === 'booster' && qty[p.id] > 1);
        if (gp) { const g = ri(1, 3); for (let k = 0; k < g && qty[gp.id] > 0; k++) { st.adjustments.push({ id: U.uid(), date: l.date, kind: 'giveaway', productId: gp.id, qty: -1, liveId: l.id, notes: '', createdAt: ts(l.date) }); qty[gp.id]--; } }
      });

      /* Dépenses */
      const ed = day(ri(2, lastDay));
      st.expenses.push({ id: U.uid(), date: ed, category: 'Emballages & envois', label: pick(['Enveloppes bulles x100', 'Cartons + scotch', 'Top loaders & sleeves']), amount: r2(15 + rnd() * 30), accountId: 'acc_bank', liveId: '', createdAt: ts(ed) });
      if (m <= 3) st.expenses.push({ id: U.uid(), date: day(1), category: 'Abonnements & logiciels', label: 'Abonnement outils live', amount: 9.99, accountId: 'acc_paypal', liveId: '', createdAt: ts(day(1)) });
      if (m === 3) st.expenses.push({ id: U.uid(), date: day(2), category: 'Matériel (live, éclairage…)', label: 'Ring light + support téléphone', amount: 64.9, accountId: 'acc_bank', liveId: '', createdAt: ts(day(2)) });
      if (m === 6) st.expenses.push({ id: U.uid(), date: day(14), category: 'Gradation', label: 'Envoi PSA (1 carte)', amount: 42, accountId: 'acc_paypal', liveId: '', createdAt: ts(day(14)) });

      /* Virements */
      const key = U.iso(base).slice(0, 7);
      if (whatnotNet[key] > 50 && m > 0) st.transfers.push({ id: U.uid(), date: day(lastDay), kind: 'transfer', from: 'acc_whatnot', to: 'acc_bank', amount: r2(whatnotNet[key] * 0.97), label: 'Versement Whatnot', createdAt: ts(day(lastDay)) });
      if (m <= 8 && m > 0) st.transfers.push({ id: U.uid(), date: day(28), kind: 'withdraw', from: 'acc_bank', to: null, amount: 100 + (8 - m) * 20, label: 'Rémunération', createdAt: ts(day(28)) });
    }
    st.transfers.push({ id: U.uid(), date: U.addDays(today, -360), kind: 'deposit', from: null, to: 'acc_bank', amount: 5000, label: 'Apport de départ', createdAt: t0++ });
    st.transfers.push({ id: U.uid(), date: U.addDays(today, -38), kind: 'transfer', from: 'acc_cash', to: 'acc_bank', amount: 1200, label: 'Dépôt espèces', createdAt: t0++ });

    /* Un éclatement de display et une précommande */
    const disp = st.products.find(p => p.id === 'demo_p0');
    if (qty.demo_p0 > 1) st.adjustments.push({ id: U.uid(), date: U.addDays(today, -20), kind: 'transform', productId: disp.id, qty: -1, toProductId: 'demo_p2', toQty: 36, notes: 'Pour les lives', liveId: '', createdAt: ts(U.addDays(today, -20)) });
    st.purchases.push({ id: U.uid(), date: U.addDays(today, -12), supplierId: 'sp_pkc', accountId: 'acc_bank', lines: [{ productId: 'demo_p8', qty: 4, unit: 54.9 }], shipping: 0, otherFees: 0, discount: 0, status: 'preorder', expectedAt: U.addDays(today, 18), ref: 'PKC-88213', notes: 'Précommande', receivedAt: null, channel: 'online', createdAt: t0++ });
    return st;
  };
})();
