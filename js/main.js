/* main.js — démarrage */
(function () {
'use strict';
const NS = window.NS; const { h, $, $$, clear } = NS;
const app = window.__app = new NS.App(); app.init();
$('#btn-scen').onclick = e => app.openTPMenu(e.currentTarget);
/* restauration de la dernière session */
let restored = false;
try {
  const s = JSON.parse(localStorage.getItem('electrolab.v1') || 'null');
  if (s && s.c && s.c.parts && s.c.parts.length) { app.loadCircuit(s.c); app.editor.fit(); restored = true; if (s.tp) { const sc = NS.SCENARIOS.find(x => x.id === s.tp.id); if (sc) { app.tp = { sc, variant: s.tp.variant, started: Date.now(), results: null, qres: {} }; } } }
} catch (e) { /* session illisible : on repart de zéro */ }
app.renderTP();
if (!restored) { const sc = NS.SCENARIOS[0]; if (sc && !/[?&]blank/.test(location.search)) app.loadScenario(sc); }
/* aide + couverture du programme */
$('#btn-help').onclick = () => {
  const ST = { ok: ['✔ simulé', 'st-ok'], part: ['◐ partiel', 'st-part'], no: ['○ prévu', 'st-no'] }; const cov = NS.COVERAGE;
  const rows = cov.items.map(it => h('tr', h('td', it[0]), h('td', it[1]), h('td.' + ST[it[2]][1], ST[it[2]][0]), h('td', it[3] || '')));
  const m = h('div.modal', { onclick: e => { if (e.target === m) m.remove(); } }, h('div',
    h('h2', 'ElectroLab — aide'), h('p', 'Simulateur de circuits électroniques pédagogique (analyse nodale modifiée, composants non linéaires, régime transitoire) avec instruments de mesure et TP corrigés. Fonctionne hors ligne.'),
    h('h4', 'Prise en main'), h('ol', h('li', 'Choisissez un composant dans la palette, cliquez dans le schéma pour le placer (R pour pivoter).'), h('li', 'Câblez : tirez depuis une broche vers une autre broche (clic dans le vide = point de passage, clic sur un fil = jonction).'), h('li', 'Placez un multimètre / un oscilloscope, câblez leurs broches, double-cliquez pour ouvrir la face avant.'), h('li', 'Le multimètre se comporte comme un vrai : en mode A il est un court-circuit (fusible !), en mode V il a 10 MΩ d\'impédance.')),
    h('h4', 'Pannes et dépannage'), h('p', 'Les TP « Dépannage » injectent une panne cachée. Mesurez, localisez, remplacez le composant défectueux (clic sur le composant → « Remplacer »), puis vérifiez le fonctionnement. Le mode enseignant révèle la panne.'),
    h('h4', 'Couverture du programme'), h('p.small.muted', cov.note), h('table.cov', h('tr', h('th', 'Thème'), h('th', 'Notion'), h('th', 'État'), h('th', 'TP')), rows),
    h('h4', 'Limites connues'), h('ul', cov.limits.map(l => h('li', l))), h('div', { style: { textAlign: 'right', marginTop: '10px' } }, h('button.primary', { onclick: () => m.remove() }, 'Fermer'))));
  document.body.appendChild(m);
};
})();
