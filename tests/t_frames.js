// générateurs de trames + analyseur logique (capture dans le moteur, puis décodage)
const NS = require('./load')(); const { Circuit, Sim } = NS; const P = NS.PROTO; let bad = 0;
const ok = (n, c, d) => { if (!c) bad++; console.log((c ? 'ok   ' : 'FAIL ') + n + (d ? '  ' + d : '')); };
function C() { const c = new Circuit(); c.G = c.add('ground', 0, 0, {}, 'GND1'); return c; }
const add = (c, t, ref, p) => { const i = c.add(t, 0, 0, p || {}, ref); i.dev = 0; return i; };
function run(c, T) { const s = new Sim(c); s.advance(T); return s; }
const ring = s => s.el('LA1').s.ring;
// UART TTL → D0
{ const c = C(); add(c, 'fg_uart', 'TX1', { baud: 9600, bits: 8, parity: 'N', stop: 1, level: 'ttl', vhi: 5, msg: 'Bonjour\\r\\n', every: 0.1, polarity: 'norm', gap: 0, on: true, vrs: 12 }); add(c, 'logic', 'LA1');
  c.link('TX1', 'TX', 'LA1', 'D0'); c.link('TX1', 'GND', 'LA1', 'GND'); c.link(c.G, 'G', 'LA1', 'GND'); const s = run(c, 0.09);
  const ev = P.ringEvents(ring(s), 0, 2.5); const d = P.uartDecode(ev, { baud: 9600, bits: 8, parity: 'N', stop: 1 }); const txt = d.map(x => String.fromCharCode(x.byte)).join('');
  ok('UART TTL capturé par l\'analyseur', txt === 'Bonjour\r\n', JSON.stringify(txt) + ' · ' + ring(s).n + ' échantillons, ' + s.eng.stats.steps + ' pas'); }
// RS-232 ±12 V (logique inversée), seuil 0 V
{ const c = C(); add(c, 'fg_uart', 'TX1', { baud: 19200, bits: 8, parity: 'E', stop: 1, level: 'rs232', vhi: 5, vrs: 12, msg: 'OK 12', every: 0.05, polarity: 'norm', gap: 0, on: true }); add(c, 'logic', 'LA1');
  c.link('TX1', 'TX', 'LA1', 'D0'); c.link(c.G, 'G', 'LA1', 'GND'); c.link(c.G, 'G', 'TX1', 'GND'); const s = run(c, 0.045); const r = ring(s); let vmin = 1e9, vmax = -1e9; for (let j = 0; j < r.n; j++) { const v = r.v[0][r.idx(j)]; vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); }
  const ev = P.invert(P.ringEvents(r, 0, 0)); const d = P.uartDecode(ev, { baud: 19200, bits: 8, parity: 'E', stop: 1 }); const txt = d.map(x => String.fromCharCode(x.byte)).join('');
  ok('RS-232 : niveaux ±12 V, décodage après inversion', txt === 'OK 12' && vmax > 11 && vmin < -11, JSON.stringify(txt) + ' · ' + vmin.toFixed(1) + ' / ' + vmax.toFixed(1) + ' V'); }
// Modbus RTU en différentiel (A→D0, B→D1)
{ const c = C(); add(c, 'fg_rs485', 'MB1', { baud: 9600, parity: 'E', stop: 1, addr: 1, func: 3, reg: 0, qty: 2, regs: '230, 1013, 45, 12', delay: 0.004, corrupt: false, every: 0.3, on: true }); add(c, 'logic', 'LA1');
  c.link('MB1', 'A', 'LA1', 'D0'); c.link('MB1', 'B', 'LA1', 'D1'); c.link(c.G, 'G', 'LA1', 'GND'); c.link(c.G, 'G', 'MB1', 'GND'); const s = run(c, 0.12);
  const ev = P.ringEvents(ring(s), 1, 0, 0); const fr = P.modbusDecode(ev, { baud: 9600, parity: 'E', stop: 1 });
  ok('Modbus RTU en différentiel', fr.length === 2 && fr.every(f => f.ok) && /registres \[230, 1013\]/.test(fr[1].text), fr.map(f => f.text).join(' || ')); }
// I²C avec résistances internes
{ const c = C(); add(c, 'fg_i2c', 'I1', { freq: 100000, addr: 0x48, rw: 'W', data: '01 A5', ack: 'oui', pullup: '4k7', vhi: 3.3, every: 0.05, on: true }); add(c, 'logic', 'LA1');
  c.link('I1', 'SCL', 'LA1', 'D0'); c.link('I1', 'SDA', 'LA1', 'D1'); c.link(c.G, 'G', 'LA1', 'GND'); c.link(c.G, 'G', 'I1', 'GND'); const s = run(c, 0.04);
  const r = ring(s); const d = P.i2cDecode(P.ringEvents(r, 0, 1.65), P.ringEvents(r, 1, 1.65)); ok('I²C : adresse 0x48, données 01 A5', d.length >= 1 && d[0].addr === 0x48 && d[0].bytes.map(b => b.v).join() === '1,165', d[0] && ('addr ' + d[0].addr + ' · ' + d[0].bytes.map(b => b.v).join())); }
// I²C sans résistances de rappel : le bus ne monte pas
{ const c = C(); add(c, 'fg_i2c', 'I1', { freq: 100000, addr: 0x48, rw: 'W', data: '01', ack: 'oui', pullup: 'none', vhi: 3.3, every: 0.05, on: true }); add(c, 'logic', 'LA1');
  c.link('I1', 'SCL', 'LA1', 'D0'); c.link('I1', 'SDA', 'LA1', 'D1'); c.link(c.G, 'G', 'LA1', 'GND'); c.link(c.G, 'G', 'I1', 'GND'); const s = run(c, 0.04); const r = ring(s); let vmax = 0; for (let j = 0; j < r.n; j++) vmax = Math.max(vmax, r.v[1][r.idx(j)]);
  ok('I²C sans pull-up : SDA reste bas (pas de 1 logique)', vmax < 0.5, 'Vmax SDA = ' + vmax.toFixed(2) + ' V'); }
// SPI mode 3
{ const c = C(); add(c, 'fg_spi', 'S1', { freq: 100000, mode: 3, data: 'A5 3C', reply: '11 22', vhi: 3.3, every: 0.05, on: true }); add(c, 'logic', 'LA1');
  ['CS', 'SCK', 'MOSI', 'MISO'].forEach((n, k) => c.link('S1', n, 'LA1', 'D' + k)); c.link(c.G, 'G', 'LA1', 'GND'); c.link(c.G, 'G', 'S1', 'GND'); const s = run(c, 0.04); const r = ring(s);
  const d = P.spiDecode({ cs: P.ringEvents(r, 0, 1.65), clk: P.ringEvents(r, 1, 1.65), mosi: P.ringEvents(r, 2, 1.65), miso: P.ringEvents(r, 3, 1.65) }, 3, 8); ok('SPI mode 3 : MOSI A5 3C / MISO 11 22', d.length >= 1 && d[0].mosi.join() === '165,60' && d[0].miso.join() === '17,34', d[0] && d[0].mosi.join() + ' / ' + d[0].miso.join()); }
// avance par tranches de 1/60 s (comme l'affichage) : aucune trame perdue, y compris au passage de la période
{ const c = C(); add(c, 'fg_uart', 'TX1', { baud: 9600, bits: 8, parity: 'N', stop: 1, level: 'ttl', vhi: 5, msg: 'Bonjour\\r\\n', every: 0.1, polarity: 'norm', gap: 0, on: true }); add(c, 'logic', 'LA1');
  c.link('TX1', 'TX', 'LA1', 'D0'); c.link(c.G, 'G', 'LA1', 'GND'); c.link(c.G, 'G', 'TX1', 'GND'); const s = new Sim(c); for (let i = 0; i < 240; i++) s.advance(1 / 60, 12);
  const d = P.uartDecode(P.ringEvents(ring(s), 0, 2.5), { baud: 9600, bits: 8, parity: 'N', stop: 1 }); const txt = d.map(x => x.err ? '⚠' : String.fromCharCode(x.byte)).join(''); const n = (txt.match(/Bonjour\r\n/g) || []).length;
  ok('40 messages consécutifs sans perte (tranches d\'affichage)', n === 40 && !/⚠/.test(txt), n + ' messages · ' + d.length + ' octets'); }
console.log(bad ? bad + ' ÉCHEC(S)' : 'FRAMES OK'); process.exit(bad ? 1 : 0);
