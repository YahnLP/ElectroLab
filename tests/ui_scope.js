const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 860 } }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/simulateur-electronique/dist/electrolab.html?blank'); await p.waitForTimeout(400);
  await p.evaluate(() => { const sc = NS.SCENARIOS.find(s => s.id === 'rc'); __app.loadScenario(sc, 0); const a = __app; const L = NS.mk(a.circuit); const o = a.circuit.byRef('OSC1'); o.p.on2 = true; o.p.tdiv = 1e-4; L.w('OSC1', 'CH1', 'R1', 'A'); L.w('OSC1', 'CH2', 'C1', 'A'); L.w('OSC1', 'GND', 'GND1', 'G'); a.changed('structure'); a.editor.render(); a.openInstrument(o); });
  await p.waitForTimeout(2500); await p.screenshot({ path: '/tmp/ui_scope.png' }); console.log('erreurs', errs.slice(0, 5)); await b.close();
})();
