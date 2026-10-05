// test : verrouillage PIN du mode enseignant + journal
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 860 } }); const errs = []; let bad = 0;
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'ECHEC ') + m); if (!c) bad++; };
  await p.goto('file:///home/claude/simulateur-electronique/dist/electrolab.html?blank'); await p.waitForTimeout(400);
  await p.evaluate(() => { __app.loadScenario(NS.SCENARIOS.find(s => s.id === 'dep1'), 2); });
  await p.click('#opt-teacher'); ok(await p.evaluate(() => __app.teacher), 'sans PIN : mode enseignant actif');
  await p.click('#btn-lock'); await p.fill('.pinin >> nth=0', '123456'); await p.fill('.pinin >> nth=1', '123456');
  await p.click('text=Définir et verrouiller'); await p.waitForTimeout(100);
  ok(!(await p.evaluate(() => __app.teacher)), 'verrouillé après définition du PIN');
  ok(await p.evaluate(() => !document.querySelector('.tp-card[style*="fef2f2"]')), 'panne injectée masquée');
  await p.click('#opt-teacher', { force: true }); ok(await p.isVisible('.pinbox'), 'case cochée → demande du PIN');
  for (const c of ['000000', '111111']) { await p.fill('.pinin', c); await p.press('.pinin', 'Enter'); }
  ok(!(await p.evaluate(() => __app.teacher)), 'mauvais codes refusés');
  await p.fill('.pinin', '222222'); await p.press('.pinin', 'Enter'); await p.waitForTimeout(100);
  ok(await p.isVisible('text=Blocage'), '3e échec → blocage temporaire');
  await p.fill('.pinin', '123456'); await p.press('.pinin', 'Enter'); ok(!(await p.evaluate(() => __app.teacher)), 'bon code refusé pendant le blocage');
  await p.evaluate(() => { const d = JSON.parse(localStorage['electrolab.teacher']); d.until = 0; localStorage['electrolab.teacher'] = JSON.stringify(d); });
  await p.fill('.pinin', '123456'); await p.press('.pinin', 'Enter'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => __app.teacher), 'bon code → déverrouillé');
  const lg = await p.evaluate(() => NS.Teacher.log().map(e => e.k)); console.log(lg.join(','));
  ok(lg.filter(k => k === 'echec').length === 3 && lg.includes('bloque') && lg.includes('succes'), 'journal : 3 échecs, 1 blocage, 1 succès');
  await p.click('#btn-lock'); await p.screenshot({ path: '/tmp/pin.png' });
  console.log('erreurs', errs); console.log(bad ? 'ECHEC' : 'PIN OK'); await b.close(); process.exit(bad ? 1 : 0);
})();
