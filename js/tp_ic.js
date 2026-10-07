/* tp_ic.js — TP « Circuits intégrés & numérique » : portes logiques, NE555, optocoupleur, MOSFET, dépannage logique */
(function (g) {
'use strict';
const NS = g.NS; const { mk, near, regScenario } = NS;
const CAT = '6 · Circuits intégrés & numérique';
const R = (L, ref, x, y, v, rot, ex) => L.p('resistor', ref, x, y, Object.assign({ R: v, tol: 1, W: 0.25 }, ex || {}), rot);
const noBurn = { label: 'Aucun composant n\'est détruit', run: c => c.anyBurnt().length === 0 };
const rev = c => { c.sim.dirty = true; };
/* fréquence et rapport cyclique d'une broche (franchissements du seuil), en avançant la simulation */
function freqOf(c, ref, pin, thr, fGuess) {
  const dt = 1 / (fGuess * 300), N = Math.round(8 / (fGuess * dt)); let prev = null, hi = 0; const ed = [];
  for (let i = 0; i < N; i++) { c.sim.advance(dt); const v = c.v(ref, pin); if (v >= thr) hi++; if (prev !== null && prev < thr && v >= thr) ed.push(c.sim.eng.t); prev = v; }
  const f = ed.length >= 3 ? (ed.length - 1) / (ed[ed.length - 1] - ed[0]) : 0; return { f, duty: hi / N, edges: ed.length };
}

/* ============================================================ F1 — portes logiques */
const GATES = ['AND', 'NAND', 'OR', 'NOR', 'XOR', 'XNOR'];
const FAM = ['HC', 'LS'];
regScenario({
  id: 'portes', cat: CAT, diff: 2, title: 'Portes logiques : tables de vérité, alimentation, CMOS / TTL', level: 'Bac Pro CIEL (première)', duration: '1 h 15', variants: 6, variantLabel: '↻ Autre porte', settle: 0.05,
  refs: 'Logique combinatoire ; portes ET, OU, NON, OU exclusif ; niveaux logiques ; familles CMOS et TTL',
  desc: 'Une porte logique à deux entrées est câblée à deux interrupteurs et à une LED, mais <b>le circuit intégré n\'est pas encore alimenté</b>. Alimentez-le, établissez sa table de vérité et identifiez sa fonction.',
  objectives: ['Alimenter correctement un circuit intégré logique (VCC, GND)', 'Établir la table de vérité d\'une porte par des mesures', 'Distinguer niveau haut / niveau bas et connaître les niveaux CMOS et TTL', 'Savoir qu\'une entrée ne doit jamais rester « en l\'air »'],
  steps: ['Repérez la porte U1 (double-clic : fonction et famille). Observez les <b>broches VCC et GND</b> : rien n\'y est relié. Que vaut la sortie Y ?', 'Reliez <b>VCC au +5 V</b> de l\'alimentation et <b>GND à la masse</b>.', 'Cliquez sur SW1 et SW2 pour appliquer les 4 combinaisons (interrupteur fermé = niveau haut = 5 V, ouvert = niveau bas grâce à la résistance de rappel ; 470 Ω en TTL, 10 kΩ en CMOS). Mesurez la tension de Y avec le multimètre et notez l\'état de la LED.', 'Complétez la table de vérité, identifiez la fonction, puis répondez aux questions.'],
  questions: [
    { q: 'Quelle fonction logique réalise U1 ?', type: 'choice', options: GATES, correct: c => GATES.indexOf(c.part('U1').p.fn) },
    { q: 'A = 0, B = 0 : la sortie Y est…', type: 'choice', options: ['au niveau bas (≈ 0 V)', 'au niveau haut'], correct: c => NS.GATEFN[c.part('U1').p.fn](0, 0) ? 1 : 0 },
    { q: 'A = 0, B = 1 : la sortie Y est…', type: 'choice', options: ['au niveau bas (≈ 0 V)', 'au niveau haut'], correct: c => NS.GATEFN[c.part('U1').p.fn](0, 1) ? 1 : 0 },
    { q: 'A = 1, B = 0 : la sortie Y est…', type: 'choice', options: ['au niveau bas (≈ 0 V)', 'au niveau haut'], correct: c => NS.GATEFN[c.part('U1').p.fn](1, 0) ? 1 : 0 },
    { q: 'A = 1, B = 1 : la sortie Y est…', type: 'choice', options: ['au niveau bas (≈ 0 V)', 'au niveau haut'], correct: c => NS.GATEFN[c.part('U1').p.fn](1, 1) ? 1 : 0 },
    { q: 'Le circuit est alimenté et SW1, SW2 sont ouverts (entrées à 0) : tension mesurée sur l\'entrée A (en V)', answer: c => c.v('U1', 'A'), abs: 0.3, unit: 'V' },
    { q: 'Une entrée de porte CMOS (74HC) laissée « en l\'air » (non reliée) est…', type: 'choice', options: ['lue comme un 0', 'lue comme un 1', 'indéterminée : c\'est interdit, il faut la relier (résistance de rappel)'], correct: 2 },
  ],
  build(c, o) {
    const v = (o && o.variant) || 0; const L = mk(c);
    L.p('psu', 'AL1', 100, 200, { V: 5, Ilim: 0.2 }); L.p('ground', 'GND1', 100, 340);
    L.p('gate', 'U1', 520, 200, { fn: GATES[v % 6], fam: FAM[v % 2] });
    L.p('switch', 'SW1', 300, 140, { closed: false }); L.p('switch', 'SW2', 300, 260, { closed: false });
    const rp = FAM[v % 2] === 'LS' ? 470 : 10000; R(L, 'RA', 380, 100, rp, 90); R(L, 'RB', 380, 300, rp, 90);
    R(L, 'R1', 680, 200, 330); L.p('led', 'D1', 780, 240, { model: 'LED verte' }, 90); L.p('multimeter', 'MM1', 900, 200, { mode: 'VDC' });
    L.w('AL1', '+', 'SW1', 'A'); L.w('AL1', '+', 'SW2', 'A'); L.w('SW1', 'B', 'U1', 'A'); L.w('SW2', 'B', 'U1', 'B');
    L.w('RA', 'A', 'U1', 'A'); L.w('RB', 'A', 'U1', 'B'); L.w('GND1', 'G', 'RA', 'B'); L.w('GND1', 'G', 'RB', 'B'); L.w('GND1', 'G', 'AL1', '−');
    L.w('U1', 'Y', 'R1', 'A'); L.w('R1', 'B', 'D1', 'A'); L.w('D1', 'K', 'GND1', 'G');
  },
  solve(c) { const L = mk(c); L.w('AL1', '+', 'U1', 'VCC'); L.w('GND1', 'G', 'U1', 'GND'); L.w('MM1', 'V/Ω/A', 'U1', 'Y'); L.w('MM1', 'COM', 'GND1', 'G'); },
  checks: [
    { label: 'U1 est alimenté : VCC = 5 V par rapport à GND', run: c => near(c.vd('U1', 'VCC', 'U1', 'GND'), 5, 0.06) },
    { label: 'La broche GND de U1 est reliée à la masse', run: c => Math.abs(c.v('U1', 'GND')) < 0.05 },
    { label: 'Les entrées sont à un niveau défini (pas « en l\'air »)', run: c => [c.v('U1', 'A'), c.v('U1', 'B')].every(x => x < 0.5 || x > 4.5) },
    { label: 'Un voltmètre est câblé sur la sortie Y', run: c => c.voltmeterAcross('U1', 'Y', 'GND1', 'G') },
    { label: 'La sortie respecte la table de vérité (SW1 = SW2 = 1)', run: c => { c.part('SW1').p.closed = true; c.part('SW2').p.closed = true; rev(c); c.settle(0.05); const y = NS.GATEFN[c.part('U1').p.fn](1, 1); return y ? c.v('U1', 'Y') > 2.8 : c.v('U1', 'Y') < 0.5; } },
    noBurn],
  correction: '<p>Un circuit intégré logique doit être <b>alimenté</b> : VCC au +5 V, GND à la masse. Sans cela, sa sortie est indéterminée. Table de vérité de la porte étudiée : voir la fonction dans le symbole (ET / NON-ET / OU / NON-OU / OU exclusif / son complément).</p><p><b>Niveaux :</b> CMOS 74HC en 5 V : sortie ≈ 0 V ou 5 V ; TTL (74LS) : sortie haute ≈ 3,4 V seulement et une entrée en l\'air est lue « 1 ». Une entrée CMOS non reliée est indéterminée (capte les parasites) : on utilise une <b>résistance de rappel</b> (pull-down 10 kΩ en CMOS). En <b>TTL</b>, une entrée au niveau bas <i>débite</i> ≈ 0,4 mA : avec 10 kΩ on aurait 4 V (niveau haut !), d\'où un pull-down de 470 Ω.</p>',
});

/* ============================================================ F2 — NE555 astable */
const T5 = [
  { f: 1000, C: 100e-9, R1: 1000, lab: '1 kHz' },
  { f: 440, C: 100e-9, R1: 1000, lab: '440 Hz (la du diapason)' },
  { f: 2000, C: 47e-9, R1: 1000, lab: '2 kHz' },
  { f: 1, C: 47e-6, R1: 10000, lab: '1 Hz (clignotant)', led: true },
];
const r2of = t => (1.44 / (t.f * t.C) - t.R1) / 2;
regScenario({
  id: 'ne555', cat: CAT, diff: 3, title: 'NE555 en multivibrateur astable (4 fréquences)', level: 'Bac Pro CIEL (première / terminale)', duration: '1 h 30', variants: 4, variantLabel: '↻ Autre fréquence', settle: 0.02,
  refs: 'Générateur de signaux ; temporisation ; NE555 ; période, fréquence, rapport cyclique',
  desc: 'Le NE555 est câblé en <b>astable</b> : la sortie OUT oscille entre 0 et Vcc. La fréquence dépend de R1, R2 et C : f ≈ 1,44 / ((R1 + 2·R2)·C). Calculez R2 pour obtenir la fréquence demandée, puis vérifiez à l\'oscilloscope.',
  objectives: ['Identifier les broches du NE555 (TRIG, THR, DIS, OUT, RESET, CTRL)', 'Dimensionner R2 à partir d\'une fréquence cible', 'Mesurer période, fréquence et rapport cyclique à l\'oscilloscope', 'Comprendre pourquoi le rapport cyclique est toujours supérieur à 50 %'],
  steps: ['Lisez dans l\'énoncé la fréquence cible (variante affichée dans la question 1) et relevez R1 et C sur le schéma.', 'Calculez R2 = (1,44 / (f·C) − R1) / 2, puis réglez R2 (double-clic sur le composant).', 'Reliez la voie CH1 de l\'oscilloscope à la sortie <b>OUT</b> (GND de l\'oscilloscope à la masse) et ajustez la base de temps.', 'Mesurez période, fréquence et rapport cyclique. Comparez au calcul.', 'Observez aussi la tension aux bornes de C (CH2 sur THR) : entre quelles valeurs oscille-t-elle ?'],
  questions: [
    { q: c => 'Fréquence cible de cette variante : ' + T5[c.tp.variant % 4].lab + '. Valeur calculée de R2 (en Ω, tolérance large : valeur normalisée acceptée)', answer: c => r2of(T5[c.tp.variant % 4]), tol: 0.15, unit: 'Ω', hint: 'f = 1,44 / ((R1 + 2·R2)·C)' },
    { q: 'Fréquence mesurée de la sortie (en Hz)', answer: c => freqOf(c, 'U1', 'OUT', c.v('U1', 'VCC') / 2, T5[c.tp.variant % 4].f).f, tol: 0.08, unit: 'Hz' },
    { q: 'Période mesurée (en ms)', answer: c => 1000 / freqOf(c, 'U1', 'OUT', c.v('U1', 'VCC') / 2, T5[c.tp.variant % 4].f).f, tol: 0.08, unit: 'ms' },
    { q: 'Rapport cyclique de la sortie (en %)', answer: c => { const a = c.el('R1').value(), b = c.el('R2').value(); return 100 * (a + b) / (a + 2 * b); }, tol: 0.06, unit: '%', hint: 'α = (R1 + R2) / (R1 + 2·R2)' },
    { q: 'Entre quelles valeurs oscille la tension aux bornes du condensateur ?', type: 'choice', options: ['0 et Vcc', 'Vcc/3 et 2·Vcc/3', '0 et Vcc/3', '2·Vcc/3 et Vcc'], correct: 1 },
    { q: 'Pourquoi le rapport cyclique est-il toujours > 50 % avec ce montage ?', type: 'choice', options: ['Parce que le NE555 est asymétrique', 'Parce que C se charge par R1 + R2 mais se décharge seulement par R2', 'Parce que R1 est toujours plus grande que R2', 'Parce que la tension d\'alimentation n\'est pas stable'], correct: 1 },
  ],
  build(c, o) {
    const t = T5[((o && o.variant) || 0) % 4]; const L = mk(c);
    L.p('psu', 'AL1', 100, 200, { V: 5, Ilim: 0.3 }); L.p('ground', 'GND1', 100, 360);
    L.p('timer555', 'U1', 500, 220, { model: 'NE555' });
    R(L, 'R1', 380, 120, t.R1, 90); R(L, 'R2', 380, 220, 1000, 90); L.p('capacitor', 'C1', 340, 330, { C: t.C, esr: 0.001, tol: 2, Vmax: 25 }, 90);
    L.p('scope', 'OSC1', 780, 460, { tdiv: t.f >= 100 ? (t.f > 1500 ? 5e-4 : 1e-3) : 0.2, v1: 2, v2: 2, on1: true, on2: true, trig: 2.5, src: 1, edge: 'up' });
    L.w('AL1', '+', 'U1', 'VCC'); L.w('AL1', '+', 'U1', 'RESET'); L.w('AL1', '+', 'R1', 'A'); L.w('R1', 'B', 'U1', 'DIS'); L.w('U1', 'DIS', 'R2', 'A'); L.w('R2', 'B', 'U1', 'THR'); L.w('U1', 'THR', 'U1', 'TRIG'); L.w('U1', 'THR', 'C1', 'A');
    L.w('GND1', 'G', 'U1', 'GND'); L.w('GND1', 'G', 'C1', 'B'); L.w('GND1', 'G', 'AL1', '−');
    if (t.led) { R(L, 'R3', 660, 160, 470); L.p('led', 'D1', 740, 200, { model: 'LED rouge' }, 90); L.w('U1', 'OUT', 'R3', 'A'); L.w('R3', 'B', 'D1', 'A'); L.w('D1', 'K', 'GND1', 'G'); }
  },
  solve(c, ctx, v) { const L = mk(c); c.byRef('R2').p.R = r2of(T5[v % 4]); L.w('OSC1', 'CH1', 'U1', 'OUT'); L.w('OSC1', 'CH2', 'U1', 'THR'); L.w('OSC1', 'GND', 'GND1', 'G'); },
  checks: [
    { label: 'Le NE555 est alimenté et oscille', run: c => freqOf(c, 'U1', 'OUT', 2.5, T5[c.tp.variant % 4].f).f > 0 },
    { label: 'La fréquence de sortie est celle demandée (± 10 %)', run: c => { const t = T5[c.tp.variant % 4]; return near(freqOf(c, 'U1', 'OUT', 2.5, t.f).f, t.f, 0.1); } },
    { label: 'Oscilloscope : CH1 câblée sur la sortie OUT, GND à la masse', run: c => c.scopeWired(null, ['U1', 'OUT']) },
    noBurn],
  correction: '<p>Le NE555 charge C par R1 + R2 jusqu\'à 2·Vcc/3 (seuil THR), puis le décharge par R2 jusqu\'à Vcc/3 (seuil TRIG). t<sub>H</sub> = 0,69·(R1 + R2)·C ; t<sub>L</sub> = 0,69·R2·C ; T = t<sub>H</sub> + t<sub>L</sub> d\'où <b>f = 1,44 / ((R1 + 2·R2)·C)</b>. Rapport cyclique α = (R1 + R2)/(R1 + 2·R2) &gt; 50 %.</p><p>Valeurs : 1 kHz → R2 ≈ 6,7 kΩ ; 440 Hz → ≈ 15,9 kΩ ; 2 kHz → ≈ 7,2 kΩ (C = 47 nF) ; 1 Hz (C = 47 µF, R1 = 10 kΩ) → ≈ 10,3 kΩ. Les valeurs normalisées (E12) donnent un écart de quelques %, compatible avec la tolérance des composants.</p>',
});

/* ============================================================ F3 — optocoupleur */
const OPT = [
  { model: 'PC817', RC: 2200 }, { model: 'PC817C', RC: 2200 }, { model: '4N25', RC: 10000 },
];
const raOf = o => { const ctr = NS.LIB.OPTOS[o.model].CTR, ic = (12 - 0.2) / o.RC; return (5 - 1.2) / (2 * ic / ctr); };
regScenario({
  id: 'opto', cat: CAT, diff: 3, title: 'Optocoupleur : isoler une commande 5 V d\'une charge 12 V', level: 'Bac Pro CIEL (première / terminale)', duration: '1 h 15', variants: 3, variantLabel: '↻ Autre optocoupleur', settle: 0.1,
  refs: 'Isolation galvanique ; optocoupleur ; commutation ; rapport de transfert en courant (CTR)',
  desc: 'Un signal logique 5 V (côté commande) doit piloter un circuit alimenté en 12 V (côté puissance) <b>sans liaison électrique</b> entre les deux. L\'optocoupleur transmet l\'information par la lumière. Dimensionnez la résistance R<sub>A</sub> de la LED d\'entrée pour que le phototransistor soit <b>saturé</b> (interrupteur fermé).',
  objectives: ['Identifier LED d\'entrée (A, K) et phototransistor de sortie (C, E)', 'Calculer R<sub>A</sub> à partir du CTR pour saturer le transistor de sortie', 'Mesurer I<sub>F</sub>, I<sub>C</sub>, V<sub>CE</sub> et en déduire le CTR', 'Vérifier l\'isolation galvanique (masses séparées)'],
  steps: ['Repérez les deux parties : <b>entrée</b> (IN, R<sub>A</sub>, LED de l\'opto) et <b>sortie</b> (AL2 12 V, R<sub>C</sub>, phototransistor).', 'Calculez I<sub>C,sat</sub> = (12 − 0,2)/R<sub>C</sub>, puis le courant I<sub>F</sub> nécessaire = 2·I<sub>C,sat</sub>/CTR (coefficient de sur-saturation 2).', 'Calculez R<sub>A</sub> = (5 − V<sub>F</sub>)/I<sub>F</sub> avec V<sub>F</sub> ≈ 1,2 V, réglez R<sub>A</sub> et vérifiez V<sub>CE</sub> &lt; 0,4 V entrée à 5 V.', 'Mettez l\'entrée IN à 0 V : la sortie doit être bloquée (V<sub>C</sub> ≈ 12 V).', 'Mesurez I<sub>F</sub>, I<sub>C</sub> et V<sub>CE</sub> à l\'aide des multimètres et répondez.'],
  questions: [
    { q: 'Valeur de R<sub>A</sub> calculée (en Ω, tolérance large : valeur normalisée proche acceptée)', answer: c => raOf(OPT[c.tp.variant % 3]), tol: 0.4, unit: 'Ω' },
    { q: 'Courant dans la LED d\'entrée I<sub>F</sub> (en mA), entrée à 5 V', answer: c => Math.abs(c.el('OC1').I) * 1000, tol: 0.08, unit: 'mA' },
    { q: 'Courant collecteur I<sub>C</sub> du phototransistor (en mA), entrée à 5 V', answer: c => Math.abs(c.el('RC').I) * 1000, tol: 0.08, unit: 'mA' },
    { q: 'Tension V<sub>CE</sub> du phototransistor saturé (en V)', answer: c => Math.abs(c.vd('OC1', 'C', 'OC1', 'E')), abs: 0.15, unit: 'V' },
    { q: 'Le CTR (Current Transfer Ratio) est défini par…', type: 'choice', options: ['CTR = I<sub>C</sub> / I<sub>F</sub> (en mode linéaire)', 'CTR = V<sub>CE</sub> / V<sub>F</sub>', 'CTR = I<sub>F</sub> / I<sub>C</sub>', 'CTR = P<sub>sortie</sub> / P<sub>entrée</sub>'], correct: 0 },
    { q: 'Quel est l\'intérêt principal de l\'optocoupleur ?', type: 'choice', options: ['Amplifier fortement le signal', 'Isoler galvaniquement la commande de la puissance', 'Redresser le courant', 'Stabiliser la tension'], correct: 1 },
  ],
  build(c, o) {
    const t = OPT[((o && o.variant) || 0) % 3]; const L = mk(c);
    L.p('psu', 'IN', 100, 160, { V: 5, Ilim: 0.1 }); L.p('ground', 'GND1', 100, 320);
    R(L, 'RA', 300, 120, 22000); L.p('opto', 'OC1', 500, 200, { model: t.model });
    L.p('psu', 'AL2', 760, 160, { V: 12, Ilim: 0.2 }); R(L, 'RC', 640, 120, t.RC);
    L.p('multimeter', 'MM1', 560, 340, { mode: 'VDC' });
    L.w('IN', '+', 'RA', 'A'); L.w('RA', 'B', 'OC1', 'A'); L.w('OC1', 'K', 'GND1', 'G'); L.w('IN', '−', 'GND1', 'G');
    L.w('AL2', '+', 'RC', 'A'); L.w('RC', 'B', 'OC1', 'C'); L.w('OC1', 'E', 'AL2', '−');
  },
  solve(c, ctx, v) { c.byRef('RA').p.R = raOf(OPT[v % 3]); },
  checks: [
    { label: 'Entrée à 5 V : le phototransistor est saturé (V<sub>CE</sub> &lt; 0,4 V)', run: c => c.part('IN').p.V === 5 && Math.abs(c.vd('OC1', 'C', 'OC1', 'E')) < 0.4 },
    { label: 'Le courant de LED I<sub>F</sub> reste raisonnable (2 à 30 mA)', run: c => { const i = Math.abs(c.el('OC1').I); return i > 0.002 && i < 0.03; } },
    { label: 'Isolation galvanique : la masse de sortie n\'est pas reliée à la masse d\'entrée', run: c => c.net('AL2', '−') !== c.net('IN', '−') },
    { label: 'Entrée à 0 V : la sortie est bloquée (V<sub>C</sub> ≈ 12 V)', run: c => { c.part('IN').p.V = 0; rev(c); c.settle(0.1); return c.vd('OC1', 'C', 'AL2', '−') > 11.5; } },
    noBurn],
  correction: '<p>La LED de l\'opto est une diode : R<sub>A</sub> fixe I<sub>F</sub> = (5 − 1,2)/R<sub>A</sub>. Le phototransistor se comporte comme un transistor dont le courant de base est la lumière : I<sub>C</sub> = CTR·I<sub>F</sub> <i>tant qu\'il n\'est pas saturé</i>. Pour fermer l\'interrupteur, on veut V<sub>CE</sub> ≈ 0,2 V, donc I<sub>C,sat</sub> = (12 − 0,2)/R<sub>C</sub> et on prend I<sub>F</sub> = 2·I<sub>C,sat</sub>/CTR.</p><p>PC817 (CTR ≈ 100 %, R<sub>C</sub> = 2,2 kΩ) → R<sub>A</sub> ≈ 360 Ω ; PC817C (CTR 250 %) → ≈ 900 Ω ; 4N25 (CTR 25 %, R<sub>C</sub> = 10 kΩ) → ≈ 400 Ω. Comme CTR varie de 1 à 3 d\'un exemplaire à l\'autre, on <b>surdimensionne I<sub>F</sub></b>. Les deux masses sont <i>séparées</i> : c\'est l\'isolation galvanique (tenue typique 5 kV).</p>',
});

/* ============================================================ F4 — MOSFET */
const MF = [
  { model: 'IRF540N', vg: 3.3, ok: ['IRLZ44N'], info: 'IRF540N : V<sub>GS(th)</sub> ≈ 3 V, non « logic-level »' },
  { model: '2N7000', vg: 5, ok: ['IRF540N', 'IRLZ44N'], info: '2N7000 : limité à 200 mA' },
];
regScenario({
  id: 'mosfet', cat: CAT, diff: 3, title: 'MOSFET de puissance : commande d\'une lampe 12 V par une sortie logique', level: 'Bac Pro CIEL (terminale)', duration: '1 h 15', variants: 2, variantLabel: '↻ Autre cas', settle: 0.2,
  refs: 'Transistor MOSFET ; commutation ; tension de seuil ; R<sub>DS(on)</sub> ; interface logique / puissance',
  desc: 'Une sortie logique (3,3 V ou 5 V selon la variante) doit allumer une lampe 12 V / 5 W à l\'aide d\'un MOSFET. Le montage fourni <b>ne fonctionne pas correctement</b> : lampe faible, transistor qui chauffe ou qui est détruit. Trouvez pourquoi et choisissez le MOSFET adapté.',
  objectives: ['Comprendre la commande en tension d\'un MOSFET (V<sub>GS</sub>, V<sub>GS(th)</sub>)', 'Distinguer un MOSFET « logic-level » d\'un MOSFET standard', 'Vérifier courant maximal et puissance dissipée (V<sub>DS</sub>·I<sub>D</sub>)', 'Mesurer R<sub>DS(on)</sub> en commutation'],
  steps: ['Fermez SW1 (commande à l\'état haut) : observez la lampe et V<sub>DS</sub> du transistor Q1. Relevez V<sub>GS</sub>.', 'Calculez le courant attendu dans la lampe (P/V ≈ 0,42 A) et comparez aux caractéristiques de Q1 (double-clic : référence). Quelle limite est dépassée ?', 'Remplacez Q1 par un MOSFET adapté (changez la référence) : il doit être <b>complètement passant</b> avec la tension de commande disponible et supporter 0,42 A.', 'Mesurez V<sub>DS</sub>, I<sub>D</sub>, la puissance dissipée dans Q1 puis R<sub>DS(on)</sub> = V<sub>DS</sub>/I<sub>D</sub>.', 'Ouvrez SW1 : la lampe doit s\'éteindre.'],
  questions: [
    { q: 'Tension de commande V<sub>GS</sub> appliquée (SW1 fermé), en V', answer: c => c.vd('Q1', 'G', 'Q1', 'S'), abs: 0.1, unit: 'V' },
    { q: 'Tension V<sub>DS</sub> du MOSFET lorsque la lampe est allumée (en V)', answer: c => Math.abs(c.vd('Q1', 'D', 'Q1', 'S')), abs: 0.15, unit: 'V' },
    { q: 'Courant dans la lampe (en mA)', answer: c => Math.abs(c.I('LP1')) * 1000, tol: 0.08, unit: 'mA' },
    { q: 'Puissance dissipée dans le MOSFET (en mW)', answer: c => Math.abs(c.vd('Q1', 'D', 'Q1', 'S') * c.I('LP1')) * 1000, tol: 0.15, abs: 5, unit: 'mW' },
    { q: 'Quel type de MOSFET faut-il pour une commande à 3,3 V ?', type: 'choice', options: ['Un MOSFET standard (V<sub>GS(th)</sub> ≈ 3-4 V)', 'Un MOSFET « logic-level » (V<sub>GS(th)</sub> ≈ 1-2 V, R<sub>DS(on)</sub> garanti à 4,5 V)', 'N\'importe lequel', 'Un MOSFET canal P obligatoirement'], correct: 1 },
    { q: 'Un MOSFET est commandé par…', type: 'choice', options: ['un courant de grille', 'une tension grille-source (courant de grille quasi nul)', 'une tension drain-source', 'un courant de source'], correct: 1 },
  ],
  build(c, o) {
    const t = MF[((o && o.variant) || 0) % 2]; const L = mk(c);
    L.p('psu', 'AL1', 100, 160, { V: 12, Ilim: 2 }); L.p('psu', 'VG', 100, 380, { V: t.vg, Ilim: 0.05 }); L.p('ground', 'GND1', 100, 520);
    L.p('lamp', 'LP1', 460, 160, { V: 12, P: 5 }, 90); L.p('mosfet', 'Q1', 460, 340, { model: t.model });
    L.p('switch', 'SW1', 300, 340, { closed: true }); R(L, 'RP', 340, 440, 10000, 90);
    L.w('AL1', '+', 'LP1', 'A'); L.w('LP1', 'B', 'Q1', 'D'); L.w('Q1', 'S', 'GND1', 'G'); L.w('VG', '+', 'SW1', 'A'); L.w('SW1', 'B', 'Q1', 'G'); L.w('RP', 'A', 'Q1', 'G'); L.w('RP', 'B', 'GND1', 'G'); L.w('AL1', '−', 'GND1', 'G'); L.w('VG', '−', 'GND1', 'G');
  },
  solve(c, ctx, v) { c.byRef('Q1').p.model = 'IRLZ44N'; NS.replacePart(c.byRef('Q1')); },
  checks: [
    { label: 'Commande à l\'état haut : MOSFET saturé (V<sub>DS</sub> &lt; 0,5 V) et lampe allumée (≈ 0,42 A)', run: c => { c.part('SW1').p.closed = true; rev(c); c.settle(0.2); return Math.abs(c.vd('Q1', 'D', 'Q1', 'S')) < 0.5 && near(Math.abs(c.I('LP1')), 0.42, 0.2); } },
    { label: 'Le MOSFET ne dissipe presque rien (&lt; 0,5 W)', run: c => Math.abs(c.vd('Q1', 'D', 'Q1', 'S') * c.I('LP1')) < 0.5 },
    { label: 'Aucun composant n\'est détruit', run: c => c.anyBurnt().length === 0 },
    { label: 'SW1 ouvert : la lampe est éteinte', run: c => { c.part('SW1').p.closed = false; rev(c); c.settle(0.2); return Math.abs(c.I('LP1')) < 0.005; } },
  ],
  correction: '<p>Un MOSFET est commandé par la <b>tension V<sub>GS</sub></b> : en dessous du seuil V<sub>GS(th)</sub> il est bloqué, au-delà il conduit. Pour être <i>vraiment</i> saturé (R<sub>DS(on)</sub> faible), il faut V<sub>GS</sub> bien au-dessus du seuil : 10 V pour un MOSFET standard (IRF540N), 4,5 V seulement pour un <b>logic-level</b> (IRLZ44N).</p><p><b>Cas 1</b> : IRF540N commandé en 3,3 V → à peine au-dessus du seuil (≈ 3 V) : forte V<sub>DS</sub>, la lampe reste faible et le transistor chauffe. Solution : IRLZ44N. <b>Cas 2</b> : 2N7000 (I<sub>D,max</sub> = 200 mA) pour une lampe de 420 mA : surcharge, destruction. Solution : IRF540N (V<sub>GS</sub> = 5 V suffit ici) ou IRLZ44N.</p><p>R<sub>DS(on)</sub> = V<sub>DS</sub>/I<sub>D</sub> de l\'ordre de quelques dizaines de mΩ : dissipation ≈ R·I² ≈ 10 mW.</p>',
});

/* ============================================================ F5 — dépannage logique */
const DL = [
  { ref: 'U1', fault: 'stuck0', nature: 0, sym: 'La LED reste allumée en permanence, quelles que soient les positions de SW1 et SW2.', info: 'Sortie de U1 bloquée à 0' },
  { ref: 'U1', fault: 'stuck1', nature: 0, sym: 'La LED reste éteinte, même avec SW1 et SW2 fermés.', info: 'Sortie de U1 bloquée à 1' },
  { ref: 'U2', fault: 'dead', nature: 0, sym: 'La LED reste éteinte, sortie de U2 à 0 V même avec une entrée correcte.', info: 'Inverseur U2 hors service' },
  { cut: ['AL1', '+', 'U1', 'VCC'], nature: 2, any: ['AL1', 'U1'], sym: 'La LED reste éteinte. Le +5 V est bien présent sur l\'alimentation.', info: 'Fil d\'alimentation VCC de U1 coupé' },
  { ref: 'R1', fault: 'open', nature: 0, sym: 'La LED reste éteinte alors que la sortie de U2 est bien à 5 V.', info: 'R1 coupée' },
];
const NATD = ['Composant défectueux (hors service / sortie bloquée / coupé)', 'Court-circuit', 'Connexion coupée (fil, soudure)'];
regScenario({
  id: 'dep_log', cat: '4 · Dépannage', diff: 3, title: 'Dépannage d\'une platine logique NAND + inverseur (5 pannes)', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', variants: 5, variantLabel: '↻ Autre panne', settle: 0.05,
  refs: 'Maintenance ; recherche de panne ; logique combinatoire ; alimentation des circuits intégrés',
  faultInfo: v => DL[v % DL.length].info,
  symptom: v => DL[v % DL.length].sym,
  desc: 'Une platine logique combine une porte NAND (U1) et un inverseur (U2) : la LED doit s\'allumer <b>uniquement quand SW1 et SW2 sont fermés</b> (fonction ET). Elle ne fonctionne plus. Localisez la panne par des mesures de niveaux logiques à l\'entrée et à la sortie de chaque étage, puis réparez.',
  objectives: ['Suivre un signal logique de bloc en bloc (entrées → U1 → U2 → LED)', 'Reconnaître une sortie bloquée, une alimentation absente, un composant coupé', 'Contrôler la table de vérité complète après réparation'],
  steps: ['<b>Constat</b> : testez les 4 combinaisons de SW1, SW2 et notez la LED.', '<b>Mesures</b> : VCC de U1 et U2, niveau de la sortie de U1 (NAND) et de U2 (NOT).', '<b>Localisation</b> : quel étage ne suit pas sa table de vérité ?', '<b>Réparation</b> : remplacez le composant défectueux (clic droit) ou rétablissez le fil coupé.', '<b>Contrôle</b> : vérifiez les 4 combinaisons.'],
  questions: [
    { q: 'Quel élément est défectueux ? (pour une connexion coupée, indiquer l\'un des deux éléments reliés)', type: 'part', correct: c => { const f = DL[c.tp.variant % DL.length]; return f.any || f.ref; } },
    { q: 'Nature de la panne', type: 'choice', options: NATD, correct: c => DL[c.tp.variant % DL.length].nature },
    { q: 'Décrivez les mesures qui vous ont permis de conclure.', type: 'text' },
  ],
  build(c, o) {
    const L = mk(c); L.p('psu', 'AL1', 100, 200, { V: 5, Ilim: 0.2 }); L.p('ground', 'GND1', 100, 340);
    L.p('switch', 'SW1', 280, 140, { closed: true }); L.p('switch', 'SW2', 280, 260, { closed: true }); R(L, 'RA', 340, 100, 10000, 90); R(L, 'RB', 340, 300, 10000, 90);
    L.p('gate', 'U1', 500, 200, { fn: 'NAND', fam: 'HC' }); L.p('inv', 'U2', 700, 200, { fn: 'NOT', fam: 'HC' }); R(L, 'R1', 860, 200, 330); L.p('led', 'D1', 940, 240, { model: 'LED verte' }, 90); L.p('multimeter', 'MM1', 600, 360, { mode: 'VDC' });
    L.w('AL1', '+', 'SW1', 'A'); L.w('AL1', '+', 'SW2', 'A'); L.w('SW1', 'B', 'U1', 'A'); L.w('SW2', 'B', 'U1', 'B'); L.w('RA', 'A', 'U1', 'A'); L.w('RB', 'A', 'U1', 'B'); L.w('GND1', 'G', 'RA', 'B'); L.w('GND1', 'G', 'RB', 'B');
    L.w('AL1', '+', 'U1', 'VCC'); L.w('AL1', '+', 'U2', 'VCC'); L.w('GND1', 'G', 'U1', 'GND'); L.w('GND1', 'G', 'U2', 'GND'); L.w('U1', 'Y', 'U2', 'A'); L.w('U2', 'Y', 'R1', 'A'); L.w('R1', 'B', 'D1', 'A'); L.w('D1', 'K', 'GND1', 'G'); L.w('AL1', '−', 'GND1', 'G');
    const f = DL[((o && o.variant) || 0) % DL.length]; if (f.cut) NS.cutWire(c, ...f.cut); else c.byRef(f.ref).fault = f.fault;
  },
  solve(c, ctx, v) { const f = DL[v % DL.length]; if (f.cut) mk(c).w(...f.cut); else NS.replacePart(c.byRef(f.ref)); },
  checks: [
    { label: 'Table de vérité ET respectée : LED allumée uniquement pour SW1 = SW2 = 1', run: c => { let ok = true; for (const [a, b] of [[1, 1], [1, 0], [0, 1], [0, 0]]) { c.part('SW1').p.closed = !!a; c.part('SW2').p.closed = !!b; rev(c); c.settle(0.05); const on = Math.abs(c.I('D1')) > 0.003; if (on !== !!(a && b)) ok = false; } return ok; } },
    noBurn,
    { label: 'Dépannage ciblé (réparation effectuée, pas de remplacement inutile)', run: c => { const f = DL[c.tp.variant % DL.length]; return c.c.parts.every(p => (f.cut ? !(p.replaced > 0) : (p.ref === f.ref ? p.replaced >= 1 : !(p.replaced > 0)))); } },
  ],
  correction: '<p>On suit le signal : entrées de U1 (niveaux 0/1 selon SW1, SW2) → sortie de U1 (NAND : 0 seulement si A = B = 1) → sortie de U2 (NOT) → LED. <b>Sortie bloquée</b> : le niveau ne change plus quand les entrées changent. <b>VCC absent</b> : sortie à 0 V (ou indéterminée) alors que les entrées sont correctes — on mesure VCC <i>sur la broche du circuit</i>, pas seulement sur l\'alimentation. <b>R1 coupée</b> : sortie de U2 correcte (5 V) mais pas de courant dans la LED.</p>',
});

/* ============================================================ F6-F8 — logique séquentielle : 555 → bascule / compteur → LED */
function clk555(L, R2, C, R1) {
  L.p('psu', 'AL1', 100, 200, { V: 5, Ilim: 0.3 }); L.p('ground', 'GND1', 100, 360); L.p('timer555', 'U1', 400, 220, { model: 'NE555' });
  R(L, 'R1', 300, 100, R1 || 1000, 90); R(L, 'R2', 300, 190, R2, 90); L.p('capacitor', 'C1', 260, 300, { C, esr: 0.001, tol: 2, Vmax: 25 }, 90);
  L.w('AL1', '+', 'U1', 'VCC'); L.w('AL1', '+', 'U1', 'RESET'); L.w('AL1', '+', 'R1', 'A'); L.w('R1', 'B', 'U1', 'DIS'); L.w('U1', 'DIS', 'R2', 'A'); L.w('R2', 'B', 'U1', 'THR'); L.w('U1', 'THR', 'U1', 'TRIG'); L.w('U1', 'THR', 'C1', 'A');
  L.w('GND1', 'G', 'U1', 'GND'); L.w('GND1', 'G', 'C1', 'B'); L.w('GND1', 'G', 'AL1', '−');
}
const GB = [986, 2060, 520];
const fclk = (c, id) => freqOf(c, 'U1', 'OUT', 2.5, id === 'b' ? GB[c.tp.variant % 3] : SEQ[c.tp.variant % 2].f).f;
/* état du compteur (0-15) lu sur U2 */
const cnt = c => [0, 1, 2, 3].reduce((a, k) => a + (c.v('U2', 'Q' + k) > 2.5 ? 1 << k : 0), 0);
/* états observés juste après chaque front montant de l'horloge (n fronts) */
function states(c, f, n) {
  const dt = 1 / (f * 40), out = []; let prev = c.v('U1', 'OUT') > 2.5, k = 0, wait = -1;
  for (let i = 0; i < n * 45 && out.length < n; i++) { c.sim.advance(dt); const h = c.v('U1', 'OUT') > 2.5; if (h && !prev) wait = 4; prev = h; if (wait > 0 && --wait === 0) out.push(cnt(c)); }
  return out;
}
var SEQ = [{ f: 1000, R2: 6800, C: 100e-9, R1: 1000, lab: '1 kHz' }, { f: 2.2, R2: 10000, C: 22e-6, R1: 10000, lab: '2 Hz (LED visibles)' }];
const sq = c => SEQ[c.tp.variant % 2];
const tied = (c, ref, pin, to) => c.net(ref, pin) === c.net(...to);

regScenario({
  id: 'bascule', cat: CAT, diff: 3, title: 'Bascule D : diviseur de fréquence par 2', level: 'Bac Pro CIEL (première / terminale)', duration: '1 h 15', variants: 3, variantLabel: '↻ Autre horloge', settle: 0.02,
  refs: 'Logique séquentielle ; bascule D ; front d\'horloge ; entrées asynchrones SET / RESET ; division de fréquence',
  desc: 'Un NE555 fournit une horloge. Une <b>bascule D</b> (74HC74) est à moitié câblée : à vous de l\'alimenter, de neutraliser ses entrées asynchrones, de la boucler en <b>diviseur par 2</b> (Q̅ → D) et de vérifier à l\'oscilloscope.',
  objectives: ['Alimenter la bascule et relier ses entrées actives à l\'état bas (S̅, R̅) au niveau haut', 'Comprendre que Q recopie D <b>au front montant</b> de CK', 'Câbler Q̅ sur D pour obtenir f(Q) = f(CK)/2', 'Constater le rapport cyclique de 50 % en sortie'],
  steps: ['Repérez la bascule U2 : CK est déjà reliée à la sortie du 555. Alimentez-la (VCC, GND).', 'Les entrées <b>S̅ (set)</b> et <b>R̅ (reset)</b> sont <b>actives à l\'état bas</b> : reliez-les au +5 V pour qu\'elles ne forcent pas la sortie.', 'Reliez <b>Q̅ à D</b> : à chaque front montant, Q prend l\'inverse de son état précédent.', 'Oscilloscope : CH1 sur l\'horloge (sortie 555), CH2 sur Q. Mesurez les deux fréquences.'],
  questions: [
    { q: 'Fréquence de l\'horloge CK (en Hz)', answer: c => fclk(c, 'b'), tol: 0.08, unit: 'Hz' },
    { q: 'Fréquence de la sortie Q (en Hz)', answer: c => freqOf(c, 'U2', 'Q', 2.5, fclk(c, 'b') / 2).f, tol: 0.08, unit: 'Hz' },
    { q: 'Rapport cyclique de Q (en %)', answer: c => freqOf(c, 'U2', 'Q', 2.5, fclk(c, 'b') / 2).duty * 100, tol: 0.08, unit: '%' },
    { q: 'Une bascule D recopie D sur sa sortie Q…', type: 'choice', options: ['en permanence', 'au front montant de CK seulement', 'au niveau haut de CK', 'quand S̅ = 1'], correct: 1 },
    { q: 'Pourquoi relier Q̅ à D divise-t-il la fréquence par 2 ?', type: 'choice', options: ['Q change d\'état à chaque front montant de CK : une période de Q = deux périodes de CK', 'Parce que le 555 ralentit', 'Parce que Q̅ est plus lent', 'Parce que D est une entrée lente'], correct: 0 },
  ],
  build(c, o) {
    const v = (o && o.variant) || 0; const t = [{ R2: 6800, C: 100e-9 }, { R2: 7200, C: 47e-9 }, { R2: 6000, C: 220e-9 }][v % 3]; const L = mk(c);
    clk555(L, t.R2, t.C); L.p('dff', 'U2', 640, 220, { fam: 'HC' }); L.w('U1', 'OUT', 'U2', 'CK');
    L.p('scope', 'OSC1', 780, 460, { tdiv: 1e-3, v1: 2, v2: 2, on1: true, on2: true, trig: 2.5, src: 1, edge: 'up' });
    c.tpfg = [986, 2060, 520][v % 3];
  },
  solve(c) { const L = mk(c); L.w('AL1', '+', 'U2', 'VCC'); L.w('GND1', 'G', 'U2', 'GND'); L.w('AL1', '+', 'U2', 'S̅'); L.w('AL1', '+', 'U2', 'R̅'); L.w('U2', 'Q̅', 'U2', 'D'); L.w('OSC1', 'CH1', 'U1', 'OUT'); L.w('OSC1', 'CH2', 'U2', 'Q'); L.w('OSC1', 'GND', 'GND1', 'G'); },
  checks: [
    { label: 'La bascule est alimentée (VCC = 5 V, GND à la masse)', run: c => near(c.vd('U2', 'VCC', 'U2', 'GND'), 5, 0.06) && Math.abs(c.v('U2', 'GND')) < 0.05 },
    { label: 'S̅ et R̅ sont reliées au +5 V (inactives)', run: c => c.v('U2', 'S̅') > 4.5 && c.v('U2', 'R̅') > 4.5 },
    { label: 'Q̅ est reliée à D (montage diviseur)', run: c => c.net('U2', 'Q̅') === c.net('U2', 'D') },
    { label: 'f(Q) = f(CK) / 2 (± 8 %)', run: c => { const f = freqOf(c, 'U1', 'OUT', 2.5, 1000).f; const q = freqOf(c, 'U2', 'Q', 2.5, f / 2).f; return f > 0 && near(q, f / 2, 0.08); } },
    { label: 'Oscilloscope : CH1 sur l\'horloge, CH2 sur Q', run: c => c.scopeWired(null, ['U1', 'OUT'], ['U2', 'Q']) },
    noBurn],
  correction: '<p>La bascule D copie D sur Q <b>au front montant</b> de CK. Avec D = Q̅, Q bascule à chaque front : une période de Q contient deux périodes de CK, donc <b>f(Q) = f(CK)/2</b>, avec un <b>rapport cyclique de 50 %</b> même si l\'horloge est asymétrique (le 555 donne ≈ 52-55 %). Les entrées asynchrones S̅ et R̅ sont <b>actives à 0</b> et prioritaires sur l\'horloge : laissées libres ou à 0, elles bloquent la sortie.</p>',
});
// la fréquence de départ est portée par le TP (valeur indicative pour le pas de mesure)
regScenario({
  id: 'compteur', cat: CAT, diff: 3, title: 'Compteur binaire 4 bits piloté par un NE555 (affichage sur LED)', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', variants: 2, variantLabel: '↻ Autre horloge', settle: 0.02,
  refs: 'Logique séquentielle ; compteur binaire ; modulo ; remise à zéro asynchrone ; division de fréquence ; chronogrammes',
  desc: 'Le NE555 cadence un <b>compteur 4 bits</b> dont les sorties Q0 à Q3 (poids 1, 2, 4, 8) commandent quatre LED. Finissez le câblage : alimentation, remise à zéro, LED. Variante 2 Hz : on <b>voit</b> compter en binaire ; variante 1 kHz : on mesure.',
  objectives: ['Câbler un compteur : alimentation, entrée d\'horloge, remise à zéro MR (active à 1)', 'Lire un nombre binaire sur 4 LED (Q3 Q2 Q1 Q0)', 'Établir que f(Q<sub>n</sub>) = f(CK)/2<sup>n+1</sup>', 'Comprendre le modulo 16 : 0 → 15 puis retour à 0'],
  steps: ['Alimentez U2 (VCC, GND) puis reliez <b>MR (master reset) à la masse</b> : actif à l\'état haut, il bloquerait le comptage s\'il restait au +5 V.', 'Reliez les sorties <b>Q0…Q3</b> aux résistances R3…R6 des LED D1…D4 (D1 = poids 1).', 'Observez le comptage (variante 2 Hz) ou mesurez f(Q0) à f(Q3) à l\'oscilloscope (variante 1 kHz).', 'Que se passe-t-il quand MR est mis au +5 V ?', 'Répondez aux questions.'],
  questions: [
    { q: 'Fréquence de l\'horloge CK (en Hz)', answer: c => fclk(c), tol: 0.08, unit: 'Hz' },
    { q: 'Fréquence de Q0 (en Hz)', answer: c => fclk(c) / 2, tol: 0.08, unit: 'Hz', hint: 'f/2' },
    { q: 'Fréquence de Q3 (en Hz)', answer: c => fclk(c) / 16, tol: 0.08, unit: 'Hz', hint: 'Chaque étage divise par 2 : Q3 = f/16.' },
    { q: 'Les LED affichent D4 D3 D2 D1 = 1 0 1 1. Quelle valeur décimale ?', answer: 11, abs: 0.1 },
    { q: 'Combien d\'états distincts a ce compteur (modulo) ?', answer: 16, abs: 0.1 },
    { q: 'Après l\'état 1111 (15), le compteur passe à…', type: 'choice', options: ['0000 (retour à zéro)', '10000', '1111 (il s\'arrête)', '1110'], correct: 0 },
    { q: 'À quoi sert l\'entrée MR ?', type: 'choice', options: ['Remettre le compteur à 0 de façon asynchrone (MR = 1)', 'Choisir le sens de comptage', 'Augmenter la vitesse', 'Alimenter les LED'], correct: 0 },
  ],
  build(c, o) {
    const t = SEQ[((o && o.variant) || 0) % 2]; const L = mk(c);
    clk555(L, t.R2, t.C, t.R1); L.p('cnt4', 'U2', 640, 220, { fam: 'HC' }); L.w('U1', 'OUT', 'U2', 'CK');
    for (let k = 0; k < 4; k++) { R(L, 'R' + (3 + k), 820, 120 + 60 * k, 330, 0); L.p('led', 'D' + (1 + k), 920, 120 + 60 * k, { model: ['LED rouge', 'LED jaune', 'LED verte', 'LED verte'][k] }); L.w('R' + (3 + k), 'B', 'D' + (1 + k), 'A'); L.w('D' + (1 + k), 'K', 'GND1', 'G'); }
    L.p('scope', 'OSC1', 780, 520, { tdiv: t.f > 100 ? 2e-3 : 1, v1: 2, v2: 2, on1: true, on2: true, trig: 2.5, src: 1, edge: 'up' });
    c.tpfg = t.f;
  },
  solve(c) { const L = mk(c); L.w('AL1', '+', 'U2', 'VCC'); L.w('GND1', 'G', 'U2', 'GND'); L.w('GND1', 'G', 'U2', 'MR'); for (let k = 0; k < 4; k++) L.w('U2', 'Q' + k, 'R' + (3 + k), 'A'); },
  checks: [
    { label: 'Le compteur est alimenté (VCC = 5 V, GND à la masse)', run: c => near(c.vd('U2', 'VCC', 'U2', 'GND'), 5, 0.06) && Math.abs(c.v('U2', 'GND')) < 0.05 },
    { label: 'MR est reliée à la masse (comptage autorisé)', run: c => c.v('U2', 'MR') < 0.5 },
    { label: 'Q0…Q3 sont reliées aux LED D1…D4 (poids croissants)', run: c => [0, 1, 2, 3].every(k => c.net('U2', 'Q' + k) === c.net('R' + (3 + k), 'A')) },
    { label: 'Le compteur compte en binaire : +1 à chaque front d\'horloge, 0 à 15 puis retour à 0', run: c => { const f = fclk(c) || SEQ[c.tp.variant % 2].f; const s = states(c, f, 20); if (s.length < 18) return false; let ok = true; for (let i = 1; i < s.length; i++) if (((s[i] - s[i - 1] + 16) % 16) !== 1) ok = false; return ok && new Set(s).size === 16; } },
    noBurn],
  correction: '<p>Le compteur incrémente son état (Q3 Q2 Q1 Q0 en binaire) à <b>chaque front montant</b> de CK, de 0 à 15 puis revient à 0 : <b>modulo 16</b>. Chaque sortie divise par deux la fréquence de la précédente : f(Q0) = f/2, f(Q1) = f/4, f(Q2) = f/8, <b>f(Q3) = f/16</b>. <b>MR</b> (remise à zéro asynchrone, active à 1) doit être au niveau bas pour compter ; à 1 il force 0000. Poids des LED : D1 = 1, D2 = 2, D3 = 4, D4 = 8 ; 1011 = 8 + 2 + 1 = 11.</p>',
});
regScenario({
  id: 'modulo', cat: CAT, diff: 4, title: 'Compteur modulo N : remise à zéro par une porte ET (modulo 10 et modulo 6)', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', variants: 2, variantLabel: '↻ Autre modulo', settle: 0.02,
  refs: 'Logique séquentielle et combinatoire associées ; compteur modulo N ; décodage d\'un état ; remise à zéro asynchrone',
  desc: 'Un compteur 4 bits compte naturellement jusqu\'à 15. Pour le faire compter de 0 à N − 1, on <b>décode l\'état N</b> avec une porte ET dont la sortie remet le compteur à zéro (MR). Câblez la porte U3 pour obtenir le modulo demandé.',
  objectives: ['Écrire N en binaire et repérer les bits à 1', 'Décoder l\'état N avec une porte ET sur ces bits', 'Relier la sortie de la porte à MR (remise à zéro asynchrone)', 'Vérifier la séquence 0 … N − 1 sur les LED'],
  steps: ['Variante 1 : modulo <b>10</b> (compter 0 à 9) ; variante 2 : modulo <b>6</b> (0 à 5). Écrivez N en binaire.', 'Repérez les <b>deux bits à 1</b> de N : 10 = 1010 (Q3 et Q1) ; 6 = 0110 (Q2 et Q1).', 'Reliez ces deux sorties aux entrées A et B de la porte ET U3, et la sortie Y de U3 à <b>MR</b>.', 'Vérifiez sur les LED (ou à l\'oscilloscope) que le comptage s\'arrête à N − 1 puis repart de 0.'],
  questions: [
    { q: 'Valeur de N pour cette variante', answer: c => c.tp.variant % 2 ? 6 : 10, abs: 0.1 },
    { q: 'Dernier état affiché avant la remise à zéro (en décimal)', answer: c => c.tp.variant % 2 ? 5 : 9, abs: 0.1 },
    { q: 'Fréquence de la sortie de la porte ET (état N décodé) par rapport à f(CK)', type: 'choice', options: ['f(CK) / N (une impulsion très brève par cycle)', 'f(CK)', 'f(CK) / 2', '0 Hz'], correct: 0 },
    { q: 'Fréquence de l\'état « zéro » : cycle complet toutes les… (en nombre de périodes d\'horloge)', answer: c => c.tp.variant % 2 ? 6 : 10, abs: 0.1 },
    { q: 'Pourquoi décode-t-on seulement deux bits (et non les quatre) ?', type: 'choice', options: ['Parce qu\'aucun état plus petit que N ne contient ces deux bits à 1 simultanément', 'Parce qu\'une porte ET n\'a que deux entrées', 'Parce que Q0 est inutile', 'Par économie de composants uniquement'], correct: 0 },
  ],
  build(c, o) {
    const t = SEQ[0]; const L = mk(c); clk555(L, t.R2, t.C, t.R1); c.tpfg = 1000;
    L.p('cnt4', 'U2', 640, 220, { fam: 'HC' }); L.w('U1', 'OUT', 'U2', 'CK'); L.w('AL1', '+', 'U2', 'VCC'); L.w('GND1', 'G', 'U2', 'GND');
    L.p('gate', 'U3', 640, 440, { fn: 'AND', fam: 'HC' }); L.w('AL1', '+', 'U3', 'VCC'); L.w('GND1', 'G', 'U3', 'GND');
    for (let k = 0; k < 4; k++) { R(L, 'R' + (3 + k), 820, 120 + 60 * k, 330, 0); L.p('led', 'D' + (1 + k), 920, 120 + 60 * k, { model: ['LED rouge', 'LED jaune', 'LED verte', 'LED verte'][k] }); L.w('U2', 'Q' + k, 'R' + (3 + k), 'A'); L.w('R' + (3 + k), 'B', 'D' + (1 + k), 'A'); L.w('D' + (1 + k), 'K', 'GND1', 'G'); }
    L.w('GND1', 'G', 'U2', 'MR');
  },
  solve(c, ctx, v) { const L = mk(c); NS.cutWire(c, 'GND1', 'G', 'U2', 'MR'); const [a, b] = v % 2 ? ['Q1', 'Q2'] : ['Q1', 'Q3']; L.w('U2', a, 'U3', 'A'); L.w('U2', b, 'U3', 'B'); L.w('U3', 'Y', 'U2', 'MR'); },
  checks: [
    { label: 'MR n\'est plus reliée à la masse : elle est pilotée par la porte U3', run: c => c.net('U3', 'Y') === c.net('U2', 'MR') },
    { label: 'La porte ET décode l\'état N (entrées sur les bonnes sorties Q)', run: c => { const want = c.tp.variant % 2 ? ['Q1', 'Q2'] : ['Q1', 'Q3']; const ins = [c.net('U3', 'A'), c.net('U3', 'B')]; return want.every(q => ins.includes(c.net('U2', q))); } },
    { label: 'Le compteur compte de 0 à N − 1 puis repart de 0', run: c => { const N = c.tp.variant % 2 ? 6 : 10; const s = states(c, 1000, 3 * N + 2); if (s.length < 2 * N) return false; const max = Math.max(...s); if (max !== N - 1) return false; for (let i = 1; i < s.length; i++) if (((s[i] - s[i - 1] + N) % N) !== 1) return false; return new Set(s).size === N; } },
    noBurn],
  correction: '<p>Un compteur 4 bits monte jusqu\'à 15. Pour un <b>modulo N</b> on détecte l\'état N (qui n\'apparaît donc que très brièvement) et on remet à zéro de façon asynchrone. N = 10 = 1010 : on décode <b>Q3·Q1</b> ; aucun état inférieur (0 à 9) n\'a ces deux bits à 1 en même temps. N = 6 = 0110 : on décode <b>Q2·Q1</b>. Le compteur parcourt 0 … N − 1 ; l\'état N ne dure que le temps de propagation de la porte (quelques ns) : on ne le voit pas sur les LED. Application : compteur décimal (BCD), diviseur par N, horloge à 6 états (dé électronique).</p>',
});

/* ============================================================ prise en main de l'analyseur logique */
const LAI = [{ f: 986, R2: 6800, C: 100e-9, td: 2e-3 }, { f: 2060, R2: 7200, C: 47e-9, td: 1e-3 }];
const lv = c => LAI[c.tp.variant % 2];
const fl = c => freqOf(c, 'U1', 'OUT', 2.5, lv(c).f).f;
regScenario({
  id: 'la_intro', cat: '7 · Communication série', diff: 1, title: 'Prise en main de l\'analyseur logique (chronogrammes d\'un compteur)', level: 'Bac Pro CIEL (première)', duration: '45 min', variants: 2, variantLabel: '↻ Autre horloge', settle: 0.05,
  refs: 'Instruments de mesure ; signaux logiques ; analyseur logique : voies, base de temps, déclenchement, seuil, curseurs',
  desc: 'Avant d\'analyser des liaisons série, apprenez à vous servir de l\'<b>analyseur logique</b> sur un signal que vous connaissez : un compteur 4 bits piloté par un NE555. Vous allez le câbler, régler base de temps, déclenchement et seuil, puis mesurer des périodes avec les curseurs.',
  objectives: ['Câbler plusieurs voies et la masse de l\'analyseur', 'Régler la base de temps pour voir plusieurs périodes', 'Utiliser le déclenchement (voie, front) pour stabiliser l\'affichage', 'Mesurer une période avec les curseurs et en déduire une fréquence', 'Lire un compteur sur un chronogramme'],
  steps: ['Câblez <b>D0 → Q0</b>, <b>D1 → Q1</b>, <b>D2 → Q2</b>, <b>D3 → Q3</b> du compteur U2, et <b>GND → masse</b>. Double-clic sur LA pour ouvrir la fenêtre (le <b>❓ Guide d\'utilisation</b> en bas de la fenêtre résume chaque réglage).', 'Appuyez sur <b>Auto</b> : la base de temps se règle toute seule. Réglez-la ensuite à la main pour voir <b>au moins une période complète de Q3</b> (la plus lente).', 'Déclenchement : choisissez la <b>voie D0, front montant</b> : l\'image devient stable. Appuyez sur <b>STOP</b> pour figer la capture.', 'Avec les <b>curseurs</b> (glisser sur le chronogramme), mesurez la période de Q0 et celle de Q3. Comparez : Q3 est ___ fois plus lente.', 'Le seuil logique doit convenir à un signal 0 / 5 V : vérifiez qu\'il vaut environ 1,65 V. Répondez aux questions.'],
  questions: [
    { q: 'Période de l\'horloge CK du NE555 (en µs)', answer: c => 1e6 / fl(c), tol: 0.08, unit: 'µs' },
    { q: 'Période de Q0 (en µs)', answer: c => 2e6 / fl(c), tol: 0.08, unit: 'µs' },
    { q: 'Période de Q3 (en ms)', answer: c => 16e3 / fl(c), tol: 0.08, unit: 'ms' },
    { q: 'Q3 est plus lente que Q0 d\'un facteur…', answer: 8, abs: 0.1 },
    { q: 'Pourquoi faut-il relier la broche GND de l\'analyseur à la masse du montage ?', type: 'choice', options: ['Pour alimenter l\'analyseur', 'Pour que les tensions soient mesurées par rapport à la même référence (sans masse commune, aucun niveau n\'est lu)', 'Pour augmenter la vitesse', 'Ce n\'est pas nécessaire'], correct: 1 },
    { q: 'À quoi sert le déclenchement ?', type: 'choice', options: ['À amplifier le signal', 'À démarrer l\'affichage toujours au même événement (un front) pour obtenir une image stable', 'À choisir la couleur des voies', 'À éteindre l\'instrument'], correct: 1 },
  ],
  build(c, o) {
    const t = LAI[((o && o.variant) || 0) % 2]; const L = mk(c); clk555(L, t.R2, t.C);
    L.p('cnt4', 'U2', 640, 220, { fam: 'HC' }); L.w('U1', 'OUT', 'U2', 'CK'); L.w('AL1', '+', 'U2', 'VCC'); L.w('GND1', 'G', 'U2', 'GND'); L.w('GND1', 'G', 'U2', 'MR');
    L.p('logic', 'LA', 780, 420, { tdiv: 1e-4, thr: 1.65 });
  },
  solve(c, ctx, v) { const L = mk(c); for (let k = 0; k < 4; k++) L.w('LA', 'D' + k, 'U2', 'Q' + k); L.w('LA', 'GND', 'GND1', 'G'); Object.assign(c.byRef('LA').p, { tdiv: LAI[v % 2].td, trigCh: 0, edge: 'up', thr: 1.65 }); },
  checks: [
    { label: 'Analyseur : D0…D3 câblées sur Q0…Q3, GND à la masse', run: c => [0, 1, 2, 3].every(k => c.net('LA', 'D' + k) === c.net('U2', 'Q' + k)) && c.net('LA', 'GND') === 0 },
    { label: 'Base de temps adaptée : au moins une période de Q3 visible (sans être écrasée)', run: c => { const f = lv(c).f, T3 = 16 / f, w = c.part('LA').p.tdiv * 10; return w >= T3 * 0.95 && w <= T3 * 8; } },
    { label: 'Déclenchement activé sur une voie (front choisi)', run: c => c.part('LA').p.trigCh >= 0 },
    { label: 'Seuil logique adapté à un signal 0 / 5 V (1 à 3,5 V)', run: c => { const t = c.part('LA').p.thr; return t >= 1 && t <= 3.5; } },
    noBurn],
  correction: '<p>L\'analyseur logique transforme chaque entrée en 0 ou 1 en comparant la tension au <b>seuil</b>. Il faut une <b>masse commune</b> avec le montage. Le <b>déclenchement</b> cale l\'affichage sur un front (ici montant de Q0) : l\'image est stable. Les curseurs donnent les durées : période de Q0 = 2 × période de CK, de Q3 = 16 × période de CK, soit <b>8 fois</b> plus lente que Q0. Pour un UART, on déclencherait sur le front descendant du start.</p>',
});
})(typeof window !== 'undefined' ? window : globalThis);
