// test UI : analyseur logique (fenêtre, chronogramme, décodeur) sur UART, Modbus, I²C
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } }); const errs = []; let bad = 0;
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'ECHEC ') + m); if (!c) bad++; };
  await p.goto('file:///home/claude/simulateur-electronique/dist/electrolab.html?blank'); await p.waitForTimeout(400);
  const setup = (kind, par, pins, proto) => p.evaluate(([kind, par, pins, proto]) => { const a = __app; a.newCircuit && a.newCircuit(); const c = a.circuit; c.parts.length = 0; c.wires.length = 0; c.junctions.length = 0; const L = NS.mk(c);
    L.p(kind, 'G1', 100, 200, par); L.p('logic', 'LA1', 400, 200, {}); L.p('ground', 'GND1', 300, 320); pins.forEach(([a, b], k) => L.w('G1', a, 'LA1', 'D' + k)); L.w('G1', 'GND', 'LA1', 'GND'); L.w('LA1', 'GND', 'GND1', 'G'); const la = c.byRef('LA1'); Object.assign(la.p, proto); a.changed('structure'); a.editor.render(); a.openInstrument(la); a.editor.fit && a.editor.fit(); }, [kind, par, pins, proto]);
  // UART RS-232
  await setup('fg_uart', { baud: 9600, bits: 8, parity: 'N', stop: 1, level: 'rs232', vhi: 5, vrs: 12, msg: 'Bonjour\\r\\n', every: 0.1, polarity: 'norm', gap: 0, on: true, hidden: false }, [['TX']], { proto: 'uart', chA: 0, baud: 9600, bits: 8, parity: 'N', stop: 1, inv: true, thr: 0, tdiv: 2e-4, trigCh: 0, edge: 'down', run: true });
  await p.waitForTimeout(2500);
  const txt = await p.evaluate(() => document.querySelector('.lgtxt') && document.querySelector('.lgtxt').textContent); ok(/Bonjour/.test(txt || ''), 'UART RS-232 décodé : ' + JSON.stringify(txt));
  await p.screenshot({ path: '/tmp/la_uart.png' });
  // mauvais débit
  await p.evaluate(() => { __app.circuit.byRef('LA1').p.baud = 19200; }); await p.waitForTimeout(600);
  ok(await p.evaluate(() => /erreur/.test(document.querySelector('.lgdec').textContent)), 'mauvais débit → erreurs signalées');
  // mauvaise parité → aide « parité » ; mauvais débit → aide « débit »
  await p.evaluate(() => { const g = __app.circuit.byRef('G1'); g.p.parity = 'O'; g.p.msg = 'AT\\r\\n'; const la = __app.circuit.byRef('LA1'); la.p.baud = 9600; la.p.parity = 'N'; la.p.inv = true; la.p.thr = 0; const e = __app.sim.elOf.get(la.id); e.s.ring = null; }); await p.waitForTimeout(1800);
  const hh = await p.evaluate(() => (document.querySelector('.lghint') || {}).textContent); ok(/semble bon/.test(hh || ''), 'parité fausse → conseil format : ' + hh);
  await p.evaluate(() => { __app.circuit.byRef('LA1').p.baud = 4800; __app.circuit.byRef('LA1').p.parity = 'O'; }); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => /débit/.test((document.querySelector('.lghint') || {}).textContent || '')), 'débit faux → conseil sur le débit');
  await p.evaluate(() => { const g = __app.circuit.byRef('G1'); g.p.parity = 'N'; g.p.msg = 'Bonjour\\r\\n'; const la = __app.circuit.byRef('LA1'); la.p.baud = 9600; la.p.parity = 'N'; }); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !!document.querySelector('.lghelp summary')), 'guide d\'utilisation présent');
  // STOP : capture figée
  await p.evaluate(() => { const la = __app.circuit.byRef('LA1'); la.p.baud = 9600; la.p.run = false; }); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => /Bonjour/.test(document.querySelector('.lgtxt').textContent)), 'STOP : décodage toujours disponible');
  // Modbus
  await setup('fg_rs485', { on: true, baud: 9600, parity: 'E', stop: 1, addr: 1, func: 3, reg: 0, qty: 2, regs: '230, 1013, 45, 12', delay: 0.004, corrupt: false, every: 0.3, hidden: false }, [['A'], ['B']], { proto: 'modbus', chA: 0, chB: 1, baud: 9600, parity: 'E', stop: 1, thr: 1.65, tdiv: 5e-3, trigCh: -1, run: true });
  await p.waitForTimeout(3500); const mb = await p.evaluate(() => document.querySelector('.lgdec').textContent); ok(/CRC/.test(mb) && /registres \[230, 1013\]/.test(mb), 'Modbus décodé : ' + mb.slice(0, 160)); await p.screenshot({ path: '/tmp/la_modbus.png' });
  // I2C
  await setup('fg_i2c', { on: true, freq: 100000, addr: 0x48, rw: 'W', data: '01 A5', ack: 'oui', pullup: '4k7', vhi: 3.3, every: 0.05, hidden: false }, [['SCL'], ['SDA']], { proto: 'i2c', chA: 0, chB: 1, thr: 1.65, tdiv: 2e-4, trigCh: 1, edge: 'down', run: true });
  await p.waitForTimeout(2500); const i2 = await p.evaluate(() => document.querySelector('.lgdec').textContent); ok(/0x48/.test(i2) && /ACK/.test(i2), 'I²C décodé : ' + i2.slice(0, 120)); await p.screenshot({ path: '/tmp/la_i2c.png' });
  console.log('erreurs', errs.slice(0, 4)); console.log(bad ? 'ECHEC' : 'LOGIC UI OK'); await b.close(); process.exit(bad ? 1 : 0);
})();
