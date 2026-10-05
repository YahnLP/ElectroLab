// test : oscilloscope en STOP → l'image reste affichée et les mesures restent stables longtemps
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 860 } }); const errs = []; let bad = 0;
  p.on('pageerror', e => errs.push(e.message));
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'ECHEC ') + m); if (!c) bad++; };
  await p.goto('file:///home/claude/simulateur-electronique/dist/electrolab.html?blank'); await p.waitForTimeout(400);
  await p.evaluate(() => { const sc = NS.SCENARIOS.find(s => s.id === 'rc'); __app.loadScenario(sc, 0); const a = __app; const L = NS.mk(a.circuit); const o = a.circuit.byRef('OSC1'); o.p.on2 = true; o.p.tdiv = 1e-4; L.w('OSC1', 'CH1', 'R1', 'A'); L.w('OSC1', 'CH2', 'C1', 'A'); L.w('OSC1', 'GND', 'GND1', 'G'); a.changed('structure'); a.editor.render(); a.openInstrument(o); });
  await p.waitForTimeout(2500);
  const meas = () => p.evaluate(() => (document.querySelector('.scmeas') || {}).textContent || '');
  const ink = () => p.evaluate(() => { const cv = document.querySelector('canvas'); const c = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < c.length; i += 4) if (c[i] > 200 && c[i + 1] > 180 && c[i + 2] < 100) n++; return n; });
  const before = await meas(), inkBefore = await ink();
  await p.evaluate(() => { const o = __app.circuit.byRef('OSC1'); o.p.run = false; });
  await p.waitForTimeout(500); const m1 = await meas(), i1 = await ink();
  await p.evaluate(() => { __app.speed = 100; }); await p.waitForTimeout(6000);
  const m2 = await meas(), i2 = await ink();
  ok(i1 > 50 && i2 > 50, 'courbe encore tracée après long STOP (' + i1 + ' / ' + i2 + ')');
  ok(m1 === m2 && /Vpp/.test(m1) && !/Vpp 0 V/.test(m1), 'mesures stables et non nulles en STOP'); console.log(m1.slice(0, 120)); console.log(m2.slice(0, 120));
  console.log('erreurs', errs); console.log(bad ? 'ECHEC' : 'STOP OK'); await b.close(); process.exit(bad ? 1 : 0);
})();
