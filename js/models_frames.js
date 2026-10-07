/* models_frames.js — générateurs de trames (UART, RS-485/Modbus, I²C, SPI) et analyseur logique 8 voies */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { El, MODELS, PROTO: P } = NS;

/* ---- générateur de trames : sources de Thévenin pilotées par un échéancier d'événements ---- */
const KINDS = {
  uart: { lines: ['TX'], pins: [0], gnd: 1, od: false },
  rs485: { lines: ['A', 'B'], pins: [0, 1], gnd: 2, od: false },
  i2c: { lines: ['SCL', 'SDA'], pins: [0, 1], gnd: 2, od: true },
  spi: { lines: ['CS', 'SCK', 'MOSI', 'MISO'], pins: [0, 1, 2, 3], gnd: 4, od: false },
};
class FrameGen extends El {
  constructor(i, p, kind) { super(i, p); this.kind = kind; this.k = KINDS[kind]; this.sched = null; this.key = ''; }
  build() {
    const p = this.p, k = JSON.stringify(p); if (k === this.key) return; this.key = k;
    const s = this.sched = P[this.kind === 'rs485' ? 'rs485' : this.kind](p); const bp = new Set();
    for (const n in s.lines) s.lines[n].forEach(e => { if (e[0] > 0) bp.add(e[0]); }); this.bp = Array.from(bp).sort((a, b) => a - b); this.idx = {};
  }
  wrap(t) { const pr = this.sched.period; let m = ((t % pr) + pr) % pr; if (pr - m < 1e-9) m = 0; return m; }
  levelOf(name, tm) { return P.lvAt(this.sched.lines[name], tm + 1e-12); }
  volts(name, lv) { const p = this.p;
    if (this.kind === 'rs485') { const vcm = 2.5, vod = 1.2; return vcm + (lv ? -vod : vod); }   // B porte déjà le niveau complémentaire de A
    if (this.kind === 'uart' && p.level === 'rs232') return lv ? -p.vrs : p.vrs;
    return lv ? p.vhi : 0; }
  beginStep(eng, h, t1) {
    this.build(); const on = this.p.on !== false && this.fault !== 'dead'; this.t1 = t1; const tm = this.wrap(t1);
    const st = this.k.lines.map(n => on ? this.levelOf(n, tm) : 1); this.st = st; this.tm = tm;
    if (this.k.od) { const key = st.join(); if (key !== this.odKey) { this.odKey = key; this.ver++; } }
    if (!!this.on !== on) { this.on = on; this.ver++; }
  }
  ro() { return this.kind === 'uart' ? (this.p.level === 'rs232' ? 300 : 50) : this.kind === 'rs485' ? 25 : 50; }
  stampLin(eng) {
    this.build(); const G = 1 / this.ro(), GND = this.ix[this.k.gnd];
    this.k.lines.forEach((n, j) => { const node = this.ix[this.k.pins[j]];
      if (!this.k.od) eng.cond(node, GND, this.on === false ? 1e-9 : G);
      else { const lo = this.st && this.st[j] === 0 && this.on !== false; eng.cond(node, GND, lo ? 1 / 50 : 1e-9); if (this.p.pullup === '4k7') eng.cond(node, GND, 1 / 4700); } });
  }
  rhsLin(eng) {
    if (this.on === false || !this.st) return; const GND = this.ix[this.k.gnd], G = 1 / this.ro();
    this.k.lines.forEach((n, j) => { const node = this.ix[this.k.pins[j]];
      if (!this.k.od) { const v = this.volts(n, this.st[j]); eng.rhs(node, G * v); eng.rhs(GND, -G * v); }
      else if (this.p.pullup === '4k7') { eng.rhs(node, this.p.vhi / 4700); eng.rhs(GND, -this.p.vhi / 4700); } });
  }
  accept(eng, dt) {
    if (!this.sched || this.on === false) return;
    const tm = this.wrap(eng.t); let nx = this.sched.period - tm; const bp = this.bp;
    let lo = 0, hi = bp.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bp[m] <= tm + 1e-12) lo = m + 1; else hi = m; } if (lo < bp.length) nx = Math.min(nx, bp[lo] - tm);
    if (nx > 1e-12 && nx < eng.dtCap) eng.dtCap = nx;                                  // le pas suivant se termine exactement sur le prochain front
    this.V = this.st ? this.st.map((s, j) => this.volts(this.k.lines[j], s)) : [];
  }
}
['uart', 'rs485', 'i2c', 'spi'].forEach(k => MODELS['fg_' + k] = (i, p) => new FrameGen(i, p, k));

/* ---- analyseur logique : enregistre les 8 tensions (échantillons à chaque variation) ---- */
class LogicAn extends El {
  constructor(i, p) { super(i, p); }
  stampLin(eng) { const gnd = this.ix[8]; for (let k = 0; k < 8; k++) eng.cond(this.ix[k], gnd, 1e-6); }     // 1 MΩ par voie
  accept(eng, dt) {
    const s = this.s; if (!s.ring) { s.ring = new NS.Ring(1 << 15, 8); s.last = null; s.tl = -1; }
    const gnd = eng.v(this.ix[8]), v = []; for (let k = 0; k < 8; k++) v.push(eng.v(this.ix[k]) - gnd);
    let push = s.last === null || eng.t - s.tl > 0.02; if (!push) for (let k = 0; k < 8; k++) if (Math.abs(v[k] - s.last[k]) > 0.04) { push = true; break; }
    if (push) { s.ring.push(eng.t, v); s.last = v; s.tl = eng.t; }
  }
}
MODELS.logic = (i, p) => new LogicAn(i, p);
})(typeof window !== 'undefined' ? window : globalThis);
