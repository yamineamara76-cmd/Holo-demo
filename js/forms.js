/* HOLO — formulaires : produits, achats, ventes, dépenses, mouvements, ajustements, lives, réglages */
(function () {
  'use strict';
  const F = {};
  const { icon } = UI;
  const esc = U.esc;

  const opt = (v, l, sel) => '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(l) + '</option>';
  const accOpts = sel => S.state.accounts.map(a => opt(a.id, a.name, sel)).join('');
  const val = (el, n) => { const f = el.querySelector('[name="' + n + '"]'); if (!f) return undefined; if (f.type === 'checkbox') return f.checked; return f.value; };
  /* Avertit si le mouvement est daté avant le solde de départ du compte (il serait ignoré) */
  const startWarn = (el, dateName, ...accNames) => {
    const w = el.querySelector('.start-warn'); if (!w) return;
    const upd = () => {
      const d = val(el, dateName);
      const a = accNames.map(n => { const f = el.querySelector('[name="' + n + '"]'); const lab = f && f.closest('.field'); return f && !(lab && lab.style.display === 'none') ? S.account(f.value) : null; }).find(a => a && a.initialAt && d && d < a.initialAt);
      w.hidden = !a;
      if (a) w.innerHTML = '⚠︎ Daté avant le solde de départ de <b>' + esc(a.name) + '</b> (' + U.date(a.initialAt) + ') : ce mouvement ne sera <b>pas compté</b>, le solde saisi le contient déjà. Mets une date au ' + U.date(a.initialAt) + ' ou après, ou change la date du solde dans Réglages.';
    };
    [dateName, ...accNames].forEach(n => { const f = el.querySelector('[name="' + n + '"]'); if (f) { f.addEventListener('input', upd); f.addEventListener('change', upd); } });
    el.__startWarn = upd; upd();
  };
  const startWarnEl = '<p class="start-warn" style="margin:0;font-size:12.5px;color:var(--warn)" hidden></p>';
  const field = (label, inner, cls = '', hint = '') => '<label class="field ' + cls + '"><span>' + label + '</span>' + inner + (hint ? '<small>' + hint + '</small>' : '') + '</label>';
  const inp = (name, v, attrs = '') => '<input type="text" name="' + name + '" value="' + esc(v == null ? '' : v) + '" ' + attrs + '>';
  const num = (name, v, attrs = '') => '<input type="text" inputmode="decimal" name="' + name + '" value="' + (v == null || v === '' ? '' : esc(String(v).replace('.', ','))) + '" ' + attrs + '>';
  const date = (name, v) => '<input type="date" name="' + name + '" value="' + esc(v || U.today()) + '">';
  F.opt = opt; F.field = field;
  /* Choix de la place dans la liste du jour (nouvelles opérations seulement) : le champ n'apparaît que si ce jour a déjà des opérations */
  const placeEl = isNew => isNew ? field('Place dans la liste du jour', '<select name="place"></select>', 'f-place', 'Par défaut la nouvelle opération se met en haut du jour. Tu peux la glisser juste après une autre.') : '';
  const wirePlace = (el, dateName, excludeId) => {
    const box = el.querySelector('.f-place'), sel = box && box.querySelector('select'); if (!sel) return;
    const upd = () => {
      const keep = sel.value, rows = V.journalDay(val(el, dateName), excludeId);
      box.style.display = rows.length ? '' : 'none';
      sel.innerHTML = opt('top', 'En haut (la plus récente)', keep) + rows.map(r => opt('after:' + r.id, 'Juste après : ' + r.label, keep)).join('') + opt('bottom', 'En bas (la plus ancienne)', keep);
    };
    const d = el.querySelector('[name="' + dateName + '"]'); d.addEventListener('input', upd); d.addEventListener('change', upd); upd();
  };
  const applyPlace = (el, obj) => { const v = val(el, 'place'); if (v && v !== 'top') V.journalPlace(obj, v); };
  const linkInp = (name, v, ph) => '<div class="link-inp"><input type="url" inputmode="url" name="' + name + '" value="' + esc(v || '') + '" placeholder="' + esc(ph) + '" autocomplete="off" spellcheck="false"><a class="btn btn-ghost btn-icon" data-open="' + name + '" target="_blank" rel="noopener" title="Ouvrir" href="' + esc(U.url(v) || '#') + '"' + (U.url(v) ? '' : ' hidden') + '>' + icon('arrowR') + '</a></div>';
  F.linkInp = linkInp;
  /* Met à jour le bouton « ouvrir » à côté d'un champ lien */
  function wireLinks(el) {
    el.querySelectorAll('.link-inp input').forEach(i => {
      const a = i.parentElement.querySelector('[data-open]');
      const upd = () => { const u = U.url(i.value); a.hidden = !u; a.href = u || '#'; i.classList.toggle('bad', !!i.value.trim() && !u); };
      i.addEventListener('input', upd); i.addEventListener('blur', () => { const u = U.url(i.value); if (u) i.value = u; upd(); });
    });
  }
  F.wireLinks = wireLinks;
  /* Devine le fournisseur à partir du site (amazon.fr → Amazon, pokemoncenter.com → Pokémon Center…) */
  F.supplierFromUrl = v => {
    const h = U.host(U.url(v)).replace(/[^a-z0-9]/g, '');
    if (!h) return null;
    const s = S.state.suppliers.find(x => { const n = U.norm(x.name).replace(/[^a-z0-9]/g, ''); return n.length >= 3 && h.includes(n); });
    return s ? s.id : null;
  };

  function saveBtn(label = 'Enregistrer') { return '<button class="btn btn-primary" data-save>' + icon('check') + label + '</button>'; }
  function delBtn(has) { return has ? '<button class="btn btn-ghost btn-danger" data-del>' + icon('trash') + '</button>' : ''; }
  function dupBtn(has) { return has ? '<button class="btn btn-ghost" data-dup title="Dupliquer">' + icon('copy') + '<span class="t">Dupliquer</span></button>' : ''; }

  /* Duplication : même transaction recopiée n fois (payée plusieurs fois à l'identique) */
  const DUP = { purchases: ['cet achat', 'Achat dupliqué'], expenses: ['cette dépense', 'Dépense dupliquée'], transfers: ['ce mouvement', 'Mouvement dupliqué'], sales: ['cette vente', 'Vente dupliquée'] };
  function dupDialog(coll, id, after) {
    const [noun, done] = DUP[coll];
    UI.open({
      title: 'Dupliquer ' + noun, size: 'sm',
      body: field('Nombre de copies à créer', '<input type="number" name="n" inputmode="numeric" min="1" max="50" step="1" value="1" autofocus style="font-size:20px">', '', 'Chaque copie est une transaction séparée et identique : même date, même montant, mêmes articles. Tu pourras les modifier une par une ensuite.')
        + (coll === 'purchases' ? '<p class="faint" style="margin:0;font-size:12.5px">Si tu as payé <b>une seule fois</b> pour plusieurs articles identiques, mets plutôt la <b>quantité</b> sur la ligne de l’article.</p>' : ''),
      foot: '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" data-ok>' + icon('copy') + 'Dupliquer</button>',
      onMount(el, close) {
        const go = () => {
          const ids = S.duplicate(coll, id, val(el, 'n')); close(); if (after) after();
          UI.toast(done + (ids.length > 1 ? ' ×' + ids.length : ''), { undo: () => { S.state[coll] = S.state[coll].filter(x => !ids.includes(x.id)); S.commit(); } });
        };
        el.querySelector('[data-ok]').onclick = go;
        el.querySelector('[name=n]').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      }
    });
  }
  const wireDup = (el, close, coll, id) => { const b = el.querySelector('[data-dup]'); if (b) b.onclick = () => dupDialog(coll, id, close); };
  const savedToast = (msg, coll, obj, isNew) => UI.toast(msg, isNew ? { undo: () => dupDialog(coll, obj.id), undoLabel: 'Dupliquer' } : {});

  function withUndo(coll, obj, label) {
    const copy = JSON.parse(JSON.stringify(obj));
    S.remove(coll, obj.id);
    UI.toast(label, { undo: () => { S.state[coll].push(copy); S.commit(); } });
  }

  /* ======================= PRODUIT ======================= */
  F.product = (p, opts = {}) => {
    const isNew = !p;
    p = p ? JSON.parse(JSON.stringify(p)) : { type: opts.type && !opts.name ? opts.type : guessType(opts.name || ''), lang: 'FR', condition: 'Scellé', name: opts.name || '' };
    const sets = Array.from(new Set(REF.sets.concat(S.state.products.map(x => x.set).filter(Boolean))));
    const withStock = isNew && !opts.noStock;
    const stockBlock = () => `
      <div class="stock-in">
        <div class="stock-in-h"><div class="label">Mise en stock</div>
          <div class="seg" data-sm><button type="button" data-m="buy" class="on">${icon('cart')}Je l’ai acheté</button><button type="button" data-m="have">${icon('box')}Déjà en stock</button><button type="button" data-m="none">Plus tard</button></div>
        </div>
        <div class="grid-3 sm-q">
          ${field('Quantité', num('sQty', 1, 'data-sq'))}
          ${field('Prix payé / unité (€)', num('sUnit', '', 'placeholder="0,00"'))}
          ${field('Total payé (€)', num('sTotal', '', 'placeholder="0,00"'), '', 'Remplis l’un ou l’autre')}
        </div>
        <div class="grid-3 sm-buy">
          ${field('Acheté où', '<select name="sSupplier">' + S.state.suppliers.map(s => opt(s.id, s.name + (s.channel === 'online' ? ' · en ligne' : ' · magasin'), S.state.suppliers[0] && S.state.suppliers[0].id)).join('') + '<option value="__new">+ Nouveau fournisseur…</option></select>')}
          ${field('Date d’achat', date('sDate'))}
          ${field('Payé avec', '<select name="sAccount">' + accOpts() + '</select>')}
        </div>
        <div class="grid-3 sm-buy">
          ${field('Frais de port', num('sShip', '', 'placeholder="0,00"'))}
          ${field('Statut', '<select name="sStatus">' + Object.entries(REF.purStatus).map(([k, v]) => opt(k, v, 'received')).join('') + '</select>')}
          ${field('N° de commande', inp('sRef', '', 'placeholder="optionnel"'))}
        </div>
        <p class="faint sm-help" style="margin:0;font-size:12px"></p>
      </div>`;
    const body = `
      <div class="imgdrop">
        <div class="prev" data-img>${p.image ? '<img src="' + p.image + '">' : icon('image')}</div>
        <div class="field"><span>Photo</span><small>Clique pour ajouter une photo (redimensionnée automatiquement).</small>
          <div style="display:flex;gap:8px;margin-top:6px"><button class="btn btn-sm" data-pick>${icon('up')}Choisir</button>${p.image ? '<button class="btn btn-sm btn-ghost" data-rmimg>Retirer</button>' : ''}</div>
          <input type="file" accept="image/*" hidden data-file></div>
      </div>
      ${field('Nom du produit', inp('name', p.name, 'autofocus placeholder="ex. Display Évolutions Prismatiques"'))}
      <div class="grid-3">
        ${field('Type', '<select name="type"><optgroup label="Items">' + REF.types.filter(t => !t.supply).map(t => opt(t.id, t.label, p.type)).join('') + '</optgroup><optgroup label="Fournitures">' + REF.types.filter(t => t.supply).map(t => opt(t.id, t.label, p.type)).join('') + '</optgroup></select>')}
        ${field('Extension / série', inp('set', p.set, 'list="dl-sets" placeholder="—"') + '<datalist id="dl-sets">' + sets.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist>')}
        ${field('Langue', '<select name="lang">' + REF.langs.map(l => opt(l, l, p.lang)).join('') + '</select>')}
      </div>
      ${withStock ? stockBlock() : ''}
      <div class="grid-3">
        ${field('État', '<select name="condition">' + REF.conditions.map(c => opt(c, c, p.condition)).join('') + '</select>')}
        ${field('Gradation', '<select name="grader"><option value="">Non gradé</option>' + REF.graders.map(g => opt(g, g, p.grader)).join('') + '</select>')}
        ${field('Note', inp('grade', p.grade, 'placeholder="ex. 10"'))}
      </div>
      <div class="grid-3">
        ${field('Prix marché (€)', num('market', p.market, 'placeholder="Cardmarket, eBay…"'), '', p.marketAt ? 'MAJ ' + U.date(p.marketAt) : '')}
        ${field('Prix de vente visé (€)', num('target', p.target))}
        ${field('Alerte stock bas', num('minStock', p.minStock, 'placeholder="' + S.state.settings.lowStock + '"'))}
      </div>
      <div class="grid-3">
        ${field('Boosters dedans', num('boosters', p.boosters, 'placeholder="' + (S.boostersOf(Object.assign({}, p, { boosters: '' })) || 'aucun') + '"'), '', 'Pour le mode live : combien de boosters quand tu l’ouvres')}
      </div>
      <div class="grid-2 links-2">
        ${field(icon('link', 'xs') + ' Lien Cardmarket', linkInp('cmUrl', p.cmUrl, 'cardmarket.com/fr/Pokemon/Products/…'), '', 'Pour vérifier le prix marché en 1 clic')}
        ${field(icon('cart', 'xs') + ' Lien d’achat', linkInp('buyUrl', p.buyUrl, 'la page du produit là où tu as payé'), '', 'Pour racheter ou retrouver la commande')}
      </div>
      <div class="grid-2">
        ${field('SKU / référence', inp('sku', p.sku, 'placeholder="optionnel"'))}
        ${field('Emplacement', inp('location', p.location, 'placeholder="ex. Étagère A, bac 3"'))}
      </div>
      ${field('Notes', '<textarea name="notes" rows="2">' + esc(p.notes || '') + '</textarea>')}
      ${!isNew ? '<label class="check"><input type="checkbox" name="archived"' + (p.archived ? ' checked' : '') + '> Archiver (masqué du stock et des recherches)</label>' : ''}
    `;
    UI.open({
      title: isNew ? 'Nouveau produit' : 'Modifier le produit', body,
      foot: delBtn(!isNew) + '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        const file = el.querySelector('[data-file]');
        const setImg = src => { p.image = src; el.querySelector('[data-img]').innerHTML = src ? '<img src="' + src + '">' : icon('image'); };
        el.querySelector('[data-pick]').onclick = () => file.click();
        el.querySelector('[data-img]').onclick = () => file.click();
        const rm = el.querySelector('[data-rmimg]'); if (rm) rm.onclick = () => setImg(null);
        file.onchange = async () => { if (file.files[0]) { const d = await UI.readImage(file.files[0]); setImg(d); const u = await Cloud.uploadImage(d); if (p.image === d) setImg(u); } };
        el.querySelector('[name=name]').addEventListener('input', e => { if (isNew) el.querySelector('[name=type]').value = guessType(e.target.value); });
        wireLinks(el);
        let mode = 'buy', lastPrice = 'unit';
        if (withStock) {
          const qI = el.querySelector('[name=sQty]'), uI = el.querySelector('[name=sUnit]'), tI = el.querySelector('[name=sTotal]');
          const fmt = v => v ? String(Math.round(v * 100) / 100).replace('.', ',') : '';
          const recalc = () => {
            const q = U.num(qI.value);
            if (lastPrice === 'unit') tI.value = q && uI.value !== '' ? fmt(U.num(uI.value) * q) : '';
            else uI.value = q && tI.value !== '' ? fmt(U.num(tI.value) / q) : '';
            const help = el.querySelector('.sm-help');
            help.textContent = mode === 'buy' ? 'Un achat sera créé : ton stock et ta trésorerie sont mis à jour automatiquement.'
              : mode === 'have' ? 'Pour du stock que tu avais déjà avant HOLO : aucune sortie d’argent n’est comptée.' : 'Le produit est créé à 0 en stock.';
          };
          uI.oninput = () => { lastPrice = 'unit'; recalc(); };
          tI.oninput = () => { lastPrice = 'total'; recalc(); };
          qI.oninput = recalc;
          const setMode = m => {
            mode = m;
            el.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === m));
            el.querySelectorAll('.sm-buy').forEach(n => n.style.display = m === 'buy' ? '' : 'none');
            el.querySelector('.sm-q').style.display = m === 'none' ? 'none' : '';
            el.querySelector('.sm-q .field:nth-child(2) > span').textContent = m === 'buy' ? 'Prix payé / unité (€)' : 'Coût / unité (€)';
            el.querySelector('[data-save]').lastChild.textContent = m === 'none' ? 'Enregistrer' : 'Ajouter au stock';
            recalc();
          };
          el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => setMode(b.dataset.m));
          const supSel = el.querySelector('[name=sSupplier]');
          let lastSup = supSel.value;
          supSel.onchange = () => {
            if (supSel.value !== '__new') { lastSup = supSel.value; return; }
            supSel.value = lastSup;
            F.supplier(null, s => { supSel.insertAdjacentHTML('afterbegin', opt(s.id, s.name + (s.channel === 'online' ? ' · en ligne' : ' · magasin'), s.id)); supSel.value = lastSup = s.id; });
          };
          setMode('buy');
          el.querySelector('[name=buyUrl]').addEventListener('change', e => { const id = F.supplierFromUrl(e.target.value); if (id && mode === 'buy') { supSel.value = lastSup = id; } });
        }
        const save = () => {
          const name = val(el, 'name').trim();
          if (!name) { el.querySelector('[name=name]').focus(); return; }
          const badLink = ['cmUrl', 'buyUrl'].find(n => val(el, n).trim() && !U.url(val(el, n)));
          if (badLink) { UI.toast('Ce lien n’est pas valide'); el.querySelector('[name=' + badLink + ']').focus(); return; }
          const sQty = withStock && mode !== 'none' ? U.num(val(el, 'sQty')) : 0;
          if (withStock && mode !== 'none' && !(sQty > 0)) { UI.toast('Indique la quantité'); el.querySelector('[name=sQty]').focus(); return; }
          if (withStock && mode === 'buy' && val(el, 'sSupplier') === '__new') { UI.toast('Choisis où tu l’as acheté'); return; }
          const market = U.num(val(el, 'market'));
          if (market !== U.num(p.market)) p.marketAt = U.today();
          Object.assign(p, {
            name, type: val(el, 'type'), set: val(el, 'set').trim(), lang: val(el, 'lang'), condition: val(el, 'condition'),
            grader: val(el, 'grader'), grade: val(el, 'grade').trim(), market: market || '', target: U.num(val(el, 'target')) || '',
            minStock: val(el, 'minStock') === '' ? '' : U.num(val(el, 'minStock')), boosters: val(el, 'boosters') === '' ? '' : U.num(val(el, 'boosters')), sku: val(el, 'sku').trim(), location: val(el, 'location').trim(), cmUrl: U.url(val(el, 'cmUrl')), buyUrl: U.url(val(el, 'buyUrl')),
            notes: val(el, 'notes'), archived: !!val(el, 'archived')
          });
          const saved = S.upsert('products', p);
          const sUnit = U.num(val(el, 'sUnit'));
          if (sQty > 0 && mode === 'buy') {
            const status = val(el, 'sStatus'), sid = val(el, 'sSupplier'), sp = S.supplier(sid);
            S.upsert('purchases', {
              date: val(el, 'sDate'), supplierId: sid, channel: sp ? sp.channel : 'instore', accountId: val(el, 'sAccount'), status,
              lines: [{ productId: saved.id, qty: sQty, unit: sUnit }], shipping: U.num(val(el, 'sShip')), otherFees: 0, discount: 0,
              ref: val(el, 'sRef').trim(), url: U.url(val(el, 'buyUrl')), notes: '', expectedAt: '', receivedAt: status === 'received' ? val(el, 'sDate') : null
            });
          } else if (sQty > 0 && mode === 'have') {
            S.upsert('adjustments', { date: U.today(), kind: 'correction', productId: saved.id, qty: sQty, unitCost: val(el, 'sUnit') === '' ? '' : sUnit, notes: 'Stock de départ', liveId: '' });
          }
          close();
          UI.toast(sQty > 0 ? U.n(sQty) + ' × ' + name + (mode === 'buy' && val(el, 'sStatus') !== 'received' ? ' · en transit' : ' ajouté au stock') : isNew ? 'Produit créé' : 'Produit mis à jour');
          opts.onSaved && opts.onSaved(saved);
        };
        el.querySelector('[data-save]').onclick = save;
        el.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); });
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => {
          const used = S.state.purchases.some(x => x.lines.some(l => l.productId === p.id)) || S.state.sales.some(x => x.lines.some(l => l.productId === p.id));
          if (used) { UI.toast('Produit utilisé dans des opérations : archive-le plutôt'); return; }
          if (await UI.confirm('Supprimer ce produit ?')) { close(); withUndo('products', p, 'Produit supprimé'); }
        };
      }
    });
  };
  function guessType(n) {
    const s = U.norm(n);
    if (/display|booster box|bb\b/.test(s)) return 'display';
    if (/etb|elite|dresseur/.test(s)) return 'etb';
    if (/tripack|tri-pack|blister|duopack/.test(s)) return 'tripack';
    if (/upc|ultra premium|premium/.test(s)) return 'upc';
    if (/pokebox|tin|mini tin|boite/.test(s)) return 'tin';
    if (/coffret|collection|box/.test(s)) return 'coffret';
    if (/psa|cgc|pca|bgs|grad/.test(s)) return 'graded';
    if (/booster/.test(s)) return 'booster';
    if (/lot/.test(s)) return 'lot';
    if (/sleeve|pochette/.test(s)) return 'sleeve';
    if (/toploader|top loader|semi.?rigid|card saver|one.?touch|magnetique/.test(s)) return 'toploader';
    if (/enveloppe|bulle|carton|emballage|scotch|adhesif|etiquette/.test(s)) return 'packaging';
    if (/classeur|binder|protege/.test(s)) return 'accessory';
    if (/ex\b|gx|vmax|vstar|alt|sar|ir\b|\d+\/\d+/.test(s)) return 'card';
    return 'other';
  }
  F.guessType = guessType;

  /* ======================= PRIX MARCHÉ & LIENS (en masse) ======================= */
  const cmSearch = p => 'https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=' + encodeURIComponent(p.name);
  F.cmSearch = cmSearch;
  F.marketBulk = () => {
    const C = S.calc();
    const edits = {};                                          // id → { cmUrl, market }
    let q = '', onlyStock = true, onlyMissing = false;
    const rows = () => {
      const nq = U.norm(q);
      const list = S.state.products.filter(p => !p.archived)
        .filter(p => !onlyStock || C.prod[p.id].qty > 0 || C.prod[p.id].transit > 0)
        .filter(p => !onlyMissing || !(edits[p.id] ? edits[p.id].cmUrl : p.cmUrl) || !U.num(edits[p.id] ? edits[p.id].market : p.market))
        .filter(p => !nq || U.norm(p.name + ' ' + (p.set || '') + ' ' + (p.sku || '')).includes(nq))
        .sort((a, b) => (a.marketAt || '') < (b.marketAt || '') ? -1 : 1);
      if (!list.length) return '<div class="faint" style="padding:24px;text-align:center">Aucun produit.</div>';
      return list.map(p => {
        const e = edits[p.id] || {}, cm = e.cmUrl != null ? e.cmUrl : (p.cmUrl || ''), mk = e.market != null ? e.market : (p.market ? String(p.market).replace('.', ',') : '');
        const u = U.url(cm);
        return '<div class="mb-row" data-id="' + p.id + '">' + UI.mini(p)
          + '<div class="mb-name"><div class="row-t">' + esc(p.name) + '</div><div class="row-s">' + U.n(C.prod[p.id].qty) + ' en stock · ' + (p.marketAt ? 'MAJ ' + U.date(p.marketAt) : 'jamais mis à jour') + '</div></div>'
          + '<div class="link-inp mb-link"><input type="url" inputmode="url" data-f="cmUrl" value="' + esc(cm) + '" placeholder="Colle le lien Cardmarket" spellcheck="false" autocomplete="off">'
          + '<a class="btn btn-sm ' + (u ? '' : 'btn-ghost') + '" target="_blank" rel="noopener" data-go href="' + esc(u || cmSearch(p)) + '">' + (u ? 'Ouvrir' : 'Chercher') + icon('arrowR') + '</a></div>'
          + '<div class="mb-price"><input type="text" inputmode="decimal" data-f="market" value="' + esc(mk) + '" placeholder="Prix €"></div></div>';
      }).join('');
    };
    const body = '<p class="faint" style="margin:0;font-size:12.5px">Clique « Chercher » ou « Ouvrir » pour voir le produit sur Cardmarket, colle le bon lien une fois pour toutes, puis tape le prix. Les plus anciens prix sont en haut.</p>'
      + '<div class="toolbar mb-tools" style="margin:0"><label class="input-search">' + icon('search') + '<input type="search" data-q placeholder="Filtrer…"></label>'
      + '<label class="check"><input type="checkbox" data-stock checked> En stock</label><label class="check"><input type="checkbox" data-miss> À compléter</label></div>'
      + '<div class="mb-list" data-rows></div>';
    UI.open({
      title: 'Prix marché & liens Cardmarket', body, size: 'lg',
      foot: '<span class="faint" data-count style="font-size:13px"></span><span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn('Enregistrer tout'),
      onMount(el, close) {
        const box = el.querySelector('[data-rows]'), cnt = el.querySelector('[data-count]');
        const draw = () => { box.innerHTML = rows(); };
        const count = () => { const n = Object.keys(edits).length; cnt.textContent = n ? n + ' produit' + (n > 1 ? 's' : '') + ' modifié' + (n > 1 ? 's' : '') : ''; };
        draw();
        box.addEventListener('input', e => {
          const f = e.target.dataset.f; if (!f) return;
          const row = e.target.closest('[data-id]'), id = row.dataset.id, p = S.product(id);
          const ed = edits[id] || (edits[id] = { cmUrl: p.cmUrl || '', market: p.market ? String(p.market).replace('.', ',') : '' });
          ed[f] = e.target.value;
          if (f === 'cmUrl') {
            const u = U.url(e.target.value), a = row.querySelector('[data-go]');
            a.href = u || cmSearch(p); a.firstChild.textContent = u ? 'Ouvrir' : 'Chercher'; a.classList.toggle('btn-ghost', !u);
            e.target.classList.toggle('bad', !!e.target.value.trim() && !u);
          }
          count();
        });
        box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.f === 'market') { const all = [...box.querySelectorAll('[data-f=market]')]; const nx = all[all.indexOf(e.target) + 1]; if (nx) nx.focus(); } });
        el.querySelector('[data-q]').oninput = e => { q = e.target.value; draw(); };
        el.querySelector('[data-stock]').onchange = e => { onlyStock = e.target.checked; draw(); };
        el.querySelector('[data-miss]').onchange = e => { onlyMissing = e.target.checked; draw(); };
        el.querySelector('[data-save]').onclick = () => {
          const ids = Object.keys(edits);
          const bad = ids.find(id => edits[id].cmUrl.trim() && !U.url(edits[id].cmUrl));
          if (bad) { UI.toast('Un lien n’est pas valide'); const i = box.querySelector('[data-id="' + bad + '"] [data-f=cmUrl]'); i && i.focus(); return; }
          let n = 0;
          ids.forEach(id => {
            const p = S.product(id); if (!p) return;
            const cm = U.url(edits[id].cmUrl), mk = U.num(edits[id].market) || '';
            if (cm === (p.cmUrl || '') && mk === (U.num(p.market) || '')) return;
            if (mk !== (U.num(p.market) || '')) p.marketAt = U.today();
            p.cmUrl = cm; p.market = mk; n++;
          });
          if (n) S.commit();
          close(); UI.toast(n ? n + ' produit' + (n > 1 ? 's' : '') + ' mis à jour' : 'Aucun changement');
        };
      }
    });
  };

  F.links = p => {
    UI.open({
      title: 'Liens · ' + p.name, size: 'sm',
      body: field(icon('link', 'xs') + ' Lien Cardmarket', linkInp('cmUrl', p.cmUrl, 'cardmarket.com/fr/Pokemon/Products/…'), '', '<a target="_blank" rel="noopener" href="' + esc(cmSearch(p)) + '">Chercher ce produit sur Cardmarket ↗</a>')
        + field(icon('cart', 'xs') + ' Lien d’achat', linkInp('buyUrl', p.buyUrl, 'la page du produit là où tu as payé'))
        + field('Prix marché (€)', num('market', p.market, 'placeholder="ex. 64,90"'), '', p.marketAt ? 'MAJ ' + U.date(p.marketAt) : ''),
      foot: '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        wireLinks(el);
        el.querySelector('[data-save]').onclick = () => {
          const bad = ['cmUrl', 'buyUrl'].find(n => val(el, n).trim() && !U.url(val(el, n)));
          if (bad) { UI.toast('Ce lien n’est pas valide'); el.querySelector('[name=' + bad + ']').focus(); return; }
          const mk = U.num(val(el, 'market')) || '';
          if (mk !== (U.num(p.market) || '')) p.marketAt = U.today();
          Object.assign(p, { cmUrl: U.url(val(el, 'cmUrl')), buyUrl: U.url(val(el, 'buyUrl')), market: mk });
          S.upsert('products', p); close(); UI.toast('Liens enregistrés');
        };
      }
    });
  };

  /* ======================= LIGNES (achat / vente) ======================= */
  function linesEditor(el, lines, mode, onChange) {
    const box = el.querySelector('[data-lines]');
    const render = () => {
      box.innerHTML = '<div class="line-h"><span>Produit</span><span>Qté</span><span>' + (mode === 'sale' ? 'Prix unit.' : 'Prix unit. payé') + '</span><span></span></div>' + lines.map((l, i) => {
        const p = S.product(l.productId);
        return '<div class="line" data-li="' + i + '"><div class="picker"><input type="text" data-pp placeholder="Chercher ou créer un produit…" value="' + esc(p ? p.name : '') + '"><div class="hint" data-hint></div></div>'
          + '<input type="text" inputmode="decimal" data-q value="' + esc(l.qty) + '">'
          + '<input type="text" inputmode="decimal" data-u placeholder="0,00" value="' + (l.unit === '' || l.unit == null ? '' : esc(String(l.unit).replace('.', ','))) + '">'
          + '<button class="btn btn-ghost btn-icon" data-rm title="Retirer">' + icon('x') + '</button></div>';
      }).join('') + '<button class="btn btn-sm btn-ghost" data-add style="align-self:flex-start">' + icon('plus') + 'Ajouter une ligne</button>';
      box.querySelectorAll('.line').forEach(row => {
        const i = +row.dataset.li;
        UI.productPicker(row.querySelector('[data-pp]'), {
          onPick: p => {
            lines[i].productId = p.id;
            if (mode === 'sale' && (lines[i].unit === '' || lines[i].unit == null)) {
              const guess = U.num(p.target) || U.num(p.market);
              if (guess) { lines[i].unit = guess; row.querySelector('[data-u]').value = String(guess).replace('.', ','); }
            }
            hint(); onChange();
            (row.querySelector('[data-u]').value ? row.querySelector('[data-q]') : row.querySelector('[data-u]')).focus();
          }
        });
        row.querySelector('[data-q]').oninput = e => { lines[i].qty = U.num(e.target.value); hint(); onChange(); };
        row.querySelector('[data-u]').oninput = e => { lines[i].unit = U.num(e.target.value); hint(); onChange(); };
        row.querySelector('[data-rm]').onclick = () => { lines.splice(i, 1); if (!lines.length) lines.push({ productId: null, qty: 1, unit: '' }); render(); onChange(); };
      });
      box.querySelector('[data-add]').onclick = () => { lines.push({ productId: null, qty: 1, unit: '' }); render(); onChange(); const all = box.querySelectorAll('[data-pp]'); all[all.length - 1].focus(); };
      hint();
    };
    const hint = () => {
      const C = S.calc();
      box.querySelectorAll('.line').forEach(row => {
        const l = lines[+row.dataset.li], h = row.querySelector('[data-hint]');
        const c = l.productId && C.prod[l.productId];
        if (!c) { h.textContent = ''; return; }
        if (mode === 'sale') {
          const m = U.num(l.unit) - c.cost;
          h.innerHTML = 'Stock ' + U.n(c.qty) + ' · coût ' + U.eur(c.cost) + (U.num(l.unit) ? ' · <span class="' + (m >= 0 ? 'pos' : 'neg') + '">marge ' + U.signed(m * U.num(l.qty)) + '</span>' : '') + (c.qty < U.num(l.qty) ? ' · <span class="warn">stock insuffisant</span>' : '');
        } else {
          h.innerHTML = 'En stock : ' + U.n(c.qty) + (c.qty > 0 ? ' à ' + U.eur(c.cost) : '') + (c.market ? ' · marché ' + U.eur(c.market) : '');
        }
      });
    };
    render();
    return { render };
  }

  /* ======================= ACHAT ======================= */
  F.purchase = (pu, opts = {}) => {
    const isNew = !pu;
    pu = pu ? JSON.parse(JSON.stringify(pu)) : {
      date: U.today(), supplierId: opts.supplierId || S.state.suppliers[0].id, status: 'received', accountId: S.state.accounts[0].id,
      lines: [{ productId: opts.productId || null, qty: 1, unit: '' }], shipping: '', otherFees: '', discount: ''
    };
    const sup = S.state.suppliers;
    const body = `
      <div class="grid-3 g-sup">
        ${field('Date d’achat', date('date', pu.date))}
        ${field('Fournisseur / magasin', '<select name="supplierId">' + sup.map(s => opt(s.id, s.name + (s.channel === 'online' ? ' · en ligne' : ' · magasin'), pu.supplierId)).join('') + '<option value="__new">+ Nouveau fournisseur…</option></select>')}
        ${field('Payé avec', '<select name="accountId">' + accOpts(pu.accountId) + '<option value=""' + (pu.accountId ? '' : ' selected') + '>Stock de départ · hors trésorerie</option></select>', '', 'Choisis « Stock de départ » pour saisir ce que tu as déjà : rien n’est déduit de tes comptes.')}
        ${startWarnEl}
      </div>
      <div>
        <div class="label" style="margin-bottom:8px">Articles</div>
        <div class="lines" data-lines></div>
      </div>
      <div class="grid-3">
        ${field('Frais de port', num('shipping', pu.shipping, 'placeholder="0,00"'))}
        ${field('Autres frais', num('otherFees', pu.otherFees, 'placeholder="0,00"'), '', 'Essence, parking, frais de service…')}
        ${field('Remise / bon d’achat', num('discount', pu.discount, 'placeholder="0,00"'))}
      </div>
      <div class="grid-3">
        ${field('Statut', '<select name="status">' + Object.entries(REF.purStatus).map(([k, v]) => opt(k, v, pu.status)).join('') + '</select>')}
        ${field('Réception prévue', '<input type="date" name="expectedAt" value="' + esc(pu.expectedAt || '') + '">', 'exp')}
        ${field('N° de commande', inp('ref', pu.ref, 'placeholder="optionnel"'))}
      </div>
      ${field(icon('link', 'xs') + ' Lien de la commande ou du produit', linkInp('url', pu.url, 'colle le lien du site où tu as payé'), '', 'Le fournisseur est reconnu tout seul (Amazon, Pokémon Center, Cardmarket…)')}
      ${field('Notes', '<textarea name="notes" rows="2">' + esc(pu.notes || '') + '</textarea>')}
      ${placeEl(isNew)}
      <p class="faint" style="margin:0;font-size:12px">Les frais sont répartis au prorata sur chaque article pour calculer ton vrai coût de revient. Tant que l'achat n'est pas « Reçu », les articles apparaissent « en transit ».</p>
    `;
    UI.open({
      title: isNew ? 'Nouvel achat' : 'Modifier l’achat', body,
      foot: delBtn(!isNew) + dupBtn(!isNew) + '<div class="sum" data-sum></div><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        startWarn(el, 'date', 'accountId'); wireDup(el, close, 'purchases', pu.id);
        wirePlace(el, 'date', pu.id);
        const sum = () => {
          const base = U.sum(pu.lines, l => U.num(l.qty) * U.num(l.unit));
          const extra = U.num(val(el, 'shipping')) + U.num(val(el, 'otherFees')) - U.num(val(el, 'discount'));
          const units = U.sum(pu.lines, l => U.num(l.qty));
          el.querySelector('[data-sum]').innerHTML = '<span>Articles <b>' + U.n(units) + '</b></span><span>Total payé <b>' + U.eur(base + extra) + '</b></span>' + (units ? '<span>Coût / u. <b>' + U.eur((base + extra) / units) + '</b></span>' : '');
        };
        linesEditor(el, pu.lines, 'purchase', sum);
        ['shipping', 'otherFees', 'discount'].forEach(n => el.querySelector('[name=' + n + ']').addEventListener('input', sum));
        const st = el.querySelector('[name=status]'), exp = el.querySelector('.exp');
        const tog = () => exp.style.opacity = st.value === 'received' ? .4 : 1; st.onchange = tog; tog();
        const supSel = el.querySelector('[name=supplierId]');
        supSel.onchange = () => {
          if (supSel.value !== '__new') return;
          F.supplier(null, s => { supSel.insertAdjacentHTML('afterbegin', opt(s.id, s.name, s.id)); supSel.value = s.id; });
          supSel.value = pu.supplierId;
        };
        wireLinks(el);
        el.querySelector('[name=url]').addEventListener('change', e => { const id = F.supplierFromUrl(e.target.value); if (id) supSel.value = id; });
        sum();
        el.querySelector('[data-save]').onclick = () => {
          const lines = pu.lines.filter(l => l.productId && U.num(l.qty) > 0);
          if (!lines.length) { UI.toast('Ajoute au moins un article'); return; }
          const url = U.url(val(el, 'url'));
          if (val(el, 'url').trim() && !url) { UI.toast('Ce lien n’est pas valide'); el.querySelector('[name=url]').focus(); return; }
          if (url && lines.length === 1) { const pr = S.product(lines[0].productId); if (pr && !pr.buyUrl) pr.buyUrl = url; }
          const status = val(el, 'status');
          Object.assign(pu, {
            date: val(el, 'date'), supplierId: val(el, 'supplierId'), accountId: val(el, 'accountId'), lines: lines.map(l => Object.assign({ productId: l.productId, qty: U.num(l.qty), unit: U.num(l.unit) }, l.ord != null ? { ord: l.ord } : {}, Array.isArray(l.ords) ? { ords: l.ords } : {})),
            shipping: U.num(val(el, 'shipping')), otherFees: U.num(val(el, 'otherFees')), discount: U.num(val(el, 'discount')),
            status, expectedAt: val(el, 'expectedAt'), ref: val(el, 'ref').trim(), url, notes: val(el, 'notes'),
            receivedAt: status === 'received' ? (pu.receivedAt && pu.status === 'received' ? pu.receivedAt : (pu.status !== 'received' && !isNew ? U.today() : val(el, 'date'))) : null
          });
          const sp = S.supplier(pu.supplierId); pu.channel = sp ? sp.channel : 'instore';
          S.upsert('purchases', pu); applyPlace(el, pu); close(); savedToast(isNew ? 'Achat enregistré · stock mis à jour' : 'Achat mis à jour', 'purchases', pu, isNew);
        };
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => { if (await UI.confirm('Supprimer cet achat ?', { sub: 'Le stock et la trésorerie seront recalculés.' })) { close(); withUndo('purchases', pu, 'Achat supprimé'); } };
      }
    });
  };

  /* ======================= VENTE ======================= */
  F.sale = (sa, opts = {}) => {
    const isNew = !sa;
    const defPf = opts.platformId || (S.state.platforms[0] || {}).id;
    sa = sa ? JSON.parse(JSON.stringify(sa)) : {
      date: U.today(), platformId: defPf, status: defPf === 'pf_whatnot' ? 'pending' : 'paid', accountId: (S.get('platforms', defPf) || {}).accountId || S.state.accounts[0].id,
      lines: [{ productId: opts.productId || null, qty: 1, unit: '' }], shippingCharged: '', shippingCost: '', fees: '', feesAuto: true, shipped: false, liveId: opts.liveId || ''
    };
    const lives = S.state.lives.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 20);
    const body = `
      <div class="grid-3">
        ${field('Date', date('date', sa.date))}
        ${field('Plateforme', '<select name="platformId">' + S.state.platforms.map(p => opt(p.id, p.name, sa.platformId)).join('') + '</select>')}
        ${field('Acheteur', inp('buyer', sa.buyer, 'placeholder="pseudo / nom"'))}
      </div>
      <div>
        <div class="label" style="margin-bottom:8px">Articles vendus</div>
        <div class="lines" data-lines></div>
      </div>
      <div class="grid-3">
        ${field('Port payé par l’acheteur', num('shippingCharged', sa.shippingCharged, 'placeholder="0,00"'))}
        ${field('Coût d’envoi réel', num('shippingCost', sa.shippingCost, 'placeholder="0,00"'), '', 'Étiquette, enveloppe bulle…')}
        ${field('Frais plateforme', num('fees', sa.fees, 'placeholder="auto"') + '<label class="check" style="font-size:12px;margin-top:4px"><input type="checkbox" name="feesAuto"' + (sa.feesAuto !== false ? ' checked' : '') + '> Calcul auto</label>')}
      </div>
      <div class="grid-3">
        ${field('Paiement', '<select name="status">' + Object.entries(REF.saleStatus).map(([k, v]) => opt(k, v, sa.status)).join('') + '</select>')}
        ${field('Encaissé sur', '<select name="accountId">' + accOpts(sa.accountId) + '</select>')}
        ${field('Live', '<select name="liveId"><option value="">— Hors live —</option>' + lives.map(l => opt(l.id, U.date(l.date) + ' · ' + (l.title || 'Live'), sa.liveId)).join('') + '</select>')}
      </div>
      <div class="grid-2">
        <label class="check"><input type="checkbox" name="shipped"${sa.shipped ? ' checked' : ''}> Colis expédié / remis</label>
        ${inp('tracking', sa.tracking, 'placeholder="N° de suivi (optionnel)"')}
      </div>
      <label class="check" data-keep style="display:none"><input type="checkbox" name="keepOut"${sa.keepOut ? ' checked' : ''}> Remboursée sans retour de l’article (l'article reste sorti du stock)</label>
      ${field('Notes', '<textarea name="notes" rows="2">' + esc(sa.notes || '') + '</textarea>')}
      ${placeEl(isNew)}
    `;
    UI.open({
      title: isNew ? 'Nouvelle vente' : 'Modifier la vente', body,
      foot: delBtn(!isNew) + dupBtn(!isNew) + '<div class="sum" data-sum></div><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        const feesI = el.querySelector('[name=fees]'), auto = el.querySelector('[name=feesAuto]');
        wireDup(el, close, 'sales', sa.id);
        wirePlace(el, 'date', sa.id);
        const sum = () => {
          const items = U.sum(sa.lines, l => U.num(l.qty) * U.num(l.unit));
          const shipIn = U.num(val(el, 'shippingCharged'));
          if (auto.checked) { const f = S.feesFor(val(el, 'platformId'), items, shipIn); feesI.value = f ? String(f).replace('.', ',') : ''; }
          const C = S.calc();
          const cogs = U.sum(sa.lines, (l, i) => { const c = l.productId && C.prod[l.productId]; if (!c) return 0; if (!isNew && C.sale[sa.id] && C.sale[sa.id].lineCogs[i] != null && S.get('sales', sa.id).lines[i] && S.get('sales', sa.id).lines[i].productId === l.productId) return C.sale[sa.id].lineCogs[i] / (U.num(S.get('sales', sa.id).lines[i].qty) || 1) * U.num(l.qty); return c.cost * U.num(l.qty); });
          const rev = items + shipIn, net = rev - U.num(feesI.value) - U.num(val(el, 'shippingCost'));
          const profit = net - cogs;
          el.querySelector('[data-sum]').innerHTML = '<span>CA <b>' + U.eur(rev) + '</b></span><span>Net perçu <b>' + U.eur(net) + '</b></span><span>Bénéfice <b class="' + (profit >= 0 ? 'pos' : 'neg') + '">' + U.signed(profit) + '</b>' + (rev ? ' <span class="faint">' + U.pct(profit / rev, 0) + '</span>' : '') + '</span>';
        };
        linesEditor(el, sa.lines, 'sale', sum);
        ['shippingCharged', 'shippingCost'].forEach(n => el.querySelector('[name=' + n + ']').addEventListener('input', sum));
        feesI.addEventListener('input', () => { auto.checked = false; sum(); });
        auto.onchange = sum;
        const st = el.querySelector('[name=status]');
        const keep = el.querySelector('[data-keep]');
        const togKeep = () => keep.style.display = st.value === 'refunded' ? '' : 'none'; togKeep(); st.addEventListener('change', togKeep);
        el.querySelector('[name=platformId]').onchange = e => {
          const p = S.get('platforms', e.target.value);
          if (p && p.accountId) el.querySelector('[name=accountId]').value = p.accountId;
          if (isNew) st.value = e.target.value === 'pf_whatnot' ? 'pending' : 'paid';
          sum();
        };
        sum();
        el.querySelector('[data-save]').onclick = () => {
          const lines = sa.lines.filter(l => l.productId && U.num(l.qty) > 0);
          if (!lines.length) { UI.toast('Ajoute au moins un article'); return; }
          const status = val(el, 'status');
          Object.assign(sa, {
            date: val(el, 'date'), platformId: val(el, 'platformId'), buyer: val(el, 'buyer').trim(),
            lines: lines.map(l => ({ productId: l.productId, qty: U.num(l.qty), unit: U.num(l.unit) })),
            shippingCharged: U.num(val(el, 'shippingCharged')), shippingCost: U.num(val(el, 'shippingCost')), fees: U.num(feesI.value), feesAuto: auto.checked,
            status, accountId: val(el, 'accountId'), liveId: val(el, 'liveId'), shipped: val(el, 'shipped'), tracking: val(el, 'tracking').trim(), notes: val(el, 'notes'),
            keepOut: status === 'refunded' ? val(el, 'keepOut') : false,
            paidAt: status === 'paid' ? (sa.paidAt || (isNew ? val(el, 'date') : U.today())) : null
          });
          S.upsert('sales', sa); applyPlace(el, sa); close();
          const pr = S.calc().sale[sa.id];
          UI.toast(isNew ? 'Vente enregistrée · ' + U.signed(pr.profit) : 'Vente mise à jour');
        };
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => { if (await UI.confirm('Supprimer cette vente ?', { sub: 'Les articles retournent en stock.' })) { close(); withUndo('sales', sa, 'Vente supprimée'); } };
      }
    });
  };

  /* ======================= DÉPENSE ======================= */
  F.expense = (ex, opts = {}) => {
    const isNew = !ex;
    ex = ex ? Object.assign({}, ex) : { date: U.today(), category: opts.sub ? 'Abonnements & logiciels' : REF.expenseCats[0], accountId: S.state.accounts[0].id, amount: '', liveId: opts.liveId || '', months: opts.sub ? 12 : 0 };
    const sub = !!opts.sub || U.num(ex.months) >= 1;          // deux formulaires : dépense ponctuelle / abonnement
    const body = sub ? `
      <div class="grid-2">
        ${field('Montant payé (€)', num('amount', ex.amount, 'autofocus placeholder="0,00" style="font-size:20px"'))}
        ${field('Date de paiement', date('date', ex.date))}
      </div>
      ${field('Abonnement', inp('label', ex.label, 'placeholder="ex. Fnac+, Micromania Ultimate…"'))}
      <div class="grid-2">
        ${field('Durée (mois)', '<input type="number" name="months" inputmode="numeric" min="1" max="120" step="1" value="' + (Math.round(U.num(ex.months)) || 12) + '">', 'dur', 'Ex. 12 pour un an, 24 pour deux ans.')}
        ${field('Payé avec', '<select name="accountId">' + accOpts(ex.accountId) + '</select>')}
      </div>
      <div class="faint sub-note" style="font-size:12.5px;margin-top:-6px"></div>
      ${placeEl(isNew)}
      ${startWarnEl}
      <input type="hidden" name="category" value="Abonnements & logiciels"><input type="hidden" name="liveId" value="">` : `
      <div class="grid-2">
        ${field('Montant (€)', num('amount', ex.amount, 'autofocus placeholder="0,00" style="font-size:20px"'))}
        ${field('Date', date('date', ex.date))}
      </div>
      ${field('Catégorie', '<select name="category">' + REF.expenseCats.map(c => opt(c, c, ex.category)).join('') + '</select>', '', 'Perso = pour toi (repas, courses…) : ça baisse le compte mais pas le bénéfice.')}
      ${field('Libellé', inp('label', ex.label, 'placeholder="ex. 100 enveloppes bulles"'))}
      <div class="grid-2">
        ${field('Payé avec', '<select name="accountId">' + accOpts(ex.accountId) + '</select>')}
        ${field('Lié à un live', '<select name="liveId"><option value="">—</option>' + S.state.lives.slice(-15).reverse().map(l => opt(l.id, U.date(l.date) + ' · ' + (l.title || 'Live'), ex.liveId)).join('') + '</select>')}
      </div>
      ${placeEl(isNew)}
      ${startWarnEl}
      <input type="hidden" name="months" value="0">`;
    UI.open({
      title: isNew ? (sub ? 'Nouvel abonnement' : 'Nouvelle dépense') : (sub ? 'Modifier l’abonnement' : 'Modifier la dépense'), body, size: 'sm',
      foot: delBtn(!isNew) + dupBtn(!isNew) + '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        const note = el.querySelector('.sub-note');
        const upd = () => {
          if (!note) return;
          const m = Math.max(1, Math.round(U.num(val(el, 'months')))), a = U.num(val(el, 'amount')), d = val(el, 'date') || U.today();
          note.innerHTML = 'Jusqu’au <b>' + U.date(S.subUntil({ date: d, months: m })) + '</b>. L’argent sort du compte en une fois, le bilan l’étale à ' + U.eur(a / m) + ' par mois.';
        };
        if (sub) { ['months', 'amount', 'date'].forEach(n => el.querySelector('[name=' + n + ']').addEventListener('input', upd)); upd(); }
        startWarn(el, 'date', 'accountId'); wireDup(el, close, 'expenses', ex.id);
        wirePlace(el, 'date', ex.id);
        el.querySelector('[data-save]').onclick = () => {
          const amount = U.num(val(el, 'amount')); if (!amount) { el.querySelector('[name=amount]').focus(); return; }
          if (sub && !val(el, 'label').trim()) { el.querySelector('[name=label]').focus(); return; }
          Object.assign(ex, { amount, date: val(el, 'date'), category: val(el, 'category'), label: val(el, 'label').trim(), accountId: val(el, 'accountId'), liveId: val(el, 'liveId'), months: sub ? Math.max(1, Math.round(U.num(val(el, 'months')))) : 0 });
          S.upsert('expenses', ex); applyPlace(el, ex); close(); savedToast(sub ? 'Abonnement enregistré' : 'Dépense enregistrée', 'expenses', ex, isNew);
        };
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => { if (await UI.confirm(sub ? 'Supprimer cet abonnement ?' : 'Supprimer cette dépense ?')) { close(); withUndo('expenses', ex, sub ? 'Abonnement supprimé' : 'Dépense supprimée'); } };
      }
    });
  };

  /* ======================= MOUVEMENT DE TRÉSO ======================= */
  F.transfer = (t, opts = {}) => {
    const isNew = !t;
    const accs = S.state.accounts;
    // Retrait d'espèces au distributeur : formulaire réduit (montant, jour, carte), sans les onglets
    const cashOut = !!opts.cashOut || !!(t && t.kind === 'transfer' && t.label === 'Retrait d’espèces' && S.account(t.to).type === 'cash');
    t = t ? Object.assign({}, t) : { kind: opts.kind || 'transfer', date: U.today(), from: opts.from || (accs.find(a => a.type === 'platform') || accs[0]).id, to: opts.to || accs[0].id, amount: '', label: opts.label || '' };
    const body = `
      ${cashOut ? '<p style="margin:0">Tu as retiré des billets avec ta carte. L’argent quitte ton compte et arrive dans tes espèces.</p>' : ''}
      <div class="seg" data-kind style="align-self:flex-start${cashOut ? ';display:none' : ''}">
        <button data-k="transfer">Virement</button><button data-k="income">Rentrée d’argent</button><button data-k="deposit">Apport perso</button><button data-k="withdraw">Retrait perso</button>
      </div>
      <div class="grid-2">
        ${field(cashOut ? 'Combien as-tu retiré ? (€)' : 'Montant (€)', num('amount', t.amount, 'autofocus placeholder="0,00" style="font-size:20px"'))}
        ${field(cashOut ? 'Quel jour ?' : 'Date', date('date', t.date))}
      </div>
      <div class="${cashOut ? '' : 'grid-2'}">
        ${field(cashOut ? 'Avec la carte de quel compte ?' : 'Depuis', '<select name="from">' + (cashOut ? accs.filter(a => a.id !== t.to).map(a => opt(a.id, a.name, t.from)).join('') : accOpts(t.from)) + '</select>', 'f-from')}
        ${field('Vers', '<select name="to">' + accOpts(t.to) + '</select>', 'f-to')}
      </div>
      ${field('Libellé', inp('label', t.label, 'placeholder="optionnel"'), 'f-label')}
      ${cashOut ? '' : '<label class="check f-pend"><input type="checkbox" name="pending"' + (t.pending ? ' checked' : '') + '> Pas encore arrivé sur l’autre compte (virement en route)</label><div class="faint f-pend" style="font-size:12px;margin-top:-6px">L’argent sort du compte de départ tout de suite. Il s’ajoute à l’arrivée quand tu cliques « Reçu » ou que tu décoches la case.</div>'}
      ${isNew && !cashOut ? '<label class="check f-rep"><input type="checkbox" name="repeat"> Répéter tous les mois, le même jour</label><div class="f-repn" style="display:none">' + field('Combien de fois en tout ?', num('repeatN', '', 'placeholder="vide = sans fin"'), '', 'Ex. bourse sur 10 mois : mets 10. Les mois suivants seront ajoutés tout seuls.') + '</div>' : ''}
      ${cashOut ? '<div class="num" data-sum style="padding:12px 14px;border:1px solid var(--line);border-radius:12px;font-size:13.5px"></div>' : ''}
      ${placeEl(isNew)}
      <p class="faint" data-help style="margin:0;font-size:12.5px"></p>
      ${startWarnEl}`;
    UI.open({
      title: cashOut ? (isNew ? 'Retrait d’espèces' : 'Modifier le retrait d’espèces') : isNew ? 'Mouvement de trésorerie' : 'Modifier le mouvement', body, size: 'sm',
      foot: delBtn(!isNew) + dupBtn(!isNew) + '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        const help = { transfer: 'Ex. versement Whatnot → banque, retrait d’espèces à la carte, dépôt d’espèces. N’impacte pas ton bénéfice.', income: 'Argent qui rentre sans passer par une vente : remboursement, cashback, vente hors app, cadeau… Compte dans ton bénéfice.', deposit: 'Argent perso injecté dans l’activité (ex. mise de départ).', withdraw: 'Argent que tu te verses. N’est pas une charge : c’est ta rémunération.' };
        const set = k => {
          t.kind = k;
          el.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === k));
          el.querySelector('.f-from').style.display = k === 'deposit' || k === 'income' ? 'none' : '';
          el.querySelector('.f-to').style.display = k === 'withdraw' || cashOut ? 'none' : '';
          el.querySelectorAll('.f-pend').forEach(x => x.style.display = k === 'transfer' && !cashOut ? '' : 'none');
          if (cashOut) el.querySelector('.f-label').style.display = 'none';
          const lab = el.querySelector('.f-label input'); lab.placeholder = k === 'income' ? 'ex. remboursement Vinted, cashback, vente à un pote' : 'optionnel';
          el.querySelector('[data-help]').textContent = cashOut ? 'Ton argent change juste de poche. Ça ne compte ni comme une dépense ni comme un gain.' : help[k];
          if (el.__startWarn) el.__startWarn();
        };
        if (cashOut) {
          const sum = () => { const v = U.num(val(el, 'amount')); el.querySelector('[data-sum]').textContent = S.account(val(el, 'from')).name + ' : ' + U.signed(-v) + '   ·   ' + S.account(t.to).name + ' : ' + U.signed(v); };
          el.querySelector('[name=amount]').addEventListener('input', sum); el.querySelector('[name=from]').addEventListener('change', sum); sum();
        }
        startWarn(el, 'date', 'to', 'from'); wireDup(el, close, 'transfers', t.id);
        wirePlace(el, 'date', t.id);
        el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => set(b.dataset.k)); set(t.kind);
        el.querySelector('[data-save]').onclick = () => {
          const amount = U.num(val(el, 'amount')); if (!amount) return;
          if (t.kind === 'transfer' && val(el, 'from') === val(el, 'to')) { UI.toast('Choisis deux comptes différents'); return; }
          if (t.kind === 'income' && !val(el, 'label').trim()) { UI.toast('Indique d’où vient cet argent'); el.querySelector('[name=label]').focus(); return; }
          Object.assign(t, { amount, date: val(el, 'date'), from: t.kind === 'deposit' || t.kind === 'income' ? null : val(el, 'from'), to: t.kind === 'withdraw' ? null : val(el, 'to'), label: val(el, 'label').trim() });
          const pend = el.querySelector('[name=pending]'), wasPending = !!t.pending;
          t.pending = t.kind === 'transfer' && !cashOut && !!(pend && pend.checked);
          if (wasPending && !t.pending && !t.receivedAt) t.receivedAt = U.today();   // décoché : l'argent vient d'arriver
          const rep = el.querySelector('[name=repeat]');
          if (rep && rep.checked) {                           // automatisme : les prochains mois se créent tout seuls
            const total = Math.round(U.num(val(el, 'repeatN'))) || null;
            if (total) t.label = (t.label || 'Mouvement répété') + ' (mois 1 sur ' + total + ')';
            S.state.settings.recurring = S.recurring().concat([{ id: U.uid(), kind: t.kind, from: t.from, to: t.to, amount, label: val(el, 'label').trim() || 'Mouvement répété', next: U.addMonths(t.date, 1), n: 1, total, left: total ? total - 1 : null }]);
          }
          S.upsert('transfers', t); applyPlace(el, t); close(); savedToast(cashOut ? 'Retrait d’espèces enregistré' : 'Mouvement enregistré', 'transfers', t, isNew);
        };
        const rep = el.querySelector('[name=repeat]');
        if (rep) rep.onchange = () => { el.querySelector('.f-repn').style.display = rep.checked ? '' : 'none'; };
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => { if (await UI.confirm('Supprimer ce mouvement ?')) { close(); withUndo('transfers', t, 'Mouvement supprimé'); } };
      }
    });
  };

  /* ======================= AJUSTEMENT DE STOCK ======================= */
  F.adjust = (a, opts = {}) => {
    if (a && a.kind === 'exchange') return F.swap(a);
    const isNew = !a;
    a = a ? Object.assign({}, a) : { date: U.today(), kind: opts.kind || '', productId: opts.productId || null, qty: 1, liveId: opts.liveId || '' };
    const p0 = S.product(a.productId), t0 = S.product(a.toProductId);
    const body = `
      ${field('Type de mouvement', '<select name="kind">' + (a.kind ? '' : '<option value="" selected disabled>Choisis le type…</option>') + REF.adjKinds.filter(k => k.id !== 'exchange').map(k => opt(k.id, k.label, a.kind)).join('') + '</select>')}
      ${field('Produit', '<div class="picker"><input type="text" data-pp placeholder="Chercher un produit…" value="' + esc(p0 ? p0.name : '') + '"></div>', '', '<span data-info></span>')}
      <div class="grid-2">
        ${field('Quantité', num('qty', Math.abs(a.qty)), 'f-qty')}
        ${field('Date', date('date', a.date))}
      </div>
      <div class="grid-2 f-corr">
        ${field('Sens', '<select name="dir">' + opt('out', 'Retirer du stock', U.num(a.qty) < 0 || isNew ? 'out' : 'in') + opt('in', 'Ajouter au stock', U.num(a.qty) > 0 && !isNew ? 'in' : 'out') + '</select>')}
        ${field('Coût unitaire (si ajout)', num('unitCost', a.unitCost, 'placeholder="coût actuel"'))}
      </div>
      <div class="f-tr">
        ${field('Transformé en', '<div class="picker"><input type="text" data-pt placeholder="ex. Booster Évolutions Prismatiques" value="' + esc(t0 ? t0.name : '') + '"></div>')}
        <div class="grid-2" style="margin-top:12px">${field('Quantité obtenue', num('toQty', a.toQty || ''))}<div class="field"><span>Coût unitaire obtenu</span><div class="input mono" data-tcost style="background:transparent">—</div></div></div>
      </div>
      ${field('Live associé', '<select name="liveId"><option value="">—</option>' + S.state.lives.slice(-15).reverse().map(l => opt(l.id, U.date(l.date) + ' · ' + (l.title || 'Live'), a.liveId)).join('') + '</select>', 'f-live')}
      ${field('Note', inp('notes', a.notes, 'placeholder="optionnel"'))}`;
    UI.open({
      title: isNew ? 'Mouvement de stock' : 'Modifier le mouvement de stock', body, size: 'sm',
      foot: delBtn(!isNew) + '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        const kind = el.querySelector('[name=kind]');
        const info = () => {
          const c = a.productId && S.calc().prod[a.productId];
          el.querySelector('[data-info]').textContent = c ? 'En stock : ' + U.n(c.qty) + ' · coût ' + U.eur(c.cost) : '';
          const tq = U.num(val(el, 'toQty')), q = U.num(val(el, 'qty'));
          el.querySelector('[data-tcost]').textContent = c && tq ? U.eur(c.cost * q / tq) : '—';
        };
        const tog = () => {
          const k = kind.value;
          el.querySelector('.f-corr').style.display = k === 'correction' ? '' : 'none';
          el.querySelector('.f-tr').style.display = k === 'transform' ? '' : 'none';
          el.querySelector('.f-live').style.display = ['giveaway', 'opened'].includes(k) ? '' : 'none';
        };
        kind.onchange = tog; tog();
        UI.productPicker(el.querySelector('[data-pp]'), { onPick: p => { a.productId = p.id; info(); } });
        UI.productPicker(el.querySelector('[data-pt]'), { onPick: p => { a.toProductId = p.id; info(); } });
        ['qty', 'toQty'].forEach(n => el.querySelector('[name=' + n + ']').addEventListener('input', info));
        info();
        el.querySelector('[data-save]').onclick = () => {
          if (!kind.value) { UI.toast('Choisis le type de mouvement'); kind.focus(); return; }
          if (!a.productId) { UI.toast('Choisis un produit'); return; }
          const k = kind.value, q = Math.abs(U.num(val(el, 'qty')));
          if (!q) return;
          if (k === 'transform' && (!a.toProductId || !U.num(val(el, 'toQty')))) { UI.toast('Indique le produit obtenu et la quantité'); return; }
          const dir = k === 'correction' && val(el, 'dir') === 'in' ? 1 : -1;
          Object.assign(a, { kind: k, qty: dir * q, date: val(el, 'date'), notes: val(el, 'notes'), liveId: val(el, 'liveId'), toQty: k === 'transform' ? U.num(val(el, 'toQty')) : '', toProductId: k === 'transform' ? a.toProductId : null, unitCost: k === 'correction' && dir > 0 && val(el, 'unitCost') !== '' ? U.num(val(el, 'unitCost')) : '' });
          S.upsert('adjustments', a); close(); UI.toast('Stock mis à jour');
        };
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => { if (await UI.confirm('Supprimer ce mouvement ?')) { close(); withUndo('adjustments', a, 'Mouvement supprimé'); } };
      }
    });
  };

  /* ======================= ÉCHANGE (produit contre produit, sans argent) ======================= */
  F.swap = (a, opts = {}) => {
    const isNew = !a;
    a = a ? Object.assign({}, a) : { date: U.today(), kind: 'exchange', productId: opts.productId || null, toProductId: null, qty: -1, toQty: 1, liveId: '' };
    const p0 = S.product(a.productId), t0 = S.product(a.toProductId);
    const row = (lab, pick, name, v, ph, p) => '<div style="display:grid;grid-template-columns:minmax(0,1fr) 84px;gap:10px;align-items:start">'
      + field(lab, '<div class="picker"><input type="text" ' + pick + ' placeholder="' + ph + '" value="' + esc(p ? p.name : '') + '"></div>', '', '<span data-i' + name + '></span>')
      + field('Quantité', num(name, v)) + '</div>';
    const body = `
      ${row('Je donne', 'data-pp', 'qty', Math.abs(U.num(a.qty)) || 1, 'Chercher dans ton stock…', p0)}
      ${row('Je reçois', 'data-pt', 'toQty', U.num(a.toQty) || 1, 'Chercher ou créer un produit…', t0)}
      ${field('Date de l’échange', date('date', a.date))}
      ${field('Note', inp('notes', a.notes, 'placeholder="ex. échange avec un pote, salon…"'))}
      <p class="swap-note" style="margin:0;font-size:12.5px;color:var(--text-2, inherit);opacity:.8"></p>`;
    UI.open({
      title: isNew ? 'Nouvel échange' : 'Modifier l’échange', body, size: 'sm',
      foot: delBtn(!isNew) + '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        const info = () => {
          const C = S.calc(), c = a.productId && C.prod[a.productId], t = a.toProductId && C.prod[a.toProductId];
          const q = Math.abs(U.num(val(el, 'qty'))), tq = Math.abs(U.num(val(el, 'toQty')));
          el.querySelector('[data-iqty]').textContent = c ? 'En stock : ' + U.n(c.qty) + ' · coût ' + U.eur(c.cost) : '';
          el.querySelector('[data-itoQty]').textContent = t ? 'En stock : ' + U.n(t.qty) : '';
          const unit = c ? (!isNew && C.adj[a.id] ? C.adj[a.id].unit : c.cost) : 0;
          const n = el.querySelector('.swap-note');
          const low = isNew && c && q > c.qty;
          n.style.color = low ? 'var(--warn)' : '';
          n.innerHTML = low ? '⚠︎ Tu n’en as que <b>' + U.n(c.qty) + '</b> en stock.'
            : 'Aucun argent ne bouge et ton bénéfice ne change pas.' + (c && tq ? ' Ce que tu reçois entre en stock à <b>' + U.eur(unit * q / tq) + '</b> pièce : la valeur de ce que tu donnes.' : '');
        };
        UI.productPicker(el.querySelector('[data-pp]'), { allowCreate: false, onPick: p => { a.productId = p.id; info(); } });
        UI.productPicker(el.querySelector('[data-pt]'), { onPick: p => { a.toProductId = p.id; info(); } });
        ['qty', 'toQty'].forEach(n => el.querySelector('[name=' + n + ']').addEventListener('input', info));
        info();
        el.querySelector('[data-save]').onclick = () => {
          const q = Math.abs(U.num(val(el, 'qty'))), tq = Math.abs(U.num(val(el, 'toQty')));
          if (!a.productId) { UI.toast('Choisis le produit que tu donnes'); return; }
          if (!a.toProductId) { UI.toast('Choisis le produit que tu reçois'); return; }
          if (a.productId === a.toProductId) { UI.toast('Les deux produits doivent être différents'); return; }
          if (!q || !tq) { UI.toast('Indique les deux quantités'); return; }
          Object.assign(a, { kind: 'exchange', qty: -q, toQty: tq, date: val(el, 'date'), notes: val(el, 'notes'), liveId: '', unitCost: '' });
          S.upsert('adjustments', a); close(); UI.toast('Échange enregistré · stock mis à jour');
        };
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => { if (await UI.confirm('Supprimer cet échange ?')) { close(); withUndo('adjustments', a, 'Échange supprimé'); } };
      }
    });
  };

  /* ======================= LIVE ======================= */
  F.live = (l, opts = {}) => {
    const isNew = !l;
    l = l ? Object.assign({}, l) : { date: U.today(), platformId: 'pf_whatnot', title: '', pins: [] };
    const body = `
      ${field('Titre du live', inp('title', l.title, 'autofocus placeholder="ex. Mardi Display Night"'))}
      <div class="grid-2">
        ${field('Date', date('date', l.date))}
        ${field('Plateforme', '<select name="platformId">' + S.state.platforms.map(p => opt(p.id, p.name, l.platformId)).join('') + '</select>')}
      </div>
      <div class="grid-2">
        ${field('Début', '<input type="time" name="start" value="' + esc(l.start || '') + '">')}
        ${field('Fin', '<input type="time" name="end" value="' + esc(l.end || '') + '">')}
      </div>
      ${field('Notes', '<textarea name="notes" rows="2" placeholder="Viewers max, remarques…">' + esc(l.notes || '') + '</textarea>')}`;
    UI.open({
      title: isNew ? 'Nouveau live' : 'Modifier le live', body, size: 'sm',
      foot: delBtn(!isNew) + '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        el.querySelector('[data-save]').onclick = () => {
          Object.assign(l, { title: val(el, 'title').trim() || 'Live du ' + U.date(val(el, 'date')), date: val(el, 'date'), platformId: val(el, 'platformId'), start: val(el, 'start'), end: val(el, 'end'), notes: val(el, 'notes') });
          S.upsert('lives', l); close(); UI.toast('Live enregistré');
        };
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => {
          if (!(await UI.confirm('Supprimer ce live ?', { sub: 'Les ventes restent enregistrées mais ne seront plus rattachées à ce live.' }))) return;
          S.state.sales.forEach(s => { if (s.liveId === l.id) s.liveId = ''; });
          close(); S.remove('lives', l.id); UI.toast('Live supprimé');
        };
      }
    });
  };

  /* ======================= LIVE : récap des articles vendus ======================= */
  F.liveRecap = (l0, opts = {}) => {
    const isNew = !l0;
    const l = l0 ? Object.assign({}, l0) : { date: U.today(), platformId: 'pf_whatnot', title: '' };
    const picked = [];                                   // { productId, qty, unit }
    let q = '';
    let mode = 'total', net = null;                      // total : un seul montant pour tout le live · net : null tant que non précisé
    try { mode = localStorage.getItem('holo.liveMode') === 'unit' ? 'unit' : 'total'; const n = localStorage.getItem('holo.liveNet'); net = n === '1' ? true : n === '0' ? false : null; } catch (e) {}
    const keep = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    // Poids de chaque article pour répartir le total : son coût, sinon son prix marché/cible, sinon la moyenne des autres
    const weights = () => {
      const C = S.calc();
      const ls = picked.filter(x => U.num(x.qty) > 0).map(x => { const p = S.product(x.productId) || {}; return { productId: x.productId, qty: Math.round(U.num(x.qty)), w: C.prod[x.productId].cost || U.num(p.market) || U.num(p.target) || 0 }; });
      const known = ls.filter(l => l.w > 0), avg = known.length ? U.sum(known, l => l.w) / known.length : 1;
      ls.forEach(l => { if (!(l.w > 0)) l.w = avg; });
      return { ls, W: U.sum(ls, l => l.w * l.qty) };
    };
    // Répartit le total au centime près : la somme des lignes retombe exactement sur le total
    const alloc = total => {
      const { ls, W } = weights(), cents = Math.round(total * 100);
      let rest = cents;
      ls.forEach(l => { l.u = W > 0 ? Math.floor(cents * l.w / W) : 0; rest -= l.u * l.qty; });
      const out = [];
      ls.forEach(l => {
        const k = Math.max(0, Math.min(rest, l.qty)); rest -= k;
        if (k > 0) out.push({ productId: l.productId, qty: k, unit: (l.u + 1) / 100 });
        if (l.qty - k > 0) out.push({ productId: l.productId, qty: l.qty - k, unit: l.u / 100 });
      });
      return out;
    };
    const C0 = S.calc();
    const pool = () => S.state.products.filter(p => !p.archived && !REF.isSupply(p.type) && C0.prod[p.id].qty > 0)
      .filter(p => !q || UI.score(p, U.norm(q)) > 0)
      .sort((a, b) => (C0.prod[b.id].lastIn || '') > (C0.prod[a.id].lastIn || '') ? 1 : -1);
    const left = id => C0.prod[id].qty - U.sum(picked.filter(x => x.productId === id), x => U.num(x.qty));
    const body = `
      <div class="grid-3">
        ${field('Titre du live', inp('title', l.title, 'placeholder="ex. Mardi Display Night"'))}
        ${field('Date', date('date', l.date))}
        ${field('Plateforme', '<select name="platformId">' + S.state.platforms.map(p => opt(p.id, p.name, l.platformId)).join('') + '</select>')}
      </div>
      <div class="seg" data-mode style="align-self:flex-start">
        <button type="button" data-m="total">Un total pour tout le live</button><button type="button" data-m="unit">Un prix par article</button>
      </div>
      <div class="lr">
        <div class="lr-col">
          <div class="label" data-qlab>Qu’est-ce que tu as vendu ?</div>
          <label class="input-search">${icon('search')}<input type="search" data-lq placeholder="Chercher dans ton stock…"></label>
          <div class="lr-pool" data-pool></div>
        </div>
        <div class="lr-col">
          <div class="label">Vendu pendant ce live <span class="faint" data-cnt></span></div>
          <div class="lr-sel" data-sel></div>
        </div>
      </div>
      <div class="card card-pad" data-tot style="display:flex;flex-direction:column;gap:12px">
        <div class="grid-2">
          ${field('Total du live', num('total', '', 'placeholder="ex. 450"'))}
          ${field('Ce montant, c’est', '<div class="seg" data-net style="flex-wrap:wrap"><button type="button" data-n="0">Le total des ventes</button><button type="button" data-n="1">Ce que je touche, frais déduits</button></div>')}
        </div>
        <p class="tot-note" style="margin:0;font-size:12.5px;color:var(--tx-2)"></p>
      </div>
      <div class="grid-2">
        <label class="check"><input type="checkbox" name="paid"> Paiement déjà reçu</label>
        <label class="check"><input type="checkbox" name="shipped"> Colis déjà expédiés</label>
      </div>
      ${isNew ? field('Notes', '<textarea name="notes" rows="2" placeholder="Viewers, remarques…">' + esc(l.notes || '') + '</textarea>') : ''}`;
    UI.open({
      title: isNew ? 'Nouveau live' : 'Ajouter des ventes · ' + esc(l.title || 'Live'), body,
      foot: '<div class="sum" data-sum></div><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" data-save>' + icon('check') + 'Enregistrer</button>',
      onMount(el, close) {
        const poolEl = el.querySelector('[data-pool]'), selEl = el.querySelector('[data-sel]');
        const pfSel = el.querySelector('[name=platformId]');
        const renderPool = () => {
          const list = pool().slice(0, 60);
          poolEl.innerHTML = list.length ? list.map(p => { const n = left(p.id); return '<button type="button" class="lr-tile' + (n <= 0 ? ' off' : '') + '" data-add="' + p.id + '"' + (n <= 0 ? ' disabled' : '') + '>' + UI.mini(p) + '<span class="lr-n">' + esc(p.name) + '<small>' + esc([REF.type(p.type).label, p.set].filter(Boolean).join(' · ')) + '</small></span><span class="lr-q">×' + U.n(n) + '</span></button>'; }).join('')
            : '<div class="faint" style="padding:18px;text-align:center;font-size:13px">' + (q ? 'Rien ne correspond.' : 'Aucun article en stock.') + '</div>';
        };
        const total = () => U.num(val(el, 'total'));
        const sum = () => {
          const C = S.calc(), T = mode === 'total';
          const items = T ? total() : U.sum(picked, x => U.num(x.qty) * U.num(x.unit));
          const cogs = U.sum(picked, x => C.prod[x.productId].cost * U.num(x.qty));
          const fees = T ? (net ? 0 : S.feesFor(pfSel.value, items, 0)) : U.sum(picked, x => S.feesFor(pfSel.value, U.num(x.qty) * U.num(x.unit), 0));
          const prof = items - fees - cogs;
          el.querySelector('[data-cnt]').textContent = picked.length ? '· ' + U.n(U.sum(picked, x => U.num(x.qty))) + ' art.' : '';
          el.querySelector('[data-sum]').innerHTML = picked.length ? '<span>' + (T && net ? 'Reçu' : 'CA') + ' <b>' + U.eur(items) + '</b></span>' + (T && net ? '' : '<span>Frais <b>' + U.eur(fees) + '</b></span>') + '<span>Coût du stock <b>' + U.eur(cogs) + '</b></span><span>Bénéfice <b class="' + (prof >= 0 ? 'pos' : 'neg') + '">' + U.signed(prof) + '</b></span>' : '';
          if (T) {
            const pf = S.get('platforms', pfSel.value) || {};
            el.querySelector('.tot-note').innerHTML = 'Pas besoin de prix par article : le total est réparti tout seul sur ce que tu as sorti du stock.'
              + (net === false && items > 0 ? ' Frais ' + esc(pf.name || '') + ' estimés à <b>' + U.eur(fees) + '</b>. Pour un chiffre exact, entre plutôt ce que tu touches vraiment.' : '')
              + (net === true ? ' Aucun frais n’est ajouté : ce montant arrive tel quel sur ton compte.' : '');
          }
        };
        const drawMode = () => {
          const T = mode === 'total';
          el.querySelectorAll('[data-mode] button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
          el.querySelectorAll('[data-net] button').forEach(b => b.classList.toggle('on', net != null && b.dataset.n === (net ? '1' : '0')));
          el.querySelector('[data-tot]').style.display = T ? 'flex' : 'none';
          el.querySelector('[data-qlab]').textContent = T ? 'Qu’est-ce qui est sorti du stock ?' : 'Qu’est-ce que tu as vendu ?';
        };
        const renderSel = () => {
          const sh = mode === 'total' ? weights() : null;
          selEl.innerHTML = picked.length ? picked.map((x, i) => { const p = S.product(x.productId); return '<div class="lr-line" data-i="' + i + '">' + UI.mini(p) + '<span class="lr-n">' + esc(p.name) + '</span>'
            + '<div class="stepper"><button type="button" data-d="-1" aria-label="Moins">−</button><b>' + U.n(x.qty) + '</b><button type="button" data-d="1" aria-label="Plus"' + (left(x.productId) <= 0 ? ' disabled' : '') + '>+</button></div>'
            + (mode === 'total'
              ? '<div class="lr-price" style="text-align:right;font-size:12px;color:var(--tx-3);font-family:var(--f-mono)">' + (sh.W > 0 && total() > 0 ? '≈ ' + U.eur(total() * (sh.ls.find(l => l.productId === x.productId) || { w: 0 }).w / sh.W) + '/u' : '') + '</div>'
              : '<label class="lr-price"><input type="text" inputmode="decimal" data-u placeholder="Prix" value="' + (x.unit === '' ? '' : esc(String(x.unit).replace('.', ','))) + '"><span>€/u</span></label>') + '</div>'; }).join('')
            : '<div class="lr-empty">Touche un article à gauche pour l’ajouter.<br><span class="faint">' + (mode === 'total' ? 'Tu règles ensuite la quantité, puis tu entres le total du live en dessous.' : 'Tu règles ensuite la quantité et le prix de vente.') + '</span></div>';
          sum();
        };
        poolEl.onclick = e => {
          const b = e.target.closest('[data-add]'); if (!b) return;
          const id = b.dataset.add, p = S.product(id);
          if (left(id) <= 0) return;
          const ex = picked.find(x => x.productId === id);
          if (ex) ex.qty++; else picked.push({ productId: id, qty: 1, unit: U.num(p.target) || U.num(p.market) || '' });
          renderPool(); renderSel();
          const row = selEl.querySelector('[data-i="' + picked.findIndex(x => x.productId === id) + '"]');
          if (row) { row.classList.add('pop'); const u = row.querySelector('[data-u]'); if (u && !u.value && window.innerWidth > 860) u.focus(); }
        };
        selEl.onclick = e => {
          const b = e.target.closest('[data-d]'); if (!b) return;
          const i = +b.closest('[data-i]').dataset.i, x = picked[i];
          x.qty += +b.dataset.d;
          if (x.qty <= 0) picked.splice(i, 1);
          renderPool(); renderSel();
        };
        selEl.oninput = e => { if (!e.target.matches('[data-u]')) return; picked[+e.target.closest('[data-i]').dataset.i].unit = U.num(e.target.value); sum(); };
        el.querySelector('[data-lq]').oninput = e => { q = e.target.value.trim(); renderPool(); };
        pfSel.onchange = sum;
        el.querySelector('[data-mode]').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; mode = b.dataset.m; keep('holo.liveMode', mode); drawMode(); renderSel(); };
        el.querySelector('[data-net]').onclick = e => { const b = e.target.closest('[data-n]'); if (!b) return; net = b.dataset.n === '1'; keep('holo.liveNet', net ? '1' : '0'); drawMode(); sum(); };
        el.querySelector('[name=total]').addEventListener('input', renderSel);
        drawMode(); renderPool(); renderSel();
        el.querySelector('[data-save]').onclick = async () => {
          const lines = picked.filter(x => U.num(x.qty) > 0);
          if (isNew && !lines.length && !val(el, 'title').trim()) { UI.toast('Sélectionne au moins un article vendu'); return; }
          const T = mode === 'total', tot = total();
          if (T && lines.length) {
            if (!(tot > 0)) { UI.toast('Indique le total du live'); el.querySelector('[name=total]').focus(); return; }
            if (net == null) { UI.toast('Précise si ce total est avant ou après les frais'); return; }
          }
          if (T && !lines.length && tot > 0) { UI.toast('Sélectionne ce qui est sorti du stock'); return; }
          if (!T && lines.some(x => !U.num(x.unit)) && !(await UI.confirm('Certains articles n’ont pas de prix', { sub: 'Ils seront enregistrés à 0 €. Tu pourras corriger chaque vente ensuite.', ok: 'Enregistrer quand même', danger: false }))) return;
          const pf = val(el, 'platformId'), d = val(el, 'date'), paid = val(el, 'paid'), shipped = val(el, 'shipped');
          Object.assign(l, { title: val(el, 'title').trim() || 'Live du ' + U.date(d), date: d, platformId: pf });
          if (isNew) l.notes = val(el, 'notes');
          const acc = (S.get('platforms', pf) || {}).accountId || S.state.accounts[0].id;
          if (!l.id) l.id = U.uid();
          if (!l.createdAt) l.createdAt = Date.now();
          const i0 = S.state.lives.findIndex(x => x.id === l.id); if (i0 >= 0) S.state.lives[i0] = l; else S.state.lives.push(l);
          const now = Date.now();
          if (T && lines.length) {                           // une seule vente pour tout le live, total réparti sur les articles
            S.state.sales.push({ id: U.uid(), createdAt: now, date: d, platformId: pf, buyer: '', lines: alloc(tot),
              shippingCharged: 0, shippingCost: 0, fees: net ? 0 : S.feesFor(pf, tot, 0), feesAuto: !net, status: paid ? 'paid' : (pf === 'pf_whatnot' ? 'pending' : 'paid'),
              accountId: acc, liveId: l.id, shipped, tracking: '', notes: 'Total du live réparti sur les articles', liveTotal: true, keepOut: false, paidAt: paid || pf !== 'pf_whatnot' ? d : null });
          } else lines.forEach((x, k) => {
            const items = U.num(x.qty) * U.num(x.unit);
            S.state.sales.push({ id: U.uid(), createdAt: now + k, date: d, platformId: pf, buyer: '', lines: [{ productId: x.productId, qty: U.num(x.qty), unit: U.num(x.unit) }],
              shippingCharged: 0, shippingCost: 0, fees: S.feesFor(pf, items, 0), feesAuto: true, status: paid ? 'paid' : (pf === 'pf_whatnot' ? 'pending' : 'paid'),
              accountId: acc, liveId: l.id, shipped, tracking: '', notes: '', keepOut: false, paidAt: paid || pf !== 'pf_whatnot' ? d : null });
          });
          S.commit(); close();
          UI.toast(lines.length ? U.n(U.sum(lines, x => U.num(x.qty))) + ' article' + (U.sum(lines, x => U.num(x.qty)) > 1 ? 's' : '') + ' vendu' + (U.sum(lines, x => U.num(x.qty)) > 1 ? 's' : '') + ' ajouté' + (U.sum(lines, x => U.num(x.qty)) > 1 ? 's' : '') + ' au live' : 'Live enregistré');
          if (opts.after) opts.after(l.id);
        };
      }
    });
  };

  /* ======================= RÉGLAGES : compte / plateforme / fournisseur ======================= */
  F.account = (a) => {
    const isNew = !a;
    a = a ? Object.assign({}, a) : { name: '', type: 'bank', color: '#6aa9ff', initial: 0 };
    UI.open({
      title: isNew ? 'Nouveau compte' : 'Modifier le compte', size: 'sm',
      body: field('Nom', inp('name', a.name, 'autofocus placeholder="ex. Qonto, Revolut, Lydia…"'))
        + '<div class="grid-2">' + field('Type', '<select name="type">' + [['bank', 'Banque'], ['wallet', 'Portefeuille (PayPal…)'], ['platform', 'Solde plateforme'], ['cash', 'Espèces']].map(([k, v]) => opt(k, v, a.type)).join('') + '</select>')
        + field('Couleur', '<input type="color" name="color" value="' + esc(a.color) + '" style="height:44px;padding:4px;width:100%;border-radius:12px;border:1px solid var(--line-2);background:var(--bg-2)">') + '</div>'
        + field('Logo', '<div class="logo-pick">' + REF.logos.map(([k, v]) => '<label title="' + v + '"><input type="radio" name="logo" value="' + k + '"' + (REF.accLogo(a) === k ? ' checked' : '') + '><img src="img/brands/' + k + '.png?v=4" alt="' + v + '"></label>').join('') + '</div>')
        + '<div class="grid-2">' + field('Solde de départ (€)', num('initial', a.initial), '', 'Ce que le compte affiche à la date ci-contre.')
        + field('À la date du', '<input type="date" name="initialAt" value="' + esc(a.initialAt || U.today()) + '">', '', 'Les achats, ventes et dépenses datés avant ne comptent pas : ce solde les contient déjà.') + '</div>'
        + (isNew ? '' : '<div class="card card-pad" style="background:var(--bg-2)"><div style="font-weight:600;margin-bottom:8px">Recaler sur le vrai solde</div>' + field('Solde réel aujourd’hui (€)', num('real', '', 'placeholder="ce que ' + esc(a.name) + ' affiche maintenant"'), '', 'Tape le solde exact de ton appli bancaire : HOLO recalcule le solde de départ pour tomber pile dessus, en tenant compte des mouvements déjà saisis.') + '<div class="faint real-note" style="font-size:12.5px" hidden></div></div>'),
      foot: delBtn(!isNew) + '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        const realEl = el.querySelector('[name=real]'), note = el.querySelector('.real-note');
        const recal = () => { const r = val(el, 'real'); if (r === '' || r == null) return null; return U.num(r) - S.movementsSince(a.id, val(el, 'initialAt') || ''); };
        const updNote = () => { const v = recal(); note.hidden = v == null; if (v != null) note.innerHTML = 'Le solde de départ passera à <b>' + U.eur(v) + '</b> au ' + U.date(val(el, 'initialAt') || U.today()) + ' pour afficher ' + U.eur(U.num(val(el, 'real'))) + ' aujourd’hui.'; };
        if (realEl) { realEl.addEventListener('input', updNote); el.querySelector('[name=initialAt]').addEventListener('change', updNote); }
        el.querySelector('[data-save]').onclick = () => {
          if (!val(el, 'name').trim()) return;
          const rc = realEl ? recal() : null;
          Object.assign(a, { name: val(el, 'name').trim(), type: val(el, 'type'), color: val(el, 'color'), initial: rc != null ? Math.round(rc * 100) / 100 : U.num(val(el, 'initial')), initialAt: val(el, 'initialAt') || '', logo: (el.querySelector('[name=logo]:checked') || {}).value || '' });
          S.upsert('accounts', a); close(); UI.toast(rc != null ? 'Solde recalé sur ' + U.eur(U.num(val(el, 'real'))) : 'Compte enregistré');
        };
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => {
          const used = ['sales', 'purchases', 'expenses'].some(c => S.state[c].some(x => x.accountId === a.id)) || S.state.transfers.some(t => t.from === a.id || t.to === a.id);
          if (used) { UI.toast('Compte utilisé par des opérations'); return; }
          if (S.state.accounts.length <= 1) return;
          if (await UI.confirm('Supprimer ce compte ?')) { close(); S.remove('accounts', a.id); }
        };
      }
    });
  };

  F.platform = (p) => {
    const isNew = !p;
    p = p ? Object.assign({}, p) : { name: '', color: '#8fd3ff', commPct: 0, commFixed: 0, payPct: 0, payFixed: 0, accountId: S.state.accounts[0].id };
    UI.open({
      title: isNew ? 'Nouvelle plateforme' : p.name, size: 'sm',
      body: '<div class="grid-2">' + field('Nom', inp('name', p.name, 'autofocus')) + field('Couleur', '<input type="color" name="color" value="' + esc(p.color) + '" style="height:44px;padding:4px;width:100%;border-radius:12px;border:1px solid var(--line-2);background:var(--bg-2)">') + '</div>'
        + '<div class="grid-2">' + field('Commission (%)', num('commPct', p.commPct), '', 'Sur le prix des articles') + field('Commission fixe (€)', num('commFixed', p.commFixed), '', 'Par commande') + '</div>'
        + '<div class="grid-2">' + field('Frais de paiement (%)', num('payPct', p.payPct), '', 'Sur articles + port') + field('Frais de paiement fixe (€)', num('payFixed', p.payFixed), '', 'Par commande') + '</div>'
        + field('Compte d’encaissement par défaut', '<select name="accountId">' + accOpts(p.accountId) + '</select>')
        + '<p class="faint" style="margin:0;font-size:12px">Vérifie régulièrement les barèmes officiels : ils changent. Tu peux toujours corriger les frais vente par vente.</p>',
      foot: delBtn(!isNew) + '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        el.querySelector('[data-save]').onclick = () => {
          if (!val(el, 'name').trim()) return;
          Object.assign(p, { name: val(el, 'name').trim(), color: val(el, 'color'), commPct: U.num(val(el, 'commPct')), commFixed: U.num(val(el, 'commFixed')), payPct: U.num(val(el, 'payPct')), payFixed: U.num(val(el, 'payFixed')), accountId: val(el, 'accountId') });
          S.upsert('platforms', p); close(); UI.toast('Plateforme enregistrée');
        };
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => {
          if (S.state.sales.some(s => s.platformId === p.id)) { UI.toast('Plateforme utilisée par des ventes'); return; }
          if (await UI.confirm('Supprimer cette plateforme ?')) { close(); S.remove('platforms', p.id); }
        };
      }
    });
  };

  F.supplier = (s, cb) => {
    const isNew = !s;
    s = s ? Object.assign({}, s) : { name: '', channel: 'instore' };
    UI.open({
      title: isNew ? 'Nouveau fournisseur' : 'Modifier le fournisseur', size: 'sm',
      body: field('Nom', inp('name', s.name, 'autofocus placeholder="ex. Leclerc Rouen, grossiste X…"'))
        + field('Canal', '<select name="channel">' + opt('instore', 'En magasin', s.channel) + opt('online', 'En ligne', s.channel) + '</select>'),
      foot: delBtn(!isNew) + '<span style="flex:1"></span><button class="btn btn-ghost" data-close>Annuler</button>' + saveBtn(),
      onMount(el, close) {
        el.querySelector('[data-save]').onclick = () => {
          if (!val(el, 'name').trim()) return;
          Object.assign(s, { name: val(el, 'name').trim(), channel: val(el, 'channel') });
          S.upsert('suppliers', s); close(); UI.toast('Fournisseur enregistré'); cb && cb(s);
        };
        const d = el.querySelector('[data-del]');
        if (d) d.onclick = async () => {
          if (S.state.purchases.some(p => p.supplierId === s.id)) { UI.toast('Fournisseur utilisé par des achats'); return; }
          if (await UI.confirm('Supprimer ce fournisseur ?')) { close(); S.remove('suppliers', s.id); }
        };
      }
    });
  };

  window.Forms = F;
})();
