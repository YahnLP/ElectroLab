// charge chaque nouveau TP dans l'interface, vérifie l'absence d'erreur et le rendu des questions
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/simulateur-electronique/dist/electrolab.html?blank'); await p.waitForTimeout(400);
  for (const id of ['portes', 'ne555', 'opto', 'mosfet', 'dep_log', 'uart', 'modbus', 'i2c', 'spi']) {
    const r = await p.evaluate(id => { const a = window.__app; const sc = NS.SCENARIOS.find(s => s.id === id); a.loadScenario(sc, 0); return { q: document.querySelectorAll('.q').length, parts: a.circuit.parts.length }; }, id);
    await p.waitForTimeout(500); console.log(id, JSON.stringify(r));
    if (id === 'ne555' || id === 'uart') await p.screenshot({ path: '/tmp/tp_' + id + '.png' });
  }
  console.log('erreurs:', errs.slice(0, 10)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
