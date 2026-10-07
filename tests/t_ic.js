// validation des circuits intégrés : portes, 555, bascule, compteur, optocoupleur, MOSFET
const NS = require('./load')(); const { Circuit, Sim } = NS; let bad = 0;
const ok = (n, c, d) => { if (!c) bad++; console.log((c ? 'ok   ' : 'FAIL ') + n + (d ? '  ' + d : '')); };
function C() { const c = new Circuit(); c.G = c.add('ground', 0, 0, {}, 'GND1'); return c; }
const add = (c, t, ref, p) => { const i = c.add(t, 0, 0, p || {}, ref); i.dev = 0; return i; };
const gnd = (c, ref, pin) => c.link(c.G, 'G', ref, pin);
function psu(c, ref, V) { add(c, 'psu', ref, { V, Ilim: 1 }); c.link(c.G, 'G', ref, '−'); }
const sample = (s, dur, dt, f) => { const o = []; for (let t = 0; t < dur; t += dt) { s.advance(dt); o.push(f()); } return o; };

// 1. table de vérité NAND / NOR / XOR (74HC, 5 V)
for (const fn of ['AND', 'NAND', 'OR', 'NOR', 'XOR', 'XNOR']) {
  let all = true; const res = [];
  for (const [a, b] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
    const c = C(); psu(c, 'AL', 5); psu(c, 'IA', a ? 5 : 0); psu(c, 'IB', b ? 5 : 0); add(c, 'gate', 'U1', { fn, fam: 'HC' });
    c.link('AL', '+', 'U1', 'VCC'); gnd(c, 'U1', 'GND'); c.link('IA', '+', 'U1', 'A'); c.link('IB', '+', 'U1', 'B');
    const s = new Sim(c); s.settle(0.05); const y = s.vPin('U1', 'Y'); const exp = NS.GATEFN[fn](a, b); res.push(y.toFixed(2)); if (Math.abs(y - (exp ? 5 : 0)) > 0.2) all = false;
  } ok('porte ' + fn + ' 74HC', all, res.join(' '));
}
// 2. entrée flottante TTL = 1 → NOT donne 0 ; CMOS sans alimentation : sortie non pilotée
{ const c = C(); psu(c, 'AL', 5); add(c, 'inv', 'U1', { fn: 'NOT', fam: 'LS' }); c.link('AL', '+', 'U1', 'VCC'); gnd(c, 'U1', 'GND'); const s = new Sim(c); s.settle(0.05); ok('TTL : entrée flottante lue à 1 → NOT = 0', s.vPin('U1', 'Y') < 0.5, s.vPin('U1', 'Y').toFixed(2) + ' V'); }
{ const c = C(); psu(c, 'AL', 5); add(c, 'inv', 'U1', { fn: 'NOT', fam: 'LS' }); add(c, 'resistor', 'RL', { R: 10000, tol: 0 }); c.link('AL', '+', 'U1', 'VCC'); gnd(c, 'U1', 'GND'); gnd(c, 'U1', 'A'); c.link('U1', 'Y', 'RL', 'A'); gnd(c, 'RL', 'B'); const s = new Sim(c); s.settle(0.05); ok('TTL : niveau haut ≈ 3,4 V', Math.abs(s.vPin('U1', 'Y') - 3.4) < 0.3, s.vPin('U1', 'Y').toFixed(2) + ' V'); }
{ const c = C(); psu(c, 'AL', 5); add(c, 'inv', 'U1', { fn: 'NOT', fam: 'HC' }); c.link('AL', '+', 'U1', 'VCC'); gnd(c, 'U1', 'GND'); gnd(c, 'U1', 'A'); const s = new Sim(c); s.settle(0.05); ok('HC : NOT(0) = 5 V', Math.abs(s.vPin('U1', 'Y') - 5) < 0.2); c.byRef('U1').fault = 'stuck0'; s.invalidate && s.invalidate(); s.settle(0.05); ok('panne sortie bloquée à 0', s.vPin('U1', 'Y') < 0.3); }
// 3. NE555 astable
function astable(model, R1, R2, Cv, Vcc) {
  const c = C(); psu(c, 'AL', Vcc); add(c, 'timer555', 'U1', { model }); add(c, 'resistor', 'R1', { R: R1, tol: 0 }); add(c, 'resistor', 'R2', { R: R2, tol: 0 }); add(c, 'capacitor', 'C1', { C: Cv, esr: 0.001, tol: 0 });
  c.link('AL', '+', 'U1', 'VCC'); gnd(c, 'U1', 'GND'); c.link('AL', '+', 'U1', 'RESET'); c.link('AL', '+', 'R1', 'A'); c.link('R1', 'B', 'U1', 'DIS'); c.link('U1', 'DIS', 'R2', 'A'); c.link('R2', 'B', 'U1', 'THR'); c.link('U1', 'THR', 'U1', 'TRIG'); c.link('U1', 'THR', 'C1', 'A'); gnd(c, 'C1', 'B');
  return new Sim(c);
}
{ const s = astable('NE555', 1000, 10000, 100e-9, 5); s.advance(0.01); const el = s.el('U1'); const tr = []; let prev = el.s.out; const t0 = s.eng.t;
  const o = sample(s, 0.03, 1e-5, () => [s.eng.t, el.s.out]); for (const [t, v] of o) { if (v && !prev) tr.push(t); prev = v; }
  const T = tr.length > 2 ? (tr[tr.length - 1] - tr[0]) / (tr.length - 1) : 0, f = 1 / T, fth = 1.44 / ((1000 + 2 * 10000) * 100e-9);
  const hi = o.filter(x => x[1]).length / o.length, dth = (1000 + 10000) / (1000 + 20000);
  ok('555 astable : fréquence', Math.abs(f - fth) / fth < 0.08, f.toFixed(0) + ' Hz (théorie ' + fth.toFixed(0) + ' Hz, ' + tr.length + ' fronts)');
  ok('555 astable : rapport cyclique', Math.abs(hi - dth) < 0.04, (hi * 100).toFixed(1) + ' % (théorie ' + (dth * 100).toFixed(1) + ' %)'); }
{ const s = astable('TLC555', 10000, 47000, 10e-9, 5); const el = s.el('U1'); s.advance(0.005); let n = 0, prev = el.s.out; sample(s, 0.02, 1e-5, () => { if (el.s.out && !prev) n++; prev = el.s.out; });
  const fth = 1.44 / ((10000 + 94000) * 10e-9); ok('TLC555 astable', Math.abs(n / 0.02 - fth) / fth < 0.12, (n / 0.02).toFixed(0) + ' Hz (théorie ' + fth.toFixed(0) + ' Hz)'); }
// 4. 555 → compteur 4 bits : Q0 = f/2, Q1 = f/4
{ const s = astable('NE555', 1000, 10000, 100e-9, 5), c = s.c; add(c, 'cnt4', 'U2', { fam: 'HC' }); c.link('AL', '+', 'U2', 'VCC'); gnd(c, 'U2', 'GND'); gnd(c, 'U2', 'MR'); c.link('U1', 'OUT', 'U2', 'CK'); const s2 = new Sim(c);
  s2.advance(0.005); const e1 = s2.el('U1'), e2 = s2.el('U2'); let n = 0, n0 = 0, n1 = 0, p = e1.s.out, p0 = e2.s.o ? e2.s.o[0] : 0, p1 = 0;
  sample(s2, 0.04, 1e-5, () => { if (e1.s.out && !p) n++; p = e1.s.out; const q = e2.s.o || [0, 0]; if (q[0] && !p0) n0++; p0 = q[0]; if (q[1] && !p1) n1++; p1 = q[1]; });
  ok('compteur : Q0 = f/2, Q1 = f/4', Math.abs(n0 - n / 2) <= 1 && Math.abs(n1 - n / 4) <= 1, 'CK ' + n + ' · Q0 ' + n0 + ' · Q1 ' + n1); }
// 5. bascule D : diviseur par 2 (Q̅ → D)
{ const s = astable('NE555', 1000, 10000, 100e-9, 5), c = s.c; add(c, 'dff', 'U2', { fam: 'HC' }); c.link('AL', '+', 'U2', 'VCC'); gnd(c, 'U2', 'GND'); c.link('U2', 'Q̅', 'U2', 'D'); c.link('U1', 'OUT', 'U2', 'CK'); const s2 = new Sim(c);
  s2.advance(0.005); const e1 = s2.el('U1'), e2 = s2.el('U2'); let n = 0, nq = 0, p = e1.s.out, pq = e2.s.q; sample(s2, 0.04, 1e-5, () => { if (e1.s.out && !p) n++; p = e1.s.out; if (e2.s.q && !pq) nq++; pq = e2.s.q; });
  ok('bascule D : division par 2', Math.abs(nq - n / 2) <= 1, 'CK ' + n + ' · Q ' + nq); }
// 6. optocoupleur
for (const [on, name] of [[1, 'LED allumée'], [0, 'LED éteinte']]) {
  const c = C(); psu(c, 'IN', on ? 5 : 0); psu(c, 'AL', 12); add(c, 'resistor', 'RA', { R: 330, tol: 0 }); add(c, 'resistor', 'RC', { R: 10000, tol: 0 }); add(c, 'opto', 'OC1', { model: 'PC817' });
  c.link('IN', '+', 'RA', 'A'); c.link('RA', 'B', 'OC1', 'A'); gnd(c, 'OC1', 'K'); c.link('AL', '+', 'RC', 'A'); c.link('RC', 'B', 'OC1', 'C'); c.link('OC1', 'E', 'AL', '−');
  const s = new Sim(c); s.settle(0.1); const If = s.el('OC1').I, vc = s.vPin('RC', 'B'); ok('optocoupleur ' + name, on ? (Math.abs(If - 0.0115) < 0.002 && vc < 0.5) : (vc > 11.9), 'If = ' + (If * 1e3).toFixed(1) + ' mA · Vc = ' + vc.toFixed(2) + ' V'); }
{ const c = C(); psu(c, 'IN', 5); psu(c, 'AL', 12); add(c, 'resistor', 'RA', { R: 2200, tol: 0 }); add(c, 'resistor', 'RC', { R: 1000, tol: 0 }); add(c, 'opto', 'OC1', { model: 'PC817' });
  c.link('IN', '+', 'RA', 'A'); c.link('RA', 'B', 'OC1', 'A'); gnd(c, 'OC1', 'K'); c.link('AL', '+', 'RC', 'A'); c.link('RC', 'B', 'OC1', 'C'); c.link('OC1', 'E', 'AL', '−'); const s = new Sim(c); s.settle(0.1); const If = s.el('OC1').I, Ic = (12 - s.vPin('RC', 'B')) / 1000; ok('optocoupleur : Ic ≈ CTR·If (linéaire)', Math.abs(Ic / If - 1) < 0.2, 'If ' + (If * 1e3).toFixed(2) + ' mA · Ic ' + (Ic * 1e3).toFixed(2) + ' mA'); }
// 7. MOSFET
for (const [vg, name] of [[5, 'passant'], [0, 'bloqué']]) {
  const c = C(); psu(c, 'AL', 12); psu(c, 'VG', vg); add(c, 'resistor', 'RD', { R: 100, tol: 0 }); add(c, 'mosfet', 'Q1', { model: '2N7000' });
  c.link('AL', '+', 'RD', 'A'); c.link('RD', 'B', 'Q1', 'D'); gnd(c, 'Q1', 'S'); c.link('VG', '+', 'Q1', 'G'); const s = new Sim(c); s.settle(0.1); const vd = s.vPin('Q1', 'D');
  ok('MOSFET 2N7000 ' + name, vg ? vd < 0.8 : vd > 11.9, 'Vd = ' + vd.toFixed(3) + ' V'); }
{ const c = C(); psu(c, 'AL', 12); psu(c, 'VG', 12); add(c, 'resistor', 'RD', { R: 10, tol: 0 }); add(c, 'mosfet', 'Q1', { model: 'IRF9540N' }); // canal P : source au +12 V
  c.link('AL', '+', 'Q1', 'S'); c.link('Q1', 'D', 'RD', 'A'); gnd(c, 'RD', 'B'); c.link('VG', '+', 'Q1', 'G'); let s = new Sim(c); s.settle(0.1); const off = s.vPin('RD', 'A');
  const c2 = C(); psu(c2, 'AL', 12); psu(c2, 'VG', 0); add(c2, 'resistor', 'RD', { R: 10, tol: 0 }); add(c2, 'mosfet', 'Q1', { model: 'IRF9540N' }); c2.link('AL', '+', 'Q1', 'S'); c2.link('Q1', 'D', 'RD', 'A'); gnd(c2, 'RD', 'B'); c2.link('VG', '+', 'Q1', 'G'); s = new Sim(c2); s.settle(0.1); const on = s.vPin('RD', 'A');
  ok('MOSFET canal P (IRF9540N) : interrupteur côté haut', off < 0.1 && on > 11, 'bloqué ' + off.toFixed(2) + ' V · passant ' + on.toFixed(2) + ' V'); }
console.log(bad ? bad + ' ÉCHEC(S)' : 'IC OK'); process.exit(bad ? 1 : 0);
