/* editor.js — éditeur de schéma SVG : placement, câblage orthogonal, jonctions, rotation, annulation */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { h, $, $$, clear, PARTS, rotPt, fmt } = NS;
const SVGNS = 'http://www.w3.org/2000/svg';
const snap = v => Math.round(v / 20) * 20;
const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

function valueText(i) {
  const p = i.p; switch (i.type) {
    case 'resistor': case 'pot': return fmt(p.R, 'Ω', 3);
    case 'capacitor': return fmt(p.C, 'F', 3) + (p.pol ? ' / ' + p.Vmax + ' V' : '');
    case 'inductor': return fmt(p.L, 'H', 3);
    case 'battery': return fmt(p.V, 'V', 3);
    case 'diode': case 'led': case 'zener': case 'bjt': case 'opamp': case 'regulator': return p.model;
    case 'transformer': return p.model.replace('230V / ', '230/');
    case 'fuse': return (p.fast ? 'F ' : 'T ') + fmt(p.I, 'A', 3);
    case 'lamp': return p.V + ' V / ' + p.P + ' W';
    case 'relay': return 'Bobine ' + p.V + ' V';
    case 'gate': case 'inv': return p.fn + ' · ' + p.fam; case 'dff': case 'cnt4': return p.fam; case 'timer555': case 'opto': case 'mosfet': return p.model;
    case 'ldr': return fmt(p.lux, 'lx', 3); case 'ctn': return p.T + ' °C';
    default: return '';
  }
}
NS.valueText = valueText;
function bbox(inst) {
  const d = PARTS[inst.type]; let [x1, y1, x2, y2] = d.ext || [-24, -18, 24, 18];
  d.pins.forEach(p => { x1 = Math.min(x1, p.x); x2 = Math.max(x2, p.x); y1 = Math.min(y1, p.y); y2 = Math.max(y2, p.y); });
  return [x1, y1, x2, y2];
}

class Editor {
  constructor(app) {
    this.app = app; this.svg = $('#canvas'); this.world = $('#world'); this.gParts = $('#parts'); this.gWires = $('#wires'); this.gJ = $('#juncs'); this.gRub = $('#rubber');
    this.view = { x: 260, y: 160, k: 1 }; this.tool = 'select'; this.sel = null; this.selWire = null; this.selJ = null; this.armed = null; this.wiring = null; this.drag = null; this.undoStack = [];
    this.partEls = new Map(); this.dynKey = new Map(); this.mouse = [0, 0]; this.bind(); this.applyView();
  }
  get c() { return this.app.circuit; }
  applyView() { const v = this.view; this.world.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`); }
  toWorld(e) { const r = this.svg.getBoundingClientRect(); return [(e.clientX - r.left - this.view.x) / this.view.k, (e.clientY - r.top - this.view.y) / this.view.k]; }
  fit() {
    const c = this.c; if (!c.parts.length) { this.view = { x: 260, y: 160, k: 1 }; return this.applyView(); }
    let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    c.parts.forEach(p => { const b = bbox(p); [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].forEach(([x, y]) => { const [rx, ry] = rotPt(x, y, p.rot); x1 = Math.min(x1, p.x + rx); x2 = Math.max(x2, p.x + rx); y1 = Math.min(y1, p.y + ry); y2 = Math.max(y2, p.y + ry); }); });
    const r = this.svg.getBoundingClientRect(); const k = Math.min(1.6, Math.max(0.35, Math.min((r.width - 60) / (x2 - x1 + 40), (r.height - 60) / (y2 - y1 + 60))));
    this.view = { k, x: r.width / 2 - k * (x1 + x2) / 2, y: r.height / 2 - k * (y1 + y2) / 2 }; this.applyView();
  }
  setTool(t) { this.tool = t; this.cancelWiring(); this.svg.dataset.tool = t; $$('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); this.hint(); }
  arm(type) { this.armed = type; this.setTool('select'); this.cancelWiring(); $$('.pal-item').forEach(b => b.classList.toggle('armed', b.dataset.type === type)); this.hint(); this.ghost(); }
  hint() {
    const t = $('#toolhint'); let s = '';
    if (this.armed) s = 'Cliquez pour placer « ' + PARTS[this.armed].label + ' » · R : pivoter · Échap : terminer';
    else if (this.wiring) s = 'Cliquez une broche pour terminer · clic dans le vide = point de passage · Échap : annuler';
    else if (this.tool === 'wire') s = 'Fil : cliquez une broche (ou un fil) de départ';
    else if (this.tool === 'probe') s = 'Pointes de touche : clic sur une broche = pointe rouge (+) ; clic suivant = pointe noire (COM) · Maj+clic = noire';
    else if (this.tool === 'delete') s = 'Cliquez un composant ou un fil pour le supprimer';
    else s = 'Glissez une broche vers une autre pour câbler · glissez un câble pour déplacer son segment (double-clic : retracé auto) · double-clic sur un instrument pour l\'ouvrir';
    t.textContent = s;
  }
  /* ---------------- historique ---------------- */
  snapshot() { return JSON.stringify(NS.serialize(this.c)); }
  pushUndo() { this.undoStack.push(this.snapshot()); if (this.undoStack.length > 60) this.undoStack.shift(); }
  undo() { const s = this.undoStack.pop(); if (!s) return; this.app.loadCircuit(JSON.parse(s), true); }
  /* ---------------- rendu ---------------- */
  render() {
    clear(this.gParts); clear(this.gWires); clear(this.gJ); this.partEls.clear(); this.dynKey.clear();
    for (const w of this.c.wires) this.gWires.appendChild(this.wireEl(w));
    for (const p of this.c.parts) { const e = this.partEl(p); this.partEls.set(p.id, e); this.gParts.appendChild(e); }
    this.renderJunctions(); this.dyn(true);
  }
  expand(w) {
    const c = this.c; const A = c.endPos(w.a), B = c.endPos(w.b); const pts = [A].concat(w.mid || [], [B]);
    const dir = e => { if (e.j) return 'h'; const p = c.part(e.c); if (!p) return 'h'; const pin = PARTS[p.type].pins[e.p]; const [rx, ry] = rotPt(pin.x, pin.y, p.rot); const bb = bbox(p); // sens sortant : depuis le bord du corps
      const [cx, cy] = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]; const [qx, qy] = rotPt(cx, cy, p.rot); const dx = rx - qx, dy = ry - qy; return Math.abs(dy) > Math.abs(dx) ? 'v' : 'h'; };
    const dA = dir(w.a), dB = dir(w.b); const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p = out[out.length - 1], q = pts[i];
      if (p[0] !== q[0] && p[1] !== q[1]) {
        const first = i === 1, last = i === pts.length - 1;
        if (first && last) {
          if (dA === dB) { if (dA === 'v') { const my = snap((p[1] + q[1]) / 2); out.push([p[0], my], [q[0], my]); } else { const mx = snap((p[0] + q[0]) / 2); out.push([mx, p[1]], [mx, q[1]]); } }
          else out.push(dA === 'v' ? [p[0], q[1]] : [q[0], p[1]]);
        } else if (first) out.push(dA === 'v' ? [p[0], q[1]] : [q[0], p[1]]);
        else if (last) out.push(dB === 'v' ? [q[0], p[1]] : [p[0], q[1]]);
        else out.push([q[0], p[1]]);
      }
      out.push(q);
    }
    return out;
  }
  wireEl(w) {
    const pts = this.expand(w); const d = 'M' + pts.map(p => p[0] + ' ' + p[1]).join(' L');
    let col = w.color || ''; if (!col) { for (const e of [w.a, w.b]) if (e.c) { const p = this.c.part(e.c); const pin = p && PARTS[p.type].pins[e.p]; if (pin && pin.c && ['multimeter', 'scope'].includes(p.type)) col = pin.c; } }
    const gr = svgEl('g', { 'data-wid': w.id }); const path = svgEl('path', { d, class: 'wire' + (col ? ' ' + col : '') + (w.probe ? ' probe' : '') + (this.selWire === w.id ? ' sel' : '') }); const hit = svgEl('path', { d, class: 'wirehit', 'data-wid': w.id });
    gr.appendChild(path); gr.appendChild(hit); if (this.selWire === w.id) for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); if (L >= 20) gr.appendChild(svgEl('rect', { x: (a[0] + b[0]) / 2 - 4, y: (a[1] + b[1]) / 2 - 4, width: 8, height: 8, rx: 2, class: 'seghandle' })); } if (w.probe) { const q = pts[pts.length - 1]; gr.appendChild(svgEl('circle', { cx: q[0], cy: q[1], r: 6, class: 'probetip ' + (col || '') })); } return gr;
  }
  renderJunctions() {
    clear(this.gJ); const cnt = new Map();
    for (const w of this.c.wires) for (const e of [w.a, w.b]) if (e.j) cnt.set(e.j, (cnt.get(e.j) || 0) + 1);
    const pc = new Map(); for (const w of this.c.wires) for (const e of [w.a, w.b]) if (e.c) { const k = e.c + ':' + e.p; pc.set(k, (pc.get(k) || 0) + 1); }
    for (const [k, n] of pc) if (n >= 2) { const [id, pi] = k.split(':'); const q = this.c.endPos({ c: id, p: +pi }); if (q) this.gJ.appendChild(svgEl('circle', { cx: q[0], cy: q[1], r: 4.2, class: 'junc pinjunc' })); }
    for (const j of this.c.junctions) { const n = cnt.get(j.id) || 0; const dot = svgEl('circle', { cx: j.x, cy: j.y, r: n >= 3 ? 4.5 : 3.2, class: 'junc', 'data-jid': j.id }); if (this.selJ === j.id) dot.setAttribute('style', 'fill:#f59e0b'); this.gJ.appendChild(dot); }
  }
  partEl(inst) {
    const d = PARTS[inst.type]; const gp = svgEl('g', { class: 'part' + (this.sel === inst.id ? ' sel' : '') + (inst.burnt ? ' burnt' : ''), 'data-id': inst.id, transform: `translate(${inst.x},${inst.y})` });
    const bb = bbox(inst); gp.appendChild(svgEl('rect', { class: 'hl', x: bb[0] - 4, y: bb[1] - 4, width: bb[2] - bb[0] + 8, height: bb[3] - bb[1] + 8, transform: `rotate(${inst.rot})`, rx: 4 }));
    const body = svgEl('g', { transform: `rotate(${inst.rot})`, class: 'body' }); body.innerHTML = d.symbol(inst); gp.appendChild(body);
    // zone cliquable du corps
    const hitr = svgEl('rect', { x: bb[0], y: bb[1], width: bb[2] - bb[0], height: bb[3] - bb[1], transform: `rotate(${inst.rot})`, fill: 'transparent', stroke: 'none', class: 'bodyhit' }); gp.insertBefore(hitr, body);
    d.pins.forEach((pin, i) => { const [x, y] = rotPt(pin.x, pin.y, inst.rot); const c = svgEl('circle', { cx: x, cy: y, r: 5, class: 'pin ' + (pin.c || ''), 'data-pin': i }); const t = svgEl('title'); t.textContent = pin.n; c.appendChild(t); gp.appendChild(c); });
    if (!d.noLabel) {
      const pts = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]]].map(([x, y]) => rotPt(x, y, inst.rot)); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, top = Math.min(...ys), bot = Math.max(...ys), cy = (top + bot) / 2, side = (inst.rot % 180 === 90) && d.pins.length <= 3;
      const lab = svgEl('text', side ? { x: Math.max(...xs) + 10, y: cy - 2, class: 'lab', 'text-anchor': 'start' } : { x: cx, y: top - 6, class: 'lab', 'text-anchor': 'middle' }); lab.textContent = inst.ref; gp.appendChild(lab);
      const vt = valueText(inst); if (vt) { const v = svgEl('text', side ? { x: Math.max(...xs) + 10, y: cy + 11, class: 'val', 'text-anchor': 'start' } : { x: cx, y: bot + 13, class: 'val', 'text-anchor': 'middle' }); v.textContent = vt; gp.appendChild(v); }
      if (this.app.teacher && inst.fault) { const f = svgEl('text', side ? { x: Math.max(...xs) + 10, y: cy + 24, class: 'val', 'text-anchor': 'start', style: 'fill:#b91c1c' } : { x: cx, y: bot + 25, class: 'val', 'text-anchor': 'middle', style: 'fill:#b91c1c' }); f.textContent = '⚠ ' + inst.fault; gp.appendChild(f); }
    }
    if (inst.burnt) { const s = svgEl('g', { class: 'smoke' }); const t = svgEl('text', { x: 0, y: -26, 'text-anchor': 'middle' }); t.textContent = '✖ ' + (inst.burnt === true ? 'HS' : inst.burnt); s.appendChild(t); gp.appendChild(s); }
    return gp;
  }
  visKey(p) { return [p.rot, p.x, p.y, p.ref, p.burnt, p.fault && this.app.teacher, JSON.stringify(p.p), p.rt && p.rt.on, p.rt && p.rt.pressed, this.sel === p.id].join('|'); }
  /* mise à jour dynamique à chaque image (LED, lampe, état) */
  dyn(force) {
    const app = this.app, sim = app.sim;
    for (const p of this.c.parts) {
      let e = this.partEls.get(p.id); if (!e) continue; const k = this.visKey(p);
      if (this.dynKey.get(p.id) !== k) { const n = this.partEl(p); e.replaceWith(n); this.partEls.set(p.id, n); this.dynKey.set(p.id, k); e = n; }
      if (p.type === 'led' || p.type === 'lamp') {
        const el = sim && !sim.dirty ? sim.elOf.get(p.id) : null; const gl = e.querySelector(p.type === 'led' ? '.led-glow' : '.lamp-glow');
        if (gl) { let o = 0; if (el && !p.burnt) o = p.type === 'led' ? Math.min(1, Math.max(0, (el.I || 0) / 0.012)) : (el.bright || 0); gl.setAttribute('opacity', (o * 0.85).toFixed(2)); }
      }
      { const lvs = e.querySelectorAll('[data-lv]'); if (lvs.length) { const el = sim && !sim.dirty ? sim.elOf.get(p.id) : null; lvs.forEach(n => { const v = el && el.s && el.s.on ? el.s[n.dataset.lv] : null; n.style.fill = v === null ? '#cbd5e1' : v ? '#22c55e' : '#334155'; }); } }
      this.heatUpdate(p, e);
      if (p.type === 'multimeter') { const t = e.querySelector('.mm-read'); if (t && !sim.dirty) { const r = this.app.instr.reading(p); t.textContent = r.s + ' ' + r.u; } }
      if (p.type === 'psu') { const led = e.querySelector('.psu-led'); const el = sim && !sim.dirty ? sim.elOf.get(p.id) : null; if (led) led.style.fill = el && el.cc ? '#ef4444' : p.p.on ? '#22c55e' : '#6b7280'; }
    }
  }
  /* pointes de touche du multimètre : clic sur une broche = pointe rouge (+), clic suivant = pointe noire (COM) ; Maj+clic = noire */
  probeMeter() { let m = this.c.part(this.probeId); if (!m || m.type !== 'multimeter') m = this.c.parts.find(p => p.type === 'multimeter'); return m; }
  probeClick(e, t, wp) {
    const end = this.endpointAt(t, wp); if (!end || (end.c === undefined && !end.j)) return;
    const mm = this.probeMeter(); if (!mm) { this.app.toast('Placez d\'abord un multimètre pour utiliser les pointes de touche.', 'warn'); return; }
    if (end.c === mm.id) return;
    const col = e.shiftKey ? 'k' : (this.probeNext || 'r'); this.pushUndo();
    this.c.wires = this.c.wires.filter(w => w.probe !== mm.id + col);
    const w = this.c.wire({ c: mm.id, p: col === 'r' ? 0 : 1 }, end, [], col); w.probe = mm.id + col;
    this.probeNext = col === 'r' ? 'k' : 'r'; this.app.changed('wire'); this.hint();
  }
  clearProbes(mmId) { this.c.wires = this.c.wires.filter(w => !(w.probe && w.probe.startsWith(mmId))); this.app.changed('wire'); }
  /* surbrillance du nœud électrique survolé (pour voir ce qui est relié) */
  netLight(t) {
    const key = [];
    if (t && t.closest) { const pin = t.closest('.pin'); const wh = t.closest('[data-wid]'); if (pin) key.push('p:' + pin.closest('.part').dataset.id + ':' + pin.dataset.pin); else if (t.dataset && t.dataset.jid) key.push('j:' + t.dataset.jid); else if (wh) { const w = this.c.wires.find(x => x.id === wh.dataset.wid); if (w) for (const e of [w.a, w.b]) key.push(e.j ? 'j:' + e.j : 'p:' + e.c + ':' + e.p); } }
    const k = key.join('|'); if (k === this._netKey) return; this._netKey = k;
    this.gWires.querySelectorAll('.netlit').forEach(n => n.classList.remove('netlit'));
    if (!key.length) return;
    const ek = e => e.j ? 'j:' + e.j : 'p:' + e.c + ':' + e.p; const seen = new Set(key.slice(0, 1)); const lit = new Set(); let grow = true;
    while (grow) { grow = false; for (const w of this.c.wires) { const a = ek(w.a), b = ek(w.b); if (seen.has(a) || seen.has(b)) { if (!lit.has(w.id)) { lit.add(w.id); grow = true; } if (!seen.has(a)) { seen.add(a); grow = true; } if (!seen.has(b)) { seen.add(b); grow = true; } } } }
    // une borne de composant relie ses fils au même nœud ; en revanche deux broches différentes d'un même composant ne sont pas reliées
    this.gWires.querySelectorAll('[data-wid]').forEach(g => { if (g.tagName === 'g' && lit.has(g.dataset.wid)) g.firstChild.classList.add('netlit'); });
  }
  /* thermographie : halo coloré + température sous chaque composant */
  setHeat(on) { this.heat = !!on; this.svg.classList.toggle('thermo', this.heat); const lg = $('#heatlegend'); if (lg) lg.style.display = this.heat ? '' : 'none'; if (!this.heat) this.svg.querySelectorAll('.heatov').forEach(n => n.remove()); }
  heatUpdate(p, e) {
    if (!this.heat || ['ground', 'multimeter', 'scope', 'psu', 'gbf', 'mains', 'battery'].includes(p.type)) return;
    let g = e.querySelector('.heatov'); const T = (p.rt && p.rt.T) !== undefined ? p.rt.T : 25;
    if (!g) { const bb = bbox(p); g = svgEl('g', { class: 'heatov' }); g.appendChild(svgEl('rect', { x: bb[0] - 6, y: bb[1] - 6, width: bb[2] - bb[0] + 12, height: bb[3] - bb[1] + 12, rx: 10, transform: `rotate(${p.rot})`, class: 'heatblob' })); const t = svgEl('text', { x: 0, y: Math.max(bb[3], bb[2]) + 24, class: 'heattxt', 'text-anchor': 'middle' }); g.appendChild(t); e.insertBefore(g, e.firstChild); }
    g.firstChild.style.fill = NS.thermal.color(T); g.lastChild.textContent = Math.round(T) + ' °C'; g.lastChild.style.fill = T > 70 ? '#fca5a5' : '#e2e8f0';
  }
  /* ---------------- sélection ---------------- */
  select(id) { this.sel = id; { const q = id && this.c.part(id); if (q && q.type === 'multimeter') this.probeId = id; } this.selWire = null; this.selJ = null; this.render(); this.app.onSelect(id ? this.c.part(id) : null); }
  selectWire(id) { this.sel = null; this.selWire = id; this.selJ = null; this.render(); this.app.onSelect(null); }
  /* ---------------- fils ---------------- */
  nearestOnWire(w, pt) {
    const pts = this.expand(w); let best = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; let px, py;
      if (x1 === x2) { px = x1; py = Math.max(Math.min(y1, y2), Math.min(Math.max(y1, y2), snap(pt[1]))); } else { py = y1; px = Math.max(Math.min(x1, x2), Math.min(Math.max(x1, x2), snap(pt[0]))); }
      const d = Math.hypot(px - pt[0], py - pt[1]); if (!best || d < best.d) best = { d, i, p: [px, py], pts };
    }
    return best;
  }
  splitWire(w, pt) {
    const b = this.nearestOnWire(w, pt); if (!b) return null; const P = b.p; const pts = b.pts;
    const same = (a, c) => a[0] === c[0] && a[1] === c[1];
    for (const e of [w.a, w.b]) { const q = this.c.endPos(e); if (same(q, P)) return e; }       // extrémité existante
    const j = this.c.junction(P[0], P[1]);
    const before = pts.slice(1, b.i + 1).filter(q => !same(q, P)), after = pts.slice(b.i + 1, pts.length - 1).filter(q => !same(q, P));
    const idx = this.c.wires.indexOf(w); this.c.wires.splice(idx, 1, { id: this.c.uid('w'), a: w.a, b: { j: j.id }, mid: before, color: w.color }, { id: this.c.uid('w'), a: { j: j.id }, b: w.b, mid: after, color: w.color });
    return { j: j.id };
  }
  startWiring(from, mode) { this.wiring = { from, mid: [], mode, moved: false, start: this.mouse.slice() }; this.hint(); this.rubber(); }
  cancelWiring() { this.wiring = null; clear(this.gRub); this.hint(); }
  endpointAt(t, wp) {
    if (!t) return null;
    const pin = t.closest && t.closest('.pin'); if (pin) { const part = pin.closest('.part'); return { c: part.dataset.id, p: +pin.dataset.pin }; }
    if (t.dataset && t.dataset.jid) return { j: t.dataset.jid };
    const wh = t.closest && t.closest('[data-wid]'); if (wh && wp) { const w = this.c.wires.find(x => x.id === wh.dataset.wid); if (w) return { wire: w, pt: wp }; }
    return null;
  }
  sameEnd(a, b) { return (a.j && a.j === b.j) || (a.c && a.c === b.c && a.p === b.p); }
  finishWiring(to) {
    const wr = this.wiring; if (!wr) return; let end = to;
    if (end.wire) { this.pushUndo(); const r = this.splitWire(end.wire, end.pt); if (!r) return; end = r; this.c.wire(wr.from, end, wr.mid); this.cancelWiring(); this.app.changed('wire'); return; }
    if (this.sameEnd(wr.from, end) && !wr.mid.length) return;
    this.pushUndo(); this.c.wire(wr.from, end, wr.mid); this.cancelWiring(); this.app.changed('wire');
  }
  rubber() {
    clear(this.gRub); const wr = this.wiring; if (!wr) return;
    const fake = { id: 'tmp', a: wr.from, b: { j: '__m' }, mid: wr.mid }; const jt = { id: '__m', x: snap(this.mouse[0]), y: snap(this.mouse[1]) };
    this.c.junctions.push(jt); const pts = this.expand(fake); this.c.junctions.pop();
    this.gRub.appendChild(svgEl('path', { d: 'M' + pts.map(p => p.join(' ')).join(' L'), class: 'rubber' }));
  }
  ghost() {
    if (this.ghostEl) { this.ghostEl.remove(); this.ghostEl = null; } if (!this.armed) return;
    const inst = NS.newInst(this.armed, snap(this.mouse[0]), snap(this.mouse[1]), 'ghost'); inst.rot = this.armedRot || 0; inst.ref = '';
    const e = this.partEl(inst); e.setAttribute('opacity', '.55'); e.style.pointerEvents = 'none'; this.ghostEl = e; this.gRub.appendChild(e);
  }
  /* ---------------- suppression ---------------- */
  removePart(p) { this.pushUndo(); this.c.remove(p); this.cleanJunctions(); if (this.sel === p.id) this.sel = null; this.app.changed('structure'); this.app.onSelect(null); }
  removeWire(id) { this.pushUndo(); this.c.wires = this.c.wires.filter(w => w.id !== id); this.cleanJunctions(); this.selWire = null; this.app.changed('structure'); }
  cleanJunctions() {
    const used = new Set(); this.c.wires.forEach(w => [w.a, w.b].forEach(e => e.j && used.add(e.j)));
    this.c.junctions = this.c.junctions.filter(j => used.has(j.id));
    // fusion : jonction à 2 fils seulement → un seul fil
    for (const j of this.c.junctions.slice()) {
      const ws = this.c.wires.filter(w => w.a.j === j.id || w.b.j === j.id);
      if (ws.length === 2 && !(ws[0].a.j === j.id && ws[0].b.j === j.id)) {
        const [w1, w2] = ws; const e1 = w1.a.j === j.id ? w1.b : w1.a, e2 = w2.a.j === j.id ? w2.b : w2.a;
        const m1 = w1.a.j === j.id ? (w1.mid || []).slice().reverse() : (w1.mid || []), m2 = w2.a.j === j.id ? (w2.mid || []) : (w2.mid || []).slice().reverse();
        this.c.wires = this.c.wires.filter(w => w !== w1 && w !== w2); this.c.wires.push({ id: this.c.uid('w'), a: e1, b: e2, mid: m1.concat([[j.x, j.y]], m2), color: w1.color });
        this.c.junctions = this.c.junctions.filter(x => x !== j);
      }
    }
  }
  /* ---------------- événements ---------------- */
  bind() {
    const svg = this.svg;
    svg.addEventListener('pointerdown', e => this.down(e));
    svg.addEventListener('pointermove', e => this.move(e));
    svg.addEventListener('pointerup', e => this.up(e));
    svg.addEventListener('contextmenu', e => { e.preventDefault(); if (this.wiring) this.cancelWiring(); else if (this.armed) { this.armed = null; $$('.pal-item').forEach(b => b.classList.remove('armed')); this.ghost(); this.hint(); } });
    svg.addEventListener('wheel', e => {
      e.preventDefault(); const r = svg.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; const k0 = this.view.k; const k = Math.min(3, Math.max(0.25, k0 * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      this.view.x = mx - (mx - this.view.x) * k / k0; this.view.y = my - (my - this.view.y) * k / k0; this.view.k = k; this.applyView();
    }, { passive: false });
    window.addEventListener('keydown', e => this.key(e));
  }
  key(e) {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) return;
    const k = e.key;
    if (k === 'Escape') { this.cancelWiring(); this.armed = null; $$('.pal-item').forEach(b => b.classList.remove('armed')); this.ghost(); this.hint(); }
    else if ((k === 'Delete' || k === 'Backspace')) { if (this.sel) { const p = this.c.part(this.sel); if (p) this.removePart(p); } else if (this.selWire) this.removeWire(this.selWire); e.preventDefault(); }
    else if (k === 'r' || k === 'R') this.rotate();
    else if (k === 'v' || k === 'V') this.setTool('select'); else if (k === 'c' || k === 'C') this.setTool('wire'); else if (k === 'x' || k === 'X') this.setTool('delete'); else if (k === 'p' || k === 'P') this.setTool('probe');
    else if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { this.undo(); e.preventDefault(); }
    else if (k === ' ') { this.app.toggleRun(); e.preventDefault(); }
  }
  rotate() {
    if (this.armed) { this.armedRot = ((this.armedRot || 0) + 90) % 360; this.ghost(); return; }
    const p = this.sel && this.c.part(this.sel); if (!p) return; this.pushUndo(); p.rot = (p.rot + 90) % 360; this.render(); this.app.changed('geometry');
  }
  down(e) {
    if (e.button === 2) return;
    { const now = performance.now(), ld = this.lastDown; if (ld && now - ld.t < 380 && Math.hypot(e.clientX - ld.x, e.clientY - ld.y) < 6 && e.button === 0 && !this.armed && this.tool !== 'probe') { this.lastDown = null; this.drag = null; this.dbl(e); return; } this.lastDown = { t: now, x: e.clientX, y: e.clientY }; }   // double-clic géré à la main (le 1er clic redessine les pièces)
    this.svg.setPointerCapture(e.pointerId); const wp = this.toWorld(e); this.mouse = wp; const t = e.target;
    const end = this.endpointAt(t, wp);
    if (e.button === 1 || e.shiftKey && !end) { this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: this.view.x, vy: this.view.y }; this.svg.classList.add('panning'); return; }
    if (this.wiring) { // clic pendant un câblage
      if (end) return this.finishWiring(end);
      this.wiring.mid.push([snap(wp[0]), snap(wp[1])]); this.rubber(); return;
    }
    if (this.armed) { // placement
      this.pushUndo(); const p = this.c.add(this.armed, snap(wp[0]), snap(wp[1])); p.rot = this.armedRot || 0; this.app.changed('structure'); this.select(p.id); this.ghost(); return;
    }
    if (this.tool === 'probe') { this.probeClick(e, t, wp); return; }
    const part = t.closest && t.closest('.part');
    if (this.tool === 'delete') {
      if (part) { const p = this.c.part(part.dataset.id); if (p) this.removePart(p); } else { const wh = t.closest && t.closest('[data-wid]'); if (wh) this.removeWire(wh.dataset.wid); }
      return;
    }
    if (end && (this.tool === 'wire' || end.c !== undefined && t.closest('.pin') || end.j)) {
      if (end.wire) { this.pushUndo(); const r = this.splitWire(end.wire, wp); this.app.changed('wire'); this.render(); if (r) this.startWiring(r, 'click'); return; }
      this.startWiring(end, 'drag'); return;
    }
    if (this.tool === 'wire') { const wh = t.closest && t.closest('[data-wid]'); if (wh) { const w = this.c.wires.find(x => x.id === wh.dataset.wid); this.pushUndo(); const r = this.splitWire(w, wp); this.render(); if (r) this.startWiring(r, 'click'); } return; }
    if (part) {
      const p = this.c.part(part.dataset.id); this.select(p.id);
      if (PARTS[p.type].clickable && !t.closest('.pin')) { p.p.closed = !p.p.closed; this.app.changed('param'); this.app.refreshInspector(); }
      if (PARTS[p.type].momentary) { p.rt.pressed = true; this.app.sim.invalidate(); this.pressed = p; }
      this.drag = { kind: 'part', p, ox: wp[0] - p.x, oy: wp[1] - p.y, moved: false, undo: this.snapshot() }; return;
    }
    const wh = t.closest && t.closest('[data-wid]'); if (wh) { const wid = wh.dataset.wid; this.selectWire(wid); const w = this.c.wires.find(x => x.id === wid); if (w) this.drag = { kind: 'seg', w, start: wp.slice(), active: false, undo: this.snapshot(), moved: false }; return; }
    if (t.dataset && t.dataset.jid) { this.drag = { kind: 'junc', j: this.c.junctions.find(j => j.id === t.dataset.jid), undo: this.snapshot() }; return; }
    // fond : désélection + déplacement de la vue
    if (this.sel || this.selWire) { this.sel = null; this.selWire = null; this.render(); this.app.onSelect(null); }
    this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: this.view.x, vy: this.view.y }; this.svg.classList.add('panning');
  }
  move(e) {
    const wp = this.toWorld(e); this.mouse = wp; const d = this.drag;
    if (d) {
      if (d.kind === 'pan') { this.view.x = d.vx + e.clientX - d.sx; this.view.y = d.vy + e.clientY - d.sy; this.applyView(); }
      else if (d.kind === 'part') { const nx = snap(wp[0] - d.ox), ny = snap(wp[1] - d.oy); if (nx !== d.p.x || ny !== d.p.y) { if (!d.moved) { this.undoStack.push(d.undo); d.moved = true; } d.p.x = nx; d.p.y = ny; const el = this.partEls.get(d.p.id); if (el) el.setAttribute('transform', `translate(${nx},${ny})`); this.redrawWires(); } }
      else if (d.kind === 'seg') this.segDrag(d, wp);
      else if (d.kind === 'junc') { const nx = snap(wp[0]), ny = snap(wp[1]); if (nx !== d.j.x || ny !== d.j.y) { if (!d.moved) { this.undoStack.push(d.undo); d.moved = true; } d.j.x = nx; d.j.y = ny; this.redrawWires(); this.renderJunctions(); } }
    }
    if (this.wiring) { if (Math.hypot(wp[0] - this.wiring.start[0], wp[1] - this.wiring.start[1]) > 6) this.wiring.moved = true; this.rubber(); }
    if (this.armed) this.ghost();
    this.hoverTip(e); if (!this.drag && !this.wiring) this.netLight(e.target);
  }
  /* déplacement d'un segment de câble (perpendiculairement), puis nettoyage des points inutiles */
  segDrag(d, wp) {
    const w = d.w;
    if (!d.active) {
      if (Math.hypot(wp[0] - d.start[0], wp[1] - d.start[1]) < 5) return;
      const P = this.expand(w).map(p => p.slice()); let bi = -1, bd = 1e9;
      for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; if (a[0] === b[0] && a[1] === b[1]) continue; const dx = b[0] - a[0], dy = b[1] - a[1]; const u = Math.max(0, Math.min(1, ((d.start[0] - a[0]) * dx + (d.start[1] - a[1]) * dy) / (dx * dx + dy * dy))); const dist = Math.hypot(d.start[0] - a[0] - u * dx, d.start[1] - a[1] - u * dy); if (dist < bd) { bd = dist; bi = i; } }
      if (bi < 0) { this.drag = null; return; }
      const Q = P; let i = bi; if (i === 0) { Q.unshift(Q[0].slice()); i = 1; } if (i + 1 === Q.length - 1) Q.push(Q[Q.length - 1].slice());
      d.Q = Q; d.i = i; d.horiz = Q[i][1] === Q[i + 1][1]; d.active = true; this.undoStack.push(d.undo); d.moved = true;
    }
    const Q = d.Q, i = d.i; if (d.horiz) { const y = snap(wp[1]); Q[i][1] = y; Q[i + 1][1] = y; } else { const x = snap(wp[0]); Q[i][0] = x; Q[i + 1][0] = x; }
    w.mid = Q.slice(1, -1).map(p => p.slice()); this.redrawWires();
  }
  tidyWire(w) {
    const c = this.c; const pts = [c.endPos(w.a)].concat((w.mid || []).map(p => p.slice()), [c.endPos(w.b)]); const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) { const p = out[out.length - 1], q = pts[i], n = pts[i + 1]; if (p[0] === q[0] && p[1] === q[1]) continue; if ((p[0] === q[0] && q[0] === n[0]) || (p[1] === q[1] && q[1] === n[1])) continue; out.push(q); }
    w.mid = out.slice(1);
  }
  redrawWires() { clear(this.gWires); for (const w of this.c.wires) this.gWires.appendChild(this.wireEl(w)); this.renderJunctions(); }
  up(e) {
    this.svg.classList.remove('panning'); const d = this.drag; this.drag = null;
    if (this.pressed) { this.pressed.rt.pressed = false; this.app.sim.invalidate(); this.pressed = null; }
    if (d && d.kind === 'part' && d.moved) this.app.changed('geometry');
    if (d && d.kind === 'junc' && d.j) this.app.changed('geometry');
    if (d && d.kind === 'seg' && d.moved) { this.tidyWire(d.w); this.redrawWires(); this.app.changed('geometry'); }
    const wr = this.wiring;
    if (wr && wr.mode === 'drag') {
      const wp = this.toWorld(e); const el = document.elementFromPoint(e.clientX, e.clientY); const end = this.endpointAt(el, wp);
      if (wr.moved && end && !(this.sameEnd(wr.from, end) && !wr.mid.length)) this.finishWiring(end);
      else if (wr.moved) { this.cancelWiring(); } else wr.mode = 'click';
    }
  }
  dbl(e) {
    const tg = (e.target.closest && e.target.closest('.part')) ? e.target : (document.elementFromPoint(e.clientX, e.clientY) || e.target);   // le 1er clic a pu re-dessiner la pièce
    const part = tg.closest && tg.closest('.part');
    if (part && !this.wiring) { const p = this.c.part(part.dataset.id); if (p) this.app.openInstrument(p); return; }
    { const wh = tg.closest && tg.closest('[data-wid]'); if (wh && !this.wiring) { const w = this.c.wires.find(x => x.id === wh.dataset.wid); if (w && (w.mid || []).length) { this.pushUndo(); w.mid = []; this.redrawWires(); this.app.changed('geometry'); } return; } }
    if (this.wiring) { const wp = this.toWorld(e); const j = this.c.junction(snap(wp[0]), snap(wp[1])); this.finishWiring({ j: j.id }); }
  }
  hoverTip(e) {
    const tip = $('#tooltip'); const t = e.target; const pin = t.closest && t.closest('.pin');
    if (pin && this.app.opts.aide && this.app.sim && !this.app.sim.dirty) {
      const part = this.c.part(pin.closest('.part').dataset.id); const n = this.c.pinNode && this.c.pinNode[part.id]; if (n) { const v = n[+pin.dataset.pin] === 0 ? 0 : this.app.sim.eng.x[n[+pin.dataset.pin] - 1]; const r = this.svg.getBoundingClientRect(); tip.style.display = 'block'; tip.style.left = (e.clientX - r.left + 12) + 'px'; tip.style.top = (e.clientY - r.top - 24) + 'px'; tip.textContent = part.ref + '.' + PARTS[part.type].pins[+pin.dataset.pin].n + ' = ' + fmt(v, 'V'); return; }
    }
    tip.style.display = 'none';
  }
}
NS.Editor = Editor;

})(typeof window !== 'undefined' ? window : globalThis);
