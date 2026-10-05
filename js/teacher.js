/* teacher.js — verrouillage du mode enseignant par code PIN (6 chiffres) + journal des tentatives.
   Protection « de salle de classe » : le PIN est stocké (haché + sel) dans le navigateur ; ce n'est pas une sécurité cryptographique. */
(function (NS) {
  'use strict';
  const K = 'electrolab.teacher';
  const mem = {};
  const ld = () => { try { const s = localStorage.getItem(K); if (s) return JSON.parse(s); } catch (e) {} return mem.d || { pin: null, log: [], fails: 0, until: 0 }; };
  const sv = d => { mem.d = d; try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) {} };
  function hash(pin, salt) { // 2 × 53 bits, itéré (pas de crypto.subtle en file://)
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57; const s = salt + ':' + pin;
    for (let r = 0; r < 20000; r++) for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i) + r; h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); h1 ^= h2 >>> 15; h2 ^= h1 >>> 13; }
    return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }
  const stamp = () => new Date().toLocaleString('fr-FR');
  function log(d, kind, txt) { d.log.push({ t: stamp(), k: kind, x: txt || '' }); if (d.log.length > 500) d.log.shift(); }
  const T = NS.Teacher = {
    hasPin: () => !!ld().pin,
    log: () => ld().log.slice(),
    failCount: () => ld().log.filter(e => e.k === 'echec').length,
    wait() { const d = ld(); return Math.max(0, Math.ceil((d.until - Date.now()) / 1000)); },
    setPin(pin) { if (!/^\d{6}$/.test(pin)) return false; const d = ld(), salt = Math.random().toString(36).slice(2); d.pin = { salt, h: hash(pin, salt) }; d.fails = 0; d.until = 0; log(d, 'info', 'PIN défini / modifié'); sv(d); return true; },
    removePin() { const d = ld(); d.pin = null; d.fails = 0; d.until = 0; log(d, 'info', 'PIN supprimé'); sv(d); },
    clearLog() { const d = ld(); d.log = []; sv(d); },
    note(txt) { const d = ld(); log(d, 'info', txt); sv(d); },
    /** → {ok, wait?, msg} ; chaque essai est journalisé */
    check(pin) {
      const d = ld(); if (!d.pin) return { ok: true };
      const w = Math.max(0, Math.ceil((d.until - Date.now()) / 1000));
      if (w > 0) { log(d, 'bloque', 'tentative pendant le blocage'); sv(d); return { ok: false, wait: w, msg: 'Trop d\'essais : patientez ' + w + ' s.' }; }
      if (hash(pin, d.pin.salt) === d.pin.h) { d.fails = 0; log(d, 'succes', 'mode enseignant déverrouillé'); sv(d); return { ok: true }; }
      d.fails++; log(d, 'echec', 'code erroné (' + pin.length + ' car.) — essai n°' + d.fails);
      if (d.fails >= 3) { const s = Math.min(3600, 15 * Math.pow(2, d.fails - 3)); d.until = Date.now() + s * 1000; sv(d); return { ok: false, wait: s, msg: 'Code erroné. Blocage ' + s + ' s.' }; }
      sv(d); return { ok: false, msg: 'Code erroné (' + d.fails + '/3 avant blocage). Tentative enregistrée.' };
    },
  };

  // ---- interface ----
  const el = (tag, attrs, ...kids) => { const e = document.createElement(tag); for (const k in attrs || {}) { if (k === 'style') e.style.cssText = attrs[k]; else if (k.startsWith('on')) e[k] = attrs[k]; else e.setAttribute(k, attrs[k]); } kids.flat().forEach(c => e.append(c)); return e; };
  function modal(title, body, onClose) {
    const ov = el('div', { class: 'pinmodal' }); const box = el('div', { class: 'pinbox', role: 'dialog', 'aria-label': title }, el('h3', {}, title), body);
    const close = () => { ov.remove(); onClose && onClose(); }; box.append(el('div', { class: 'pinbtns' }, el('button', { onclick: close }, 'Fermer')));
    ov.append(box); ov.addEventListener('mousedown', e => { if (e.target === ov) close(); }); document.body.append(ov); return { ov, close };
  }
  function pinField(ph) { return el('input', { type: 'password', inputmode: 'numeric', maxlength: '6', pattern: '\\d{6}', placeholder: ph || '• • • • • •', autocomplete: 'off', class: 'pinin' }); }
  /** demande le PIN ; cb(true) si OK */
  T.ask = function (cb) {
    if (!T.hasPin()) return cb(true);
    const inp = pinField(), msg = el('div', { class: 'pinmsg' }, T.wait() ? 'Blocage en cours : ' + T.wait() + ' s.' : '');
    let m, done = false;
    const go = () => { const r = T.check(inp.value); inp.value = ''; if (r.ok) { done = true; m.close(); cb(true); } else { msg.textContent = r.msg; msg.className = 'pinmsg err'; } };
    m = modal('🔒 Mode enseignant verrouillé', el('div', {}, el('p', {}, 'Saisissez le code PIN à 6 chiffres. Chaque essai est enregistré dans le journal.'), inp, el('button', { class: 'primary', onclick: go }, 'Déverrouiller'), msg), () => { if (!done) cb(false); });
    inp.onkeydown = e => { if (e.key === 'Enter') go(); }; setTimeout(() => inp.focus(), 30);
  };
  /** menu enseignant : définir/changer/supprimer le PIN, verrouiller, journal */
  T.menu = function (app) {
    const body = el('div', {}); let m;
    const draw = () => {
      body.innerHTML = '';
      const has = T.hasPin();
      body.append(el('p', {}, has ? '🔐 Un code PIN est défini.' : '🔓 Aucun PIN : n\'importe qui peut activer le mode enseignant.'));
      const a = pinField('nouveau PIN'), b = pinField('confirmer'), msg = el('div', { class: 'pinmsg' });
      const set = lockNow => { if (!/^\d{6}$/.test(a.value)) { msg.textContent = 'Le PIN doit comporter exactement 6 chiffres.'; msg.className = 'pinmsg err'; return; } if (a.value !== b.value) { msg.textContent = 'Les deux saisies diffèrent.'; msg.className = 'pinmsg err'; return; } T.setPin(a.value); if (lockNow) { m.close(); app.setTeacher(false); } else draw(); };
      body.append(el('div', { class: 'pinrow' }, a, b), el('div', { class: 'pinbtns' }, el('button', { onclick: () => set(false) }, has ? 'Changer le PIN' : 'Définir le PIN'), el('button', { class: 'primary', onclick: () => set(true) }, (has ? 'Changer' : 'Définir') + ' et verrouiller')), msg);
      if (has) body.append(el('div', { class: 'pinbtns' }, el('button', { class: 'primary', onclick: () => { T.note('verrouillage manuel'); m.close(); app.setTeacher(false); } }, '🔒 Verrouiller maintenant'), el('button', { onclick: () => { if (confirm('Supprimer le PIN ?')) { T.removePin(); draw(); } } }, 'Supprimer le PIN')));
      const L = T.log().reverse(), nf = L.filter(e => e.k === 'echec' || e.k === 'bloque').length;
      body.append(el('h4', {}, '📋 Journal des tentatives (' + nf + ' échec' + (nf > 1 ? 's' : '') + ')'));
      const box = el('div', { class: 'pinlog' }); if (!L.length) box.append(el('div', { class: 'muted' }, 'Aucun événement.'));
      L.forEach(e => box.append(el('div', { class: 'logl ' + e.k }, el('b', {}, e.t), ' — ' + e.x)));
      body.append(box, el('button', { onclick: () => { if (confirm('Effacer le journal ?')) { T.clearLog(); draw(); } } }, 'Effacer le journal'));
    };
    m = modal('🔑 Verrouillage enseignant', body); draw();
  };
})(window.NS = window.NS || {});
