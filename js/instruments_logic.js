/* instruments_logic.js — fenêtre de l'analyseur logique : chronogrammes 8 voies, curseurs, décodeurs UART / Modbus RTU / I²C / SPI */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { h, fmt } = NS; const P = NS.PROTO; const I = NS.Instruments.prototype;
const COL = ['#b45309', '#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#e5e7eb'];
const BAUDS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
const TD = []; [1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1].forEach(d => [1, 2, 5].forEach(m => TD.push(m * d))); TD.push(1, 2);
const trim = s => s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s;
const tl = v => { const a = Math.abs(v); return a >= 1 ? trim(v.toPrecision(3)) + ' s' : a >= 1e-3 ? trim((v * 1e3).toPrecision(3)) + ' ms' : trim((v * 1e6).toPrecision(3)) + ' µs'; };
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

I.logic = function (inst) {
  const app = this.app, p = inst.p; const W = 760, H = 372;
  const cv = h('canvas', { width: W, height: H }); const dec = h('div.lgdec'); const info = h('div.lginfo');
  const save = () => app.saveSoon();
  const sel = (k, opts, f, num) => h('select', { onchange: e => { p[k] = num ? +e.target.value : e.target.value; save(); } }, opts.map(o => h('option', { value: o, selected: String(p[k]) === String(o) }, f ? f(o) : o)));
  const nin = (k, step, min, max) => h('input', { type: 'number', step, min, max, value: p[k], onchange: e => { p[k] = +e.target.value; save(); } });
  const chSel = (k, none) => h('select', { onchange: e => { p[k] = +e.target.value; save(); } }, (none ? [[-1, 'aucune']] : []).concat([0, 1, 2, 3, 4, 5, 6, 7].map(c => [c, 'D' + c])).map(([v, l]) => h('option', { value: v, selected: p[k] === v }, l)));
  const chk = (k, l) => h('label', h('input', { type: 'checkbox', checked: !!p[k], onchange: e => { p[k] = e.target.checked; save(); } }), ' ' + l);
  const runb = h('button', { title: 'RUN : défilement / déclenchement continu. STOP : fige la capture (copie) pour l\'analyser tranquillement.', onclick: () => { p.run = !p.run; save(); } });
  const shift = d => h('button', { title: 'Décaler la fenêtre', onclick: () => { p.pos += d * p.tdiv * 5; save(); } }, d < 0 ? '◀' : '▶');
  const protoBox = h('div.lgproto'); let lastProto = null;
  const drawProto = () => {
    protoBox.innerHTML = ''; const f = (l, el) => protoBox.append(h('label.lgf', l + ' ', el));
    if (p.proto === 'uart') { f('RX', chSel('chA')); f('Débit', sel('baud', BAUDS, b => b + ' bd', true)); f('Données', sel('bits', [7, 8], null, true)); f('Parité', sel('parity', ['N', 'E', 'O'], x => ({ N: 'aucune', E: 'paire', O: 'impaire' }[x]))); f('Stop', sel('stop', [1, 2], null, true)); protoBox.append(chk('inv', 'Logique inversée (RS-232 ±12 V)'), h('button', { title: 'Estime le débit à partir de la plus courte impulsion mesurée', onclick: () => this.autoBaud(inst) }, 'Auto-débit')); }
    else if (p.proto === 'modbus') { f('Ligne A', chSel('chA')); f('Ligne B', chSel('chB')); f('Débit', sel('baud', BAUDS, b => b + ' bd', true)); f('Parité', sel('parity', ['N', 'E', 'O'], x => ({ N: 'aucune', E: 'paire', O: 'impaire' }[x]))); f('Stop', sel('stop', [1, 2], null, true)); }
    else if (p.proto === 'i2c') { f('SCL', chSel('chA')); f('SDA', chSel('chB')); }
    else if (p.proto === 'spi') { f('CS', chSel('chA')); f('SCK', chSel('chB')); f('MOSI', chSel('chC')); f('MISO', chSel('chD')); f('Mode', sel('mode', [0, 1, 2, 3], m => m + ' (CPOL ' + ((m >> 1) & 1) + ', CPHA ' + (m & 1) + ')', true)); }
    lastProto = p.proto;
  };
  const protoSel = h('select', { onchange: e => { p.proto = e.target.value; save(); drawProto(); } }, [['none', 'Aucun'], ['uart', 'UART / RS-232'], ['modbus', 'Modbus RTU (RS-485)'], ['i2c', 'I²C'], ['spi', 'SPI']].map(([v, l]) => h('option', { value: v, selected: p.proto === v }, l)));
  drawProto();
  const ctl = h('div.lgctl',
    h('fieldset', h('legend', 'BASE DE TEMPS'), sel('tdiv', TD, v => tl(v) + '/div', true), h('div.lgrow', shift(-1), shift(1), h('button', { title: 'Revient à la fenêtre de base', onclick: () => { p.pos = 0; save(); } }, '⟲'), runb), h('button', { title: 'Choisit une base de temps adaptée à l\'activité détectée', onclick: () => this.logicAuto(inst) }, 'Auto')),
    h('fieldset', h('legend', 'DÉCLENCHEMENT'), h('label', 'Voie ', chSel('trigCh', true)), sel('edge', ['down', 'up'], v => v === 'up' ? 'Front montant ↗' : 'Front descendant ↘')),
    h('fieldset', h('legend', 'SEUIL LOGIQUE'), h('label', 'Seuil (V) ', nin('thr', 0.1, -30, 30)), h('div.small', '3,3 V/5 V : 1,65 V · RS-232 : 0 V')),
    h('fieldset.lgwide', h('legend', 'DÉCODEUR'), h('label', 'Protocole ', protoSel), protoBox));
  const body = h('div', cv, info, ctl, dec); const el = this.frame('Analyseur logique', 'lgwin', body, inst);
  // curseurs de mesure (glisser sur le chronogramme)
  const cur = { a: null, b: null, drag: false }; const xT = e => { const r = cv.getBoundingClientRect(); return ((e.clientX - r.left) / r.width * W - 44) / (W - 50); };
  cv.addEventListener('pointerdown', e => { cur.a = xT(e); cur.b = cur.a; cur.drag = true; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (cur.drag) cur.b = xT(e); });
  cv.addEventListener('pointerup', () => { cur.drag = false; if (Math.abs(cur.a - cur.b) < 0.004) { cur.a = cur.b = null; } });
  return { el, update: () => { if (p.proto !== lastProto) drawProto(); runb.textContent = p.run ? '▶ RUN' : '⏸ STOP'; this.drawLogic(inst, cv, info, dec, cur); } };
};

I.logicRing = function (inst) {
  const el = this.app.sim.elOf.get(inst.id); const s = el && el.s; if (!s || !s.ring || s.ring.n < 2) return null;
  let r = s.ring; if (!inst.p.run) { if (!s.frozen) { const f = new NS.Ring(r.cap, r.v.length); f.t.set(r.t); r.v.forEach((a, i) => f.v[i].set(a)); f.n = r.n; f.head = r.head; s.frozen = f; } r = s.frozen; } else s.frozen = null;
  return { r, s };
};
I.logicEvents = function (inst, r, ch, ch2) { return P.ringEvents(r, ch, inst.p.thr, ch2); };
I.logicAuto = function (inst) {
  const o = this.logicRing(inst); if (!o) return; const p = inst.p; let tmin = Infinity, tmax = -Infinity, pw = Infinity;
  for (let c = 0; c < 8; c++) { const ev = this.logicEvents(inst, o.r, c); for (let i = 1; i < ev.length; i++) { if (ev[i][0] > o.r.at(o.r.n - 1) - 0.5) { tmin = Math.min(tmin, ev[i][0]); tmax = Math.max(tmax, ev[i][0]); } if (i > 1) pw = Math.min(pw, ev[i][0] - ev[i - 1][0]); } }
  if (!isFinite(tmin)) return; const span = Math.min(Math.max((tmax - tmin) * 1.3, pw * 12), 2); p.tdiv = TD.find(t => t * 10 >= span) || 2; p.pos = 0; p.run = true; this.app.saveSoon();
};
I.autoBaud = function (inst) {
  const o = this.logicRing(inst); if (!o) return; const p = inst.p; let ev = this.logicEvents(inst, o.r, p.chA); let pw = Infinity; for (let i = 1; i < ev.length; i++) pw = Math.min(pw, ev[i][0] - ev[i - 1][0]); if (!isFinite(pw)) return;
  const b = 1 / pw; p.baud = BAUDS.reduce((a, c) => Math.abs(Math.log(c / b)) < Math.abs(Math.log(a / b)) ? c : a); this.app.saveSoon();
};
/* décodage → { spans: [{ch, t0, t1, label, err}], html } */
I.logicDecode = function (inst, r) {
  const p = inst.p, spans = []; const sync = r.n >= r.cap; let html = ''; const ok = '<span style="color:#4ade80">', ko = '<span style="color:#f87171">';
  const tEnd = r.at(r.n - 1);
  if (p.proto === 'uart') {
    let ev = this.logicEvents(inst, r, p.chA); if (p.inv) ev = P.invert(ev); const d = P.uartDecode(ev, { baud: p.baud, bits: p.bits, parity: p.parity, stop: p.stop, sync }, tEnd);
    d.forEach(b => spans.push({ ch: p.chA, t0: b.t0, t1: b.t1, label: P.hex(b.byte) + ' ' + P.ascii(b.byte), err: b.err }));
    const txt = d.map(b => b.err ? '⚠' : P.ascii(b.byte)).join(''); const nerr = d.filter(b => b.err).length;
    html = '<b>UART ' + p.baud + ' bauds · ' + p.bits + (p.parity === 'N' ? 'N' : p.parity) + p.stop + '</b> — ' + d.length + ' octet(s) décodé(s)' + (nerr ? ' · ' + ko + nerr + ' erreur(s) (parité / trame) : débit ou format incorrect ?</span>' : ' · ' + ok + 'aucune erreur</span>') + '<div class="lgtxt">' + esc(txt.slice(-300)) + '</div>' +
      '<div class="lghex">' + d.slice(-48).map(b => (b.err ? ko : '<span>') + P.hex(b.byte) + '</span>').join(' ') + '</div>';
  } else if (p.proto === 'modbus') {
    const ev = this.logicEvents(inst, r, p.chB, p.chA); const fr = P.modbusDecode(ev, { baud: p.baud, parity: p.parity, stop: p.stop, sync }, tEnd);
    fr.forEach(f => { spans.push({ ch: p.chA, t0: f.t0, t1: f.t1, label: (f.ok ? '' : '✗ ') + 'trame ' + f.bytes.length + ' o', err: !f.ok || f.errs }); });
    const by = P.uartDecode(ev, { baud: p.baud, bits: 8, parity: p.parity, stop: p.stop }, tEnd); by.forEach(b => spans.push({ ch: p.chB, t0: b.t0, t1: b.t1, label: P.hex(b.byte), err: b.err }));
    html = '<b>Modbus RTU ' + p.baud + ' bauds</b> (logique 1 : A − B &lt; 0) — ' + fr.length + ' trame(s)' + fr.slice(-6).map(f => '<div class="lgfr">' + (f.ok ? ok + '✔ CRC ' + P.hex(f.crc, 4) : ko + '✗ CRC reçu ' + P.hex(f.crc || 0, 4) + ' ≠ calculé ' + P.hex(f.calc || 0, 4)) + '</span> · <span class="mono">' + f.bytes.map(b => P.hex(b)).join(' ') + '</span><br>' + esc(f.text) + (f.errs ? ' · ' + ko + 'erreur de format (parité/stop) sur ' + f.errs + ' octet(s)</span>' : '') + '</div>').join('');
  } else if (p.proto === 'i2c') {
    const tr = P.i2cDecode(this.logicEvents(inst, r, p.chA), this.logicEvents(inst, r, p.chB)); tr.forEach(t => (t.ev || []).forEach(e => spans.push({ ch: p.chB, t0: e.t0, t1: e.t1, label: e.label, err: /NACK|N$/.test(e.label) && e.kind === 'addr' }))); tr.forEach(t => { spans.push({ ch: p.chB, t0: t.t0 - 0, t1: t.t0, label: 'S', mark: true }); if (t.stop) spans.push({ ch: p.chB, t0: t.t1, t1: t.t1, label: 'P', mark: true }); });
    html = '<b>I²C</b> — ' + tr.length + ' transaction(s)' + tr.slice(-6).map(t => '<div class="lgfr"><span class="mono">S ' + P.hex(t.addr || 0) + ' ' + (t.rw || '?') + ' ' + (t.ack ? ok + 'ACK</span>' : ko + 'NACK (pas d\'esclave ?)</span>') + ' ' + t.bytes.map(b => P.hex(b.v) + (b.ack ? '·A' : '·N')).join(' ') + (t.stop ? ' P' : ' …') + '</span><br>adresse 7 bits <b>0x' + P.hex(t.addr || 0) + '</b> (' + (t.addr || 0) + '), ' + (t.rw === 'R' ? 'lecture' : 'écriture') + ', ' + t.bytes.length + ' octet(s) de données</div>').join('');
  } else if (p.proto === 'spi') {
    const o = { cs: this.logicEvents(inst, r, p.chA), clk: this.logicEvents(inst, r, p.chB), mosi: this.logicEvents(inst, r, p.chC), miso: this.logicEvents(inst, r, p.chD) }; const tr = P.spiDecode(o, p.mode, 8);
    tr.forEach(t => (t.spans || []).forEach((s, k) => { spans.push({ ch: p.chC, t0: s.t0, t1: s.t1, label: P.hex(t.mosi[k]) }); spans.push({ ch: p.chD, t0: s.t0, t1: s.t1, label: P.hex(t.miso[k]) }); }));
    html = '<b>SPI mode ' + p.mode + '</b> — ' + tr.length + ' échange(s)' + tr.slice(-6).map(t => '<div class="lgfr"><span class="mono">MOSI : ' + t.mosi.map(b => P.hex(b)).join(' ') + '<br>MISO : ' + t.miso.map(b => P.hex(b)).join(' ') + '</span>' + (t.partial ? ' ' + ko + '(' + t.partial + ' bit(s) incomplet(s) — mauvais mode ?)</span>' : '') + '</div>').join('');
  } else html = '<span class="muted">Choisissez un protocole pour décoder les trames. Sans décodeur : mesurez les durées avec les curseurs (glisser sur le chronogramme).</span>';
  return { spans, html };
};
I.drawLogic = function (inst, cv, info, dec, cur) {
  const p = inst.p, ctx = cv.getContext('2d'), W = cv.width, H = cv.height, X0 = 44, PW = W - X0 - 6, rowH = 38, top = 6;
  ctx.fillStyle = '#0b1410'; ctx.fillRect(0, 0, W, H); ctx.font = '11px monospace';
  const o = this.logicRing(inst); const span = p.tdiv * 10;
  ctx.strokeStyle = '#1d3a2a'; ctx.lineWidth = 1; for (let i = 0; i <= 10; i++) { const x = X0 + i * PW / 10; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + 8 * rowH); ctx.stroke(); }
  for (let c = 0; c < 8; c++) { ctx.fillStyle = COL[c]; ctx.fillText('D' + c, 8, top + c * rowH + rowH / 2 + 4); ctx.strokeStyle = '#173024'; ctx.beginPath(); ctx.moveTo(X0, top + (c + 1) * rowH); ctx.lineTo(X0 + PW, top + (c + 1) * rowH); ctx.stroke(); }
  if (!o) { ctx.fillStyle = '#6ee7a0'; ctx.font = '14px monospace'; ctx.fillText('Pas de signal — câblez D0…D7 et GND', 60, 40); info.textContent = ''; return; }
  const { r, s } = o, tNow = r.at(r.n - 1); const EV = []; for (let c = 0; c < 8; c++) EV.push(this.logicEvents(inst, r, c));
  // fenêtre : déclenchement (trame maintenue) ou défilement
  if (p.run || s.vt0 === undefined) {
    let t0 = tNow - span, held = false;
    if (p.trigCh < 0) { let tLast = -1; for (const ev of EV) if (ev.length > 1 && ev[ev.length - 1][0] > tLast) tLast = ev[ev.length - 1][0]; if (tLast > 0 && tLast < tNow - span * 0.9) t0 = tLast - span * 0.9; }   // rien dans la fenêtre : on affiche la dernière activité
    if (p.trigCh >= 0) { const ev = EV[p.trigCh]; const want = p.edge === 'up' ? 1 : 0; let te = null; for (let i = ev.length - 1; i >= 1; i--) if (ev[i][1] === want && ev[i][0] + span * 0.85 <= tNow) { te = ev[i][0]; break; }
      if (te !== null) { if (s.vtrig !== te || s.vspan !== span) { s.vtrig = te; s.vspan = span; s.vbase = te - 0.1 * span; } t0 = s.vbase; held = true; } }
    s.vt0 = t0; s.vheld = held;
  }
  const t0 = s.vt0 + p.pos, t1 = t0 + span, xt = t => X0 + (t - t0) / span * PW;
  // courbes
  for (let c = 0; c < 8; c++) {
    const ev = EV[c]; const yh = top + c * rowH + 7, yl = top + (c + 1) * rowH - 9; ctx.strokeStyle = COL[c]; ctx.lineWidth = 1.8; ctx.beginPath();
    let lv = P.lvAt(ev, t0); let x = X0; ctx.moveTo(x, lv ? yh : yl);
    for (const e of ev) { if (e[0] <= t0 || e[0] >= t1) continue; const xx = xt(e[0]); ctx.lineTo(xx, lv ? yh : yl); lv = e[1]; ctx.lineTo(xx, lv ? yh : yl); }
    ctx.lineTo(X0 + PW, lv ? yh : yl); ctx.stroke();
  }
  // décodage
  const D = this.logicDecode(inst, r); ctx.font = '10px monospace';
  for (const sp of D.spans) { if (sp.t1 < t0 || sp.t0 > t1) continue; const xa = Math.max(X0, xt(sp.t0)), xb = Math.min(X0 + PW, xt(sp.t1)); const y = top + sp.ch * rowH + rowH / 2;
    if (sp.mark) { ctx.fillStyle = '#fde68a'; ctx.fillText(sp.label, xa - 3, top + sp.ch * rowH + 10); continue; }
    if (xb - xa < 2) continue; ctx.fillStyle = sp.err ? 'rgba(239,68,68,.55)' : 'rgba(250,250,250,.16)'; ctx.fillRect(xa, y - 9, xb - xa, 18); ctx.strokeStyle = sp.err ? '#f87171' : '#9ca3af'; ctx.lineWidth = 1; ctx.strokeRect(xa, y - 9, xb - xa, 18);
    if (xb - xa > ctx.measureText(sp.label).width + 4) { ctx.fillStyle = '#f8fafc'; ctx.fillText(sp.label, xa + 3, y + 3); } }
  // axe de temps
  ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'; for (let i = 0; i <= 10; i += 2) ctx.fillText(i === 0 ? 't = ' + tl(t0) : '+' + tl(i * span / 10), Math.max(2, X0 + i * PW / 10 - (i === 0 ? 0 : 24)), top + 8 * rowH + 14);
  // curseurs
  if (cur.a !== null) { const ta = t0 + cur.a * span, tb = t0 + cur.b * span; ctx.strokeStyle = '#38bdf8'; ctx.setLineDash([4, 3]); [ta, tb].forEach(t => { const x = xt(t); ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + 8 * rowH); ctx.stroke(); }); ctx.setLineDash([]);
    const dt = Math.abs(tb - ta); if (dt > 0) info.innerHTML = '<b>Curseurs</b> : Δt = <b>' + tl(dt) + '</b> · 1/Δt = <b>' + fmt(1 / dt, 'Hz', 4) + '</b> <span class="muted">(débit en bauds si Δt = 1 bit)</span>'; }
  else info.innerHTML = '<span class="muted">Glissez sur le chronogramme pour mesurer une durée (curseurs). ' + (p.trigCh >= 0 ? (s.vheld ? 'Déclenché sur D' + p.trigCh : 'En attente d\'un front sur D' + p.trigCh + '…') : 'Sans déclenchement : dernière activité affichée') + ' · fenêtre ' + tl(span) + '</span>';
  if (dec._k !== D.html) { dec._k = D.html; dec.innerHTML = D.html; }
};
})(typeof window !== 'undefined' ? window : globalThis);
