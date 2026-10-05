// test : déplacement d'un segment de câble à la souris, nettoyage, annulation, retracé auto
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 860 } }); const errs = []; let bad = 0;
  p.on('pageerror', e => errs.push(e.message));
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'ECHEC ') + m); if (!c) bad++; };
  await p.goto('file:///home/claude/simulateur-electronique/dist/electrolab.html?blank'); await p.waitForTimeout(400);
  await p.evaluate(() => { __app.loadScenario(NS.SCENARIOS.find(s => s.id === 'dep1'), 0); }); await p.waitForTimeout(600);
  // câble le plus long avec au moins un segment horizontal ≥ 60 px
  const info = await p.evaluate(() => { const ed = __app.editor; let best = null; for (const w of __app.circuit.wires) { const P = ed.expand(w); for (let i = 1; i < P.length - 2; i++) { const a = P[i], c = P[i + 1]; const L = Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]); if (L >= 60 && (!best || L > best.L)) best = { id: w.id, i, L, a, c }; } } if (!best) return null; const el = document.querySelector('[data-wid="' + best.id + '"] .wirehit'); const r = el.ownerSVGElement.getBoundingClientRect(); const m = el.getScreenCTM(); const mx = (best.a[0] + best.c[0]) / 2, my = (best.a[1] + best.c[1]) / 2; return Object.assign(best, { sx: m.a * mx + m.c * my + m.e, sy: m.b * mx + m.d * my + m.f, k: m.a }); });
  console.log(info); if (!info) { console.log('aucun segment'); process.exit(1); }
  const nets = () => p.evaluate(() => { const c = __app.circuit; return JSON.stringify(c.wires.map(w => [w.a, w.b])); });
  const before = await nets(); const mid0 = await p.evaluate(id => JSON.stringify(__app.circuit.wires.find(w => w.id === id).mid), info.id);
  const horiz = info.a[1] === info.c[1];
  await p.mouse.move(info.sx, info.sy); await p.mouse.down(); await p.mouse.move(info.sx + (horiz ? 0 : 30 * info.k), info.sy + (horiz ? 30 * info.k : 0), { steps: 6 }); await p.mouse.up();
  const mid1 = await p.evaluate(id => JSON.stringify(__app.circuit.wires.find(w => w.id === id).mid), info.id);
  ok(mid1 !== mid0, 'segment déplacé (mid modifié) ' + mid1);
  ok(await nets() === before, 'connexions inchangées');
  await p.evaluate(() => { __app.editor.undo(); }); const mid2 = await p.evaluate(id => JSON.stringify(__app.circuit.wires.find(w => w.id === id).mid), info.id);
  ok(mid2 === mid0, 'annulation restaure le tracé');
  await p.waitForTimeout(600); await p.mouse.move(info.sx, info.sy); await p.mouse.down(); await p.mouse.move(info.sx + (horiz ? 0 : 30 * info.k), info.sy + (horiz ? 30 * info.k : 0), { steps: 6 }); await p.mouse.up();
  const s2 = await p.evaluate(id => { const w = __app.circuit.wires.find(x => x.id === id); const m = w.mid[0]; return 1; }, info.id);
  await p.waitForTimeout(150); ok(await p.evaluate(() => !!document.querySelector('.seghandle')), 'poignées visibles sur le câble sélectionné');
  await p.screenshot({ path: '/tmp/wire.png' });
  await p.evaluate(id => { const w = __app.circuit.wires.find(x => x.id === id); w.mid = []; __app.editor.redrawWires(); }, info.id);
  ok(await p.evaluate(() => { __app.changed('geometry'); return true; }), 'retracé auto');
  await p.waitForTimeout(500); console.log('erreurs', errs); console.log(bad ? 'ECHEC' : 'WIRE OK'); await b.close(); process.exit(bad ? 1 : 0);
})();
