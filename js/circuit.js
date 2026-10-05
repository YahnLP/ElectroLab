/* circuit.js — modèle du schéma (composants, fils, jonctions), extraction de la netlist, pilotage du moteur */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { PARTS, Engine, MODELS } = NS;

function rotPt(x, y, rot) { switch (((rot % 360) + 360) % 360) { case 90: return [-y, x]; case 180: return [-x, -y]; case 270: return [y, -x]; default: return [x, y]; } }
NS.rotPt = rotPt;

class Circuit {
  constructor() { this.parts = []; this.wires = []; this.junctions = []; this.seq = 1; this.nameN = {}; }
  uid(p) { return p + (this.seq++); }
  part(id) { return this.parts.find(p => p.id === id); }
  byRef(ref) { return this.parts.find(p => p.ref === ref); }
  pinPos(inst, i) { const pin = PARTS[inst.type].pins[i]; const [x, y] = rotPt(pin.x, pin.y, inst.rot); return [inst.x + x, inst.y + y]; }
  pinIndex(inst, name) { return PARTS[inst.type].pins.findIndex(p => p.n === name); }
  endPos(e) { if (e.j) { const j = this.junctions.find(k => k.id === e.j); return j ? [j.x, j.y] : [0, 0]; } const c = this.part(e.c); return c ? this.pinPos(c, e.p) : [0, 0]; }
  add(type, x, y, params, ref) {
    const inst = NS.newInst(type, x, y, this.uid('c')); Object.assign(inst.p, params || {});
    const d = PARTS[type]; if (ref) inst.ref = ref; else if (!d.noLabel) { const n = (this.nameN[d.ref] = (this.nameN[d.ref] || 0) + 1); inst.ref = d.ref + n; } else inst.ref = '';
    inst.dev = NS.rng(this.seq * 2654435 + type.length)() * 2 - 1;
    this.parts.push(inst); return inst;
  }
  junction(x, y) { const j = { id: this.uid('j'), x, y }; this.junctions.push(j); return j; }
  /* fil entre deux extrémités : {c:id,p:pinIdx} ou {j:id} ; mid = points intermédiaires */
  wire(a, b, mid, color) { const w = { id: this.uid('w'), a, b, mid: mid || [], color: color || null }; this.wires.push(w); return w; }
  /* raccourci : fil entre broches nommées */
  link(ra, pa, rb, pb, mid, color) {
    const A = typeof ra === 'string' ? this.byRef(ra) : ra, B = typeof rb === 'string' ? this.byRef(rb) : rb;
    const ia = this.pinIndex(A, pa), ib = this.pinIndex(B, pb); if (ia < 0 || ib < 0) throw new Error('broche inconnue ' + ra + ':' + pa + ' / ' + rb + ':' + pb);
    return this.wire({ c: A.id, p: ia }, { c: B.id, p: ib }, mid, color);
  }
  remove(inst) { this.parts = this.parts.filter(p => p !== inst); this.wires = this.wires.filter(w => !(w.a.c === inst.id || w.b.c === inst.id)); }
  /* ---- netlist ---- */
  nets() {
    const par = new Map(); const key = e => e.j ? 'j' + e.j : 'c' + e.c + ':' + e.p;
    const find = k => { let r = k; while (par.get(r) !== r) r = par.get(r); let c = k; while (par.get(c) !== r) { const n = par.get(c); par.set(c, r); c = n; } return r; };
    const add = k => { if (!par.has(k)) par.set(k, k); };
    for (const p of this.parts) PARTS[p.type].pins.forEach((_, i) => add('c' + p.id + ':' + i));
    for (const j of this.junctions) add('j' + j.id);
    for (const w of this.wires) { const a = key(w.a), b = key(w.b); add(a); add(b); const ra = find(a), rb = find(b); if (ra !== rb) par.set(ra, rb); }
    return { find, key };
  }
  compile() {
    const { find } = this.nets(); const idx = new Map(); let n = 1;
    // masse
    let gnd = null; for (const p of this.parts) if (p.type === 'ground') { gnd = find('c' + p.id + ':0'); break; }
    this.hasGround = gnd !== null;
    if (gnd === null) { const s = this.parts.find(p => ['psu', 'battery', 'gbf', 'mains'].includes(p.type)); if (s) { const pi = s.type === 'battery' ? 1 : PARTS[s.type].pins.length - 1; gnd = find('c' + s.id + ':' + pi); } }
    if (gnd !== null) idx.set(gnd, 0); else n = 0, idx.set('__none', 0), n = 1;
    const nodeOf = k => { const r = find(k); if (!idx.has(r)) idx.set(r, n++); return idx.get(r); };
    const els = []; this.pinNode = {};
    for (const p of this.parts) {
      const d = PARTS[p.type]; const nodes = d.pins.map((_, i) => nodeOf('c' + p.id + ':' + i));
      this.pinNode[p.id] = nodes; if (p.type === 'ground') continue;
      const ep = d.eff(p.p, p); if (p.type === 'zener' && ep.Vz) ep.Vz = ep.Vz * (1 + 0.05 * p.dev);
      const el = MODELS[p.type](p, ep); el.nodes = nodes; el.part = p; els.push(el);
    }
    this.nodeOfKey = nodeOf; this.findNet = find;
    return { els, nNodes: n };
  }
}
NS.Circuit = Circuit;

/* ---- Simulation : circuit + moteur + historique d'événements ---- */
class Sim {
  constructor(circuit) {
    this.c = circuit || new Circuit(); this.eng = new Engine(); this.events = []; this.speed = 1; this.running = true; this.dirty = true; this.elOf = new Map();
    this.eng.onEvent = e => { this.events.push(Object.assign({ t: this.eng.t }, e)); if (this.onEvent) this.onEvent(e); this.dirty = true; };
  }
  invalidate() { this.dirty = true; }
  rebuild() {
    const { els, nNodes } = this.c.compile(); const t = this.eng.t, dn = this.eng.dtNext;
    const xo = this.eng.x ? this.eng.x.slice() : null; this.eng.build(els, nNodes); this.eng.t = t;
    if (xo && xo.length === this.eng.x.length) { this.eng.x.set(xo); this.eng.xp.set(xo); } this.eng.dtNext = Math.min(dn, 2e-6); this.elOf = new Map(els.map(e => [e.part.id, e])); this.dirty = false;
    if (xo && xo.length === this.eng.x.length && !this.noRefresh) { this.noRefresh = true; try { this.eng.step(1e-9); } finally { this.noRefresh = false; } }
  }
  advance(dT, budgetMs) { if (this.dirty) this.rebuild(); const e = this.eng; const r = e.advance(dT, budgetMs); if (this.dirty) this.rebuild(); return r; }
  /* tension d'un nœud (broche) */
  vPin(ref, pin) { if (this.dirty) this.rebuild(); const p = typeof ref === 'string' ? this.c.byRef(ref) : ref; const i = this.c.pinIndex(p, pin); const n = this.c.pinNode[p.id][i]; return n === 0 ? 0 : this.eng.x[n - 1]; }
  vBetween(r1, p1, r2, p2) { return this.vPin(r1, p1) - this.vPin(r2, p2); }
  el(ref) { if (this.dirty) this.rebuild(); const p = typeof ref === 'string' ? this.c.byRef(ref) : ref; return this.elOf.get(p.id); }
  /* simule jusqu'au régime établi (utile pour les tests et les vérifications de TP) */
  settle(T) { this.advance(T || 1.0); }
  reset() { for (const p of this.c.parts) { p.rt = {}; p.burnt = null; } this.eng.t = 0; this.events = []; this.dirty = true; }
}
NS.Sim = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
