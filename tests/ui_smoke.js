const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } }); const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/simulateur-electronique/index.html?blank'); await p.waitForTimeout(500);
  await p.evaluate(() => { const a = window.__app, c = a.circuit; const bat = c.add('psu', 200, 200); const r = c.add('resistor', 360, 140); const l = c.add('led', 520, 140); const g = c.add('ground', 200, 320); c.link(bat, '+', r, 'A'); c.link(r, 'B', l, 'A'); c.link(l, 'K', bat, '−'); c.link(g, 'G', bat, '−'); a.changed('structure'); a.editor.fit(); });
  await p.waitForTimeout(1200); await p.screenshot({ path: '/tmp/ui1.png' }); console.log('erreurs:', errs.slice(0, 10)); await b.close();
})();
