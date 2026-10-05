// test d'interaction réelle (souris) : placer, câbler, mesurer, ouvrir un instrument
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 860 } }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/simulateur-electronique/dist/electrolab.html?blank'); await p.waitForTimeout(400);
  const box = await p.evaluate(() => { const r = document.querySelector('#canvas, svg.canvas, #editor svg, svg').getBoundingClientRect(); return [r.left, r.top]; });
  const scr = (wx, wy) => p.evaluate(([wx, wy]) => { const e = __app.editor, r = e.svg.getBoundingClientRect(); return [r.left + e.view.x + wx * e.view.k, r.top + e.view.y + wy * e.view.k]; }, [wx, wy]);
  const place = async (type, wx, wy) => { await p.evaluate(t => __app.editor.arm(t), type); const s = await scr(wx, wy); await p.mouse.move(s[0], s[1]); await p.mouse.click(s[0], s[1]); await p.keyboard.press('Escape'); };
  await place('psu', 100, 160); await place('resistor', 300, 140); await place('ground', 200, 300); await place('multimeter', 520, 200);
  const pin = (ref, name) => p.evaluate(([ref, name]) => { const c = __app.circuit, pt = c.parts.find(x => x.ref === ref || x.type === ref), i = c.pinIndex(pt, name); const el = document.querySelector('.part[data-id="' + pt.id + '"] .pin[data-pin="' + i + '"]'); const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, [ref, name]);
  const wire = async (a, pa, b2, pb) => { await p.evaluate(() => __app.editor.setTool('wire')); const s = await pin(a, pa), t = await pin(b2, pb); await p.mouse.move(s[0], s[1]); await p.mouse.down(); console.log('  wiring?', await p.evaluate(() => { const w = __app.editor.wiring; return w ? JSON.stringify({ from: w.from, mode: w.mode, armed: __app.editor.armed }) : 'non; armed=' + __app.editor.armed; })); await p.mouse.move((s[0] + t[0]) / 2, (s[1] + t[1]) / 2, { steps: 4 }); await p.mouse.move(t[0], t[1], { steps: 4 }); await p.mouse.up(); await p.evaluate(() => __app.editor.setTool('select')); };
  const refs = await p.evaluate(() => __app.circuit.parts.map(x => x.ref).join(' ')); console.log('parts', refs);
  const W = [['AL1', '+', 'R1', 'A'], ['R1', 'B', 'AL1', '−'], ['ground', 'G', 'AL1', '−'], ['MM1', 'V/Ω/A', 'R1', 'A'], ['MM1', 'COM', 'R1', 'B']];
  for (const w of W) { const n0 = await p.evaluate(() => __app.circuit.wires.length); await wire(...w); const n1 = await p.evaluate(() => __app.circuit.wires.length); console.log(w.join(' '), n0, '->', n1, JSON.stringify(await pin(w[0], w[1])), JSON.stringify(await pin(w[2], w[3]))); }
  const hit = await p.evaluate(() => { const out = []; for (const [r, n] of [['R1', 'A'], ['AL1', '+'], ['MM1', 'COM']]) { const c = __app.circuit, pt = c.parts.find(x => x.ref === r), i = c.pinIndex(pt, n); const el = document.querySelector('.part[data-id="' + pt.id + '"] .pin[data-pin="' + i + '"]'); const b = el.getBoundingClientRect(); const e2 = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); out.push(r + n + ' -> ' + (e2 ? e2.tagName + '.' + (e2.getAttribute('class') || '') : null)); } return out; }); console.log(hit.join(' | '));
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const a = __app; const sim = a.sim; a.circuit.byRef('AL1').p.V = 10; sim.invalidate(); sim.advance(0.5); return { wires: a.circuit.wires.length, v: sim.vPin('R1', 'A'), vb: sim.vPin('R1', 'B'), mm: document.querySelector('.mm-read') && document.querySelector('.mm-read').textContent }; });
  console.log(JSON.stringify(r));
  await p.evaluate(() => { window.__dbl = []; __app.editor.svg.addEventListener('dblclick', e => window.__dbl.push(e.target.tagName + '.' + e.target.getAttribute('class') + ' wiring=' + !!__app.editor.wiring), true); });
  const s = await scr(520, 200); console.log('dbl at', s); await p.mouse.dblclick(s[0], s[1]); await p.waitForTimeout(900); await p.screenshot({ path: '/tmp/ui_int.png' });
  const win = await p.evaluate(() => { console.log('x'); const w = document.querySelector('.win'); return w ? w.innerText.replace(/\s+/g, ' ').slice(0, 120) : 'pas de fenêtre'; }); console.log('fenêtre:', win, JSON.stringify(await p.evaluate(() => window.__dbl)));
  console.log('erreurs:', errs.slice(0, 8)); await p.screenshot({ path: '/tmp/ui_int.png' }); await b.close();
})();
