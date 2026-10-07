/* parts_frames.js — générateurs de trames et analyseur logique */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { def, L, T, sel, num } = NS.PD;
const txt = (k, label) => ({ k, label, kind: 'text' });
const bool = (k, label) => ({ k, label, kind: 'bool' });
const BAUDS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
const baud = sel('baud', 'Débit', BAUDS, BAUDS.map(b => b + ' bauds'));
const box = (x1, y1, x2, y2, title, sub) => `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="5" class="inst"/>` + T((x1 + x2) / 2, y1 + 14, title, 'sym-s') + (sub ? T((x1 + x2) / 2, y1 + 27, sub, 'sym-xs') : '');
const wave = (x, y) => `<g class="sym-f" stroke="#2563eb"><path d="M${x} ${y} h6 v-10 h8 v10 h6 v-10 h10 v10 h6"/></g>`;
const FRAME_FAULTS = ['dead'];
def('fg_uart', {
  ext: [-50, -40, 50, 40], label: 'Émetteur série UART / RS-232', cat: 0, ref: 'TX', pins: [{ n: 'TX', x: 60, y: -20 }, { n: 'GND', x: 60, y: 20, c: 'k' }],
  defaults: { on: true, baud: 9600, bits: 8, parity: 'N', stop: 1, level: 'ttl', vhi: 5, vrs: 12, polarity: 'norm', msg: 'Bonjour\\r\\n', every: 0.1, gap: 0, hidden: false },
  fields: [bool('on', 'Émission active'), baud, sel('bits', 'Bits de données', [7, 8], ['7', '8']), sel('parity', 'Parité', ['N', 'E', 'O'], ['Aucune', 'Paire', 'Impaire']), sel('stop', 'Bits de stop', [1, 2], ['1', '2']),
    sel('level', 'Niveaux', ['ttl', 'rs232'], ['TTL / CMOS (0–5 V)', 'RS-232 (±12 V, logique inversée)']), sel('vhi', 'Tension TTL', [3.3, 5], ['3,3 V', '5 V']), txt('msg', 'Message (\\r \\n \\xNN)'), num('every', 'Répétition', 's', { min: 0.01, max: 10 }), bool('hidden', 'Masquer les réglages (TP d\'analyse)')],
  eff: p => p, faults: FRAME_FAULTS,
  symbol: i => box(-50, -40, 50, 40, 'UART', i.p.hidden ? '? bd' : i.p.baud + ' bd') + wave(-18, 22) + L(50, -20, 60, -20) + L(50, 20, 60, 20) + T(40, -16, 'TX', 'sym-xs', 'end') + T(40, 24, 'GND', 'sym-xs', 'end'),
});
def('fg_rs485', {
  ext: [-50, -50, 50, 50], label: 'Nœud RS-485 / Modbus RTU (maître + esclave)', cat: 0, ref: 'MB', pins: [{ n: 'A', x: 60, y: -20 }, { n: 'B', x: 60, y: 0 }, { n: 'GND', x: 60, y: 20, c: 'k' }],
  defaults: { on: true, baud: 9600, parity: 'E', stop: 1, addr: 1, func: 3, reg: 0, qty: 2, regs: '230, 1013, 45, 12', delay: 0.004, corrupt: false, every: 0.3, hidden: false },
  fields: [bool('on', 'Bus actif'), baud, sel('parity', 'Parité', ['N', 'E', 'O'], ['Aucune (2 stops)', 'Paire (8E1)', 'Impaire']), sel('stop', 'Bits de stop', [1, 2], ['1', '2']), num('addr', 'Adresse esclave', '', { min: 1, max: 247 }), sel('func', 'Fonction', [3, 6], ['03 — Lire registres', '06 — Écrire un registre']),
    num('reg', 'Adresse du registre', '', { min: 0, max: 65535 }), num('qty', 'Quantité / valeur', '', { min: 0, max: 65535 }), txt('regs', 'Table de registres de l\'esclave'), num('delay', 'Délai de réponse', 's', { min: 0.001, max: 0.5 }), bool('corrupt', 'Réponse au CRC corrompu (défaut de ligne)'), num('every', 'Répétition', 's', { min: 0.05, max: 10 }), bool('hidden', 'Masquer les réglages (TP d\'analyse)')],
  eff: p => p, faults: FRAME_FAULTS,
  symbol: i => box(-50, -50, 50, 50, 'RS-485', 'Modbus RTU') + wave(-18, 30) + L(50, -20, 60, -20) + L(50, 0, 60, 0) + L(50, 20, 60, 20) + T(40, -16, 'A', 'sym-xs', 'end') + T(40, 4, 'B', 'sym-xs', 'end') + T(40, 24, 'GND', 'sym-xs', 'end'),
});
def('fg_i2c', {
  ext: [-50, -50, 50, 50], label: 'Maître / esclave I²C', cat: 0, ref: 'I2C', pins: [{ n: 'SCL', x: 60, y: -20 }, { n: 'SDA', x: 60, y: 0 }, { n: 'GND', x: 60, y: 20, c: 'k' }],
  defaults: { on: true, freq: 100000, addr: 0x48, rw: 'W', data: '01 A5', ack: 'oui', pullup: 'none', vhi: 3.3, every: 0.05, hidden: false },
  fields: [bool('on', 'Bus actif'), sel('freq', 'Fréquence SCL', [100000, 400000], ['100 kHz (standard)', '400 kHz (rapide)']), num('addr', 'Adresse 7 bits (décimal)', '', { min: 0, max: 127 }), sel('rw', 'Sens', ['W', 'R'], ['Écriture', 'Lecture']), txt('data', 'Octets (hexa)'), sel('ack', 'Esclave présent (ACK)', ['oui', 'non'], ['Oui', 'Non (NACK)']),
    sel('pullup', 'Résistances de rappel', ['none', '4k7'], ['Externes (à câbler)', 'Internes 4,7 kΩ']), sel('vhi', 'Tension du bus', [3.3, 5], ['3,3 V', '5 V']), num('every', 'Répétition', 's', { min: 0.01, max: 10 }), bool('hidden', 'Masquer les réglages (TP d\'analyse)')],
  eff: p => Object.assign({}, p, { ack: p.ack !== 'non' }), faults: FRAME_FAULTS,
  symbol: i => box(-50, -50, 50, 50, 'I²C', i.p.hidden ? '? kHz' : (i.p.freq / 1000) + ' kHz') + `<g class="sym-f" stroke="#2563eb"><path d="M-30 14 h10 v-8 h10 v8 h10 v-8 h10"/><path d="M-30 30 h6 v-8 h22 v8 h12"/></g>` + L(50, -20, 60, -20) + L(50, 0, 60, 0) + L(50, 20, 60, 20) + T(40, -16, 'SCL', 'sym-xs', 'end') + T(40, 4, 'SDA', 'sym-xs', 'end') + T(40, 24, 'GND', 'sym-xs', 'end'),
});
def('fg_spi', {
  ext: [-50, -60, 50, 60], label: 'Maître / esclave SPI', cat: 0, ref: 'SPI', pins: [{ n: 'CS', x: 60, y: -40 }, { n: 'SCK', x: 60, y: -20 }, { n: 'MOSI', x: 60, y: 0 }, { n: 'MISO', x: 60, y: 20 }, { n: 'GND', x: 60, y: 40, c: 'k' }],
  defaults: { on: true, freq: 100000, mode: 0, data: 'A5 3C 00', reply: '', vhi: 3.3, every: 0.05, hidden: false },
  fields: [bool('on', 'Bus actif'), sel('freq', 'Fréquence SCK', [10000, 100000, 1000000, 4000000], ['10 kHz', '100 kHz', '1 MHz', '4 MHz']), sel('mode', 'Mode SPI (CPOL/CPHA)', [0, 1, 2, 3], ['0 (0,0)', '1 (0,1)', '2 (1,0)', '3 (1,1)']), txt('data', 'Octets MOSI (hexa)'), txt('reply', 'Octets MISO (hexa, vide = ~MOSI)'),
    sel('vhi', 'Tension', [3.3, 5], ['3,3 V', '5 V']), num('every', 'Répétition', 's', { min: 0.01, max: 10 }), bool('hidden', 'Masquer les réglages (TP d\'analyse)')],
  eff: p => p, faults: FRAME_FAULTS,
  symbol: i => box(-50, -60, 50, 60, 'SPI', i.p.hidden ? 'mode ?' : 'mode ' + i.p.mode) + wave(-18, 40) + [-40, -20, 0, 20, 40].map(y => L(50, y, 60, y)).join('') + T(40, -36, 'CS', 'sym-xs', 'end') + T(40, -16, 'SCK', 'sym-xs', 'end') + T(40, 4, 'MOSI', 'sym-xs', 'end') + T(40, 24, 'MISO', 'sym-xs', 'end') + T(40, 44, 'GND', 'sym-xs', 'end'),
});
const CAT_I = NS.CATS.indexOf('Instruments');
def('logic', {
  ext: [-100, -52, 100, 52], label: 'Analyseur logique 8 voies (décodeur UART, Modbus, I²C, SPI)', cat: CAT_I, ref: 'LA',
  pins: [0, 1, 2, 3, 4, 5, 6, 7].map(k => ({ n: 'D' + k, x: -80 + 20 * k, y: 80, c: ['k', 'r', 'o', 'y', 'g', 'b', 'v', 'w'][k] })).concat([{ n: 'GND', x: 80, y: 80, c: 'k' }]),
  defaults: { tdiv: 1e-3, pos: 0, run: true, thr: 1.65, trigCh: -1, edge: 'down', proto: 'none', chA: 0, chB: 1, chC: 2, chD: 3, baud: 9600, bits: 8, parity: 'N', stop: 1, inv: false, diff: false, mode: 0 },
  fields: [], eff: p => p, w: 220, h: 170, body: true,
  symbol: i => `<rect x="-100" y="-52" width="200" height="104" rx="8" class="inst"/><rect x="-90" y="-42" width="130" height="68" rx="3" class="lcd"/><g class="sym-f" stroke="#2f855a"><path d="M-84 -34 h14 v8 h12 v-8 h18 v8 h10 v-8 h14"/><path d="M-84 -14 h8 v8 h20 v-8 h12 v8 h22"/></g>` +
    [0, 1, 2, 3, 4, 5, 6, 7].map(k => L(-80 + 20 * k, 52, -80 + 20 * k, 80) + T(-80 + 20 * k, 46, 'D' + k, 'sym-xs')).join('') + L(80, 52, 80, 80) + T(80, 46, 'GND', 'sym-xs') + T(70, -26, 'LOGIC', 'sym-s') + T(70, -14, 'ANALYZER', 'sym-xs'),
});
})(typeof window !== 'undefined' ? window : globalThis);
