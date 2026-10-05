// test : pointes de touche (outil P) + surbrillance de nœud
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 860 } }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/simulateur-electronique/dist/electrolab.html?blank'); await p.waitForTimeout(400);
  await p.evaluate(() => { __app.loadScenario(NS.SCENARIOS.find(s => s.id === 'test'), 0); });
  await p.waitForTimeout(500);
  const pin = (ref, name) => p.evaluate(([ref, name]) => { const c = __app.circuit, pt = c.byRef(ref), i = c.pinIndex(pt, name); const el = document.querySelector('.part[data-id="' + pt.id + '"] .pin[data-pin="' + i + '"]'); const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, [ref, name]);
  await p.keyboard.press('p'); console.log('outil:', await p.evaluate(() => __app.editor.tool));
  await p.evaluate(() => { __app.circuit.byRef('MM1').p.mode = 'Ohm'; __app.changed('param'); });
  for (const [r, n] of [['R1', 'A'], ['R1', 'B']]) { const s = await pin(r, n); await p.mouse.click(s[0], s[1]); await p.waitForTimeout(100); }
  for (let i = 0; i < 10; i++) { await p.waitForTimeout(700); console.log(await p.evaluate(() => { const x = __app.instr.reading(__app.circuit.byRef('MM1')), el = __app.sim.el('MM1'); return x.s + x.u + ' Rr=' + el.s.Rr + ' mean=' + (el.s.mean||0).toFixed(3) + ' t=' + __app.sim.eng.t.toFixed(2); })); }
  console.log(await p.evaluate(() => __app.circuit.wires.filter(w => w.probe).map(w => JSON.stringify([w.a, w.b, w.color, w.probe]))));
  console.log(await p.evaluate(() => ({ probes: __app.circuit.wires.filter(w => w.probe).length, mm: document.querySelector('.mm-read').textContent, ohm: (() => { const r = __app.instr.reading(__app.circuit.byRef('MM1')); return r.s + ' ' + r.u; })() })));
  // 2e test : diode (mode test diode) — les pointes précédentes sont remplacées
  await p.evaluate(() => { __app.circuit.byRef('MM1').p.mode = 'Diode'; __app.changed('param'); });
  for (const [r, n] of [['D1', 'A'], ['D1', 'K']]) { const s = await pin(r, n); await p.mouse.click(s[0], s[1]); await p.waitForTimeout(100); }
  await p.waitForTimeout(1200);
  console.log(await p.evaluate(() => ({ probes: __app.circuit.wires.filter(w => w.probe).length, ohm: (() => { const r = __app.instr.reading(__app.circuit.byRef('MM1')); return r.s + ' ' + r.u; })() })));
  await p.keyboard.press('v'); const s = await pin('D1', 'A'); await p.mouse.move(s[0], s[1]); await p.waitForTimeout(200);
  await p.screenshot({ path: '/tmp/probe.png' }); console.log('erreurs', errs); await b.close();
})();
