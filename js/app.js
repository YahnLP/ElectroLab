/* app.js — application : boucle de simulation, palette, inspecteur, TP, fichiers */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const { h, $, $$, clear, PARTS, CATS, fmt } = NS;
const LS = 'electrolab.v1';
const FAULTS = { open: 'Circuit ouvert', short: 'Court-circuit', drift: 'Valeur dérivée (×3,3)', leaky: 'Fuite (résistance parallèle)', dried: 'Électrolytique séché (C↓, ESR↑)', dead: 'Hors service', ce: 'Collecteur-émetteur en court-circuit', be_open: 'Jonction base-émetteur ouverte', openP: 'Primaire coupé', openS: 'Secondaire coupé', turns: 'Spires en court-circuit', stuckOpen: 'Contact bloqué ouvert', oxid: 'Contact oxydé (47 Ω)', blown: 'Grillé', coilOpen: 'Bobine coupée', contact: 'Contact résistif', stuck: 'Armature bloquée' };
NS.FAULTS = FAULTS;
const plain = v => NS.fmt(v, '', 4).trim().replace(' ', '');

class App {
  constructor() {
    this.circuit = new NS.Circuit(); this.sim = new NS.Sim(this.circuit); this.opts = { aide: false }; this.teacher = false; this.speed = 1; this.running = true; this.tp = null; this.notes = []; this.saveT = null; this.answers = {};
    this.sim.onEvent = e => this.onSimEvent(e);
  }
  init() {
    this.editor = new NS.Editor(this); this.instr = new NS.Instruments(this); this.buildPalette(); this.render(); this.bindUI(); this.logLines = [];
    requestAnimationFrame(t => { this.last = t; this.loop(t); });
  }
  /* ---------------- boucle ---------------- */
  loop(ts) {
    requestAnimationFrame(t => this.loop(t));
    const dt = Math.min(0.1, (ts - this.last) / 1000); this.last = ts;
    if (this.running && this.circuit.parts.length) { try { this.sim.advance(dt * this.speed, 12); } catch (e) { console.error(e); this.running = false; this.toast('Erreur de simulation : ' + e.message, 'err'); } }
    if (this.running) NS.thermal.update(this.sim, dt * this.speed);
    this.editor.dyn(); this.instr.update();
    $('#simtime').textContent = 't = ' + this.sim.eng.t.toFixed(3) + ' s';
    const wb = $('#simwarn'); let w = this.sim.eng.warn;
    { const bad = this.sim.eng.stats.bad || 0; if (!this._bw || ts - this._bw.t > 1000) { this._badOn = this._bw ? bad - this._bw.n > 8 : false; this._bw = { t: ts, n: bad }; } if (w === 'Non-convergence' && !this._badOn) w = null; }   // un échec isolé pendant un transitoire (fusible qui saute…) n'est pas affiché wb.style.display = w ? '' : 'none'; if (w) wb.textContent = '⚠ ' + w;
    const noG = this.circuit.parts.length && this.circuit.hasGround === false; const bn = $('#banner'); bn.style.display = noG ? '' : 'none'; if (noG) bn.textContent = 'Aucune masse (0 V) dans le montage : la référence est choisie automatiquement. Ajoutez un symbole « Masse » pour fixer le 0 V.';
    if (this.tp && this._tpDirty && ts - (this._tpT || 0) > 400) { this._tpT = ts; this._tpDirty = false; }
  }
  toggleRun() { this.running = !this.running; $('#btn-run').textContent = this.running ? '⏸ Pause' : '▶ Lecture'; }
  setSpeed(v) { this.speed = Math.pow(10, (v - 50) / 25); const s = this.speed; $('#speedv').textContent = '×' + (s >= 10 ? Math.round(s) : s >= 1 ? s.toFixed(1).replace('.0', '') : s.toFixed(2).replace(/0+$/, '')); }
  /* ---------------- circuit ---------------- */
  loadCircuit(o, keepUndo) {
    this.circuit = NS.deserialize(o); this.sim.c = this.circuit; this.sim.invalidate(); this.sim.eng.t = 0; this.sim.events = []; this.editor.sel = null; this.editor.selWire = null; if (!keepUndo) this.editor.undoStack = [];
    this.instr.closeAll(); this.editor.render(); this.onSelect(null); this.saveSoon();
  }
  newCircuit() { this.tp = null; this.loadCircuit({ parts: [], wires: [], junctions: [] }); this.renderTP(); }
  changed(kind) { this.sim.invalidate(); if (kind === 'structure' || kind === 'wire' || kind === 'geometry') this.editor.render(); this.saveSoon(); if (kind === 'param') { /* valeurs/labels à jour */ } }
  saveSoon() { clearTimeout(this.saveT); this.saveT = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify({ c: NS.serialize(this.circuit), tp: this.tp ? { id: this.tp.sc.id, variant: this.tp.variant } : null })); } catch (e) { } }, 400); }
  render() { this.editor.render(); }
  log(msg, cls) { const box = $('#pane-log'); const d = h('div.logline.' + (cls || 'info'), h('span.muted.mono', '[' + this.sim.eng.t.toFixed(2) + ' s] '), msg); box.appendChild(d); box.parentNode.scrollTop = 1e9; while (box.children.length > 200) box.removeChild(box.firstChild); }
  toast(msg, cls) { this.log(msg, cls === 'err' ? 'burn' : cls); }
  onSimEvent(e) {
    const r = e.inst && e.inst.ref || '';
    if (e.type === 'burn') { if (e.inst.rt) e.inst.rt.T = Math.max(e.inst.rt.T || 25, 190); this.log('💥 ' + r + ' (' + PARTS[e.inst.type].label + ') est détruit : ' + (e.msg === 'primaire' ? 'enroulement surchauffé (primaire coupé)' : e.msg), 'burn'); this.refreshInspector(true); }
    else if (e.type === 'warn') this.log('⚠ ' + r + ' : ' + e.msg, 'warn'); else this.log(r + ' : ' + e.msg, 'info');
  }
  note(ref, text, mode) { this.notes.push({ t: this.sim.eng.t, ref, text, mode }); this.renderNotes(); this.log('Mesure notée : ' + text + ' (' + mode + ')', 'info'); }
  renderNotes() { const p = $('#pane-note'); clear(p); p.appendChild(h('div', h('button.small', { onclick: () => { this.notes = []; this.renderNotes(); } }, 'Effacer'), ' ', h('span.muted', 'Les mesures notées depuis le multimètre apparaissent ici.')));
    this.notes.forEach((n, i) => p.appendChild(h('div.logline', h('span.mono.muted', 't=' + n.t.toFixed(2) + ' s  '), h('b', n.text), '  ', h('span.muted', n.mode)))); }
  resetSim() { this.circuit.parts.forEach(p => { p.rt = {}; }); this.sim.eng.t = 0; this.sim.invalidate(); this.log('Simulation réinitialisée (condensateurs déchargés, temps à zéro)', 'info'); }
  replace(inst) { inst.fault = null; inst.burnt = null; inst.rt = {}; inst.replaced = (inst.replaced || 0) + 1; this.sim.invalidate(); this.editor.render(); this.refreshInspector(true); this.log('🔧 Remplacement de ' + inst.ref + ' par un composant neuf', 'info'); this.saveSoon(); }
  openInstrument(inst) { if (!this.instr.open(inst)) { this.editor.select(inst.id); $$('.rtab')[0].click(); } }
  /* ---------------- palette ---------------- */
  buildPalette() {
    const pal = clear($('#palette')); const q = h('input', { type: 'search', placeholder: 'Rechercher un composant…', style: { width: '100%', marginBottom: '6px' } }); pal.appendChild(q); const items = [];
    CATS.forEach((cat, ci) => {
      const det = h('details', { open: ci < 3 }, h('summary', cat)); NS.parts_by_cat = NS.parts_by_cat || {};
      Object.keys(PARTS).filter(t => PARTS[t].cat === ci).forEach(t => {
        const d = PARTS[t]; const inst = NS.newInst(t, 0, 0, 'pv'); inst.ref = ''; const bb = d.ext || [-24, -18, 24, 18]; let [x1, y1, x2, y2] = bb; d.pins.forEach(p => { x1 = Math.min(x1, p.x); x2 = Math.max(x2, p.x); y1 = Math.min(y1, p.y); y2 = Math.max(y2, p.y); });
        const w = x2 - x1 + 12, hh = y2 - y1 + 12, sc = Math.min(1, 34 / hh, 56 / w); const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', Math.round(w * sc)); svg.setAttribute('height', Math.round(hh * sc)); svg.setAttribute('viewBox', `${x1 - 6} ${y1 - 6} ${w} ${hh}`); svg.setAttribute('class', 'part');
        svg.innerHTML = d.symbol(inst);
        const b = h('button.pal-item', { 'data-type': t, title: d.label, onclick: () => this.editor.arm(t) }, h('span', { style: { width: '58px', display: 'inline-flex', justifyContent: 'center' } }, svg), h('span.pl', d.label)); det.appendChild(b); items.push([b, det, d.label.toLowerCase()]);
      });
      pal.appendChild(det);
    });
    q.addEventListener('input', () => { const s = q.value.trim().toLowerCase(); items.forEach(([b, det, l]) => { b.style.display = !s || l.includes(s) ? '' : 'none'; if (s) det.open = true; }); });
  }
  /* ---------------- inspecteur ---------------- */
  onSelect(inst) { this.selected = inst; this.refreshInspector(); }
  refreshInspector(soft) {
    const box = $('#inspector'); if (soft && box.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox') return;
    clear(box); const inst = this.selected && this.circuit.part(this.selected.id);
    if (!inst) { box.appendChild(h('div', h('h3', 'Aucune sélection'), h('p.muted', 'Cliquez un composant pour modifier ses propriétés. Choisissez un composant dans la palette, cliquez dans le schéma pour le placer, puis tirez un fil d\'une broche à l\'autre.'), h('p.muted.small', 'Raccourcis : R pivoter · Suppr effacer · Ctrl+Z annuler · Espace pause · molette zoom · glisser le fond pour déplacer la vue.'))); return; }
    const d = PARTS[inst.type];
    box.appendChild(h('h3', inst.ref + ' — ', h('span.muted', d.label)));
    if (!d.noLabel) box.appendChild(h('div.field', h('label', 'Repère'), h('input', { type: 'text', value: inst.ref, onchange: e => { inst.ref = e.target.value.trim() || inst.ref; this.editor.render(); this.saveSoon(); } })));
    if (inst.burnt) box.appendChild(h('div', h('span.badge.ko', '✖ Composant détruit' + (inst.burnt !== true ? ' (' + inst.burnt + ')' : '')), ' '));
    if (inst.p.hidden && !this.teacher) box.appendChild(h('p.muted', 'Réglages masqués : mesurez le signal avec les instruments.')); else d.fields.forEach(f => box.appendChild(this.fieldRow(inst, f)));
    if (['multimeter', 'scope', 'psu', 'gbf'].includes(inst.type)) box.appendChild(h('div', { style: { margin: '8px 0' } }, h('button.primary', { onclick: () => this.instr.open(inst) }, 'Ouvrir l\'instrument'), inst.type === 'multimeter' ? h('button', { style: { marginLeft: '6px' }, title: 'Retire les pointes posées avec l\'outil « Pointes »', onclick: () => this.editor.clearProbes(inst.id) }, 'Retirer les pointes') : null));
    // grandeurs
    if (this.opts.aide || this.teacher) {
      const el = !this.sim.dirty && this.sim.elOf.get(inst.id); if (el) { const kv = h('div.kv'); const add = (k, v, u) => { if (v !== undefined && isFinite(v)) { kv.appendChild(h('span', k)); kv.appendChild(h('span', fmt(v, u, 4))); } }; add('Courant', el.I, 'A'); add('Tension', el.V, 'V'); add('Puissance', el.P, 'W'); if (el.Vce !== undefined) add('Vce', el.Vce, 'V'); if (el.Vbe !== undefined) add('Vbe', el.Vbe, 'V'); if (el.T !== undefined) add('Température', el.T, '°C'); if (kv.children.length) { box.appendChild(h('h4', 'Grandeurs (mode aide)')); box.appendChild(kv); } }
    }
    if (inst.burnt || inst.replaced || this.teacher || inst.fault) {
      box.appendChild(h('h4', 'Maintenance'));
      box.appendChild(h('button', { onclick: () => this.replace(inst) }, '🔧 Remplacer par un composant neuf'));
      if (inst.replaced) box.appendChild(h('div.muted.small', 'Remplacé ' + inst.replaced + ' fois'));
    }
    if (this.teacher && d.faults && d.faults.length) {
      box.appendChild(h('h4', 'Injection de panne (enseignant)'));
      const sel = h('select', { onchange: e => { inst.fault = e.target.value || null; this.sim.invalidate(); this.editor.render(); this.saveSoon(); } }, h('option', { value: '' }, 'Aucune panne'), d.faults.map(k => h('option', { value: k, selected: inst.fault === k }, FAULTS[k] || k)));
      box.appendChild(sel);
    }
    box.appendChild(h('div', { style: { marginTop: '12px', display: 'flex', gap: '6px' } }, h('button', { onclick: () => this.editor.rotate() }, '⟳ Pivoter'), h('button', { onclick: () => this.editor.removePart(inst) }, '🗑 Supprimer')));
  }
  fieldRow(inst, f) {
    const p = inst.p; let ctl; const done = () => { this.changed('param'); this.editor.render(); };
    if (f.kind === 'bool') ctl = h('input', { type: 'checkbox', checked: !!p[f.k], onchange: e => { p[f.k] = e.target.checked; done(); } });
    else if (f.kind === 'sel') ctl = h('select', { onchange: e => { const raw = e.target.value; const idx = f.opts.map(String).indexOf(raw); p[f.k] = f.opts[idx]; done(); this.refreshInspector(); } }, f.opts.map((o, i) => h('option', { value: String(o), selected: String(p[f.k]) === String(o) }, f.labels ? f.labels[i] : o)));
    else {
      const txt = h('input', { type: 'text', value: plain(p[f.k]), onchange: e => { const v = NS.parseVal(e.target.value); if (isNaN(v) || v < f.min || v > f.max) { e.target.value = plain(p[f.k]); this.toast('Valeur hors limites (' + plain(f.min) + ' – ' + plain(f.max) + ' ' + f.unit + ')', 'warn'); return; } p[f.k] = v; if (slider) slider.value = f.log ? Math.log10(v) : v; done(); } });
      let slider = null; if (f.slider) { const lg = f.log; slider = h('input', { type: 'range', min: lg ? Math.log10(f.min) : f.min, max: lg ? Math.log10(f.max) : f.max, step: lg ? 0.01 : f.step, value: lg ? Math.log10(p[f.k]) : p[f.k], oninput: e => { const v = lg ? Math.pow(10, +e.target.value) : +e.target.value; p[f.k] = lg ? +v.toPrecision(3) : v; txt.value = plain(p[f.k]); this.changed('param'); } }); }
      ctl = h('div', { style: { display: 'flex', gap: '4px', alignItems: 'center', flexDirection: slider ? 'column' : 'row', alignItems: slider ? 'stretch' : 'center' } }, h('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } }, txt, h('span.unit', f.unit || '')), slider);
    }
    return h('div.field', h('label', f.label), ctl);
  }
  /* ---------------- options ---------------- */
  setTeacher(on) {
    this.teacher = !!on; $('#opt-teacher').checked = this.teacher; const b = $('#btn-lock'); if (b) b.textContent = this.teacher ? '🔓 PIN…' : (NS.Teacher.hasPin() ? '🔒' : '🔑');
    this.editor.render(); this.refreshInspector(); this.renderTP();
  }
  bindUI() {
    $('#btn-run').onclick = () => this.toggleRun(); $('#btn-reset').onclick = () => this.resetSim();
    const spd = $('#speed'); spd.value = 50; spd.oninput = () => this.setSpeed(+spd.value); this.setSpeed(50);
    $('#opt-aide').onchange = e => { this.opts.aide = e.target.checked; this.refreshInspector(); };
    $('#opt-teacher').onchange = e => {
      if (e.target.checked && NS.Teacher.hasPin()) { e.target.checked = false; NS.Teacher.ask(ok => { if (ok) this.setTeacher(true); }); return; }
      this.setTeacher(e.target.checked);
    };
    $('#btn-lock').textContent = NS.Teacher.hasPin() ? '🔒' : '🔑';
    $('#btn-lock').onclick = () => { if (this.teacher) NS.Teacher.menu(this); else if (NS.Teacher.hasPin()) NS.Teacher.ask(ok => { if (ok) this.setTeacher(true); }); else NS.Teacher.menu(this); };
    $$('.tool').forEach(b => b.onclick = () => this.editor.setTool(b.dataset.tool)); $('#btn-rot').onclick = () => this.editor.rotate(); $('#btn-undo').onclick = () => this.editor.undo();
    $('#btn-fit').onclick = () => this.editor.fit(); $('#btn-new').onclick = () => { if (!this.circuit.parts.length || confirm('Effacer le schéma actuel ?')) this.newCircuit(); };
    $('#btn-save').onclick = () => this.saveFile(); $('#btn-open').onclick = () => $('#filein').click();
    $('#filein').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { this.tp = null; this.loadCircuit(JSON.parse(t)); this.editor.fit(); this.renderTP(); } catch (er) { alert('Fichier invalide : ' + er.message); } }); e.target.value = ''; };
    $$('.rtab').forEach(b => b.onclick = () => { $$('.rtab').forEach(x => x.classList.toggle('on', x === b)); $('#inspector').style.display = b.dataset.r === 'insp' ? '' : 'none'; $('#tppane').style.display = b.dataset.r === 'tp' ? '' : 'none'; });
    $$('.dtab').forEach(b => b.onclick = () => { $$('.dtab').forEach(x => x.classList.toggle('on', x === b)); $('#pane-log').style.display = b.dataset.dock === 'log' ? '' : 'none'; $('#pane-note').style.display = b.dataset.dock === 'note' ? '' : 'none'; });
    $('#dockmin').onclick = () => { const d = $('#dock'); d.style.height = d.style.height === '28px' ? '150px' : '28px'; };
    this.renderNotes();
  }
  saveFile() {
    const blob = new Blob([JSON.stringify(NS.serialize(this.circuit), null, 1)], { type: 'application/json' }); const a = h('a', { href: URL.createObjectURL(blob), download: 'schema-electrolab.json' }); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  /* ---------------- TP ---------------- */
  menu(anchor, content) {
    $$('.menu').forEach(m => m.remove()); const r = anchor.getBoundingClientRect(); const m = h('div.menu', { style: { left: Math.max(4, r.left) + 'px', top: r.bottom + 4 + 'px' } }, content); document.body.appendChild(m);
    const off = e => { if (!m.contains(e.target) && e.target !== anchor) { m.remove(); document.removeEventListener('pointerdown', off, true); } }; setTimeout(() => document.addEventListener('pointerdown', off, true), 0); return m;
  }
  openTPMenu(anchor) {
    const cats = {}; NS.SCENARIOS.forEach(s => (cats[s.cat] = cats[s.cat] || []).push(s)); const box = h('div');
    Object.keys(cats).forEach(c => { box.appendChild(h('h5', c)); cats[c].forEach(s => box.appendChild(h('button', { onclick: () => { $$('.menu').forEach(m => m.remove()); this.loadScenario(s); } }, s.title, h('small', s.level + ' · ' + s.duration + ' · ' + '★'.repeat(Math.min(3, s.diff)) + '☆'.repeat(Math.max(0, 3 - s.diff)))))); });
    this.menu(anchor, box);
  }
  loadScenario(sc, variant) {
    const v = variant === undefined ? (sc.variants ? Math.floor(Math.random() * sc.variants) : 0) : variant;
    const c = new NS.Circuit(); sc.build(c, { variant: v, rnd: NS.rng(1234 + v) }); c.parts.forEach(p => { if (!p.dev) p.dev = NS.rng(c.seq * 31 + p.type.length + v * 7)() * 2 - 1; });
    this.tp = { sc, variant: v, started: Date.now(), results: null, qres: {} }; this.answers = {};
    this.circuit = c; this.sim.c = c; this.sim.invalidate(); this.sim.eng.t = 0; this.notes = []; this.renderNotes(); this.instr.closeAll(); this.editor.sel = null; this.editor.undoStack = []; this.editor.render(); this.editor.fit(); this.onSelect(null);
    if (sc.opts) { Object.assign(this.opts, sc.opts); $('#opt-aide').checked = !!this.opts.aide; }
    { const lb = $('#pane-log'); if (lb) lb.innerHTML = ''; }
    this.log('TP chargé : ' + sc.title, 'info'); this.renderTP(); $$('.rtab')[1].click(); this.saveSoon();
    if (sc.open) sc.open.forEach(ref => { const p = c.byRef(ref); if (p) this.instr.open(p); });
  }
  restartTP() { if (this.tp) this.loadScenario(this.tp.sc, this.tp.variant); }
  renderTP() {
    const box = clear($('#tppane')); const tp = this.tp;
    if (!tp) { box.appendChild(h('div', h('h3', 'Sujet de TP'), h('p.muted', 'Aucun TP chargé. Utilisez le bouton « TP ▾ » pour choisir un sujet : lois fondamentales, composants, alimentations, dépannage…'), h('button.primary', { onclick: e => this.openTPMenu(e.target) }, 'Choisir un TP'))); return; }
    const sc = tp.sc;
    box.appendChild(h('h3', sc.title)); box.appendChild(h('div.muted.small', sc.cat + ' · ' + sc.level + ' · ' + sc.duration + ' · ' + '★'.repeat(Math.min(3, sc.diff)) + '☆'.repeat(Math.max(0, 3 - sc.diff))));
    box.appendChild(h('p', { html: sc.desc }));
    if (sc.symptom) box.appendChild(h('div.tp-card', { style: { background: '#fffbeb', borderColor: '#fcd34d' } }, h('b', '📞 Symptôme signalé par le client : '), h('div', { style: { marginTop: '4px', fontStyle: 'italic' } }, '« ' + sc.symptom(tp.variant) + ' »')));
    if (sc.refs) box.appendChild(h('div.small.muted', 'Référentiel : ' + sc.refs));
    box.appendChild(h('div.tp-card', h('b', 'Objectifs'), h('ul', sc.objectives.map(o => h('li', { html: o })))));
    if (sc.safety) box.appendChild(h('div.tp-card', { style: { background: '#fff7ed', borderColor: '#fdba74' } }, h('b', '⚠ Sécurité'), h('div', { html: sc.safety })));
    box.appendChild(h('div.tp-card', h('b', 'Travail demandé'), h('ol', sc.steps.map(s => h('li', { html: s })))));
    if (this.teacher && sc.variants && sc.faultInfo) box.appendChild(h('div.tp-card', { style: { background: '#fef2f2' } }, h('b', 'Panne injectée (enseignant) : '), sc.faultInfo(tp.variant)));
    if (sc.questions && sc.questions.length) {
      box.appendChild(h('h4', 'Questions'));
      sc.questions.forEach((q, i) => box.appendChild(this.questionEl(q, i)));
      box.appendChild(h('button', { onclick: () => this.checkAnswers() }, 'Valider mes réponses'));
    }
    box.appendChild(h('h4', 'Vérification du montage'));
    const cb = h('div#tpchecks'); box.appendChild(cb); if (tp.results) this.showChecks(cb, tp.results);
    box.appendChild(h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' } }, h('button.primary', { onclick: () => this.runChecks() }, '✔ Vérifier mon travail'), h('button', { onclick: () => this.restartTP() }, sc.variants ? (sc.variantLabel || '↻ Nouvelle panne') : '↻ Recommencer'), h('button', { onclick: () => this.showCorrection() }, '📖 Correction')));
    if (sc.variants) box.appendChild(h('div.small.muted', 'Démarche de dépannage : 1) observer et décrire le symptôme 2) mesurer pour localiser (tensions, puis composants hors tension) 3) identifier le composant 4) remplacer 5) contrôler le fonctionnement.'));
    this._corr = h('div#tpcorr'); box.appendChild(this._corr);
  }
  questionEl(q, i) {
    const res = this.tp.qres[i]; const cls = res === undefined ? '' : res ? 'ok' : 'ko'; const row = h('div.q.' + cls, h('div', { html: (i + 1) + '. ' + q.q }));
    if (q.type === 'choice') { const name = 'q' + i; q.options.forEach((o, k) => row.appendChild(h('label', { style: { display: 'block' } }, h('input', { type: 'radio', name, checked: this.answers[i] === k, onchange: () => { this.answers[i] = k; } }), ' ' + o))); }
    else if (q.type === 'part') { const sel = h('select', { onchange: e => { this.answers[i] = e.target.value; } }, h('option', { value: '' }, '— choisir —'), this.circuit.parts.filter(p => !['ground', 'multimeter', 'scope', 'psu', 'gbf', 'mains', 'battery'].includes(p.type)).map(p => h('option', { value: p.ref, selected: this.answers[i] === p.ref }, p.ref + ' (' + PARTS[p.type].label + ')'))); row.appendChild(sel); }
    else if (q.type === 'text') row.appendChild(h('textarea', { rows: 2, style: { width: '100%' }, onchange: e => { this.answers[i] = e.target.value; } }, this.answers[i] || ''));
    else row.appendChild(h('div', h('input', { type: 'text', value: this.answers[i] === undefined ? '' : this.answers[i], onchange: e => { this.answers[i] = e.target.value; } }), ' ', h('span.muted', q.unit || '')));
    if (res !== undefined) row.appendChild(h('div.small', res ? '✔ Correct' : '✘ Incorrect' + (q.hint ? ' — ' + q.hint : ''))); return row;
  }
  checkAnswers() {
    const tp = this.tp, sc = tp.sc; const ctx = this.ctx();
    sc.questions.forEach((q, i) => {
      const a = this.answers[i]; let ok = false; if (a === undefined || a === '') { tp.qres[i] = false; return; }
      try {
        if (q.type === 'choice') ok = a === (typeof q.correct === 'function' ? q.correct(ctx) : q.correct); else if (q.type === 'part') ok = [].concat(typeof q.correct === 'function' ? q.correct(ctx) : q.correct).map(String).includes(String(a)); else if (q.type === 'text') ok = true;
        else { const v = NS.parseVal(String(a)); const exp = typeof q.answer === 'function' ? q.answer(ctx) : q.answer; const tol = q.tol === undefined ? 0.05 : q.tol; ok = !isNaN(v) && Math.abs(v - exp) <= Math.max(Math.abs(exp) * tol, q.abs || 0); }
      } catch (e) { ok = false; }
      tp.qres[i] = ok;
    });
    this.renderTP();
  }
  ctx() { const sim = this.sim; if (sim.dirty) sim.rebuild(); const x = NS.makeCtx(sim); x.tp = this.tp; return x; }
  runChecks() {
    const tp = this.tp; if (!tp) return; const res = NS.evalChecks(tp.sc, this.circuit, tp, { keepRt: true });
    tp.results = res; const cb = $('#tpchecks'); if (cb) { clear(cb); this.showChecks(cb, res); }
  }
  showChecks(box, res) {
    res.forEach(r => box.appendChild(h('div.chk.' + (r.ok ? 'ok' : 'ko'), h('span.m', r.ok ? '✔' : '✘'), h('span', { html: r.label }))));
    const n = res.filter(r => r.ok).length; box.appendChild(h('div', { style: { margin: '4px 0' } }, h('span.badge.' + (n === res.length ? 'ok' : 'warn'), n + ' / ' + res.length + ' critères validés')));
  }
  showCorrection() {
    const tp = this.tp; if (!tp) return; const sc = tp.sc; const el = this._corr; clear(el);
    const doIt = () => { clear(el); el.appendChild(h('div.tp-card', h('b', 'Correction'), h('div', { html: typeof sc.correction === 'function' ? sc.correction(tp.variant) : (sc.correction || '') }))); if (sc.solve) el.appendChild(h('button', { onclick: () => { sc.solve(this.circuit, this.ctx(), tp.variant); this.sim.invalidate(); this.editor.render(); this.log('Solution appliquée au schéma', 'info'); } }, 'Appliquer la solution au schéma')); };
    if (this.teacher) return doIt();
    el.appendChild(h('div.tp-card', 'Avez-vous cherché par vous-même ? ', h('button', { onclick: doIt }, 'Afficher la correction')));
  }
}
NS.App = App;
})(typeof window !== 'undefined' ? window : globalThis);
