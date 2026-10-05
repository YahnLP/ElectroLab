/* parts.js — catalogue des composants : broches, paramètres (valeurs de fiches techniques), symboles (norme NF/IEC) */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { VT } = NS;
const PARTS = NS.PARTS = {};
const CATS = NS.CATS = ['Sources & alimentation', 'Passifs', 'Semi-conducteurs', 'Commande & protection', 'Instruments', 'Divers'];
const P2 = [{ n: 'A', x: -40, y: 0 }, { n: 'B', x: 40, y: 0 }];
const L = (x1, y1, x2, y2, c) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${c ? ' class="' + c + '"' : ''}/>`;
const lead2 = a => L(-40, 0, -a, 0) + L(a, 0, 40, 0);
const T = (x, y, s, cls, anchor) => `<text x="${x}" y="${y}" class="${cls || 'sym-t'}" text-anchor="${anchor || 'middle'}">${s}</text>`;

/* ---------- tables de modèles (fiches constructeur) ---------- */
function ledP(vf, name, col) { const n = 2, Rs = 5, If = 0.02; const Is = If / Math.exp((vf - If * Rs) / (n * VT)); return { Is, n, Rs, Imax: 0.03, VRmax: 5, led: true, color: col, name }; }
const DIODES = {
  '1N4148': { Is: 2.52e-9, n: 1.752, Rs: 0.568, Imax: 0.2, VRmax: 75, name: '1N4148 (signal, 75 V, 200 mA)' },
  '1N4007': { Is: 2.55e-9, n: 1.75, Rs: 0.0665, Imax: 1.0, VRmax: 1000, name: '1N4007 (redressement, 1000 V, 1 A)' },
  '1N5819': { Is: 5.5e-7, n: 1.1, Rs: 0.04, Imax: 1.0, VRmax: 40, name: '1N5819 (Schottky, 40 V, 1 A)' },
};
const LEDS = { 'LED rouge': ledP(1.9, 'LED rouge', '#ff2a2a'), 'LED verte': ledP(2.1, 'LED verte', '#2aff55'), 'LED jaune': ledP(2.0, 'LED jaune', '#ffd800'), 'LED bleue': ledP(3.0, 'LED bleue', '#3a7bff'), 'LED blanche': ledP(3.1, 'LED blanche', '#f4f4ff') };
const ZEN = {}; [['3V3', 3.3], ['4V7', 4.7], ['5V1', 5.1], ['6V8', 6.8], ['9V1', 9.1], ['12', 12], ['15', 15]].forEach(([k, v]) => { ZEN['BZX55C' + k] = { Is: 1e-9, n: 1.8, Rs: 1.0, Vz: v, zs: 0.15, Izk: 5e-3, Pz: 0.5, name: 'Zener BZX55C' + k + ' (' + v + ' V, 0,5 W)' }; });
const BJTS = {
  'BC547B': { Is: 1.8e-14, BF: 330, BR: 5, Nf: 1, Nr: 1, VAF: 100, Rcs: 8, Pmax: 0.5, Icmax: 0.1, Vceo: 45, VebMax: 6, pnp: false, name: 'BC547B (NPN, 100 mA, 45 V)' },
  '2N2222A': { Is: 1.4e-14, BF: 200, BR: 5, Nf: 1, Nr: 1, VAF: 100, Rcs: 3, Pmax: 0.5, Icmax: 0.8, Vceo: 40, VebMax: 6, pnp: false, name: '2N2222A (NPN, 800 mA, 40 V)' },
  'BC557B': { Is: 1.7e-14, BF: 250, BR: 5, Nf: 1, Nr: 1, VAF: 80, Rcs: 8, Pmax: 0.5, Icmax: 0.1, Vceo: 45, VebMax: 5, pnp: true, name: 'BC557B (PNP, 100 mA, 45 V)' },
  'BD135': { Is: 2e-14, BF: 100, BR: 4, Nf: 1, Nr: 1, VAF: 80, Rcs: 0.8, Pmax: 1.25, Icmax: 1.5, Vceo: 45, VebMax: 5, pnp: false, name: 'BD135 (NPN puissance, 1,5 A)' },
};
const OPS = {
  'LM358': { A: 1e5, Ro: 75, dh: 1.5, dl: 0.02, Vmin: 3, Vmax: 32, Iq: 0.7e-3, Imax: 0.02, name: 'LM358 (simple alim., 3–32 V)' },
  'TL081': { A: 2e5, Ro: 75, dh: 1.5, dl: 1.5, Vmin: 8, Vmax: 36, Iq: 1.4e-3, Imax: 0.02, name: 'TL081 (JFET, ±15 V)' },
  'LM741': { A: 2e5, Ro: 75, dh: 2, dl: 2, Vmin: 8, Vmax: 36, Iq: 1.7e-3, Imax: 0.025, name: 'LM741 (±15 V)' },
};
const REGS = {
  '7805': { V: 5, drop: 2.0, Ilim: 1.5, Iq: 5e-3, Vmax: 35, name: '7805 (5 V, 1 A)' }, '7809': { V: 9, drop: 2.0, Ilim: 1.5, Iq: 5e-3, Vmax: 35, name: '7809 (9 V, 1 A)' },
  '7812': { V: 12, drop: 2.0, Ilim: 1.5, Iq: 5e-3, Vmax: 35, name: '7812 (12 V, 1 A)' }, 'LD1117-3.3': { V: 3.3, drop: 1.1, Ilim: 1.2, Iq: 5e-3, Vmax: 15, name: 'LD1117-3.3 (3,3 V, 0,8 A)' },
  '78L05': { V: 5, drop: 2.0, Ilim: 0.2, Iq: 3e-3, Vmax: 30, name: '78L05 (5 V, 100 mA)' },
};
function tr(VA, Vn, name) { const reg = 0.2, Vs = Vn * (1 + reg), n = Vs / 230, Is = VA / Vn, Rt = reg * Vn / Is; return { Vp: 230, Vs, VA, Rs: Rt / 2, Rp: Rt / 2 / (n * n), Lp: 40 + VA * 0.8, k: 0.998, name }; }
const TRAFOS = { '230V / 6V · 3 VA': tr(3, 6, '230V / 6V · 3 VA'), '230V / 9V · 5 VA': tr(5, 9, '230V / 9V · 5 VA'), '230V / 12V · 10 VA': tr(10, 12, '230V / 12V · 10 VA'), '230V / 24V · 20 VA': tr(20, 24, '230V / 24V · 20 VA') };
NS.LIB = { DIODES, LEDS, ZEN, BJTS, OPS, REGS, TRAFOS };
const opts = o => Object.keys(o);

function def(type, d) { d.type = type; PARTS[type] = d; return d; }
const num = (k, label, unit, o) => Object.assign({ k, label, unit, kind: 'num' }, o || {});
const sel = (k, label, o, labels) => ({ k, label, kind: 'sel', opts: o, labels });

/* ======================== SOURCES ======================== */
def('psu', {
  ext: [-60, -40, 60, 40],
  label: 'Alimentation de labo 0–30 V / 3 A', cat: 0, ref: 'AL', pins: [{ n: '+', x: 60, y: -20, c: 'r' }, { n: '−', x: 60, y: 20, c: 'k' }],
  defaults: { V: 12, Ilim: 0.5, on: true }, fields: [num('V', 'Tension réglée', 'V', { min: 0, max: 30, step: 0.1, slider: true }), num('Ilim', 'Limitation de courant', 'A', { min: 0.001, max: 3, step: 0.005, slider: true }), { k: 'on', label: 'Sortie active', kind: 'bool' }],
  eff: p => p, faults: ['dead'],
  symbol: i => `<rect x="-60" y="-40" width="100" height="80" rx="5" class="inst"/>` + T(-8, -26, 'ALIM. LABO', 'sym-s') + `<rect x="-52" y="-16" width="70" height="30" rx="2" class="lcd"/>` + L(40, -20, 60, -20) + L(40, 20, 60, 20) + T(30, -16, '+', 'sym-r', 'end') + T(30, 27, '−', 'sym-t', 'end') + `<circle class="psu-led" cx="-48" cy="-28" r="4" style="fill:#22c55e"/>`,
});
def('battery', {
  ext: [-40,-20,40,20],
  label: 'Pile / batterie', cat: 0, ref: 'G', pins: [{ n: '+', x: 40, y: 0, c: 'r' }, { n: '−', x: -40, y: 0, c: 'k' }], defaults: { V: 9, Ri: 1.5 },
  fields: [num('V', 'Tension à vide', 'V', { min: 0.5, max: 24 }), num('Ri', 'Résistance interne', 'Ω', { min: 0.01, max: 100 })], eff: p => p, faults: ['dead'],
  symbol: i => lead2(8) + L(-8, -18, -8, 18) + L(8, -10, 8, 10, 'thick') + T(18, -8, '+', 'sym-s') + T(-18, -8, '−', 'sym-s'),
});
def('mains', {
  ext: [-50, -30, 50, 30],
  label: 'Secteur 230 V~ 50 Hz', cat: 0, ref: 'SEC', pins: [{ n: 'L', x: 50, y: -20 }, { n: 'N', x: 50, y: 20 }], defaults: { Veff: 230, f: 50, on: true },
  fields: [num('Veff', 'Tension efficace', 'V', { min: 0, max: 260 }), num('f', 'Fréquence', 'Hz', { min: 40, max: 60 }), { k: 'on', label: 'Sectionneur fermé', kind: 'bool' }], eff: p => p,
  symbol: i => `<rect x="-50" y="-30" width="80" height="60" rx="5" class="inst"/>` + T(-10, -10, '230 V ~', 'sym-s') + `<path d="M-25 12 q7.5 -14 15 0 t15 0" class="sym-f"/>` + L(30, -20, 50, -20) + L(30, 20, 50, 20) + T(24, -24, 'L', 'sym-s', 'end') + T(24, 32, 'N', 'sym-s', 'end'),
});
def('gbf', {
  ext: [-50, -30, 50, 30],
  label: 'Générateur BF (GBF)', cat: 0, ref: 'GBF', pins: [{ n: 'OUT', x: 50, y: -20, c: 'r' }, { n: 'GND', x: 50, y: 20, c: 'k' }], defaults: { wave: 'sin', f: 1000, A: 1, off: 0, duty: 50, on: true },
  fields: [sel('wave', 'Forme', ['sin', 'carre', 'tri'], ['Sinus', 'Carré', 'Triangle']), num('f', 'Fréquence', 'Hz', { min: 0.1, max: 1e6 }), num('A', 'Amplitude (crête)', 'V', { min: 0, max: 10 }), num('off', 'Offset (composante continue)', 'V', { min: -10, max: 10 }), num('duty', 'Rapport cyclique', '%', { min: 5, max: 95 }), { k: 'on', label: 'Sortie active', kind: 'bool' }],
  eff: p => p,
  symbol: i => `<rect x="-50" y="-30" width="80" height="60" rx="5" class="inst"/>` + T(-10, -14, 'GBF', 'sym-s') + `<path d="M-30 8 q10 -18 20 0 t20 0" class="sym-f"/>` + L(30, -20, 50, -20) + L(30, 20, 50, 20) + T(24, -24, 'OUT', 'sym-xs', 'end') + T(24, 33, 'GND', 'sym-xs', 'end'),
});

/* ======================== PASSIFS ======================== */
def('resistor', {
  label: 'Résistance', cat: 1, ref: 'R', pins: P2, defaults: { R: 1000, tol: 5, W: 0.25 }, tolDev: true,
  fields: [num('R', 'Valeur', 'Ω', { min: 0.01, max: 1e9, series: 'E12' }), sel('tol', 'Tolérance', [1, 5, 10], ['±1 %', '±5 %', '±10 %']), sel('W', 'Puissance max.', [0.125, 0.25, 0.5, 1, 2, 5], ['1/8 W', '1/4 W', '1/2 W', '1 W', '2 W', '5 W'])], eff: p => p, faults: ['open', 'short', 'drift'],
  symbol: i => lead2(20) + `<rect x="-20" y="-7" width="40" height="14" class="sym-b"/>`,
});
def('pot', {
  label: 'Potentiomètre', cat: 1, ref: 'P', pins: [{ n: 'A', x: -40, y: 0 }, { n: 'B', x: 40, y: 0 }, { n: 'W', x: 0, y: -40 }], defaults: { R: 10000, pos: 0.5, W: 0.25 }, tolDev: true,
  fields: [num('R', 'Résistance totale', 'Ω', { min: 100, max: 1e7, series: 'E12' }), num('pos', 'Position du curseur', '', { min: 0, max: 1, step: 0.01, slider: true })], eff: p => p, faults: ['open'],
  symbol: i => lead2(20) + `<rect x="-20" y="-7" width="40" height="14" class="sym-b"/>` + L(0, -40, 0, -9) + `<polygon points="-4,-16 4,-16 0,-9" class="sym-fill"/>`,
});
def('capacitor', {
  label: 'Condensateur', cat: 1, ref: 'C', pins: P2, defaults: { C: 1e-6, Vmax: 63, esr: 0.05, pol: false, tol: 10 }, tolDev: true,
  fields: [num('C', 'Capacité', 'F', { min: 1e-12, max: 1, series: 'E12' }), num('Vmax', 'Tension max.', 'V', { min: 6, max: 1000 }), { k: 'pol', label: 'Polarisé (électrolytique)', kind: 'bool' }, num('esr', 'ESR', 'Ω', { min: 0, max: 100 })], eff: p => p, faults: ['open', 'short', 'leaky', 'dried'],
  symbol: i => `${L(-40, 0, -4, 0)}${L(4, 0, 40, 0)}${L(-4, -16, -4, 16)}` + (i.p.pol ? `<path d="M4 -16 Q12 0 4 16" class="sym-f"/>` + T(-14, -10, '+', 'sym-s', 'end') : L(4, -16, 4, 16)),
});
def('inductor', {
  label: 'Bobine (inductance)', cat: 1, ref: 'L', pins: P2, defaults: { L: 0.01, R: 0.5, Imax: 1 }, fields: [num('L', 'Inductance', 'H', { min: 1e-6, max: 100, series: 'E12' }), num('R', 'Résistance du fil', 'Ω', { min: 0, max: 100 }), num('Imax', 'Courant max.', 'A', { min: 0.01, max: 20 })], eff: p => p, faults: ['open', 'short'],
  symbol: i => lead2(24) + `<path d="M-24 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0" class="sym-f"/>`,
});
def('transformer', {
  ext: [-40,-36,40,36],
  label: 'Transformateur', cat: 1, ref: 'TR', pins: [{ n: 'P1', x: -40, y: -20 }, { n: 'P2', x: -40, y: 20 }, { n: 'S1', x: 40, y: -20 }, { n: 'S2', x: 40, y: 20 }], defaults: { model: '230V / 12V · 10 VA' },
  fields: [sel('model', 'Modèle', opts(TRAFOS))], eff: p => Object.assign({}, TRAFOS[p.model] || TRAFOS['230V / 12V · 10 VA']), faults: ['openP', 'openS', 'turns'],
  symbol: i => L(-40, -20, -22, -20) + L(-40, 20, -22, 20) + L(40, -20, 22, -20) + L(40, 20, 22, 20) + `<path d="M-22 -20 a5 5 0 0 1 0 10 a5 5 0 0 1 0 10 a5 5 0 0 1 0 10 a5 5 0 0 1 0 10" class="sym-f" transform="translate(0,0)"/>` + `<path d="M22 -20 a5 5 0 0 0 0 10 a5 5 0 0 0 0 10 a5 5 0 0 0 0 10 a5 5 0 0 0 0 10" class="sym-f"/>` + L(-3, -22, -3, 22) + L(3, -22, 3, 22) + `<circle cx="-30" cy="-26" r="1.6" class="sym-fill"/><circle cx="30" cy="-26" r="1.6" class="sym-fill"/>`,
});
def('ldr', {
  label: 'Photorésistance (LDR)', cat: 1, ref: 'LDR', pins: P2, defaults: { Rdark: 2e6, lux: 100 }, tolDev: true,
  fields: [num('lux', 'Éclairement', 'lux', { min: 0.1, max: 10000, step: 1, log: true, slider: true })], eff: p => p, faults: ['open', 'short'],
  symbol: i => lead2(20) + `<rect x="-20" y="-7" width="40" height="14" class="sym-b"/>` + `<g class="sym-f"><line x1="-14" y1="-30" x2="-4" y2="-12"/><line x1="-2" y1="-32" x2="8" y2="-14"/></g>`,
});
def('ctn', {
  label: 'Thermistance CTN 10 kΩ', cat: 1, ref: 'CTN', pins: P2, defaults: { R25: 10000, B: 3950, T: 25 }, tolDev: true,
  fields: [num('T', 'Température', '°C', { min: -40, max: 150, step: 1, slider: true })], eff: p => p, faults: ['open', 'short'],
  symbol: i => lead2(20) + `<rect x="-20" y="-7" width="40" height="14" class="sym-b"/>` + `<polyline points="-20,16 -10,16 10,-18 20,-18" class="sym-f"/>`,
});

/* ======================== SEMI-CONDUCTEURS ======================== */
const dPins = [{ n: 'A', x: -40, y: 0 }, { n: 'K', x: 40, y: 0 }];
const dSym = extra => lead2(10) + `<polygon points="-10,-12 -10,12 10,0" class="sym-b2"/>` + L(10, -12, 10, 12) + (extra || '');
def('diode', {
  label: 'Diode', cat: 2, ref: 'D', pins: dPins, defaults: { model: '1N4007' }, fields: [sel('model', 'Référence', opts(DIODES), opts(DIODES).map(k => DIODES[k].name))],
  eff: p => Object.assign({}, DIODES[p.model] || DIODES['1N4007']), faults: ['open', 'short'], symbol: i => dSym(),
});
def('led', {
  label: 'LED', cat: 2, ref: 'D', pins: dPins, defaults: { model: 'LED rouge' }, fields: [sel('model', 'Couleur', opts(LEDS))],
  eff: p => Object.assign({}, LEDS[p.model] || LEDS['LED rouge']), faults: ['open', 'short'],
  symbol: i => dSym(`<g class="sym-f"><line x1="-6" y1="-18" x2="4" y2="-30"/><line x1="2" y1="-14" x2="12" y2="-26"/></g><circle class="led-glow" cx="0" cy="0" r="16" style="fill:${(NS.LIB.LEDS[i.p.model] || LEDS['LED rouge']).color}" opacity="0"/>`),
});
def('zener', {
  label: 'Diode Zener', cat: 2, ref: 'DZ', pins: dPins, defaults: { model: 'BZX55C5V1' }, tolDev: true, fields: [sel('model', 'Référence', opts(ZEN), opts(ZEN).map(k => ZEN[k].name))],
  eff: p => Object.assign({}, ZEN[p.model] || ZEN['BZX55C5V1']), faults: ['open', 'short'],
  symbol: i => lead2(10) + `<polygon points="-10,-12 -10,12 10,0" class="sym-b2"/>` + `<polyline points="6,-16 10,-12 10,12 14,16" class="sym-f"/>`,
});
def('bjt', {
  ext: [-40,-26,26,26],
  label: 'Transistor bipolaire', cat: 2, ref: 'Q', pins: [{ n: 'C', x: 20, y: -40 }, { n: 'B', x: -40, y: 0 }, { n: 'E', x: 20, y: 40 }], defaults: { model: 'BC547B' },
  fields: [sel('model', 'Référence', opts(BJTS), opts(BJTS).map(k => BJTS[k].name))], eff: p => Object.assign({}, BJTS[p.model] || BJTS['BC547B']), faults: ['ce', 'open', 'be_open'],
  symbol: i => { const pnp = (NS.LIB.BJTS[i.p.model] || {}).pnp; return `<circle cx="4" cy="0" r="24" class="sym-c"/>` + L(-40, 0, -8, 0) + L(-8, -14, -8, 14, 'thick') + L(-8, -7, 20, -24) + L(20, -24, 20, -40) + L(-8, 7, 20, 24) + L(20, 24, 20, 40) + (pnp ? `<polygon points="-8,7 2,10 -2,17" class="sym-fill"/>` : `<polygon points="20,24 10,14 14,22" class="sym-fill"/>`); },
});
def('opamp', {
  ext: [-40,-40,40,40],
  label: 'Amplificateur opérationnel', cat: 2, ref: 'U', pins: [{ n: '+', x: -60, y: 20 }, { n: '−', x: -60, y: -20 }, { n: 'S', x: 60, y: 0 }, { n: 'V+', x: 0, y: -40 }, { n: 'V−', x: 0, y: 40 }], defaults: { model: 'LM358' },
  fields: [sel('model', 'Référence', opts(OPS), opts(OPS).map(k => OPS[k].name))], eff: p => Object.assign({}, OPS[p.model] || OPS['LM358']), faults: ['dead'],
  symbol: i => `<polygon points="-40,-40 -40,40 40,0" class="sym-b2"/>` + L(-60, -20, -40, -20) + L(-60, 20, -40, 20) + L(40, 0, 60, 0) + L(0, -40, 0, -20) + L(0, 40, 0, 20) + T(-34, -16, '−', 'sym-s', 'start') + T(-34, 28, '+', 'sym-s', 'start') + T(10, -26, 'V+', 'sym-xs') + T(10, 36, 'V−', 'sym-xs'),
});
def('regulator', {
  ext: [-40,-36,40,26],
  label: 'Régulateur de tension (78xx)', cat: 2, ref: 'U', pins: [{ n: 'IN', x: -60, y: -20 }, { n: 'GND', x: 0, y: 40 }, { n: 'OUT', x: 60, y: -20 }], defaults: { model: '7805', heatsink: false },
  fields: [sel('model', 'Référence', opts(REGS), opts(REGS).map(k => REGS[k].name)), { k: 'heatsink', label: 'Dissipateur thermique', kind: 'bool' }], eff: p => Object.assign({}, REGS[p.model] || REGS['7805'], { heatsink: p.heatsink }), faults: ['dead', 'short'],
  symbol: i => `<rect x="-40" y="-36" width="80" height="62" rx="3" class="inst"/>` + L(-60, -20, -40, -20) + L(40, -20, 60, -20) + L(0, 26, 0, 40) + T(0, -14, i.p.model, 'sym-s') + T(-34, -24, 'IN', 'sym-xs', 'start') + T(34, -24, 'OUT', 'sym-xs', 'end') + T(0, 22, 'GND', 'sym-xs'),
});

/* ======================== COMMANDE & PROTECTION ======================== */
def('switch', {
  label: 'Interrupteur', cat: 3, ref: 'SW', pins: P2, defaults: { closed: false }, fields: [{ k: 'closed', label: 'Fermé', kind: 'bool' }], eff: p => p, faults: ['stuckOpen', 'oxid'], clickable: true,
  symbol: i => lead2(16) + `<circle cx="-16" cy="0" r="2.5" class="sym-fill"/><circle cx="16" cy="0" r="2.5" class="sym-fill"/>` + (i.p.closed ? L(-16, 0, 16, 0, 'thick') : L(-16, 0, 12, -16, 'thick')),
});
def('pushbutton', {
  label: 'Bouton poussoir', cat: 3, ref: 'BP', pins: P2, defaults: {}, fields: [], eff: p => p, faults: ['stuckOpen'], momentary: true,
  symbol: i => lead2(16) + `<circle cx="-16" cy="0" r="2.5" class="sym-fill"/><circle cx="16" cy="0" r="2.5" class="sym-fill"/>` + L(-20, i.rt && i.rt.pressed ? -2 : -10, 20, i.rt && i.rt.pressed ? -2 : -10, 'thick') + L(0, i.rt && i.rt.pressed ? -2 : -10, 0, -24),
});
def('fuse', {
  label: 'Fusible', cat: 3, ref: 'F', pins: P2, defaults: { I: 0.5, R: 0.1, fast: true }, fields: [sel('I', 'Calibre', [0.05, 0.1, 0.25, 0.5, 1, 2, 5], ['50 mA', '100 mA', '250 mA', '500 mA', '1 A', '2 A', '5 A']), { k: 'fast', label: 'Rapide (F)', kind: 'bool' }], eff: p => p, faults: ['blown'],
  symbol: i => lead2(22) + `<rect x="-22" y="-7" width="44" height="14" rx="2" class="sym-b"/>` + (i.burnt || i.fault === 'blown' ? L(-22, 0, -6, 0) + L(6, 0, 22, 0) : L(-22, 0, 22, 0)),
});
def('relay', {
  ext: [-40,-36,40,36],
  label: 'Relais', cat: 3, ref: 'K', pins: [{ n: 'C1', x: -60, y: -20 }, { n: 'C2', x: -60, y: 20 }, { n: 'NO', x: 60, y: -20 }, { n: 'COM', x: 60, y: 0 }, { n: 'NC', x: 60, y: 20 }], defaults: { V: 5, Rc: 70, L: 0.2 },
  fields: [sel('V', 'Tension de bobine', [5, 12, 24], ['5 V', '12 V', '24 V']), num('Rc', 'Résistance bobine', 'Ω', { min: 10, max: 5000 })], eff: p => Object.assign({}, p), faults: ['coilOpen', 'contact', 'stuck'],
  symbol: i => `<rect x="-40" y="-36" width="80" height="72" rx="3" class="inst"/>` + L(-60, -20, -40, -20) + L(-60, 20, -40, 20) + `<rect x="-36" y="-12" width="22" height="24" class="sym-b"/>` + L(-40, -20, -25, -20) + L(-40, 20, -25, 20) + L(-25, -20, -25, -12) + L(-25, 20, -25, 12) +
    L(40, -20, 20, -20) + L(40, 20, 20, 20) + L(40, 0, 20, 0) + `<g class="relay-arm">` + L(20, 0, 10, i.rt && i.rt.on ? -18 : 18, 'thick') + `</g>` + `<line x1="-14" y1="0" x2="8" y2="0" class="sym-dash"/>` + T(8, -26, 'NO', 'sym-xs') + T(8, 34, 'NC', 'sym-xs') + T(46, 4, 'COM', 'sym-xs', 'start'),
});
def('lamp', {
  label: 'Lampe à incandescence', cat: 3, ref: 'LP', pins: P2, defaults: { V: 12, P: 5 }, fields: [sel('V', 'Tension nominale', [6, 12, 24], ['6 V', '12 V', '24 V']), sel('P', 'Puissance', [1, 2, 5, 10, 21], ['1 W', '2 W', '5 W', '10 W', '21 W'])], eff: p => p, faults: ['open'],
  symbol: i => lead2(16) + `<circle cx="0" cy="0" r="16" class="sym-c"/><circle class="lamp-glow" cx="0" cy="0" r="22" style="fill:#ffd34d" opacity="0"/>` + L(-11, -11, 11, 11) + L(-11, 11, 11, -11),
});

/* ======================== INSTRUMENTS ======================== */
def('multimeter', {
  ext: [-50,-62,50,62],
  label: 'Multimètre numérique', cat: 4, ref: 'MM', pins: [{ n: 'V/Ω/A', x: -20, y: 80, c: 'r' }, { n: 'COM', x: 20, y: 80, c: 'k' }], defaults: { mode: 'VDC' },
  fields: [sel('mode', 'Fonction', ['VDC', 'VAC', 'mA', 'A', 'Ohm', 'Diode', 'Cont'], ['V ⎓ (continu)', 'V ∿ (alternatif)', 'mA ⎓', 'A ⎓ (10 A)', 'Ω (ohmmètre)', 'Test diode', 'Continuité'])], eff: p => p, w: 110, h: 170, body: true,
  symbol: i => `<rect x="-50" y="-62" width="100" height="124" rx="8" class="inst mm"/><rect x="-40" y="-52" width="80" height="30" rx="3" class="lcd"/><text class="mm-read" x="36" y="-31" text-anchor="end">----</text>` + `<circle cx="0" cy="18" r="20" class="dial"/>` + L(0, 18, 0, -0, 'thick') + L(-20, 62, -20, 80) + L(20, 62, 20, 80) + T(-20, 54, 'V/Ω/A', 'sym-xs') + T(20, 54, 'COM', 'sym-xs'),
});
def('scope', {
  ext: [-80,-62,80,62],
  label: 'Oscilloscope 2 voies', cat: 4, ref: 'OSC', pins: [{ n: 'CH1', x: -40, y: 80, c: 'y' }, { n: 'CH2', x: 0, y: 80, c: 'c' }, { n: 'GND', x: 40, y: 80, c: 'k' }],
  defaults: { tdiv: 5e-3, v1: 1, v2: 1, c1: 'DC', c2: 'DC', trig: 0, edge: 'up', src: 1, pos1: 0, pos2: 0, on1: true, on2: false, run: true, tpos: 1 }, fields: [], eff: p => p, w: 190, h: 170, body: true,
  symbol: i => `<rect x="-80" y="-62" width="160" height="124" rx="8" class="inst"/><rect x="-70" y="-52" width="100" height="80" rx="3" class="lcd"/><g class="sym-f" stroke="#55cc77" opacity=".6"><path d="M-62 -12 q12 -26 24 0 t24 0 t24 0"/></g>` + L(-40, 62, -40, 80) + L(0, 62, 0, 80) + L(40, 62, 40, 80) + T(-40, 54, 'CH1', 'sym-xs') + T(0, 54, 'CH2', 'sym-xs') + T(40, 54, 'GND', 'sym-xs') + `<circle cx="52" cy="-30" r="9" class="dial"/><circle cx="52" cy="0" r="9" class="dial"/>`,
});
def('ground', {
  ext: [-14,0,14,24],
  label: 'Masse (0 V)', cat: 5, ref: 'GND', pins: [{ n: 'G', x: 0, y: 0 }], defaults: {}, fields: [], eff: p => p, noLabel: true,
  symbol: i => L(0, 0, 0, 12) + L(-14, 12, 14, 12, 'thick') + L(-9, 18, 9, 18, 'thick') + L(-4, 24, 4, 24, 'thick'),
});
/* valeurs de départ des paramètres */
NS.newInst = function (type, x, y, id) {
  const d = PARTS[type]; const inst = { id: id || ('p' + (++NS._pid)), type, x, y, rot: 0, p: JSON.parse(JSON.stringify(d.defaults)), fault: null, burnt: null, rt: {}, dev: 0, ref: '' };
  inst.dev = NS.rng(NS._pid * 7919 + type.length * 31)() * 2 - 1;              // écart aléatoire (tolérance réelle)
  return inst;
};
NS._pid = 0;
})(typeof window !== 'undefined' ? window : globalThis);
