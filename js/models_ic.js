/* models_ic.js — circuits intégrés et semi-conducteurs « actifs » : portes logiques, bascule D, compteur, NE555, optocoupleur, MOSFET */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { VT, sexp, heat, pnjlim, El, ev, MODELS } = NS; NS.LIB = NS.LIB || {};

/* aide au pas adaptatif : demande un pas assez fin quand une grandeur approche son seuil */
function capDt(eng, v, vold, thr, h) {
  const slew = Math.abs(v - vold) / h; if (slew < 1e-9) return;
  const m = Math.abs(v - thr); const c = Math.max(2e-7, 0.35 * m / slew); if (c < eng.dtCap) eng.dtCap = c;
}
NS.capDt = capDt;

/* ======================== LOGIQUE ======================== */
const LFAM = {
  HC: { Vmin: 2, Vmax: 6, ttl: false, Ro: 45, dH: 0.05, dL: 0.05, RoL: 45, Gq: 2e-7, name: '74HC (CMOS, 2–6 V)' },
  LS: { Vmin: 4.5, Vmax: 5.5, ttl: true, Ro: 70, dH: 1.6, dL: 0.3, RoL: 12, Gq: 1 / 6000, name: '74LS (TTL, 5 V)' },
  CD: { Vmin: 3, Vmax: 15, ttl: false, Ro: 300, dH: 0.05, dL: 0.05, RoL: 300, Gq: 2e-7, name: 'CD4000B (CMOS, 3–15 V)' },
};
NS.LFAM = LFAM;
/* spec : in = indices des entrées, out = sorties, vcc, gnd, pu = entrées « actives à 0 » (rappel au niveau haut) */
class Logic extends El {
  constructor(i, p, spec) { super(i, p); this.spec = spec; this.fam = LFAM[p.fam] || LFAM.HC; }
  stampLin(eng) {
    const sp = this.spec, ix = this.ix, VCC = ix[sp.vcc], GND = ix[sp.gnd], f = this.fam, s = this.s;
    for (const k of sp.in) { const n = ix[k]; if (f.ttl) eng.cond(n, VCC, 1 / 12000); else eng.cond(n, GND, 1e-8); if (sp.pu && sp.pu.includes(k) && !f.ttl) eng.cond(n, VCC, 1e-7); }
    eng.cond(VCC, GND, s.on ? f.Gq * (sp.nq || 1) : 1e-9);
    sp.out.forEach((k, j) => {
      let lv = (s.o && s.o[j]) ? 1 : 0; if (this.fault === 'stuck0') lv = 0; else if (this.fault === 'stuck1') lv = 1;
      if (!s.on || this.fault === 'dead' || this.burnt) { eng.cond(ix[k], GND, 1e-9); return; }
      eng.cond(ix[k], lv ? VCC : GND, 1 / (lv ? f.Ro : f.RoL));
    });
  }
  rhsLin(eng) {
    const sp = this.spec, ix = this.ix, f = this.fam, s = this.s;
    if (!s.on || this.fault === 'dead' || this.burnt) return;
    sp.out.forEach((k, j) => { let lv = (s.o && s.o[j]) ? 1 : 0; if (this.fault === 'stuck0') lv = 0; else if (this.fault === 'stuck1') lv = 1; if (lv) eng.rhs(ix[k], -f.dH / f.Ro); else eng.rhs(ix[k], f.dL / f.RoL); });
  }
  level(eng, v, Vs, prev) { // niveau logique d'une entrée avec hystérésis
    const f = this.fam; let hi, lo;
    if (f.ttl) { hi = this.spec.schmitt ? 1.7 : 1.5; lo = this.spec.schmitt ? 0.9 : 1.2; }
    else { hi = Vs * (this.spec.schmitt ? 0.68 : 0.55); lo = Vs * (this.spec.schmitt ? 0.32 : 0.45); }
    if (v > hi) return 1; if (v < lo) return 0; return prev ? 1 : 0;
  }
  accept(eng, dt) {
    const sp = this.spec, ix = this.ix, s = this.s, f = this.fam, VCC = ix[sp.vcc], GND = ix[sp.gnd];
    const Vs = eng.v(VCC) - eng.v(GND), vg = eng.v(GND);
    const on = Vs >= f.Vmin * 0.95 && this.fault !== 'dead' && !this.burnt; let ch = false;
    if (!!s.on !== on) { s.on = on; ch = true; }
    this.Vs = Vs;
    if (!s.i) { s.i = sp.in.map(() => 0); s.o = sp.out.map(() => 0); s.ck = 0; s.n = 0; ch = true; }
    const lv = sp.in.map((k, j) => { const v = eng.v(ix[k]) - vg; const thr = f.ttl ? (s.i[j] ? 1.2 : 1.5) : Vs * (s.i[j] ? 0.45 : 0.55); if (on) capDt(eng, v, eng.vp(ix[k]) - eng.vp(GND), thr, dt); return this.level(eng, v, Vs, s.i[j]); });
    if (on) {
      const out = this.fn(lv, s, sp);
      sp.out.forEach((k, j) => { if ((out[j] ? 1 : 0) !== (s.o[j] ? 1 : 0)) { s.o[j] = out[j] ? 1 : 0; ch = true; } });
      s.i = lv;
    }
    s.out = s.o[0]; s.q = s.o[0]; s.q2 = s.o[1]; s.q3 = s.o[2]; s.q4 = s.o[3];
    if (ch) this.ver++;
    if (this.burnt) return;
    if (Vs > f.Vmax * 1.25 && heat(s, 'hv', 3, dt, 0.05)) { this.burn(eng, 'HS'); return; }
    if (on) sp.out.forEach((k, j) => { const lvl = s.o[j] ? 1 : 0, Vy = eng.v(ix[k]); const I = lvl ? (eng.v(VCC) - f.dH - Vy) / f.Ro : (Vy - vg - f.dL) / f.RoL; if (heat(s, 'hi' + j, Math.abs(I) / (f.ttl ? 0.04 : 0.05), dt, 0.2, 2)) this.burn(eng, 'HS'); this.Iout = I; });
  }
}
/* fonctions logiques */
const GATES = {
  AND: (a, b) => a & b, NAND: (a, b) => 1 - (a & b), OR: (a, b) => a | b, NOR: (a, b) => 1 - (a | b), XOR: (a, b) => a ^ b, XNOR: (a, b) => 1 - (a ^ b),
};
NS.GATEFN = GATES;
MODELS.gate = (i, p) => { const e = new Logic(i, p, { in: [0, 1], out: [2], vcc: 3, gnd: 4, nq: 1 }); const F = GATES[p.fn] || GATES.AND; e.fn = (lv) => [F(lv[0], lv[1])]; return e; };
MODELS.inv = (i, p) => { const sch = p.fn === 'SCHMITT'; const e = new Logic(i, p, { in: [0], out: [1], vcc: 2, gnd: 3, schmitt: sch, nq: 1 }); e.fn = (lv) => [p.fn === 'BUF' ? lv[0] : 1 - lv[0]]; return e; };
/* bascule D (74xx74) : D, CK, S̅, R̅, Q, Q̅, VCC, GND */
MODELS.dff = (i, p) => { const e = new Logic(i, p, { in: [0, 1, 2, 3], out: [4, 5], vcc: 6, gnd: 7, pu: [2, 3], nq: 2 });
  e.fn = (lv, s) => { const [d, ck, sb, rb] = lv; let q = s.qs || 0; if (!sb && !rb) { s.ck = ck; return [1, 1]; } if (!sb) q = 1; else if (!rb) q = 0; else if (ck && !s.ck) q = d; s.ck = ck; s.qs = q; return [q, 1 - q]; }; return e; };
/* compteur binaire 4 bits : CK (front montant), MR (remise à zéro active à 1), Q0..Q3 */
MODELS.cnt4 = (i, p) => { const e = new Logic(i, p, { in: [0, 1], out: [2, 3, 4, 5], vcc: 6, gnd: 7, nq: 2 });
  e.fn = (lv, s) => { const [ck, mr] = lv; let n = s.n || 0; if (mr) n = 0; else if (ck && !s.ck) n = (n + 1) & 15; s.ck = ck; s.n = n; return [n & 1, (n >> 1) & 1, (n >> 2) & 1, (n >> 3) & 1]; }; return e; };

/* ======================== NE555 / TLC555 ======================== */
const T555 = {
  'NE555': { Vmin: 4.5, Vmax: 16, Gq: 1 / 1500, dH: 1.7, dL: 0.1, Ro: 20, RoL: 10, Rdis: 10, Imax: 0.2, name: 'NE555 (bipolaire, 4,5–16 V, 200 mA)' },
  'TLC555': { Vmin: 2, Vmax: 15, Gq: 1 / 50000, dH: 0.1, dL: 0.1, Ro: 40, RoL: 25, Rdis: 25, Imax: 0.01, name: 'TLC555 (CMOS, 2–15 V, 10 mA)' },
};
NS.LIB.T555 = T555;
// broches : GND, TRIG, OUT, RESET, CTRL, THR, DIS, VCC
class Timer555 extends El {
  constructor(i, p) { super(i, p); }
  outState() { const s = this.s; return (s.q && !s.rs && s.on) ? 1 : 0; }
  stampLin(eng) {
    const [GND, TRIG, OUT, RST, CTRL, THR, DIS, VCC] = this.ix, p = this.p, s = this.s;
    eng.cond(VCC, CTRL, 1 / 5000); eng.cond(CTRL, GND, 1 / 10000);        // pont diviseur interne 3 × 5 kΩ
    eng.cond(THR, GND, 1e-8); eng.cond(TRIG, VCC, 1e-8); eng.cond(RST, VCC, 1 / 200000);
    eng.cond(VCC, GND, s.on ? p.Gq : 1e-9);
    if (!s.on || this.fault === 'dead' || this.burnt) { eng.cond(OUT, GND, 1e-9); eng.cond(DIS, GND, 1e-9); return; }
    const hi = this.outState();
    eng.cond(OUT, hi ? VCC : GND, 1 / (hi ? p.Ro : p.RoL)); eng.cond(DIS, GND, hi ? 1e-9 : 1 / p.Rdis);
  }
  rhsLin(eng) {
    const OUT = this.ix[2], p = this.p, s = this.s; if (!s.on || this.fault === 'dead' || this.burnt) return;
    if (this.outState()) eng.rhs(OUT, -p.dH / p.Ro); else eng.rhs(OUT, p.dL / p.RoL);
  }
  accept(eng, dt) {
    const [GND, TRIG, OUT, RST, CTRL, THR, DIS, VCC] = this.ix, p = this.p, s = this.s, vg = eng.v(GND);
    const Vs = eng.v(VCC) - vg, Vc = eng.v(CTRL) - vg, vthr = eng.v(THR) - vg, vtr = eng.v(TRIG) - vg, vr = eng.v(RST) - vg;
    const on = Vs >= p.Vmin && this.fault !== 'dead' && !this.burnt; let ch = false; this.Vs = Vs;
    if (!!s.on !== on) { s.on = on; ch = true; }
    if (on) {
      const prevOut = this.outState(); const rs = vr < 0.7; if (!!s.rs !== rs) { s.rs = rs ? 1 : 0; ch = true; }
      let q = s.q || 0;
      if (vthr > Vc) q = 0; else if (vtr < Vc / 2) q = 1;
      if (q !== (s.q || 0)) { s.q = q; ch = true; }
      // pas fins près des seuils des comparateurs
      capDt(eng, vthr, eng.vp(THR) - eng.vp(GND), Vc, dt); capDt(eng, vtr, eng.vp(TRIG) - eng.vp(GND), Vc / 2, dt);
      this.out = this.outState(); s.out = this.out; if (this.out !== prevOut) ch = true;
    }
    this.Vc = Vc; if (ch) this.ver++;
    if (this.burnt) return;
    if (Vs > p.Vmax * 1.2 && heat(s, 'hv', 3, dt, 0.05)) { this.burn(eng, 'HS'); return; }
    if (on) { const hi = this.outState(), Vy = eng.v(OUT); const I = hi ? (eng.v(VCC) - p.dH - Vy) / p.Ro : (Vy - vg - p.dL) / p.RoL; this.Iout = I; if (heat(s, 'hi', Math.abs(I) / (p.Imax * 1.5), dt, 0.3, 3)) this.burn(eng, 'HS'); }
  }
}
MODELS.timer555 = (i, p) => new Timer555(i, p);

/* ======================== OPTOCOUPLEUR ======================== */
const OPTOS = {
  'PC817': { CTR: 1.0, Vf: 1.2, Ifmax: 0.05, Vceo: 80, Pmax: 0.15, name: 'PC817 (CTR ≈ 100 %, 80 V)' },
  'PC817C': { CTR: 2.5, Vf: 1.2, Ifmax: 0.05, Vceo: 80, Pmax: 0.15, name: 'PC817C (CTR 200–400 %)' },
  '4N25': { CTR: 0.25, Vf: 1.2, Ifmax: 0.06, Vceo: 30, Pmax: 0.15, name: '4N25 (CTR ≈ 20–30 %, 30 V)' },
};
NS.LIB.OPTOS = OPTOS;
// broches : A, K (LED), C, E (phototransistor)
class Opto extends El {
  constructor(i, p) { super(i, p); this.nl = true; this.nInt = 1; const n = 1.8, Rs = 10, If = 0.02; this.Rs = Rs; this.n = n; this.Is = If / Math.exp((p.Vf - If * Rs) / (n * VT)); this.nvt = n * VT; this.vcrit = this.nvt * Math.log(this.nvt / (Math.SQRT2 * this.Is)); }
  stampLin(eng) { eng.cond(this.ix[0], this.ii[0], 1 / this.Rs); }
  stampNL(eng) {
    const [A, K, C, E] = this.ix, ai = this.ii[0], s = this.s, p = this.p;
    if (this.burnt) { eng.cond(ai, K, 1e-12); eng.cond(C, E, 1e-12); return; }
    let vd = eng.v(ai) - eng.v(K); const vold = s.vdi !== undefined ? s.vdi : 0; const vl = pnjlim(vd, vold, this.nvt, this.vcrit); if (vl !== vd) eng.noncon = true; s.vdi = vl;
    const e = sexp(vl / this.nvt); let Id = this.Is * (e - 1) + 1e-12 * vl; const Gd = this.Is * e / this.nvt + 1e-12;
    if (this.fault === 'ledOpen') { Id = 0; }
    const ctr = p.CTR * (1 + (this.inst.dev || 0) * 0.25); let vce = eng.v(C) - eng.v(E); const Vs = 0.25;
    if (s.vcei !== undefined && Math.abs(vce - s.vcei) > 4) { vce = s.vcei + Math.sign(vce - s.vcei) * 4; eng.noncon = true; } s.vcei = vce;   // limitation de Newton sur V_CE
    const th = vce > 0 ? vce / (Vs + vce) : vce / Vs, dth = vce > 0 ? Vs / ((Vs + vce) * (Vs + vce)) : 1 / Vs;
    const open = this.fault === 'phOpen'; const Idn = Math.max(Id, 0);
    const Ic = open ? 0 : ctr * Idn * th + 1e-7 * th, dd = open ? 0 : ctr * (Id > 0 ? Gd : 0) * th, dc = open ? 0 : ctr * Idn * dth;
    const nodes = [ai, K, C, E], v0 = [vl + eng.v(K), eng.v(K), eng.v(E) + vce, eng.v(E)];
    const g = this.fault === 'ledOpen' ? 1e-12 : Gd;
    eng.nlStamp(nodes, [Id, -Id, Ic, -Ic], [[g, -g, 0, 0], [-g, g, 0, 0], [dd, -dd, dc, -dc], [-dd, dd, -dc, dc]], v0);
    this.Ic = Ic; this.If = Id; s.vcei = eng.v(C) - eng.v(E);
  }
  accept(eng, dt) {
    const [A, K, C, E] = this.ix, ai = this.ii[0], s = this.s, p = this.p; const vd = eng.v(ai) - eng.v(K); s.vd = vd; s.vdi = vd;
    this.I = (eng.v(A) - eng.v(ai)) / this.Rs; this.V = eng.v(A) - eng.v(K); this.Vce = eng.v(C) - eng.v(E);
    if (this.burnt) return;
    const u = Math.abs(this.I) / p.Ifmax; if (heat(s, 'h', u * u, dt, 0.1, 2)) this.burn(eng, 'ouvert');
    const P = Math.abs(this.Vce * (this.Ic || 0)); if (heat(s, 'hp', P / p.Pmax, dt, 0.3, 3) || (Math.abs(this.Vce) > p.Vceo * 1.15 && heat(s, 'hv', 3, dt, 0.05))) this.burn(eng, 'ouvert');
    if (this.V < -6 * 1.3 && heat(s, 'hr', 3, dt, 0.05)) this.burn(eng, 'ouvert');
  }
}
MODELS.opto = (i, p) => new Opto(i, p);

/* ======================== MOSFET ======================== */
const MOSFETS = {
  '2N7000': { Vth: 2.1, K: 0.1, lam: 0.02, Imax: 0.2, Vdsmax: 60, Pmax: 0.4, pch: false, Cg: 20e-12, name: '2N7000 (N, 60 V, 200 mA)' },
  'IRF540N': { Vth: 3.0, K: 3.3, lam: 0.01, Imax: 33, Vdsmax: 100, Pmax: 25, pch: false, Cg: 1.7e-9, name: 'IRF540N (N, 100 V, 33 A)' },
  'IRLZ44N': { Vth: 1.6, K: 6.0, lam: 0.01, Imax: 47, Vdsmax: 55, Pmax: 30, pch: false, Cg: 1.7e-9, name: 'IRLZ44N (N logic-level, 55 V, 47 A)' },
  'BS250': { Vth: 2.0, K: 0.06, lam: 0.02, Imax: 0.18, Vdsmax: 45, Pmax: 0.7, pch: true, Cg: 40e-12, name: 'BS250 (P, 45 V, 180 mA)' },
  'IRF9540N': { Vth: 3.0, K: 1.9, lam: 0.01, Imax: 23, Vdsmax: 100, Pmax: 25, pch: true, Cg: 1.4e-9, name: 'IRF9540N (P, 100 V, 23 A)' },
};
NS.LIB.MOSFETS = MOSFETS;
// broches : G, D, S
class Mosfet extends El {
  constructor(i, p) { super(i, p); this.nl = true; this.nInt = 0; this.nBr = 0; const n = 1.2; this.Is = 1e-11; this.nvt = n * VT; this.vcrit = this.nvt * Math.log(this.nvt / (Math.SQRT2 * this.Is)); }
  stampLin(eng) { const [G, D, S] = this.ix, p = this.p; eng.cond(G, S, 1e-11 + (this.fault === 'gs' ? 1 : 0)); if (this.fault === 'ds' || this.burnt === 'court-circuit') eng.cond(D, S, 20); }
  stampNL(eng) {
    const [G, D, S] = this.ix, p = this.p, s = this.s, sg = p.pch ? -1 : 1;
    if (this.fault === 'ds' || this.burnt === 'court-circuit') { this.Id = sg * 20 * (eng.v(D) - eng.v(S)); return; }
    if (this.fault === 'open' || this.burnt === 'ouvert') { eng.cond(D, S, 1e-12); this.Id = 0; return; }
    const vG = sg * eng.v(G), vD = sg * eng.v(D), vS = sg * eng.v(S);
    const rev = vD < vS, dn = rev ? S : D, sn = rev ? D : S, vd = rev ? vS : vD, vs = rev ? vD : vS;     // source = borne la plus basse
    const vgs = vG - vs, vds = vd - vs, vov = vgs - p.Vth, eps = 0.0025;
    const sq = Math.sqrt(vov * vov + eps), veff = 0.5 * (vov + sq), dv = 0.5 * (1 + vov / sq);
    const K = p.K * (1 + (this.inst.dev || 0) * 0.1), lam = p.lam; let Id, gm, gds;
    if (vds < veff) { const f = veff * vds - vds * vds / 2, m = 1 + lam * vds; Id = K * f * m; gm = K * vds * m * dv; gds = K * (veff - vds) * m + K * f * lam; }
    else { const f = veff * veff / 2, m = 1 + lam * vds; Id = K * f * m; gm = K * veff * m * dv; gds = K * f * lam; }
    // courants entrants (variables « virtuelles » : drain/source effectifs) ; dérivées par rapport aux tensions réelles (le facteur sg s'élimine)
    const nodes = [G, dn, sn], gnd = [0, gds, 0];
    const J = [[0, 0, 0], [gm, gds, -(gm + gds)], [-gm, -gds, gm + gds]];
    const Ir = [0, sg * Id, -sg * Id]; // courant entrant dans dn = sg·Id
    eng.nlStamp(nodes, Ir, J, [eng.v(G), eng.v(dn), eng.v(sn)]);
    // diode « body » source → drain (jonction p-n intrinsèque)
    const nb = p.pch ? [D, S] : [S, D]; let vb = eng.v(nb[0]) - eng.v(nb[1]); const vold = s.vbd !== undefined ? s.vbd : 0; const vl = pnjlim(vb, vold, this.nvt, this.vcrit); if (vl !== vb) eng.noncon = true; s.vbd = vl;
    const e = sexp(vl / this.nvt), Ib = this.Is * (e - 1), Gb = this.Is * e / this.nvt + 1e-12; eng.cond(nb[0], nb[1], Gb); const ieq = Ib - Gb * vl; eng.rhs(nb[0], -ieq); eng.rhs(nb[1], ieq);
    this.Id = sg * Id * (rev ? -1 : 1); this.gm = gm; this.Idr = Id;
  }
  accept(eng, dt) {
    const [G, D, S] = this.ix, p = this.p, s = this.s, sg = p.pch ? -1 : 1; const vgs = sg * (eng.v(G) - eng.v(S)), vds = sg * (eng.v(D) - eng.v(S));
    this.Vgs = vgs; this.Vds = vds; s.vbd = sg > 0 ? eng.v(S) - eng.v(D) : eng.v(D) - eng.v(S);
    this.Id = Math.abs(this.Idr || 0) * Math.sign(vds || 1);
    if (this.burnt) return;
    if (Math.abs(vgs) > 24 && heat(s, 'hg', 3, dt, 0.02)) { this.burn(eng, 'court-circuit'); return; }
    const P = Math.abs(vds * this.Idr), u = Math.max(P / p.Pmax, Math.abs(this.Idr) / (p.Imax * 1.5));
    if (heat(s, 'h', u, dt, 0.5, 4)) this.burn(eng, 'court-circuit');
    if (Math.abs(vds) > p.Vdsmax * 1.2 && heat(s, 'hv', 3, dt, 0.05)) this.burn(eng, 'court-circuit');
  }
}
MODELS.mosfet = (i, p) => new Mosfet(i, p);
})(typeof window !== 'undefined' ? window : globalThis);
