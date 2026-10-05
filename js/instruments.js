/* instruments.js — fenêtres flottantes : multimètre, oscilloscope, alimentation de labo, GBF */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { h, $, clear, fmt } = NS;

/* affichage multimètre : 4 chiffres significatifs, unité auto */
function dmm(val, unit) {
  if (!isFinite(val)) return { s: val > 0 ? 'OL' : '----', u: '' };
  const a = Math.abs(val); let sc = 1, pre = '';
  if (unit === 'Ω') { if (a >= 1e6) { sc = 1e6; pre = 'M'; } else if (a >= 1e3) { sc = 1e3; pre = 'k'; } }
  else { if (a < 1 && a >= 1e-3 - 1e-12) { sc = 1e-3; pre = 'm'; } else if (a < 1e-3) { sc = 1e-6; pre = 'µ'; } }
  let x = val / sc; const dec = Math.abs(x) >= 100 ? 1 : Math.abs(x) >= 10 ? 2 : 3;
  return { s: x.toFixed(dec).replace('-0.000', '0.000'), u: pre + unit };
}
NS.dmm = dmm;
const TDIV = []; [1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1].forEach(d => [1, 2, 5].forEach(m => TDIV.push(m * d))); TDIV.push(10);
const VDIV = []; [1e-3, 1e-2, 1e-1, 1, 10].forEach(d => [1, 2, 5].forEach(m => VDIV.push(m * d))); VDIV.push(100);
const lbl = (v, u) => fmt(v, u, 2).replace('.0 ', ' ');

class Instruments {
  constructor(app) { this.app = app; this.wins = new Map(); this.audio = null; }
  open(inst) {
    if (this.wins.has(inst.id)) { const w = this.wins.get(inst.id); w.el.style.zIndex = ++this.z || (this.z = 30); return; }
    const mk = { multimeter: () => this.multimeter(inst), scope: () => this.scope(inst), psu: () => this.psu(inst), gbf: () => this.gbf(inst) }[inst.type]; if (!mk) return false;
    const n = this.wins.size; const w = mk(); w.el.style.left = (window.innerWidth - 740 - n * 30) + 'px'; w.el.style.top = (110 + n * 30) + 'px'; w.el.style.zIndex = ++this.z || (this.z = 30);
    $('#winlayer').appendChild(w.el); this.wins.set(inst.id, w); this.drag(w.el); return true;
  }
  closeAll() { for (const w of this.wins.values()) w.el.remove(); this.wins.clear(); this.beep(false); }
  closeFor(id) { const w = this.wins.get(id); if (w) { w.el.remove(); this.wins.delete(id); } }
  frame(title, cls, body, inst) {
    const x = h('button.x', { title: 'Fermer', onclick: () => { el.remove(); this.wins.delete(inst.id); this.beep(false); } }, '×');
    const el = h('div.win.' + cls, h('div.wh', h('span', title + ' — ' + inst.ref), x), h('div.wb', body)); return el;
  }
  drag(el) {
    const hd = el.querySelector('.wh'); let d = null;
    hd.addEventListener('pointerdown', e => { if (e.target.tagName === 'BUTTON') return; d = { x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop }; hd.setPointerCapture(e.pointerId); el.style.zIndex = ++this.z; });
    hd.addEventListener('pointermove', e => { if (d) { el.style.left = Math.max(0, e.clientX - d.x) + 'px'; el.style.top = Math.max(0, e.clientY - d.y) + 'px'; } });
    hd.addEventListener('pointerup', () => { d = null; });
  }
  beep(on) {
    try {
      if (on && !this.audio) { const A = new (window.AudioContext || window.webkitAudioContext)(); const o = A.createOscillator(), gn = A.createGain(); o.frequency.value = 2400; o.type = 'square'; gn.gain.value = 0.02; o.connect(gn); gn.connect(A.destination); o.start(); this.audio = { A, o, gn }; }
      else if (!on && this.audio) { this.audio.o.stop(); this.audio.A.close(); this.audio = null; }
    } catch (e) { /* pas de son */ }
  }
  /* ================= MULTIMÈTRE ================= */
  multimeter(inst) {
    const app = this.app; const modes = [['VDC', 'V ⎓'], ['VAC', 'V ∿'], ['mA', 'mA ⎓'], ['A', '10 A ⎓'], ['Ohm', 'Ω'], ['Diode', '▷|'], ['Cont', '•))']];
    const lcd = h('div.lcdbig'), mode = h('small'), val = h('span'), unit = h('span.u'); lcd.append(mode, val, unit);
    const btns = modes.map(([m, l]) => h('button', { onclick: () => { inst.p.mode = m; app.changed('param'); app.refreshInspector(); if (m === 'Cont') this.beep(false); }, 'data-m': m }, l));
    const fuseBox = h('div', { style: { display: 'none', marginTop: '6px', color: '#991b1b', fontWeight: 600 } }, 'Fusible grillé ! ', h('button.small', { onclick: () => { inst.rt.fuseA = inst.rt.fuseB = false; inst.rt.hfmA = 0; inst.rt.hfA = 0; app.sim.invalidate(); app.log('Fusible du multimètre remplacé', 'info'); } }, 'Remplacer le fusible'));
    const body = h('div', lcd, h('div.dialgrid', btns), fuseBox,
      h('div.jack', h('span', h('i', { style: { background: '#dc2626' } }), 'V/Ω/A (rouge)'), h('span', h('i', { style: { background: '#111' } }), 'COM (noir)')),
      h('div', { style: { marginTop: '8px', display: 'flex', gap: '6px' } }, h('button.small', { onclick: () => { const r = this.reading(inst); app.note(inst.ref, r.text, r.mode); } }, '✎ Noter la mesure'), h('span.small.muted', 'Cordons : câblez les broches du multimètre sur le schéma.')));
    const el = this.frame('Multimètre', 'mmwin', body, inst);
    return { el, update: () => {
      const r = this.reading(inst); val.textContent = r.s; unit.textContent = r.u; mode.textContent = r.label;
      btns.forEach(b => b.classList.toggle('on', b.dataset.m === inst.p.mode)); fuseBox.style.display = r.fuse ? 'block' : 'none';
      lcd.style.opacity = app.sim.eng.t > 0 ? 1 : 0.5; this.beepState(inst, r);
    } };
  }
  beepState(inst, r) { const want = !!r.beep; if (want !== !!this._beeping) { this._beeping = want; this.beep(want); } }
  reading(inst) {
    const el = this.app.sim.elOf.get(inst.id); const m = inst.p.mode; const labels = { VDC: 'DC', VAC: 'AC RMS', mA: 'DC mA', A: 'DC 10A', Ohm: 'Ω', Diode: 'DIODE', Cont: 'CONT' };
    if (!el || this.app.sim.dirty) return { s: '----', u: '', label: labels[m], text: '', mode: m };
    const r = el.reading(); let s, u;
    if (r.fuse) { s = 'FUSE'; u = ''; } else if (r.txt) { s = r.txt; u = r.unit; } else { const d = dmm(r.val, r.unit); s = d.s; u = d.u; }
    if (r.over && !r.txt && m !== 'Ohm') { s = 'OL'; u = ''; }
    return { s, u, label: labels[m], fuse: r.fuse, beep: r.beep, text: s + ' ' + u, mode: labels[m] };
  }
  /* ================= ALIMENTATION DE LABO ================= */
  psu(inst) {
    const app = this.app; const vin = h('input', { type: 'range', min: 0, max: 30, step: 0.01, value: inst.p.V }), vnum = h('input', { type: 'number', min: 0, max: 30, step: 0.1, value: inst.p.V });
    const iin = h('input', { type: 'range', min: 0, max: 3, step: 0.005, value: inst.p.Ilim }), inum = h('input', { type: 'number', min: 0.001, max: 3, step: 0.01, value: inst.p.Ilim });
    const setV = v => { inst.p.V = Math.max(0, Math.min(30, +v || 0)); vin.value = vnum.value = inst.p.V; app.changed('param'); app.refreshInspector(true); };
    const setI = v => { inst.p.Ilim = Math.max(0.001, Math.min(3, +v || 0.001)); iin.value = inum.value = inst.p.Ilim; app.changed('param'); app.refreshInspector(true); };
    vin.oninput = () => setV(vin.value); vnum.onchange = () => setV(vnum.value); iin.oninput = () => setI(iin.value); inum.onchange = () => setI(inum.value);
    const dv = h('div.disp7'), di = h('div.disp7'), cv = h('span.led'), cc = h('span.led'); const onb = h('button', { onclick: () => { inst.p.on = !inst.p.on; app.changed('param'); app.refreshInspector(true); } });
    const body = h('div', h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } }, h('div', h('div.small', 'TENSION'), dv), h('div', h('div.small', 'COURANT'), di)),
      h('div.knobrow', h('span', 'Tension'), vin, vnum), h('div.knobrow', h('span', 'Limite I'), iin, inum),
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, onb, h('span', cv, 'CV'), h('span', cc, 'CC (limitation)')), h('p.small.muted', 'Astuce : réglez la limitation de courant AVANT de brancher le circuit ; en CC la tension s\'effondre pour ne pas dépasser I.'));
    const el = this.frame('Alimentation 0–30 V / 3 A', 'psuwin', body, inst);
    return { el, update: () => {
      const e = app.sim.elOf.get(inst.id); const on = inst.p.on; const v = e && on ? e.V : 0, i = e && on ? e.I : 0;
      dv.textContent = v.toFixed(2) + ' V'; di.textContent = (Math.abs(i)).toFixed(3) + ' A'; onb.textContent = on ? '⏻ Sortie ON' : '⏻ Sortie OFF'; onb.className = on ? 'primary' : '';
      const isCC = !!(e && e.cc); cv.className = 'led' + (on && !isCC ? ' g' : ''); cc.className = 'led' + (on && isCC ? ' r' : '');
    } };
  }
  /* ================= GBF ================= */
  gbf(inst) {
    const app = this.app; const ch = () => app.changed('param');
    const wave = h('select', { onchange: e => { inst.p.wave = e.target.value; ch(); app.refreshInspector(true); } }, [['sin', 'Sinus'], ['carre', 'Carré'], ['tri', 'Triangle']].map(([v, l]) => h('option', { value: v, selected: inst.p.wave === v }, l)));
    const num = (k, label, unit, min, max) => { const i = h('input', { type: 'text', value: String(inst.p[k]), onchange: e => { const v = NS.parseVal(e.target.value); if (!isNaN(v)) { inst.p[k] = Math.max(min, Math.min(max, v)); } e.target.value = String(inst.p[k]); ch(); app.refreshInspector(true); } }); return h('div.knobrow', h('span', label), i, h('span.muted', unit)); };
    const onb = h('button', { onclick: () => { inst.p.on = !inst.p.on; ch(); } });
    const hid = inst.p.hidden && !app.teacher;
    const body = hid ? h('div', onb, h('p.small.muted', 'Réglages masqués : caractérisez le signal avec l\'oscilloscope et le multimètre.')) : h('div', h('div.knobrow', h('span', 'Forme'), wave, h('span')), num('f', 'Fréquence', 'Hz', 0.1, 1e6), num('A', 'Amplitude', 'V crête', 0, 10), num('off', 'Offset', 'V', -10, 10), num('duty', 'Rapp. cycl.', '%', 5, 95), onb, h('p.small.muted', 'Impédance de sortie 50 Ω. Amplitude = valeur crête (Vmax) ; Vpp = 2 × amplitude. Valeurs acceptées : 1k, 2.5k, 100m…'));
    const el = this.frame('Générateur basse fréquence', 'psuwin', body, inst);
    return { el, update: () => { onb.textContent = inst.p.on ? '⏻ Sortie ON' : '⏻ Sortie OFF'; onb.className = inst.p.on ? 'primary' : ''; } };
  }
  /* ================= OSCILLOSCOPE ================= */
  scope(inst) {
    const app = this.app, P = inst.p; const cv = h('canvas', { width: 680, height: 420 }); const meas = h('div.scmeas');
    const sel = (k, opts, fmtf, cls) => h('select', { class: cls || '', onchange: e => { const v = e.target.value; P[k] = isNaN(+v) || typeof opts[0] === 'string' ? v : +v; if (['v1', 'v2', 'tdiv', 'src', 'trig', 'pos1', 'pos2'].includes(k)) P[k] = +v; app.saveSoon(); } }, opts.map(o => h('option', { value: o, selected: String(P[k]) === String(o) }, fmtf ? fmtf(o) : o)));
    const num = (k, step, min, max) => h('input', { type: 'number', step, min, max, value: P[k], onchange: e => { P[k] = +e.target.value; app.saveSoon(); } });
    const runb = h('button', { title: 'RUN : l\'écran se met à jour en continu. STOP : fige l\'image pour la mesurer (clic pour basculer).', onclick: () => { P.run = !P.run; app.saveSoon(); } });
    const tog = (k, l, cls) => h('label', { class: cls }, h('input', { type: 'checkbox', checked: P[k], onchange: e => { P[k] = e.target.checked; app.saveSoon(); } }), ' ' + l);
    const ctl = h('div.scctl',
      h('fieldset', h('legend.ch1', 'CH1'), tog('on1', 'Afficher', 'ch1'), sel('v1', VDIV, v => lbl(v, 'V') + '/div'), sel('c1', ['DC', 'AC', 'GND']), h('div', 'Pos. ', num('pos1', 0.5, -4, 4))),
      h('fieldset', h('legend.ch2', 'CH2'), tog('on2', 'Afficher', 'ch2'), sel('v2', VDIV, v => lbl(v, 'V') + '/div'), sel('c2', ['DC', 'AC', 'GND']), h('div', 'Pos. ', num('pos2', 0.5, -4, 4))),
      h('fieldset', h('legend', 'BASE DE TEMPS'), sel('tdiv', TDIV, v => lbl(v, 's') + '/div'), h('div', 'Pos. déclench. ', num('tpos', 1, 0, 9)), runb, h('button', { title: 'Réglage automatique : ajuste sensibilité, base de temps et déclenchement au signal de CH1', onclick: () => this.autoset(inst) }, 'Auto')),
      h('fieldset', h('legend', 'DÉCLENCHEMENT'), sel('src', [1, 2], v => 'Source CH' + v), sel('edge', ['up', 'down'], v => v === 'up' ? 'Front montant ↗' : 'Front descendant ↘'), h('div', 'Niveau (V) ', num('trig', 0.1))));
    const body = h('div', cv, ctl, meas); const el = this.frame('Oscilloscope', 'scwin', body, inst);
    return { el, cv, meas, update: () => { runb.textContent = P.run ? '▶ RUN' : '⏸ STOP'; this.drawScope(inst, cv, meas); } };
  }
  autoset(inst) {
    const el = this.app.sim.elOf.get(inst.id); const s = el && el.s; if (!s || !s.ring || s.ring.n < 10) return; const r = s.ring, P = inst.p; const tn = r.at(r.n - 1);
    const j0 = r.find(tn - 0.2); const m = this.stats(r, 0, j0, r.n); const ch = P.on1 ? 0 : 1; const st = m[ch];
    const pp = Math.max(st.max - st.min, 1e-3); const want = pp / 6; const vd = VDIV.find(v => v >= want) || 100; P[ch ? 'v2' : 'v1'] = vd; if (P.on1 && P.on2) { const o = this.stats(r, 1, j0, r.n); const w2 = Math.max(o.max - o.min, 1e-3) / 6; P.v2 = VDIV.find(v => v >= w2) || 100; }
    if (st.f > 0) P.tdiv = TDIV.find(t => t >= (3 / st.f) / 10) || 1; else P.tdiv = 0.1;
    P.trig = +(((st.max + st.min) / 2)).toFixed(3); P.pos1 = P.pos2 = 0; P.run = true; this.app.saveSoon();
  }
  stats(r, ch, j0, j1) { // min, max, moyenne, rms, fréquence (passages montants par la moyenne) sur [j0, j1)
    let mn = 1e30, mx = -1e30, sum = 0, sq = 0, wsum = 0; const v = r.v[ch]; const t = r.t;
    for (let j = j0; j < j1; j++) { const i = r.idx(j); const x = v[i]; if (x < mn) mn = x; if (x > mx) mx = x; const dt = j + 1 < j1 ? (t[r.idx(j + 1)] - t[i]) : 0; sum += x * dt; sq += x * x * dt; wsum += dt; }
    const mean = wsum > 0 ? sum / wsum : v[r.idx(j0)], rms = wsum > 0 ? Math.sqrt(sq / wsum) : Math.abs(mean);
    let n = 0, tf = 0, tl = 0, prev = v[r.idx(j0)] - mean; const hyst = Math.max((mx - mn) * 0.05, 1e-6);
    let armed = prev < -hyst;
    for (let j = j0 + 1; j < j1; j++) { const x = v[r.idx(j)] - mean; if (x < -hyst) armed = true; else if (armed && x > hyst) { const tt = t[r.idx(j)]; if (n === 0) tf = tt; tl = tt; n++; armed = false; } }
    const f = n >= 2 ? (n - 1) / (tl - tf) : 0; return Object.assign([], { min: mn, max: mx, mean, rms, f });
  }
  drawScope(inst, cv, meas) {
    const el = this.app.sim.elOf.get(inst.id); const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height, P = inst.p; const dx = W / 10, dy = H / 8;
    ctx.fillStyle = '#07110c'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#1d3a2a'; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(i * dx, 0); ctx.lineTo(i * dx, H); ctx.stroke(); } for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(0, i * dy); ctx.lineTo(W, i * dy); ctx.stroke(); }
    ctx.strokeStyle = '#2e5c43'; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.strokeStyle = '#2e5c43'; for (let i = 0; i < 50; i++) { const x = i * dx / 5; ctx.beginPath(); ctx.moveTo(x, H / 2 - 3); ctx.lineTo(x, H / 2 + 3); ctx.stroke(); } for (let i = 0; i < 40; i++) { const y = i * dy / 5; ctx.beginPath(); ctx.moveTo(W / 2 - 3, y); ctx.lineTo(W / 2 + 3, y); ctx.stroke(); }
    const s = el && el.s; if (!s || !s.ring || s.ring.n < 2) { ctx.fillStyle = '#6ee7a0'; ctx.font = '14px monospace'; ctx.fillText('Pas de signal — câblez CH1 / CH2 / GND', 14, 24); meas.textContent = ''; return; }
    const r = s.ring, span = P.tdiv * 10, tNow = r.at(r.n - 1);
    let t0 = s.t0; const trigCh = P.src === 2 ? 1 : 0;
    const sig = [P.tdiv, P.trig, P.edge, P.src, P.tpos].join('|'); if (s.sig !== sig) { s.sig = sig; s.t0 = t0 = undefined; s.trigT = undefined; }
    // comme un vrai oscilloscope : on fige une trame complète synchronisée, puis on la remplace seulement quand une nouvelle acquisition est terminée (pas de « tressautement »)
    const nowMs = performance.now(), roll = span > 0.6, frameDone = t0 === undefined || (tNow >= t0 + span && nowMs - (s.lastUpd || 0) > 200);
    if (P.run && (roll || frameDone) || t0 === undefined) {
      const tpos = Math.max(0, Math.min(9, P.tpos === undefined ? 1 : P.tpos)); const tMaxTrig = tNow - (10 - tpos) * P.tdiv; let found = null;
      if (tMaxTrig > r.at(0)) {
        const jEnd = Math.min(r.n - 1, r.find(tMaxTrig)), jMin = Math.max(1, r.find(tMaxTrig - Math.max(span * 20, 0.05))); const v = r.v[trigCh]; const lvl = P.trig; const up = P.edge !== 'down';
        for (let j = jEnd; j >= jMin; j--) { const a = v[r.idx(j - 1)], b = v[r.idx(j)]; if (up ? (a < lvl && b >= lvl) : (a > lvl && b <= lvl)) { const ta = r.t[r.idx(j - 1)], tb = r.t[r.idx(j)]; found = ta + (tb - ta) * (lvl - a) / ((b - a) || 1e-12); break; } }
      }
      if (found !== null && !roll && s.trigT !== undefined && found - s.trigT < span * 0.5) found = null === 0 ? null : -1;   // même événement que la trame précédente
      if (found === -1) { /* on garde la trame affichée */ }
      else if (found !== null) { s.t0 = t0 = found - tpos * P.tdiv; s.trigT = found; s.trigd = true; s.lastUpd = nowMs; }
      else { s.trigd = false; s.t0 = t0 = tNow - span; s.trigT = undefined; s.lastUpd = nowMs; }
    }
    if (t0 === undefined) t0 = tNow - span;
    const j0 = Math.max(0, r.find(t0) - 1), j1 = Math.min(r.n, r.find(t0 + span) + 1);
    const chans = [{ ch: 0, on: P.on1, vd: P.v1, pos: P.pos1, cp: P.c1, col: '#facc15' }, { ch: 1, on: P.on2, vd: P.v2, pos: P.pos2, cp: P.c2, col: '#22d3ee' }]; let txt = '';
    for (const c of chans) {
      if (!c.on) continue; const v = r.v[c.ch]; const st = this.stats(r, c.ch, Math.max(0, r.find(t0)), Math.max(Math.max(0, r.find(t0)) + 2, Math.min(r.n, r.find(t0 + span)))); const off = c.cp === 'AC' ? st.mean : 0;
      const Y = x => H / 2 - ((c.cp === 'GND' ? 0 : x - off) / c.vd + c.pos) * dy;
      // marqueur de zéro
      ctx.fillStyle = c.col; ctx.beginPath(); const y0 = H / 2 - c.pos * dy; ctx.moveTo(0, y0 - 5); ctx.lineTo(10, y0); ctx.lineTo(0, y0 + 5); ctx.fill();
      ctx.strokeStyle = c.col; ctx.lineWidth = 1.8; ctx.beginPath(); const n = j1 - j0;
      if (n > 3 * W) { // enveloppe min/max par colonne
        const mn = new Float32Array(W + 1).fill(1e30), mx = new Float32Array(W + 1).fill(-1e30);
        for (let j = j0; j < j1; j++) { const i = r.idx(j); const x = Math.floor((r.t[i] - t0) / span * W); if (x < 0 || x > W) continue; const val = v[i]; if (val < mn[x]) mn[x] = val; if (val > mx[x]) mx[x] = val; }
        let first = true; for (let x = 0; x <= W; x++) { if (mn[x] > 1e29) continue; if (first) { ctx.moveTo(x, Y(mn[x])); first = false; } else ctx.lineTo(x, Y(mn[x])); ctx.lineTo(x, Y(mx[x])); }
      } else { // rééchantillonnage sur la grille de pixels, référencée à t0 : image identique d'une trame à l'autre pour un signal périodique
        let first = true, j = Math.max(1, j0); for (let x = 0; x <= W; x++) { const tx = t0 + x / W * span; while (j < r.n && r.at(j) < tx) j++; if (j >= r.n || j < 1) continue; const ia = r.idx(j - 1), ib = r.idx(j), ta = r.t[ia], tb = r.t[ib]; const u = tb > ta ? (tx - ta) / (tb - ta) : 0; if (u < 0) continue; const y = Y(v[ia] + (v[ib] - v[ia]) * Math.min(1, u)); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
      }
      ctx.stroke();
      txt += `<span style="color:${c.col}">CH${c.ch + 1}: Vpp ${fmt(st.max - st.min, 'V', 3)} · Vmoy ${fmt(st.mean, 'V', 3)} · Veff ${fmt(st.rms, 'V', 3)} · ${st.f > 0 ? 'f ' + fmt(st.f, 'Hz', 4) + ' (T ' + fmt(1 / st.f, 's', 3) + ')' : 'f —'}</span>`;
    }
    // niveau de déclenchement
    ctx.strokeStyle = '#ef4444'; ctx.setLineDash([4, 4]); const ty = H / 2 - (P.trig / (trigCh ? P.v2 : P.v1) + (trigCh ? P.pos2 : P.pos1)) * dy; ctx.beginPath(); ctx.moveTo(W - 14, ty); ctx.lineTo(W, ty); ctx.stroke(); ctx.setLineDash([]);
    const tp = Math.max(0, Math.min(9, P.tpos === undefined ? 1 : P.tpos)); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(tp * dx - 5, 0); ctx.lineTo(tp * dx + 5, 0); ctx.lineTo(tp * dx, 8); ctx.fill();
    ctx.fillStyle = '#9ae6b4'; ctx.font = '12px monospace'; ctx.fillText((P.run ? 'RUN ' : 'STOP ') + (s.trigd ? 'Trig\'d' : 'Auto') + ' · ' + lbl(P.tdiv, 's') + '/div · t = ' + fmt(tNow, 's', 3), 8, H - 8);
    meas.innerHTML = txt;
  }
  update() { for (const w of this.wins.values()) w.update(); }
}
NS.Instruments = Instruments;
})(typeof window !== 'undefined' ? window : globalThis);
