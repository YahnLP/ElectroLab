// usage: node tests/ui_shots.js id[:variant] ... → /tmp/shot_<id>.png
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 820 } }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/simulateur-electronique/dist/electrolab.html?blank'); await p.waitForTimeout(400);
  for (const a of process.argv.slice(2)) {
    const [id, v] = a.split(':');
    await p.evaluate(([id, v]) => { const sc = NS.SCENARIOS.find(s => s.id === id); __app.loadScenario(sc, v === undefined ? undefined : +v); }, [id, v]);
    await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/shot_' + id + (v ? '_' + v : '') + '.png' });
  }
  console.log('erreurs:', errs.slice(0, 8)); await b.close();
})();
