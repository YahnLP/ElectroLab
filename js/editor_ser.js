/* editor_ser.js — (sérialisation du schéma, séparée de l'éditeur pour être utilisable sans DOM) */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { PARTS } = NS;
NS.serialize = function (c) {
  return { v: 1, seq: c.seq, nameN: c.nameN, parts: c.parts.map(p => ({ id: p.id, type: p.type, x: p.x, y: p.y, rot: p.rot, p: p.p, fault: p.fault, burnt: p.burnt, dev: p.dev, ref: p.ref, replaced: p.replaced })), wires: c.wires, junctions: c.junctions };
};
NS.deserialize = function (o) {
  const c = new NS.Circuit(); c.seq = o.seq || 1; c.nameN = o.nameN || {};
  for (const q of o.parts) { if (!PARTS[q.type]) continue; const inst = NS.newInst(q.type, q.x, q.y, q.id); Object.assign(inst, { rot: q.rot || 0, fault: q.fault || null, burnt: q.burnt || null, dev: q.dev || 0, ref: q.ref, replaced: q.replaced || 0 }); inst.p = Object.assign({}, inst.p, JSON.parse(JSON.stringify(q.p))); c.parts.push(inst); }
  c.wires = (o.wires || []).map(w => ({ id: w.id, a: w.a, b: w.b, mid: w.mid || [], color: w.color || null, probe: w.probe || undefined })); c.junctions = (o.junctions || []).map(j => Object.assign({}, j));
  return c;
};
})(typeof window !== 'undefined' ? window : globalThis);
