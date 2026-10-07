/* protocols.js — génération de trames (UART/RS-232, Modbus RTU/RS-485, I²C, SPI) et décodeurs. Fonctions pures (testables sous Node). */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const P = NS.PROTO = {};

/* ---------- utilitaires ---------- */
P.crc16 = bytes => { let c = 0xFFFF; for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = (c & 1) ? (c >> 1) ^ 0xA001 : c >> 1; } return c & 0xFFFF; };
P.parseText = s => { const o = []; s = String(s == null ? '' : s); for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === '\\' && i + 1 < s.length) { const n = s[i + 1]; if (n === 'r') { o.push(13); i++; } else if (n === 'n') { o.push(10); i++; } else if (n === 't') { o.push(9); i++; } else if (n === 'x' && /^[0-9a-fA-F]{2}$/.test(s.substr(i + 2, 2))) { o.push(parseInt(s.substr(i + 2, 2), 16)); i += 3; } else o.push(92); } else o.push(s.charCodeAt(i) & 0xFF); } return o; };
P.parseHex = s => String(s || '').split(/[\s,;]+/).filter(Boolean).map(x => parseInt(x.replace(/^0x/i, ''), 16)).filter(x => isFinite(x)).map(x => x & 0xFF);
P.parseNums = s => String(s || '').split(/[\s,;]+/).filter(Boolean).map(Number).filter(x => isFinite(x)).map(x => x & 0xFFFF);
const hex = (b, n) => ('0'.repeat(n || 2) + b.toString(16).toUpperCase()).slice(-(n || 2));
P.hex = hex;
P.ascii = b => (b >= 32 && b < 127) ? String.fromCharCode(b) : (b === 13 ? '␍' : b === 10 ? '␊' : b === 9 ? '⇥' : '·');

/* générateur d'événements : lignes {nom: [[t, niveau]...]}, niveau 0/1 ; niveau initial à t = 0 */
class Gen { constructor(names, idle) { this.ev = {}; this.cur = {}; names.forEach((n, i) => { this.ev[n] = [[0, idle[i]]]; this.cur[n] = idle[i]; }); }
  set(n, t, v) { v = v ? 1 : 0; if (this.cur[n] === v) return; const a = this.ev[n]; if (a.length && t < a[a.length - 1][0]) t = a[a.length - 1][0]; this.cur[n] = v; a.push([t, v]); } }

/* UART : start 0, bits LSB d'abord, parité, stop(s) à 1 */
P.uartBits = (byte, nb, par, stop) => { const b = [0]; let ones = 0; for (let i = 0; i < nb; i++) { const x = (byte >> i) & 1; b.push(x); ones += x; } if (par === 'E') b.push(ones & 1); else if (par === 'O') b.push((ones & 1) ^ 1); for (let i = 0; i < stop; i++) b.push(1); return b; };
function uartStream(g, name, t, bytes, p, inv) { const Tb = 1 / p.baud; const nb = +p.bits || 8, stop = +p.stop || 1, gap = +p.gap || 0; for (const by of bytes) { for (const bit of P.uartBits(by, nb, p.parity || 'N', stop)) { g.set(name, t, inv ? 1 - bit : bit); t += Tb; } t += gap * Tb; } return t; }
P.frameLen = p => (1 + (+p.bits || 8) + ((p.parity && p.parity !== 'N') ? 1 : 0) + (+p.stop || 1)) / p.baud;

/* Modbus RTU : requête maître + réponse esclave (fonctions 03 et 06) */
P.modbusFrames = p => {
  const addr = p.addr & 0xFF, fn = p.func & 0xFF, reg = p.reg & 0xFFFF, regs = P.parseNums(p.regs);
  const withCrc = a => { const c = P.crc16(a); return a.concat([c & 0xFF, c >> 8]); };
  let req, rsp;
  if (fn === 6) { const val = p.qty & 0xFFFF; req = withCrc([addr, 6, reg >> 8, reg & 0xFF, val >> 8, val & 0xFF]); rsp = (reg < regs.length || regs.length === 0) ? withCrc([addr, 6, reg >> 8, reg & 0xFF, val >> 8, val & 0xFF]) : withCrc([addr, 0x86, 2]); }
  else { const q = Math.max(1, p.qty & 0xFFFF); req = withCrc([addr, 3, reg >> 8, reg & 0xFF, q >> 8, q & 0xFF]);
    if (reg + q > regs.length) rsp = withCrc([addr, 0x83, 2]); else { const d = []; for (let i = 0; i < q; i++) { const v = regs[reg + i] || 0; d.push(v >> 8, v & 0xFF); } rsp = withCrc([addr, 3, d.length].concat(d)); } }
  if (p.corrupt) rsp[rsp.length - 1] ^= 0x5A;
  return { req, rsp };
};
P.rs485 = p => { // lignes A et B (différentiel) : logique 1 (repos) = A < B
  const g = new Gen(['L'], [1]); const f = P.modbusFrames(p); const Tc = P.frameLen({ baud: p.baud, bits: 8, parity: p.parity, stop: p.stop });
  let t = 0.002; t = uartStream(g, 'L', t, f.req, { baud: p.baud, bits: 8, parity: p.parity, stop: p.stop }, false);
  t += Math.max(+p.delay || 0.004, 4 * Tc); t = uartStream(g, 'L', t, f.rsp, { baud: p.baud, bits: 8, parity: p.parity, stop: p.stop }, false); g.set('L', t, 1);
  const period = Math.max(+p.every || 0.2, t + 10 * Tc); return { period, lines: { A: g.ev.L.map(e => [e[0], e[1]]), B: g.ev.L.map(e => [e[0], 1 - e[1]]) }, frames: f, t1: t };
};
/* UART simple */
P.uart = p => { const g = new Gen(['TX'], [(p.polarity === 'inv') ? 0 : 1]); const bytes = P.parseText(p.msg); const inv = p.polarity === 'inv'; let t = 0.002; t = uartStream(g, 'TX', t, bytes, p, inv); g.set('TX', t, inv ? 0 : 1);
  const period = Math.max(+p.every || 0.1, t + 4 / p.baud); return { period, lines: g.ev, bytes, t1: t }; };
/* I²C : écriture ou lecture sur adresse 7 bits ; niveaux 1 = ligne relâchée */
P.i2c = p => {
  const g = new Gen(['SCL', 'SDA'], [1, 1]); const T = 1 / p.freq; let t = 0.001;
  const bit = (b) => { g.set('SDA', t + 0.05 * T, b); g.set('SCL', t + 0.25 * T, 1); g.set('SCL', t + 0.75 * T, 0); t += T; };
  g.set('SDA', t, 0); t += 0.25 * T; g.set('SCL', t, 0); t += 0.25 * T;                      // START
  const rd = p.rw === 'R', addr = p.addr & 0x7F, ack = p.ack !== false && p.ack !== 'non';
  const byte = (v, acked) => { for (let i = 7; i >= 0; i--) bit((v >> i) & 1); bit(acked ? 0 : 1); };
  for (let i = 6; i >= 0; i--) bit((addr >> i) & 1); bit(rd ? 1 : 0); bit(ack ? 0 : 1);
  let data = P.parseHex(p.data); if (!data.length) data = [0];
  if (ack) data.forEach((v, k) => { for (let i = 7; i >= 0; i--) bit((v >> i) & 1); bit(rd ? (k === data.length - 1 ? 1 : 0) : 0); });
  g.set('SDA', t + 0.05 * T, 0); g.set('SCL', t + 0.25 * T, 1); g.set('SDA', t + 0.5 * T, 1); t += T;   // STOP
  return { period: Math.max(+p.every || 0.05, t + 5 * T), lines: g.ev, t1: t, data };
};
/* SPI : modes 0–3, MSB d'abord */
P.spi = p => {
  const g = new Gen(['CS', 'SCK', 'MOSI', 'MISO'], [1, (p.mode >> 1) & 1, 0, 0]); const Tb = 1 / p.freq, cpol = (p.mode >> 1) & 1, cpha = p.mode & 1;
  const mosi = P.parseHex(p.data), miso = P.parseHex(p.reply); let t = 0.001; g.set('CS', t, 0); t += Tb;
  mosi.forEach((m, k) => { const r = miso.length ? (miso[k % miso.length]) : (~m & 0xFF); for (let i = 7; i >= 0; i--) {
    const bm = (m >> i) & 1, br = (r >> i) & 1;
    if (!cpha) { g.set('MOSI', t, bm); g.set('MISO', t, br); g.set('SCK', t + Tb / 2, 1 - cpol); g.set('SCK', t + Tb, cpol); }
    else { g.set('SCK', t, 1 - cpol); g.set('MOSI', t + 0.05 * Tb, bm); g.set('MISO', t + 0.05 * Tb, br); g.set('SCK', t + Tb / 2, cpol); }
    t += Tb; } });
  t += Tb / 2; g.set('CS', t, 1); return { period: Math.max(+p.every || 0.05, t + 5 * Tb), lines: g.ev, t1: t, mosi, miso };
};

/* ---------- décodage ---------- */
/* ev : [[t,niveau]...] trié ; niveau à l'instant t (maintien) */
const lvAt = (ev, t) => { let lo = 0, hi = ev.length - 1; if (!ev.length) return 0; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ev[m][0] <= t) lo = m; else hi = m - 1; } return ev[lo][0] <= t ? ev[lo][1] : ev[0][1]; };
P.lvAt = lvAt;
/* convertit des échantillons analogiques (t[], v[]) en événements logiques par seuil avec hystérésis */
P.toEvents = (t, v, thr, hy) => { hy = hy === undefined ? 0.1 : hy; const ev = []; let lv = null; for (let i = 0; i < t.length; i++) { const x = v[i]; let n = lv; if (lv === null) n = x > thr ? 1 : 0; else if (lv === 0 && x > thr + hy) n = 1; else if (lv === 1 && x < thr - hy) n = 0; if (n !== lv) { ev.push([t[i], n]); lv = n; } } return ev; };
/* événements d'une voie (ou d'une paire différentielle ch − ch2) à partir du tampon de l'analyseur */
P.ringEvents = (ring, ch, thr, ch2) => { const T = [], V = []; for (let j = 0; j < ring.n; j++) { const i = ring.idx(j); T.push(ring.t[i]); V.push(ring.v[ch][i] - (ch2 >= 0 && ch2 !== undefined && ch2 !== null ? ring.v[ch2][i] : 0)); } return P.toEvents(T, V, thr, ch2 >= 0 && ch2 !== undefined && ch2 !== null ? 0.05 : 0.15); };
P.invert = ev => ev.map(e => [e[0], 1 - e[1]]);
P.uartDecode = (ev, o, tEnd) => {
  const Tb = 1 / o.baud, nb = +o.bits || 8, stop = +o.stop || 1, par = o.parity || 'N', out = []; if (!ev.length) return out;
  const idle = 1; let t = ev[0][0];
  const falls = ev.filter((e, i) => e[1] === 0 && (i === 0 ? false : ev[i - 1][1] === 1)).map(e => e[0]); let fi = 0;
  let sync = !o.sync;
  while (fi < falls.length) {
    const t0 = falls[fi];
    if (!sync) { let pr = null; for (let k = ev.length - 1; k >= 0; k--) if (ev[k][0] < t0 && ev[k][1] === 1) { pr = ev[k][0]; break; } const ek = ev.findIndex(e => e[0] === t0); const idleT = ek > 0 ? t0 - ev[ek - 1][0] : 0; if (ek > 0 && idleT >= (nb + 2) * Tb) sync = true; else { fi++; continue; } } if (tEnd !== undefined && t0 + Tb * (nb + 1) > tEnd) break;
    if (lvAt(ev, t0 + 0.5 * Tb) !== 0) { fi++; continue; }                         // parasite
    let val = 0, ones = 0; for (let i = 0; i < nb; i++) { const b = lvAt(ev, t0 + (1.5 + i) * Tb); val |= b << i; ones += b; }
    let k = 1 + nb, err = null;
    if (par !== 'N') { const pb = lvAt(ev, t0 + (k + 0.5) * Tb); const exp = par === 'E' ? (ones & 1) : ((ones & 1) ^ 1); if (pb !== exp) err = 'parité'; k++; }
    for (let i = 0; i < stop; i++) if (lvAt(ev, t0 + (k + i + 0.5) * Tb) !== 1) { err = err || 'trame (stop)'; }
    const t1 = t0 + (k + stop) * Tb; out.push({ t0, t1, byte: val, err, bits: nb });
    const tn = t0 + (k + stop - 0.3) * Tb; while (fi < falls.length && falls[fi] < tn) fi++;
  }
  return out;
};
const MBFN = { 1: 'Lire bobines', 2: 'Lire entrées TOR', 3: 'Lire registres de maintien', 4: 'Lire registres d\'entrée', 5: 'Écrire une bobine', 6: 'Écrire un registre', 15: 'Écrire plusieurs bobines', 16: 'Écrire plusieurs registres' };
P.MBFN = MBFN;
P.modbusParse = bytes => {
  if (bytes.length < 4) return { ok: false, text: 'Trame trop courte (' + bytes.length + ' octets)', bytes };
  const body = bytes.slice(0, -2), crc = bytes[bytes.length - 2] | (bytes[bytes.length - 1] << 8), calc = P.crc16(body), ok = crc === calc;
  const addr = bytes[0], fn = bytes[1]; let text = 'Esclave ' + addr + ' · ';
  if (fn & 0x80) text += 'EXCEPTION sur fonction ' + (fn & 0x7F) + ' (code ' + bytes[2] + (bytes[2] === 2 ? ' : adresse de donnée illégale' : bytes[2] === 1 ? ' : fonction illégale' : bytes[2] === 3 ? ' : valeur illégale' : '') + ')';
  else { text += 'fonction ' + fn + ' (' + (MBFN[fn] || '?') + ')';
    if ((fn === 3 || fn === 4 || fn === 1 || fn === 2) && bytes.length === 8) text += ' · REQUÊTE : adresse ' + ((bytes[2] << 8) | bytes[3]) + ', quantité ' + ((bytes[4] << 8) | bytes[5]);
    else if ((fn === 3 || fn === 4) && bytes.length >= 5) { const n = bytes[2], v = []; for (let i = 0; i < n / 2; i++) v.push((bytes[3 + 2 * i] << 8) | bytes[4 + 2 * i]); text += ' · RÉPONSE : ' + n + ' octets → registres [' + v.join(', ') + ']'; }
    else if (fn === 6 && bytes.length === 8) text += ' · registre ' + ((bytes[2] << 8) | bytes[3]) + ' = ' + ((bytes[4] << 8) | bytes[5]); }
  return { ok, text, crc, calc, bytes, addr, fn };
};
/* regroupe les octets en trames : silence ≥ 3,5 caractères */
P.modbusDecode = (ev, o, tEnd) => { const by = P.uartDecode(ev, { baud: o.baud, bits: 8, parity: o.parity, stop: o.stop, sync: o.sync }, tEnd); const Tc = P.frameLen({ baud: o.baud, bits: 8, parity: o.parity, stop: o.stop }); const fr = []; let cur = null;
  for (const b of by) { if (!cur || b.t0 - cur.t1 > 3.5 * Tc) { cur = { t0: b.t0, t1: b.t1, bytes: [], errs: 0 }; fr.push(cur); } cur.bytes.push(b.byte); cur.t1 = b.t1; if (b.err) cur.errs++; }
  fr.forEach(f => Object.assign(f, P.modbusParse(f.bytes))); return fr; };
P.i2cDecode = (scl, sda) => {
  const out = []; const edges = []; scl.forEach(e => edges.push({ t: e[0], c: 'scl', v: e[1] })); sda.forEach((e, i) => { if (i) edges.push({ t: e[0], c: 'sda', v: e[1] }); }); edges.sort((a, b) => a.t - b.t || (a.c === 'scl' ? -1 : 1));
  let S = scl.length ? scl[0][1] : 1, D = sda.length ? sda[0][1] : 1; let cur = null, bits = [];
  const fin = (t, stop) => { if (cur) { cur.t1 = t; cur.stop = stop; out.push(cur); cur = null; bits = []; } };
  const bitEv = (t, v) => { bits.push({ t, v }); if (bits.length === 9) { const val = bits.slice(0, 8).reduce((a, b) => (a << 1) | b.v, 0); const ack = bits[8].v === 0; const first = !cur.addrDone; if (first) { cur.addr = val >> 1; cur.rw = (val & 1) ? 'R' : 'W'; cur.ack = ack; cur.addrDone = true; cur.ev.push({ t0: cur.t0, t1: t, label: 'Adr ' + hex(val >> 1) + (val & 1 ? ' R' : ' W') + (ack ? ' ACK' : ' NACK'), kind: 'addr' }); } else { cur.bytes.push({ v: val, ack }); cur.ev.push({ t0: bits[0].t, t1: t, label: hex(val) + (ack ? ' A' : ' N'), kind: 'data' }); } cur.last = t; bits = []; } };
  for (const e of edges) {
    if (e.c === 'scl') { if (e.v === 1 && S === 0) { if (cur) bitEv(e.t, D); } S = e.v; }
    else { if (S === 1 && D === 1 && e.v === 0) { if (cur) fin(e.t, false); cur = { t0: e.t, bytes: [], ev: [] }; bits = []; } else if (S === 1 && D === 0 && e.v === 1) { fin(e.t, true); } D = e.v; }
  }
  if (cur) fin(cur.last || cur.t0, false); return out;
};
P.spiDecode = (o, mode, nb) => { // o : {cs, clk, mosi, miso} événements
  nb = nb || 8; const cpol = (mode >> 1) & 1, cpha = mode & 1, out = []; const csE = o.cs; if (!csE.length) return out;
  const act = []; let st = null; for (const e of csE) { if (e[1] === 0 && st === null) st = e[0]; else if (e[1] === 1 && st !== null) { act.push([st, e[0]]); st = null; } } if (st !== null) act.push([st, Infinity]);
  const samp = []; for (const e of o.clk) if (e[0] > 0 || e[1] !== cpol) { const lead = e[1] !== cpol; if (lead === !cpha) samp.push(e[0]); }
  for (const [a, b] of act) { const times = samp.filter(t => t >= a && t < b); const mo = [], mi = []; let vo = 0, vi = 0, n = 0; const spans = [];
    for (const t of times) { vo = (vo << 1) | lvAt(o.mosi, t); vi = (vi << 1) | lvAt(o.miso || [], t); n++; if (n === nb) { mo.push(vo & 0xFF); mi.push(vi & 0xFF); spans.push({ t0: times[times.length > 0 ? times.indexOf(t) - nb + 1 : 0], t1: t }); vo = vi = n = 0; } }
    out.push({ t0: a, t1: isFinite(b) ? b : (times.length ? times[times.length - 1] : a), mosi: mo, miso: mi, spans, partial: n }); }
  return out;
};
})(typeof window !== 'undefined' ? window : globalThis);
