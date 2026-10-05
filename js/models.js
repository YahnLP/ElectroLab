/* models.js — modèles physiques des composants (éléments du moteur) : stamps, états, défaillances */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { VT, sexp } = NS;
const MODELS = NS.MODELS = {};
const OPEN = 1e-12, SHORT = 1e-3;   // conductance « ouvert » / résistance « court-circuit »

/* modèle thermique simple : h monte si u>1 (surcharge), redescend sinon ; ≥1 = destruction */
function heat(s, key, u, dt, tau, tauCool) {
  let h = s[key] || 0;
  if (u > 1) h += (u - 1) * dt / tau; else h -= h * dt / (tauCool || tau * 4);
  if (h < 0) h = 0; s[key] = h; return h >= 1;
}
NS.heat = heat;
function ev(eng, type, el, msg) { if (eng.onEvent) eng.onEvent({ type, inst: el.inst, msg }); }

class El {
  constructor(inst, p) { this.inst = inst; this.p = p; this.s = inst.rt || (inst.rt = {}); this.ver = 0; this.nInt = 0; this.nBr = 0; this.nl = false; }
  get fault() { return this.inst.fault; }
  get burnt() { return this.inst.burnt; }
  burn(eng, why) { if (this.inst.burnt) return; this.inst.burnt = why; this.ver++; if (eng.kick) eng.kick(); ev(eng, 'burn', this, why); }
}

/* ---------------- Résistance (aussi LDR, CTN) ---------------- */
class Resistor extends El {
  value() {
    const p = this.p; let R = p.R * (1 + (this.inst.dev || 0) * (p.tol || 0) / 100);
    if (this.inst.type === 'ldr') R = p.Rdark * Math.pow(Math.max(p.lux, 0.01) / 10, -0.7) * (1 + (this.inst.dev || 0) * 0.1) + 100;       // R(10 lux)=Rdark... ~ 10k
    if (this.inst.type === 'ctn') { const T = p.T + 273.15, T0 = 298.15; R = p.R25 * Math.exp(p.B * (1 / T - 1 / T0)); }
    return R;
  }
  stampLin(eng) {
    let G;
    if (this.burnt || this.fault === 'open') G = OPEN; else if (this.fault === 'short') G = 1 / SHORT;
    else if (this.fault === 'drift') G = 1 / (this.value() * 3.3); else G = 1 / Math.max(this.value(), 1e-6);
    this.G = G; eng.cond(this.ix[0], this.ix[1], G);
  }
  accept(eng, dt) {
    const v = eng.v(this.ix[0]) - eng.v(this.ix[1]); this.V = v; this.I = v * this.G; const P = v * v * this.G; this.P = P;
    this.s.P = P;
    if (!this.burnt && this.p.W && heat(this.s, 'h', P / this.p.W, dt, 1.0, 4)) this.burn(eng, 'surchauffe');
  }
}
MODELS.resistor = (i, p) => new Resistor(i, p); MODELS.ldr = MODELS.resistor; MODELS.ctn = MODELS.resistor;

/* ---------------- Potentiomètre ---------------- */
class Pot extends El {
  stampLin(eng) {
    const a = Math.min(0.9999, Math.max(0.0001, this.p.pos)); let R = this.p.R * (1 + (this.inst.dev || 0) * 0.2);
    let R1 = R * a, R2 = R * (1 - a);
    if (this.fault === 'open') { R1 = 1e12; }                                   // piste coupée côté A
    if (this.burnt) R1 = R2 = 1e12;
    this.R1 = R1; this.R2 = R2;
    eng.cond(this.ix[0], this.ix[2], 1 / R1); eng.cond(this.ix[2], this.ix[1], 1 / R2);
  }
  accept(eng, dt) {
    const va = eng.v(this.ix[0]), vw = eng.v(this.ix[2]), vb = eng.v(this.ix[1]);
    const P = (va - vw) * (va - vw) / this.R1 + (vw - vb) * (vw - vb) / this.R2; this.I = (va - vw) / this.R1;
    if (!this.burnt && heat(this.s, 'h', P / (this.p.W || 0.25), dt, 1.0, 4)) this.burn(eng, 'surchauffe');
  }
}
MODELS.pot = (i, p) => new Pot(i, p);

/* ---------------- Condensateur (avec ESR) ---------------- */
class Capacitor extends El {
  constructor(i, p) { super(i, p); this.nInt = 1; }
  params() {
    const f = this.fault; let C = this.p.C * (1 + (this.inst.dev || 0) * (this.p.tol || 0) / 100), esr = this.p.esr;
    if (f === 'dried') { C *= 0.25; esr = Math.max(esr, 0.1) * 60; }               // électrolytique « séché »
    return { C: Math.max(C, 1e-15), esr: Math.max(esr, 1e-4) };
  }
  stampLin(eng, h) {
    const [a, b] = this.ix, m = this.ii[0]; const q = this.params(); this.q = q;
    let esr = q.esr, Gc = q.C / h, open = this.fault === 'open' || (this.burnt === 'ouvert');
    if (this.fault === 'short' || this.burnt === 'court-circuit') { esr = 0.5; }
    eng.cond(a, m, 1 / esr);
    if (this.fault === 'short' || this.burnt === 'court-circuit') eng.cond(m, b, 1 / 0.01);
    else if (open) eng.cond(m, b, 1e-12 + Gc * 1e-9); else eng.cond(m, b, Gc);
    if (this.fault === 'leaky') eng.cond(a, b, 1 / 330);                             // fuite importante
    else eng.cond(a, b, 1 / 1e9);
    this.Gc = open ? 0 : Gc;
  }
  rhsLin(eng) { const vc = this.s.vc || 0; const I = this.Gc * vc; eng.rhs(this.ii[0], I); eng.rhs(this.ix[1], -I); }
  accept(eng, dt) {
    const m = this.ii[0], b = this.ix[1]; const vc = eng.v(m) - eng.v(b); const ic = this.Gc * (vc - (this.s.vc || 0));
    this.s.vc = vc; this.I = (eng.v(this.ix[0]) - eng.v(m)) / this.q.esr; this.VC = vc;
    const p = this.p; if (this.burnt) return;
    const vt = eng.v(this.ix[0]) - eng.v(this.ix[1]);
    if (p.pol && vt < -1.5) { if (heat(this.s, 'hr', 3, dt, 0.4)) this.burn(eng, 'court-circuit'); }
    if (vt > p.Vmax * 1.15) { if (heat(this.s, 'hv', 3, dt, 0.2)) this.burn(eng, 'court-circuit'); }
    else if (p.pol && p.esr > 0) { const P = this.I * this.I * this.q.esr; if (heat(this.s, 'hp', P / 0.25, dt, 5, 20)) this.burn(eng, 'ouvert'); }
  }
}
MODELS.capacitor = (i, p) => new Capacitor(i, p);

/* ---------------- Inductance ---------------- */
class Inductor extends El {
  constructor(i, p) { super(i, p); this.nBr = 1; }
  stampLin(eng, h) {
    const [a, b] = this.ix, k = this.br[0]; const L = this.fault === 'open' || this.burnt ? 1e6 : this.p.L; const R = this.fault === 'short' ? 1e-3 : this.p.R;
    eng.add(a, k, 1); eng.add(b, k, -1); eng.add(k, a, 1); eng.add(k, b, -1); eng.add(k, k, -(L / h + R)); this.Lh = L / h;
  }
  rhsLin(eng) { eng.b[this.br[0]] += -this.Lh * (this.s.il || 0); }
  accept(eng, dt) { const i = eng.x[this.br[0]]; this.s.il = i; this.I = i; if (!this.burnt && heat(this.s, 'h', Math.abs(i) / this.p.Imax, dt, 1.0, 4)) this.burn(eng, 'ouvert'); }
}
MODELS.inductor = (i, p) => new Inductor(i, p);

/* ---------------- Transformateur (deux enroulements couplés) ---------------- */
class Transformer extends El {
  constructor(i, p) { super(i, p); this.nBr = 2; }
  coef() {
    const p = this.p, L1 = p.Lp, n = p.Vs / p.Vp * 1.0, L2 = L1 * n * n; const k = p.k; const M = k * Math.sqrt(L1 * L2);
    return { L1, L2, M };
  }
  stampLin(eng, h) {
    const [p1, p2, s1, s2] = this.ix, [k1, k2] = this.br; const c = this.coef(); const p = this.p;
    let R1 = p.Rp, R2 = p.Rs, L1 = c.L1, L2 = c.L2, M = c.M;
    if (this.fault === 'turns') { R2 *= 1.0; L2 *= 0.25; M *= 0.5; R1 *= 2; }          // spires en court-circuit
    if (this.fault === 'openP' || this.burnt === 'primaire') { R1 = 1e9; }
    if (this.fault === 'openS') { R2 = 1e9; }
    eng.add(p1, k1, 1); eng.add(p2, k1, -1); eng.add(k1, p1, 1); eng.add(k1, p2, -1);
    eng.add(s1, k2, 1); eng.add(s2, k2, -1); eng.add(k2, s1, 1); eng.add(k2, s2, -1);
    eng.add(k1, k1, -(R1 + L1 / h)); eng.add(k1, k2, -M / h);
    eng.add(k2, k2, -(R2 + L2 / h)); eng.add(k2, k1, -M / h);
    this.h = h; this.cc = { L1, L2, M };
  }
  rhsLin(eng) { const [k1, k2] = this.br, c = this.cc, h = this.h, s = this.s; eng.b[k1] += -(c.L1 * (s.i1 || 0) + c.M * (s.i2 || 0)) / h; eng.b[k2] += -(c.M * (s.i1 || 0) + c.L2 * (s.i2 || 0)) / h; }
  accept(eng, dt) {
    const i1 = eng.x[this.br[0]], i2 = eng.x[this.br[1]]; this.s.i1 = i1; this.s.i2 = i2; this.I1 = i1; this.I2 = -i2;
    if (this.burnt) return; const p = this.p;
    const P = i1 * i1 * p.Rp + i2 * i2 * p.Rs; const Pn = p.VA * 0.25;               // pertes cuivre admissibles
    if (heat(this.s, 'h', P / Pn, dt, 6, 30)) this.burn(eng, 'primaire');
  }
}
MODELS.transformer = (i, p) => new Transformer(i, p);

/* ---------------- Sources de tension (pile, secteur, GBF) ---------------- */
class VSource extends El {
  constructor(i, p) { super(i, p); this.nBr = 1; }
  value(t) {
    const p = this.p, ty = this.inst.type;
    if (ty === 'battery') return p.V * (this.fault === 'dead' ? 0.3 : 1);
    if (ty === 'mains') return p.Veff * Math.SQRT2 * Math.sin(2 * Math.PI * p.f * t) * (p.on ? 1 : 0);
    // GBF
    if (!p.on) return 0;
    const ph = ((p.f * t) % 1 + 1) % 1; let w;
    if (p.wave === 'sin') w = Math.sin(2 * Math.PI * ph);
    else if (p.wave === 'carre') w = ph < (p.duty / 100) ? 1 : -1;
    else w = ph < 0.5 ? (4 * ph - 1) : (3 - 4 * ph);
    return p.off + p.A * w;
  }
  period() { const p = this.p; return (this.inst.type !== 'battery' && p.f > 0) ? 1 / p.f : 0; }
  stampLin(eng) {
    const [a, b] = this.ix, k = this.br[0]; const R = this.inst.type === 'battery' ? this.p.Ri : this.inst.type === 'mains' ? 0.4 : 50;
    eng.add(a, k, 1); eng.add(b, k, -1); eng.add(k, a, 1); eng.add(k, b, -1); eng.add(k, k, -R);
  }
  rhsLin(eng, h, t1) { eng.b[this.br[0]] += this.value(t1); }
  accept(eng) { this.I = -eng.x[this.br[0]]; this.V = eng.v(this.ix[0]) - eng.v(this.ix[1]); }
}
MODELS.battery = MODELS.mains = MODELS.gbf = (i, p) => new VSource(i, p);

/* ---------------- Alimentation de laboratoire (CV/CC) ---------------- */
class LabPSU extends El {
  constructor(i, p) { super(i, p); this.nBr = 1; }
  active() { return this.p.on && this.fault !== 'dead'; }
  stampLin(eng) {
    const [a, b] = this.ix, k = this.br[0]; eng.add(a, k, 1); eng.add(b, k, -1);
    if (!this.active()) { eng.add(k, k, 1); this.mode = 'off'; return; }       // sortie coupée : i = 0
    if (this.s.cc) { eng.add(k, k, 1); this.mode = 'cc'; }                       // limitation : i imposé
    else { eng.add(k, a, 1); eng.add(k, b, -1); eng.add(k, k, -0.01); this.mode = 'cv'; }   // tension imposée (Rs = 10 mΩ)
  }
  rhsLin(eng) { const k = this.br[0]; eng.b[k] += this.mode === 'off' ? 0 : this.mode === 'cc' ? -Math.max(this.p.Ilim, 1e-3) : this.p.V; }
  accept(eng) {
    const v = eng.v(this.ix[0]) - eng.v(this.ix[1]), I = -eng.x[this.br[0]]; this.V = v; this.I = I; this.cc = !!this.s.cc && this.active();
    if (!this.active()) { this.s.cc = false; return; }
    const lim = Math.max(this.p.Ilim, 1e-3);
    if (!this.s.cc && I > lim * 1.0005) { this.s.cc = true; this.ver++; }
    else if (this.s.cc && v > this.p.V) { this.s.cc = false; this.ver++; }
  }
}
MODELS.psu = (i, p) => new LabPSU(i, p);

/* ---------------- Interrupteur / bouton poussoir / fusible ---------------- */
class Switch extends El {
  stampLin(eng) {
    const closed = this.inst.type === 'pushbutton' ? !!this.s.pressed : !!this.p.closed;
    let Rv = closed ? 0.01 : 1e12; if (this.fault === 'stuckOpen') Rv = 1e12; if (this.fault === 'stuckClosed') Rv = 0.01; if (this.fault === 'oxid' && closed) Rv = 47;
    if (this.fault === 'noisy') Rv = closed ? 0.01 : 1e12;
    this.Rv = Rv; eng.cond(this.ix[0], this.ix[1], 1 / Rv);
  }
  accept(eng, dt) { const v = eng.v(this.ix[0]) - eng.v(this.ix[1]); this.I = v / this.Rv; }
}
MODELS.switch = MODELS.pushbutton = (i, p) => new Switch(i, p);

class Fuse extends El {
  stampLin(eng) { const open = this.burnt || this.fault === 'blown'; this.R = open ? 1e12 : this.p.R; eng.cond(this.ix[0], this.ix[1], 1 / this.R); }
  accept(eng, dt) {
    const v = eng.v(this.ix[0]) - eng.v(this.ix[1]); const I = v / this.R; this.I = I; if (this.burnt) return;
    this.s.ms = (this.s.ms || 0) + (I * I - (this.s.ms || 0)) * Math.min(1, dt / 0.05);   // échauffement = I² moyen (pas les pointes de courant du redressement)
    const u = this.s.ms / (this.p.I * this.p.I * 1.7); if (heat(this.s, 'h', u, dt, this.p.fast ? 0.02 : 0.3, 1.5)) this.burn(eng, 'fusible grillé');
  }
}
MODELS.fuse = (i, p) => new Fuse(i, p);

/* ---------------- Lampe à incandescence ---------------- */
class Lamp extends El {
  stampLin(eng) {
    const Rh = this.p.V * this.p.V / this.p.P; const th = Math.min(1.3, Math.max(0, this.s.th || 0));
    let R = Rh * (0.08 + 0.92 * th); if (this.burnt || this.fault === 'open') R = 1e12; this.R = R; eng.cond(this.ix[0], this.ix[1], 1 / R);
    this.ver0 = th;
  }
  accept(eng, dt) {
    const v = eng.v(this.ix[0]) - eng.v(this.ix[1]); const P = v * v / this.R; this.I = v / this.R; this.Pel = P;
    const tau = 0.12; this.s.th = (this.s.th || 0) + (Math.min(P / this.p.P, 3) - (this.s.th || 0)) * Math.min(1, dt / tau);
    this.bright = Math.min(1, Math.max(0, this.s.th));
    if (Math.abs(this.s.th - this.ver0) > 0.01) { this.ver++; }
    if (!this.burnt && heat(this.s, 'h', P / this.p.P / 1.9, dt, 2, 10)) this.burn(eng, 'filament grillé');
  }
}
MODELS.lamp = (i, p) => new Lamp(i, p);

/* ---------------- Diodes (jonction + Rs ; Zener ; LED ; Schottky) ---------------- */
function pnjlim(vnew, vold, vt, vcrit) {
  if (vnew > vcrit && Math.abs(vnew - vold) > 2 * vt) {
    if (vold > 0) { const a = (vnew - vold) / vt; if (a > 0) vnew = vold + vt * (2 + Math.log(a - 2)); else vnew = vold - vt * (2 + Math.log(2 - a)); }
    else vnew = vt * Math.log(vnew / vt);
  }
  return vnew;
}
NS.pnjlim = pnjlim;
class Diode extends El {
  constructor(i, p) { super(i, p); this.nl = true; this.nInt = 1; }
  par() { return this.p; }
  stampLin(eng) {
    const Rs = (this.fault === 'short' ? 1e-3 : this.p.Rs); eng.cond(this.ix[0], this.ii[0], 1 / Math.max(Rs, 1e-4));
    this.nvt = this.p.n * VT; this.vcrit = this.nvt * Math.log(this.nvt / (Math.SQRT2 * this.p.Is));
  }
  stampNL(eng) {
    const p = this.p, ai = this.ii[0], k = this.ix[1];
    let vd = eng.v(ai) - eng.v(k); const vold = this.s.vdi !== undefined ? this.s.vdi : (this.s.vd === undefined ? 0 : this.s.vd);
    let vl = pnjlim(vd, vold, this.nvt, this.vcrit);
    if (p.Vz) { // limitation côté claquage
      const nz = p.zs; const u = -(vd + p.Vz), uo = -(vold + p.Vz); const vcz = nz * Math.log(nz / (Math.SQRT2 * 1e-3 * 1e-3 + 1e-12));
      const ul = pnjlim(u, uo, nz, Math.max(vcz, 0.05)); if (ul !== u) vl = -(ul) - p.Vz;
    }
    if (vl !== vd) eng.noncon = true; this.s.vdi = vl;
    let I, Gd;
    if (this.fault === 'open' || (this.burnt && this.burnt !== 'court-circuit')) { I = 0; Gd = 1e-12; }
    else if (this.fault === 'short' || this.burnt === 'court-circuit') { I = vl / 1e-3; Gd = 1e3; }
    else {
      const e = sexp(vl / this.nvt); I = p.Is * (e - 1); Gd = p.Is * e / this.nvt;
      if (p.Vz) { const z = sexp(-(vl + p.Vz) / p.zs); I -= p.Izk * z; Gd += p.Izk * z / p.zs; }
      I += 1e-12 * vl; Gd += 1e-12;
    }
    eng.cond(ai, k, Gd); const ieq = I - Gd * vl; eng.rhs(ai, -ieq); eng.rhs(k, ieq);
  }
  accept(eng, dt) {
    const a = this.ix[0], ai = this.ii[0], k = this.ix[1]; const vd = eng.v(ai) - eng.v(k); this.s.vd = vd; this.s.vdi = vd;
    const I = (eng.v(a) - eng.v(ai)) / Math.max(this.fault === 'short' ? 1e-3 : this.p.Rs, 1e-4); this.I = I; this.V = eng.v(a) - eng.v(k); this.Vd = vd;
    const p = this.p; if (this.burnt) return;
    if (p.Imax) { const u = Math.abs(I) / p.Imax; if (heat(this.s, 'h', u * u * (p.Vz ? 1 : 1), dt, p.led ? 0.08 : 0.3, 2)) this.burn(eng, p.led ? 'ouvert' : (p.Vz ? 'court-circuit' : 'court-circuit')); }
    if (p.Vz && p.Pz) { const P = Math.abs(I * this.V); if (I < 0 && heat(this.s, 'hz', P / p.Pz, dt, 0.5, 4)) this.burn(eng, 'court-circuit'); }
    if (p.VRmax && this.V < -p.VRmax * 1.2 && !p.Vz) { if (heat(this.s, 'hr', 3, dt, 0.05)) this.burn(eng, p.led ? 'ouvert' : 'court-circuit'); }
  }
}
MODELS.diode = MODELS.zener = MODELS.led = (i, p) => new Diode(i, p);

/* ---------------- Transistor bipolaire ---------------- */
class BJT extends El {
  constructor(i, p) { super(i, p); this.nl = true; this.nInt = 1; }
  stampLin(eng) { this.vcrit = VT * Math.log(VT / (Math.SQRT2 * this.p.Is)); eng.cond(this.ix[0], this.ii[0], 1 / (this.p.Rcs || 1)); }
  // broches : C, B, E
  stampNL(eng) {
    const p = this.p, s = p.pnp ? -1 : 1, [C, B, E] = this.ix, Ci = this.ii[0], nodes = [Ci, B, E], o = this.s, fl = this.fault;
    const vC = eng.v(Ci), vB = eng.v(B), vE = eng.v(E);
    if (fl === 'ce') { eng.cond(C, E, 2); this.Ic = 2 * s * (vC - vE) * s; this.Ib = 0; return; }
    if (this.burnt === 'ouvert' || fl === 'open') { eng.cond(C, E, 1e-12); eng.cond(B, E, 1e-12); this.Ic = this.Ib = 0; return; }
    if (this.burnt === 'court-circuit') { eng.cond(C, E, 2); eng.cond(B, E, 0.05); this.Ic = this.Ib = 0; return; }
    const vbe = s * (vB - vE), vbc = s * (vB - vC);
    const be = pnjlim(vbe, o.vbe === undefined ? 0 : o.vbe, VT * p.Nf, this.vcrit), bc = pnjlim(vbc, o.vbc === undefined ? 0 : o.vbc, VT * p.Nr, this.vcrit);
    if (be !== vbe || bc !== vbc) eng.noncon = true; o.vbe = be; o.vbc = bc;
    const f = (a, b) => {
      const If = p.Is * (sexp(a / (p.Nf * VT)) - 1), Ir = p.Is * (sexp(b / (p.Nr * VT)) - 1);
      const fa = Math.max(0.1, 1 + (a - b) / p.VAF);
      return [(If - Ir) * fa - Ir / p.BR, If / p.BF + Ir / p.BR];
    };
    let [Ic, Ib] = f(be, bc); const dv = 1e-7, [Ic1, Ib1] = f(be + dv, bc), [Ic2, Ib2] = f(be, bc + dv);
    let a1 = (Ic1 - Ic) / dv, b1 = (Ib1 - Ib) / dv, a2 = (Ic2 - Ic) / dv, b2 = (Ib2 - Ib) / dv;
    if (fl === 'be_open') { Ic = Ib = a1 = b1 = a2 = b2 = 0; }
    // variables : vbe = s(vB-vE), vbc = s(vB-vC) ; courants réels entrants : s*Ic en C, s*Ib en B, -s(Ic+Ib) en E
    const rC = [-a2, a1 + a2, -a1], rB = [-b2, b1 + b2, -b1], rE = rC.map((x, k) => -(x + rB[k]));
    const vE0 = vE, vB0 = vE + s * be, vC0 = vB0 - s * bc;
    eng.nlStamp(nodes, [s * Ic, s * Ib, -s * (Ic + Ib)], [rC, rB, rE], [vC0, vB0, vE0]);
    // claquage par avalanche de la jonction collecteur-base (limite la surtension à ≈ 1,1·Vceo)
    const Vbr = p.Vceo * 1.1, vcb = s * (vC - vB), av = vcb > Vbr; if (av !== !!o.av) eng.noncon = true; o.av = av; this.Iav = 0;
    if (av) { const G = 0.5; eng.cond(Ci, B, G); eng.rhs(Ci, s * G * Vbr); eng.rhs(B, -s * G * Vbr); this.Iav = G * (vcb - Vbr); }
    this.Ic = s * Ic; this.Ib = s * Ib;
  }
  accept(eng, dt) {
    const p = this.p, [C, B, E] = this.ix, s = p.pnp ? -1 : 1; const vC = eng.v(C), vB = eng.v(B), vE = eng.v(E), vCi = eng.v(this.ii[0]);
    this.s.vbe = s * (vB - vE); this.s.vbc = s * (vB - vCi); this.Vce = s * (vC - vE); this.Vbe = s * (vB - vE);
    if (this.burnt) return;
    if (this.s.av) { this.s.Eav = (this.s.Eav || 0) + Math.abs(vC - vCi) / (p.Rcs || 1) * Math.abs(this.Vce) * dt; if (this.s.Eav > 2e-4) { this.burn(eng, 'court-circuit'); return; } }
    const Ic = Math.abs(this.Ic || 0), P = Math.abs(this.Vce * Math.abs(this.Ic || 0) + this.Vbe * Math.abs(this.Ib || 0));
    if (heat(this.s, 'h', Math.max(P / p.Pmax, Ic / p.Icmax), dt, 0.4, 3)) this.burn(eng, 'court-circuit');
    if (Math.abs(this.Vce) > p.Vceo * 1.15 && heat(this.s, 'hv', 3, dt, 0.05)) this.burn(eng, 'court-circuit');
    if (this.Vbe < -p.VebMax * 1.4 && heat(this.s, 'hb', 3, dt, 0.05)) this.burn(eng, 'ouvert');
  }
}
MODELS.bjt = (i, p) => new BJT(i, p);

/* ---------------- Amplificateur opérationnel ---------------- */
class OpAmp extends El {
  constructor(i, p) { super(i, p); this.nl = true; }
  // broches : IN+, IN-, OUT, V+, V-
  stampLin(eng) { if (this.fault !== 'dead' && !this.burnt) eng.cond(this.ix[3], this.ix[4], this.p.Iq / 24); }   // courant de repos modélisé par une résistance entre les alimentations
  stampNL(eng) {
    const nodes = this.ix, [ip, im, out, vp, vm] = nodes, p = this.p, rin = 2e6, o = this.s;
    const Vp = eng.v(vp), Vm = eng.v(vm), Vo = eng.v(out), Vim = eng.v(im);
    let vd = eng.v(ip) - Vim; const od = o.vdi || 0, lim = 0.05;
    const vd0 = vd; if (vd - od > lim) vd = od + lim; else if (vd - od < -lim) vd = od - lim;
    if (vd !== vd0) eng.noncon = true; o.vdi = vd;
    const active = (Vp - Vm) > p.Vmin && this.fault !== 'dead' && !this.burnt;
    let hi = Vp - p.dh, lo = Vm + p.dl, Vt, dVt = 0; const Go = 1 / p.Ro;
    if (!active) Vt = Vo; else {
      if (hi < lo + 1e-3) hi = lo + 1e-3; const mid = (hi + lo) / 2, half = (hi - lo) / 2;
      const th = Math.tanh(Math.max(-30, Math.min(30, p.A * vd / half))); Vt = mid + half * th; dVt = p.A * (1 - th * th);
    }
    const Iout = active ? Go * (Vt - Vo) : 0, Iq = 0, gq = 0;
    const iv = Iq + Math.max(Iout, 0), ivm = Iq + Math.max(-Iout, 0), gi = 1 / rin, K = Go * dVt;
    const I0 = [vd * gi, -vd * gi, -Iout, iv, -ivm];
    const J = [[gi, -gi, 0, 0, 0], [-gi, gi, 0, 0, 0], [-K, K, active ? Go : 1e-9, 0, 0], [0, 0, 0, gq, -gq], [0, 0, 0, -gq, gq]];
    eng.nlStamp(nodes, I0, J, [Vim + vd, Vim, Vo, Vp, Vm]);
    this.Iout = Iout; this.active = active;
  }
  accept(eng, dt) {
    const [ip, im, out, vp, vm] = this.ix; this.Vo = eng.v(out); this.Vd = eng.v(ip) - eng.v(im); this.I = this.Iout;
    if (this.burnt) return; const p = this.p; const sup = eng.v(vp) - eng.v(vm);
    if ((sup > p.Vmax * 1.1 || sup < -0.7) && heat(this.s, 'h', 3, dt, 0.1)) this.burn(eng, 'HS');
    if (Math.abs(this.Iout) > 3 * p.Imax && heat(this.s, 'hi', 3, dt, 0.5)) this.burn(eng, 'HS');
  }
}
MODELS.opamp = (i, p) => new OpAmp(i, p);

/* ---------------- Régulateur linéaire (78xx) ---------------- */
class Regulator extends El {
  constructor(i, p) { super(i, p); this.nl = true; }
  // broches : IN, GND, OUT
  stampNL(eng) {
    const nodes = this.ix, [IN, GND, OUT] = nodes, p = this.p, o = this.s;
    if (this.fault === 'short' || this.burnt === 'court-circuit') { eng.nlStamp([IN, OUT], [0, 0], [[20, -20], [-20, 20]], [0, 0]); eng.cond(IN, OUT, 0); this.Iout = (eng.v(IN) - eng.v(OUT)) * 20; return; }
    const vIN = eng.v(IN), vG = eng.v(GND), vO = eng.v(OUT), vin = vIN - vG, vout = vO - vG;
    const off = this.fault === 'dead' || this.burnt === 'ouvert' || o.tsd; const Gout = 25, Il = p.Ilim;
    let Vt = 0, dVt = 0;
    if (!off) {
      const bb = vin - p.drop, a = p.V, k = 0.15, d = a - Math.max(bb, 0), r = Math.sqrt(d * d + k * k);
      Vt = 0.5 * (a + Math.max(bb, 0) - r); dVt = bb > 0 ? 0.5 * (1 + d / r) : 0;
    }
    const th = Math.tanh(Math.max(-30, Math.min(30, Gout * (Vt - vout) / Il))), Io = Il * th, s2 = 1 - th * th;
    const gO = Gout * s2 + 1e-9, gV = Gout * dVt * s2, Iq = off ? 0 : p.Iq;
    const rowIN = [gV, gO - gV, -gO];                                  // ∂Io/∂(vIN, vGND, vOUT)
    const J = [rowIN, [0, 0, 0], rowIN.map(x => -x)];
    eng.nlStamp(nodes, [Io + Iq, -Iq, -Io], J, [vIN, vG, vO]);
    this.Iout = Io; this.Iq = Iq; this.Vt = Vt;
  }
  accept(eng, dt) {
    const [IN, GND, OUT] = this.ix; const vin = eng.v(IN) - eng.v(GND), vout = eng.v(OUT) - eng.v(GND); this.Vin = vin; this.Vout = vout; this.I = this.Iout;
    const p = this.p, o = this.s;
    const P = Math.max(0, (vin - vout) * Math.max(this.Iout || 0, 0)) + vin * (this.Iq || 0);
    const Rth = p.heatsink ? 12 : 65, T0 = o.T === undefined ? 25 : o.T; o.T = T0 + (25 + P * Rth - T0) * Math.min(1, dt / 4); this.T = o.T;
    if (!o.tsd && o.T > 150) { o.tsd = true; this.ver++; ev(eng, 'info', this, 'Protection thermique : le régulateur coupe sa sortie'); }
    else if (o.tsd && o.T < 125) { o.tsd = false; this.ver++; }
    if (!this.burnt && (vin > p.Vmax * 1.15 || vout > vin + 1.5) && heat(o, 'h', 3, dt, 0.1)) this.burn(eng, 'court-circuit');
  }
}
MODELS.regulator = (i, p) => new Regulator(i, p);

/* ---------------- Relais (bobine + contact inverseur) ---------------- */
class Relay extends El {
  constructor(i, p) { super(i, p); this.nBr = 1; }
  stampLin(eng, h) {
    const [c1, c2, no, com, nc] = this.ix, k = this.br[0], p = this.p;
    let R = p.Rc, L = p.L; if (this.fault === 'coilOpen' || this.burnt) R = 1e9;
    eng.add(c1, k, 1); eng.add(c2, k, -1); eng.add(k, c1, 1); eng.add(k, c2, -1); eng.add(k, k, -(R + L / h)); this.Lh = L / h;
    const on = !!this.s.on && this.fault !== 'stuck';
    const Gc = (this.fault === 'contact' ? 1 / 22 : 1 / 0.05), Go = 1e-9;
    eng.cond(com, no, on || this.fault === 'stuckNO' ? Gc : Go); eng.cond(com, nc, on ? Go : Gc);
    this.onS = on;
  }
  rhsLin(eng) { eng.b[this.br[0]] += -this.Lh * (this.s.il || 0); }
  accept(eng, dt) {
    const i = eng.x[this.br[0]]; this.s.il = i; this.I = i; const Inom = this.p.V / this.p.Rc;
    const on = !!this.s.on;
    if (!on && i > 0.7 * Inom) { this.s.on = true; this.ver++; ev(eng, 'click', this, 'Le relais colle'); }
    else if (on && i < 0.25 * Inom) { this.s.on = false; this.ver++; ev(eng, 'click', this, 'Le relais retombe'); }
    if (!this.burnt && heat(this.s, 'h', (i * i * this.p.Rc) / (this.p.V * this.p.V / this.p.Rc * 2), dt, 2, 10)) this.burn(eng, 'bobine coupée');
  }
}
MODELS.relay = (i, p) => new Relay(i, p);

/* ---------------- Masse ---------------- */
MODELS.ground = (i, p) => new El(i, p);

/* ---------------- Instruments ---------------- */
/* ring buffer de signaux (oscilloscope) */
class Ring {
  constructor(cap, ch) { this.cap = cap; this.t = new Float64Array(cap); this.v = []; for (let i = 0; i < ch; i++) this.v.push(new Float32Array(cap)); this.n = 0; this.head = 0; }
  push(t, vals) { const i = this.head; this.t[i] = t; for (let c = 0; c < vals.length; c++) this.v[c][i] = vals[c]; this.head = (i + 1) % this.cap; if (this.n < this.cap) this.n++; }
  /* index logique j (0 = plus ancien) */
  idx(j) { return (this.head - this.n + j + this.cap * 2) % this.cap; }
  at(j) { return this.t[this.idx(j)]; }
  find(t) { // premier j tel que at(j) >= t
    let lo = 0, hi = this.n; while (lo < hi) { const m = (lo + hi) >> 1; if (this.at(m) < t) lo = m + 1; else hi = m; } return lo;
  }
}
NS.Ring = Ring;

class Multimeter extends El {
  constructor(i, p) { super(i, p); }
  stampLin(eng) {
    const [a, b] = this.ix, m = this.p.mode, s = this.s; const fuseBlown = s.fuseA || s.fuseB;
    let mode = m;
    this.rr = 1e7;
    if (m === 'VDC' || m === 'VAC') { eng.cond(a, b, 1 / 1e7); }
    else if (m === 'mA') { eng.cond(a, b, s.fuseA ? 1e-12 : 1 / 1.0); }
    else if (m === 'A') { eng.cond(a, b, s.fuseB ? 1e-12 : 1 / 0.05); }
    else if (m === 'Ohm' || m === 'Cont') { const Rr = m === 'Cont' ? 100 : (s.Rr || 1000); this.Rr = Rr; eng.cond(a, b, 1 / Rr); }
    else if (m === 'Diode') { eng.cond(a, b, 1 / 3000); }
  }
  rhsLin(eng) {
    const [a, b] = this.ix, m = this.p.mode, s = this.s;
    if (m === 'Ohm') { const I = 0.45 / (s.Rr || 1000); eng.rhs(a, I); eng.rhs(b, -I); }
    else if (m === 'Cont') { eng.rhs(a, 0.45 / 100); eng.rhs(b, -0.45 / 100); }
    else if (m === 'Diode') { const I = 3.0 / 3000; eng.rhs(a, I); eng.rhs(b, -I); }
  }
  accept(eng, dt) {
    const s = this.s, m = this.p.mode, v = eng.v(this.ix[0]) - eng.v(this.ix[1]);
    // statistiques glissantes sur ~0,25 s (cumuls)
    if (!s.ring) { s.ring = new Ring(16384, 2); s.c1 = 0; s.c2 = 0; }
    s.c1 += v * dt; s.c2 += v * v * dt; s.ring.push(eng.t, [s.c1, s.c2]); s.v = v; s.m = m; s.last = eng.t;
    const r = s.ring, W = 0.25; const j = r.find(eng.t - W); const j0 = Math.max(0, j - 1);
    const t0 = r.at(j0), a1 = r.v[0][r.idx(j0)], a2 = r.v[1][r.idx(j0)]; const span = eng.t - t0;
    if (span > 1e-9) { s.mean = (s.c1 - a1) / span; s.ms = (s.c2 - a2) / span; } else { s.mean = v; s.ms = v * v; }
    if (m === 'mA' || m === 'A') {
      const sh = m === 'mA' ? 1.0 : 0.05; const I = v / sh; this.I = I; const lim = m === 'mA' ? 0.4 : 10; // calibre
      if (!(m === 'mA' ? s.fuseA : s.fuseB)) { const u = (I * I) / (lim * lim * 1.5); if (heat(s, 'hf' + m, u, dt, 0.02, 1)) { if (m === 'mA') s.fuseA = true; else s.fuseB = true; this.ver++; ev(eng, 'warn', this, 'Fusible du multimètre grillé (' + (m === 'mA' ? '0,5 A' : '10 A') + ') — appuyez sur « Remplacer le fusible »'); } }
    }
    if (m === 'Ohm') { // calibrage automatique
      const Rr = s.Rr || 1000; const vs = 0.45, x = s.mean; let ratio = x / vs; let R = Rr * x / Math.max(vs - x, 1e-9); s.R = R;
      if (ratio > 0.8 && Rr < 1e7) { s.Rr = Rr * 10; this.ver++; } else if (ratio < 0.05 && Rr > 100) { s.Rr = Rr / 10; this.ver++; }
    }
  }
  reading() {
    const s = this.s, m = this.p.mode; const err = 1 + ((this.inst.dev || 0) * 0.003);
    if (!s.ring || s.mean === undefined) return { txt: '0.000', unit: m === 'Ohm' ? 'Ω' : 'V', val: 0, raw: 0 };
    const fb = (m === 'mA' && s.fuseA) || (m === 'A' && s.fuseB);
    if (fb) return { txt: 'FUSE', unit: '', val: NaN, fuse: true };
    if (m === 'VDC') return { val: s.mean * err, unit: 'V', dc: true, over: Math.abs(s.mean) > 1000 };
    if (m === 'VAC') { const ac = Math.sqrt(Math.max(0, s.ms - s.mean * s.mean)); return { val: ac * err, unit: 'V', ac: true }; }
    if (m === 'mA') return { val: s.mean / 1.0 * err, unit: 'A', over: Math.abs(s.mean) > 0.4 };
    if (m === 'A') return { val: s.mean / 0.05 * err, unit: 'A', over: Math.abs(s.mean) > 0.5 };
    if (m === 'Ohm') { const R = s.R; const ratio = s.mean / 0.45; if (ratio > 0.97 || !isFinite(R) || R > 6e7) return { txt: 'OL', unit: 'Ω', over: true, val: Infinity }; return { val: Math.max(R, 0) * err, unit: 'Ω' }; }
    if (m === 'Cont') { const ratio = s.mean / 0.45, R = 100 * ratio / Math.max(1 - ratio, 1e-9); return { val: Math.max(R, 0), unit: 'Ω', beep: R < 50 }; }
    if (m === 'Diode') { if (s.mean > 2.9) return { txt: 'OL', unit: 'V', over: true, val: Infinity }; return { val: s.mean, unit: 'V', diode: true }; }
    return { txt: '—', unit: '', val: NaN };
  }
}
MODELS.multimeter = (i, p) => new Multimeter(i, p);

class Scope extends El {
  stampLin(eng) { const [c1, c2, gn] = this.ix; eng.cond(c1, gn, 1e-6); eng.cond(c2, gn, 1e-6); }
  accept(eng, dt) {
    const s = this.s; if (!s.ring) s.ring = new Ring(262144, 2);
    const [c1, c2, gn] = this.ix; const vg = eng.v(gn);
    if (!s.last || eng.t - s.last >= 0) s.ring.push(eng.t, [eng.v(c1) - vg, eng.v(c2) - vg]); s.last = eng.t;
  }
}
MODELS.scope = (i, p) => new Scope(i, p);
})(typeof window !== 'undefined' ? window : globalThis);
