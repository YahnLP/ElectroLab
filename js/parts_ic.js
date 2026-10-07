/* parts_ic.js — catalogue : circuits intégrés (logique, NE555), optocoupleur, MOSFET */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { def, L, T, sel, num, opts } = NS.PD; const { LFAM, LIB } = NS; const CAT = NS.CATS.indexOf('Circuits intégrés & logique'), SEMI = 2;
const famF = sel('fam', 'Famille logique', Object.keys(LFAM), Object.keys(LFAM).map(k => LFAM[k].name));
const lv = c => `<circle class="lv" data-lv="${c[0]}" cx="${c[1]}" cy="${c[2]}" r="4"/>`;
const body = (x1, y1, x2, y2) => `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="3" class="inst"/>`;
const GFN = ['AND', 'NAND', 'OR', 'NOR', 'XOR', 'XNOR'], GSYM = { AND: '&', NAND: '&', OR: '≥1', NOR: '≥1', XOR: '=1', XNOR: '=1' }, GNEG = { NAND: 1, NOR: 1, XNOR: 1 };
const GCHIP = { HC: { AND: '74HC08', NAND: '74HC00', OR: '74HC32', NOR: '74HC02', XOR: '74HC86', XNOR: '74HC7266' }, LS: { AND: '74LS08', NAND: '74LS00', OR: '74LS32', NOR: '74LS02', XOR: '74LS86', XNOR: '74LS266' }, CD: { AND: 'CD4081', NAND: 'CD4011', OR: 'CD4071', NOR: 'CD4001', XOR: 'CD4070', XNOR: 'CD4077' } };

def('gate', {
  ext: [-40, -40, 60, 40], label: 'Porte logique 2 entrées (AND, NAND, OR, NOR, XOR…)', cat: CAT, ref: 'U',
  pins: [{ n: 'A', x: -60, y: -20 }, { n: 'B', x: -60, y: 20 }, { n: 'Y', x: 60, y: 0 }, { n: 'VCC', x: 0, y: -40, c: 'r' }, { n: 'GND', x: 0, y: 40, c: 'k' }],
  defaults: { fn: 'NAND', fam: 'HC' }, fields: [sel('fn', 'Fonction', GFN, GFN.map(k => k + ' — ' + GCHIP.HC[k])), famF], eff: p => Object.assign({}, p), faults: ['stuck0', 'stuck1', 'dead'],
  symbol: i => { const neg = GNEG[i.p.fn]; return body(-40, -40, 40, 40) + L(-60, -20, -40, -20) + L(-60, 20, -40, 20) + L(neg ? 48 : 40, 0, 60, 0) + (neg ? `<circle cx="44" cy="0" r="4" class="sym-c"/>` : '') + T(0, 6, GSYM[i.p.fn] || '&', 'sym-s') + T(0, -28, 'VCC', 'sym-xs') + T(0, 36, 'GND', 'sym-xs') + T(-36, -24, 'A', 'sym-xs', 'start') + T(-36, 24, 'B', 'sym-xs', 'start') + T(2, 20, (GCHIP[i.p.fam] || GCHIP.HC)[i.p.fn], 'sym-xs') + lv(['out', 28, 0]).replace('cx="28"', 'cx="30"'); },
});
const IFN = ['NOT', 'BUF', 'SCHMITT'];
def('inv', {
  ext: [-40, -40, 60, 40], label: 'Inverseur / buffer / trigger de Schmitt', cat: CAT, ref: 'U',
  pins: [{ n: 'A', x: -60, y: 0 }, { n: 'Y', x: 60, y: 0 }, { n: 'VCC', x: 0, y: -40, c: 'r' }, { n: 'GND', x: 0, y: 40, c: 'k' }],
  defaults: { fn: 'NOT', fam: 'HC' }, fields: [sel('fn', 'Fonction', IFN, ['NOT (74xx04)', 'Buffer (74xx34)', 'NOT à trigger de Schmitt (74xx14)']), famF], eff: p => Object.assign({}, p), faults: ['stuck0', 'stuck1', 'dead'],
  symbol: i => { const neg = i.p.fn !== 'BUF'; return body(-40, -40, 40, 40) + L(-60, 0, -40, 0) + L(neg ? 48 : 40, 0, 60, 0) + (neg ? `<circle cx="44" cy="0" r="4" class="sym-c"/>` : '') + T(-2, 5, '1', 'sym-s') + (i.p.fn === 'SCHMITT' ? `<path d="M-14 -20 h12 v10 h-12 z" class="sym-f" transform="translate(14,-4) scale(.7)"/>` : '') + T(0, -28, 'VCC', 'sym-xs') + T(0, 36, 'GND', 'sym-xs') + lv(['out', 30, -14]); },
});
def('dff', {
  ext: [-40, -60, 60, 60], label: 'Bascule D (74xx74)', cat: CAT, ref: 'U',
  pins: [{ n: 'D', x: -60, y: -20 }, { n: 'CK', x: -60, y: 20 }, { n: 'S̅', x: -20, y: -60 }, { n: 'R̅', x: -20, y: 60 }, { n: 'Q', x: 60, y: -20 }, { n: 'Q̅', x: 60, y: 20 }, { n: 'VCC', x: 20, y: -60, c: 'r' }, { n: 'GND', x: 20, y: 60, c: 'k' }],
  defaults: { fam: 'HC' }, fields: [famF], eff: p => Object.assign({}, p), faults: ['dead'],
  symbol: i => body(-40, -60, 40, 60) + L(-60, -20, -40, -20) + L(-60, 20, -40, 20) + `<polyline points="-40,12 -30,20 -40,28" class="sym-f"/>` + L(-20, -60, -20, -50) + L(-20, 60, -20, 50) + L(20, -60, 20, -50) + L(20, 60, 20, 50) + L(40, -20, 60, -20) + L(40, 20, 60, 20) +
    T(-34, -16, 'D', 'sym-xs', 'start') + T(34, -16, 'Q', 'sym-xs', 'end') + T(34, 24, 'Q̅', 'sym-xs', 'end') + T(-20, -42, 'S̅', 'sym-xs') + T(-20, 52, 'R̅', 'sym-xs') + T(20, -42, 'VCC', 'sym-xs') + T(20, 52, 'GND', 'sym-xs') + T(0, 4, '74xx74', 'sym-xs') + lv(['q', 26, -20]) + lv(['q2', 26, 20]),
});
def('cnt4', {
  ext: [-40, -80, 60, 80], label: 'Compteur binaire 4 bits (74xx161 simplifié)', cat: CAT, ref: 'U',
  pins: [{ n: 'CK', x: -60, y: -20 }, { n: 'MR', x: -60, y: 20 }, { n: 'Q0', x: 60, y: -60 }, { n: 'Q1', x: 60, y: -20 }, { n: 'Q2', x: 60, y: 20 }, { n: 'Q3', x: 60, y: 60 }, { n: 'VCC', x: 0, y: -80, c: 'r' }, { n: 'GND', x: 0, y: 80, c: 'k' }],
  defaults: { fam: 'HC' }, fields: [famF], eff: p => Object.assign({}, p), faults: ['dead'],
  symbol: i => body(-40, -80, 40, 80) + L(-60, -20, -40, -20) + L(-60, 20, -40, 20) + `<polyline points="-40,-28 -30,-20 -40,-12" class="sym-f"/>` + [-60, -20, 20, 60].map((y, k) => L(40, y, 60, y) + T(34, y + 4, 'Q' + k, 'sym-xs', 'end') + lv(['q' + (k ? k + 1 : ''), 22, y])).join('') + T(-34, -16, 'CK', 'sym-xs', 'start') + T(-34, 24, 'MR', 'sym-xs', 'start') + T(0, -66, 'VCC', 'sym-xs') + T(0, 74, 'GND', 'sym-xs') + T(0, 4, 'CTR 4', 'sym-s'),
});
/* le compteur : Q0 = s.q, Q1 = s.q2 … */
def('timer555', {
  ext: [-40, -60, 60, 60], label: 'NE555 / TLC555 (temporisateur)', cat: CAT, ref: 'U',
  pins: [{ n: 'GND', x: 0, y: 60, c: 'k' }, { n: 'TRIG', x: -60, y: -40 }, { n: 'OUT', x: 60, y: -40 }, { n: 'RESET', x: 20, y: -60 }, { n: 'CTRL', x: -60, y: 0 }, { n: 'THR', x: -60, y: 40 }, { n: 'DIS', x: 60, y: 40 }, { n: 'VCC', x: -20, y: -60, c: 'r' }],
  defaults: { model: 'NE555' }, fields: [sel('model', 'Référence', Object.keys(LIB.T555), Object.keys(LIB.T555).map(k => LIB.T555[k].name))], eff: p => Object.assign({}, LIB.T555[p.model] || LIB.T555.NE555, { model: p.model }), faults: ['dead'],
  symbol: i => body(-40, -60, 40, 60) + L(-60, -40, -40, -40) + L(-60, 0, -40, 0) + L(-60, 40, -40, 40) + L(40, -40, 60, -40) + L(40, 40, 60, 40) + L(-20, -60, -20, -50) + L(20, -60, 20, -50) + L(0, 60, 0, 50) +
    T(-36, -36, 'TRIG', 'sym-xs', 'start') + T(-36, 4, 'CTRL', 'sym-xs', 'start') + T(-36, 44, 'THR', 'sym-xs', 'start') + T(36, -36, 'OUT', 'sym-xs', 'end') + T(36, 44, 'DIS', 'sym-xs', 'end') + T(-20, -64, 'VCC', 'sym-xs') + T(20, -64, 'RST', 'sym-xs') + T(0, 46, 'GND', 'sym-xs') + T(0, -10, i.p.model, 'sym-s') + lv(['out', 26, -40]),
});
def('opto', {
  ext: [-40, -40, 40, 40], label: 'Optocoupleur (PC817, 4N25)', cat: SEMI, ref: 'OC',
  pins: [{ n: 'A', x: -60, y: -20 }, { n: 'K', x: -60, y: 20 }, { n: 'C', x: 60, y: -20 }, { n: 'E', x: 60, y: 20 }],
  defaults: { model: 'PC817' }, fields: [sel('model', 'Référence', Object.keys(LIB.OPTOS), Object.keys(LIB.OPTOS).map(k => LIB.OPTOS[k].name))], eff: p => Object.assign({}, LIB.OPTOS[p.model] || LIB.OPTOS.PC817), faults: ['ledOpen', 'phOpen'],
  symbol: i => body(-40, -40, 40, 40) + L(-60, -20, -40, -20) + L(-60, 20, -40, 20) + L(40, -20, 60, -20) + L(40, 20, 60, 20) +
    L(-40, -20, -24, -20) + L(-24, -20, -24, -8) + `<polygon points="-32,-8 -16,-8 -24,8" class="sym-b2"/>` + L(-32, 8, -16, 8, 'thick') + L(-24, 8, -24, 20) + L(-24, 20, -40, 20) +
    `<line x1="0" y1="-36" x2="0" y2="36" class="sym-dash"/>` + `<g class="sym-f"><line x1="-10" y1="-6" x2="6" y2="-6"/><polyline points="2,-10 6,-6 2,-2"/><line x1="-10" y1="6" x2="6" y2="6"/><polyline points="2,2 6,6 2,10"/></g>` +
    L(14, -12, 14, 12, 'thick') + L(14, -6, 40, -20) + L(14, 6, 40, 20) + `<polygon points="40,20 32,17 34,12" class="sym-fill"/>` + T(0, -30, i.p.model, 'sym-xs'),
});
const MP = Object.keys(LIB.MOSFETS);
def('mosfet', {
  ext: [-40, -40, 26, 40], label: 'Transistor MOSFET (N / P)', cat: SEMI, ref: 'Q', pins: [{ n: 'G', x: -40, y: 0 }, { n: 'D', x: 20, y: -40 }, { n: 'S', x: 20, y: 40 }],
  defaults: { model: '2N7000' }, fields: [sel('model', 'Référence', MP, MP.map(k => LIB.MOSFETS[k].name))], eff: p => Object.assign({}, LIB.MOSFETS[p.model] || LIB.MOSFETS['2N7000']), faults: ['ds', 'open', 'gs'],
  symbol: i => { const pch = (LIB.MOSFETS[i.p.model] || {}).pch; return L(-40, 0, -14, 0) + L(-14, -16, -14, 16, 'thick') + L(-8, -18, -8, -8, 'thick') + L(-8, -4, -8, 4, 'thick') + L(-8, 8, -8, 18, 'thick') + L(-8, -13, 20, -13) + L(20, -13, 20, -40) + L(-8, 13, 20, 13) + L(20, 13, 20, 40) + L(-8, 0, 20, 0) + L(20, 0, 20, 13) +
    (pch ? `<polygon points="12,0 4,-4 4,4" class="sym-fill"/>` : `<polygon points="-8,0 0,-4 0,4" class="sym-fill"/>`) + T(34, 4, i.p.model, 'sym-xs', 'start'); },
});
})(typeof window !== 'undefined' ? window : globalThis);
