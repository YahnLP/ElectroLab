/* scenarios.js — cadre des TP : outils de construction, contexte de vérification, couverture du programme */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const SC = NS.SCENARIOS = [];

/* ---------- construction ---------- */
NS.mk = function (c) {
  const api = {
    c,
    p(type, ref, x, y, params, rot) { const i = c.add(type, x, y, params, ref); i.rot = rot || 0; return i; },
    /* fil entre deux broches ; pts = points de passage exacts */
    w(a, pa, b, pb, pts, color) { return c.link(a, pa, b, pb, pts || [], color); },
    j(x, y) { return c.junction(x, y); },
    wj(ref, pin, j, pts) { const p = c.byRef(ref); return c.wire({ c: p.id, p: c.pinIndex(p, pin) }, { j: j.id }, pts || []); },
    jj(j1, j2, pts) { return c.wire({ j: j1.id }, { j: j2.id }, pts || []); },
  };
  return api;
};
/* remplace un composant par un neuf (même valeur) */
NS.replacePart = function (inst) { inst.fault = null; inst.burnt = null; inst.rt = {}; inst.replaced = (inst.replaced || 0) + 1; };

/* ---------- contexte de vérification (utilisé par l'appli et par les tests) ---------- */
NS.makeCtx = function (sim) {
  const c = sim.c; const ensure = () => { if (sim.dirty) sim.rebuild(); };
  const ctx = {
    sim, c, tp: null,
    v: (r, p) => sim.vPin(r, p), vd: (r1, p1, r2, p2) => sim.vPin(r1, p1) - sim.vPin(r2, p2),
    el: r => sim.el(r), part: r => c.byRef(r), I: r => sim.el(r).I, replaced: r => (c.byRef(r).replaced || 0),
    settle: t => sim.advance(t || 0.5),
    net(r, p) { ensure(); const part = c.byRef(r); return c.pinNode[part.id][c.pinIndex(part, p)]; },
    meters() { ensure(); return c.parts.filter(p => p.type === 'multimeter').map(p => ({ part: p, el: sim.el(p), mode: p.p.mode, a: c.pinNode[p.id][0], b: c.pinNode[p.id][1] })); },
    /* voltmètre câblé entre les broches données ? */
    voltmeterAcross(r1, p1, r2, p2, ac) { const a = ctx.net(r1, p1), b = ctx.net(r2, p2); if (a === b) return false; return ctx.meters().some(m => m.mode === (ac ? 'VAC' : 'VDC') && ((m.a === a && m.b === b) || (m.a === b && m.b === a))); },
    /* ampèremètre en série avec le composant (même courant) ? */
    ammeterIn(ref, minI) { const I = ctx.el(ref).I; return ctx.meters().some(m => (m.mode === 'mA' || m.mode === 'A') && m.a !== m.b && Math.abs(m.el.I || 0) > (minI || 1e-4) && Math.abs(Math.abs(m.el.I) - Math.abs(I)) <= 0.05 * Math.abs(I) + 1e-6); },
    anyBurnt() { return c.parts.filter(p => p.burnt && !(p.type === 'multimeter')); },
    /* échantillonne une grandeur pendant T secondes */
    measure(fn, T, n) { n = n || 400; const out = []; const dt = T / n; for (let i = 0; i < n; i++) { sim.advance(dt); out.push(fn()); } return { min: Math.min(...out), max: Math.max(...out), mean: out.reduce((a, b) => a + b, 0) / out.length, pp: Math.max(...out) - Math.min(...out), data: out }; },
    scopeWired(r, ch1, ch2) { // CH1/CH2/GND câblés sur les nœuds donnés ([ref,pin])
      const so = c.parts.find(p => p.type === 'scope'); if (!so) return false; const n = c.pinNode[so.id]; const want = (pair) => ctx.net(pair[0], pair[1]);
      return (!ch1 || n[0] === want(ch1)) && (!ch2 || n[1] === want(ch2)) && n[2] === 0;
    },
  };
  return ctx;
};
/* exécute les critères d'un TP sur une COPIE du circuit (n'altère pas la simulation en cours) */
NS.evalChecks = function (sc, circuit, tp, opts) {
  const c2 = NS.deserialize(NS.serialize(circuit)); circuit.parts.forEach(p => { const q = c2.part(p.id); if (q) { q.replaced = p.replaced; q.burnt = p.burnt; q.fault = p.fault; q.dev = p.dev; } });
  if (opts && opts.keepRt) circuit.parts.forEach(p => { const q = c2.part(p.id); q.rt = JSON.parse(JSON.stringify(p.rt || {}, (k, v) => (k === 'ring' ? undefined : v))); });
  const sim2 = new NS.Sim(c2); const ctx = NS.makeCtx(sim2); ctx.tp = tp; sim2.advance(sc.settle || 1.0);
  const res = sc.checks.map(k => { let ok = false; try { ok = !!k.run(ctx); } catch (e) { ok = false; if (typeof console !== 'undefined') console.warn('check', k.label, e.message); } return { label: k.label, ok }; });
  return res;
};

/* ---------- outils de TP communs ---------- */
NS.near = (v, t, tol) => Math.abs(v - t) <= tol * Math.max(Math.abs(t), 1e-9);
NS.regScenario = function (sc) { sc.settle = sc.settle || 1.0; SC.push(sc); return sc; };
const STD = { level: 'Bac Pro CIEL', };
NS.std = STD;
})(typeof window !== 'undefined' ? window : globalThis);
(function (g) {
const NS = g.NS;
NS.cutWire = function (c, ra, pa, rb, pb) {
  const A = c.byRef(ra), B = c.byRef(rb), ia = c.pinIndex(A, pa), ib = c.pinIndex(B, pb);
  const m = (e, p, i) => e.c === p.id && e.p === i; const w = c.wires.find(w => (m(w.a, A, ia) && m(w.b, B, ib)) || (m(w.a, B, ib) && m(w.b, A, ia)));
  if (w) c.wires = c.wires.filter(x => x !== w); return !!w;
};
})(typeof window !== 'undefined' ? window : globalThis);
