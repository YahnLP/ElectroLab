/* tp_aop.js — TP « Amplificateur opérationnel » : montage inverseur, saturation, comparateur (interrupteur crépusculaire) */
(function (g) {
'use strict';
const NS = g.NS; const { mk, near, regScenario } = NS;
const R = (L, ref, x, y, v, rot, ex) => L.p('resistor', ref, x, y, Object.assign({ R: v, tol: 5, W: 0.25 }, ex || {}), rot);
const noBurn = { label: 'Aucun composant n\'est détruit', run: c => c.anyBurnt().length === 0 };

/* alimentation symétrique ±12 V : G1 (+12) / G2 (−12) autour de la masse */
NS.symSupply = function (L, x, y, vsup) {
  L.p('battery', 'G1', x, y, { V: vsup || 12, Ri: 0.2 }, 270); L.p('battery', 'G2', x, y + 240, { V: vsup || 12, Ri: 0.2 }, 90); L.p('ground', 'GND2', x + 80, y + 120);
  L.w('G1', '−', 'GND2', 'G'); L.w('G2', '+', 'GND2', 'G');
};

/* ============================================================ E1 — Inverseur */
regScenario({
  id: 'inverseur', cat: '5 · Amplification', diff: 3, title: 'Amplificateur inverseur à AOP : gain et saturation', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', settle: 0.01,
  refs: 'Amplificateur opérationnel ; montage inverseur ; gain en tension ; saturation ; alimentation symétrique',
  desc: 'Un AOP TL081 alimenté en ±12 V est monté en amplificateur <b>inverseur</b> (R<sub>1</sub> = 10 kΩ, R<sub>f</sub> = 47 kΩ). Avec un signal d\'entrée de 3 V d\'amplitude, la sortie est écrêtée. Mesurez le gain, expliquez l\'écrêtage, puis réglez le montage pour obtenir un gain de −10 sans distorsion.',
  objectives: ['Reconnaître un montage inverseur (entrée − via R<sub>1</sub>, contre-réaction R<sub>f</sub>)', 'Calculer et mesurer le gain G = −R<sub>f</sub>/R<sub>1</sub>', 'Comprendre la saturation (sortie limitée à ≈ V<sub>CC</sub> − 1,5 V)', 'Choisir R<sub>f</sub> et l\'amplitude d\'entrée pour un gain donné sans écrêtage'],
  steps: ['Câblez l\'oscilloscope : CH1 sur l\'entrée (GBF), CH2 sur la sortie de l\'AOP, GND à la masse. Affichez les 2 voies (5 V/div, 0,2 ms/div).', 'Mesurez le gain en regard des amplitudes. Que remarquez-vous sur la sortie (forme, plafonnement) ? Quel est le déphasage entre entrée et sortie ?', 'Calculez R<sub>f</sub> pour G = −10 puis réglez R<sub>f</sub> dans l\'inspecteur ; réduisez l\'amplitude du GBF à 0,5 V.', 'Vérifiez le gain et l\'absence de distorsion ; relevez la tension de saturation haute.'],
  questions: [
    { q: 'Gain théorique du montage initial G = −R<sub>f</sub>/R<sub>1</sub>', answer: () => -4.7, tol: 0.03, unit: '' },
    { q: 'Amplitude maximale de la sortie, constatée à l\'oscilloscope (en V)', answer: c => c.measure(() => c.v('U1', 'S'), 0.004, 400).max, tol: 0.1, unit: 'V', hint: 'Avec l\'amplitude de 3 V en entrée, la sortie est limitée par la saturation.' },
    { q: 'Valeur de R<sub>f</sub> pour G = −10 avec R<sub>1</sub> = 10 kΩ (en kΩ)', answer: () => 100, tol: 0.02, unit: 'kΩ' },
    { q: 'Déphasage entrée / sortie du montage inverseur', type: 'choice', options: ['0°', '90°', '180° (opposition de phase)', '45°'], correct: 2 },
    { q: 'Pourquoi la sortie est-elle écrêtée à ≈ ±10,5 V ?', type: 'choice', options: ['L\'AOP ne peut pas dépasser sa tension d\'alimentation (moins un déchet de ≈ 1,5 V)', 'Le GBF est limité', 'R<sub>f</sub> est trop faible', 'La masse est mal reliée'], correct: 0 },
  ],
  build(c) {
    const L = mk(c); L.p('gbf', 'GBF1', 100, 260, { wave: 'sin', f: 1000, A: 3, off: 0 }); R(L, 'R1', 300, 200, 10000); R(L, 'RF', 500, 120, 47000); L.p('opamp', 'U1', 500, 260, { model: 'TL081' }); L.p('ground', 'GND1', 200, 360);
    NS.symSupply(L, 760, 100, 12); L.p('scope', 'OSC1', 760, 480, { tdiv: 2e-4, v1: 5, v2: 5, on1: true, on2: false, trig: 0, src: 1 });
    L.w('GBF1', 'OUT', 'R1', 'A'); L.w('R1', 'B', 'U1', '−'); L.w('RF', 'A', 'U1', '−'); L.w('RF', 'B', 'U1', 'S'); L.w('U1', '+', 'GND1', 'G'); L.w('GBF1', 'GND', 'GND1', 'G');
    L.w('G1', '+', 'U1', 'V+'); L.w('G2', '−', 'U1', 'V−'); L.w('GND2', 'G', 'GND1', 'G');
  },
  solve(c) { const L = mk(c); c.byRef('RF').p.R = 100000; c.byRef('GBF1').p.A = 0.5; c.byRef('OSC1').p.on2 = true; L.w('OSC1', 'CH1', 'GBF1', 'OUT'); L.w('OSC1', 'CH2', 'U1', 'S'); L.w('OSC1', 'GND', 'GND1', 'G'); },
  checks: [
    { label: 'Oscilloscope : CH1 sur l\'entrée, CH2 sur la sortie, GND à la masse', run: c => c.scopeWired('', ['GBF1', 'OUT'], ['U1', 'S']) },
    { label: 'Gain mesuré compris entre −9,5 et −10,5', run: c => { const a = c.measure(() => c.v('GBF1', 'OUT'), 0.004, 400), b = c.measure(() => c.v('U1', 'S'), 0.004, 400); return a.pp > 0.1 && b.pp / a.pp > 9.5 && b.pp / a.pp < 10.5; } },
    { label: 'La sortie n\'est pas écrêtée (|V<sub>S</sub>| < 10 V)', run: c => c.measure(() => c.v('U1', 'S'), 0.004, 400).max < 10 },
    { label: 'R<sub>f</sub> est une valeur E12 (100 kΩ)', run: c => near(c.part('RF').p.R, 100000, 0.05) }, noBurn],
  correction: '<p>G = −R<sub>f</sub>/R<sub>1</sub> = −47/10 = −4,7. Avec 3 V crête en entrée, la sortie « voudrait » atteindre 14 V mais l\'AOP, alimenté en ±12 V, sature vers ±10,5 V (V<sub>CC</sub> moins la tension de déchet) : le signal est <b>écrêté</b>. Pour G = −10 il faut R<sub>f</sub> = 100 kΩ et une entrée ≤ 1 V crête (sortie 10 V max) : avec 0,5 V la sortie fait 5 V crête, sans distorsion. Le signe « − » = opposition de phase (180°). L\'entrée « − » est un point à potentiel quasi nul (« masse virtuelle »).</p>',
});

/* ============================================================ E2 — Interrupteur crépusculaire */
regScenario({
  id: 'cre', cat: '5 · Amplification', diff: 3, title: 'Interrupteur crépusculaire : comparateur à AOP et LDR', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', settle: 0.2,
  refs: 'AOP en comparateur ; capteur LDR ; pont diviseur ; seuil de basculement ; commande d\'éclairage',
  desc: 'On veut allumer une LED quand la luminosité baisse. Une photorésistance (LDR) forme un pont diviseur avec R<sub>1</sub> ; la tension obtenue est comparée à une tension de référence de 2,5 V par un LM358 en comparateur. Le pont diviseur, la référence et l\'alimentation sont déjà câblés : <b>c\'est à vous de câbler le comparateur</b> et sa sortie.',
  objectives: ['Mesurer la résistance de la LDR selon l\'éclairement', 'Calculer la tension V<sub>mesure</sub> d\'un pont diviseur', 'Câbler un AOP en comparateur (sans contre-réaction) : sens des entrées + et −', 'Vérifier le basculement jour/nuit'],
  steps: ['Mesurez la tension V<sub>mes</sub> au point milieu du pont R<sub>1</sub>/LDR1 de jour (800 lux) puis de nuit (5 lux, réglage dans l\'inspecteur de la LDR).', 'Câblez : entrée « + » de U1 sur V<sub>mes</sub>, entrée « − » sur V<sub>ref</sub> (2,5 V), sortie S de U1 vers R4 puis la LED D1 vers la masse.', 'Testez : de jour la LED est éteinte, de nuit elle s\'allume. Pourquoi ?', 'Quelle serait la conséquence d\'inverser les entrées + et − ?'],
  questions: [
    { q: 'Résistance de la LDR de jour (800 lux) (en kΩ)', answer: c => { const l = c.part('LDR1'); const lux = l.p.lux; l.p.lux = 800; c.sim.dirty = true; const v = c.el('LDR1').value() / 1000; l.p.lux = lux; c.sim.dirty = true; return v; }, tol: 0.1, unit: 'kΩ' },
    { q: 'Tension de référence V<sub>ref</sub> (en V)', answer: c => c.v('U1', '−'), tol: 0.04, unit: 'V' },
    { q: 'De nuit la résistance de la LDR est très grande : V<sub>mes</sub> est alors proche de…', type: 'choice', options: ['0 V', '2,5 V', '5 V', '−5 V'], correct: 2 },
    { q: 'Avec le câblage correct, la LED est allumée quand…', type: 'choice', options: ['Il fait nuit (V<sub>mes</sub> > V<sub>ref</sub>)', 'Il fait jour', 'Toujours', 'Jamais'], correct: 0 },
    { q: 'Un AOP en comparateur n\'a pas de contre-réaction : sa sortie vaut…', type: 'choice', options: ['Une valeur proportionnelle à (V+ − V−)', 'Soit presque V<sub>CC</sub>, soit presque 0 V (saturation)', 'Toujours V+', 'Toujours 0'], correct: 1 },
  ],
  build(c) {
    const L = mk(c); L.p('psu', 'AL1', 100, 200, { V: 5, Ilim: 0.2 }); R(L, 'R1', 320, 160, 220000, 90); L.p('ldr', 'LDR1', 320, 300, { Rdark: 2e6, lux: 800 }, 90); R(L, 'R2', 440, 160, 10000, 90); R(L, 'R3', 440, 300, 10000, 90);
    L.p('opamp', 'U1', 640, 240, { model: 'LM358' }); R(L, 'R4', 800, 240, 470); L.p('led', 'D1', 940, 300, { model: 'LED rouge' }, 90); L.p('ground', 'GND1', 200, 440);
    L.p('multimeter', 'MM1', 1000, 100, { mode: 'VDC' });
    const jp = L.j(240, 80), jg = L.j(240, 400); 
    L.wj('AL1', '+', jp, [[160, 80]]); L.wj('R1', 'A', jp, [[320, 80]]); L.wj('R2', 'A', jp, [[440, 80]]); L.wj('U1', 'V+', jp, [[640, 80]]);
    L.wj('AL1', '−', jg, [[160, 400]]); L.wj('LDR1', 'B', jg, [[320, 400]]); L.wj('R3', 'B', jg, [[440, 400]]); L.wj('U1', 'V−', jg, [[640, 400]]); L.wj('D1', 'K', jg, [[940, 400]]); L.wj('GND1', 'G', jg);
    L.w('R1', 'B', 'LDR1', 'A'); L.w('R2', 'B', 'R3', 'A');
  },
  solve(c) { const L = mk(c); L.w('R1', 'B', 'U1', '+'); L.w('R2', 'B', 'U1', '−'); L.w('U1', 'S', 'R4', 'A'); L.w('R4', 'B', 'D1', 'A'); },
  checks: [
    { label: 'Entrée + de U1 reliée au pont R<sub>1</sub>/LDR (V<sub>mes</sub>)', run: c => c.net('U1', '+') === c.net('LDR1', 'A') },
    { label: 'Entrée − de U1 reliée à la tension de référence', run: c => c.net('U1', '−') === c.net('R2', 'B') },
    { label: 'De jour (800 lux) la LED est éteinte', run: c => { c.part('LDR1').p.lux = 800; c.sim.dirty = true; c.settle(0.2); return Math.abs(c.I('D1')) < 0.0005; } },
    { label: 'De nuit (5 lux) la LED est allumée (≥ 3 mA, non détruite)', run: c => { c.part('LDR1').p.lux = 5; c.sim.dirty = true; c.settle(0.3); const I = Math.abs(c.I('D1')); return I > 0.003 && I < 0.03 && !c.part('D1').burnt; } }, noBurn],
  correction: '<p>Le pont diviseur donne V<sub>mes</sub> = 5·R<sub>LDR</sub>/(R<sub>1</sub> + R<sub>LDR</sub>). De jour (R<sub>LDR</sub> ≈ 80 kΩ) : V<sub>mes</sub> ≈ 1,3 V &lt; V<sub>ref</sub> = 2,5 V → V+ &lt; V− → sortie ≈ 0 V : LED éteinte. De nuit (R<sub>LDR</sub> ≈ 3 MΩ) : V<sub>mes</sub> ≈ 4,7 V &gt; 2,5 V → sortie ≈ 3,5 V (saturation haute du LM358) : LED allumée par R4 (470 Ω). Le seuil est atteint pour R<sub>LDR</sub> = R<sub>1</sub>, soit ≈ 240 lux. En inversant + et − le comportement s\'inverse (LED allumée de jour).</p>',
});
})(typeof window !== 'undefined' ? window : globalThis);
