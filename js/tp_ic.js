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
})(typeof window !== 'undefined' ? window : globalThis);
