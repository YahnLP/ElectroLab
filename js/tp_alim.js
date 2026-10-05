/* tp_alim.js — TP « Alimentations » : transformateur, redressement, filtrage, régulation 78xx */
(function (g) {
'use strict';
const NS = g.NS; const { mk, near, regScenario } = NS;
const R = (L, ref, x, y, v, rot, ex) => L.p('resistor', ref, x, y, Object.assign({ R: v, tol: 5, W: 0.25 }, ex || {}), rot);
const SAFE = '<p><b>⚠ Sécurité :</b> le secteur 230 V est <b>mortel</b>. Dans ce simulateur on s\'entraîne sans danger, mais dans la réalité on ne touche jamais à un circuit relié au secteur : on débranche, on attend la décharge des condensateurs, on vérifie l\'absence de tension, <i>puis</i> on intervient.</p>';
const noBurn = { label: 'Aucun composant n\'est détruit', run: c => c.anyBurnt().length === 0 };

/* ----- alimentation 5 V complète (réutilisée par les TP de dépannage) ----- */
NS.buildPSU = function (c, o) {
  o = o || {}; const L = mk(c);
  L.p('mains', 'SEC', 80, 200, {}); L.p('fuse', 'F1', 240, 180, { I: 0.1, fast: false }); L.p('transformer', 'TR1', 400, 200, { model: o.trafo || '230V / 12V · 10 VA' });
  ['D1', 'D2'].forEach((r, i) => L.p('diode', r, 540 + i * 90, 160, { model: '1N4007' }, 270));
  ['D3', 'D4'].forEach((r, i) => L.p('diode', r, 540 + i * 90, 260, { model: '1N4007' }, 270));
  L.p('capacitor', 'C1', 760, 210, { C: o.C1 || 2.2e-3, Vmax: 25, esr: 0.05, pol: true, tol: 20 }, 90);
  L.p('regulator', 'U1', 880, 160, { model: '7805', heatsink: !!o.heatsink }); L.p('capacitor', 'C2', 1000, 210, { C: 1e-7, Vmax: 50, esr: 0.01, pol: false, tol: 10 }, 90);
  R(L, 'RL', 1080, 210, o.RL || 22, 90, { W: o.RLW || 2 }); L.p('ground', 'GND1', 880, 330);
  const w = (a, pa, b, pb) => L.w(a, pa, b, pb);
  w('SEC', 'L', 'F1', 'A'); w('F1', 'B', 'TR1', 'P1'); w('SEC', 'N', 'TR1', 'P2');
  w('TR1', 'S1', 'D1', 'A'); w('TR1', 'S2', 'D2', 'A'); w('D1', 'K', 'D2', 'K'); w('TR1', 'S1', 'D3', 'K'); w('TR1', 'S2', 'D4', 'K'); w('D3', 'A', 'D4', 'A');
  w('D1', 'K', 'C1', 'A'); w('D3', 'A', 'C1', 'B'); w('D1', 'K', 'U1', 'IN'); w('U1', 'OUT', 'C2', 'A'); w('U1', 'OUT', 'RL', 'A'); w('C2', 'B', 'U1', 'GND'); w('RL', 'B', 'U1', 'GND'); w('D3', 'A', 'U1', 'GND'); w('GND1', 'G', 'U1', 'GND');
  return L;
};
const dmmV = (L, ref, x, y, mode) => L.p('multimeter', ref, x, y, { mode: mode || 'VDC' });

/* ============================================================ C1 — Transformateur */
regScenario({
  id: 'transfo', cat: '3 · Alimentations', diff: 2, title: 'Le transformateur : rapport de transformation', level: 'Bac Pro CIEL (première)', duration: '1 h', settle: 0.1,
  refs: 'Transformateur monophasé ; rapport de transformation ; valeur efficace ; tension alternative',
  desc: 'Un transformateur 230 V / 12 V est alimenté par le secteur à vide. Mesurez les tensions primaire et secondaire au multimètre (V∿) et à l\'oscilloscope, puis déterminez le rapport de transformation.' + SAFE,
  objectives: ['Mesurer une tension alternative (valeur efficace) au multimètre en mode V∿', 'Relever la valeur maximale et la période à l\'oscilloscope', 'Calculer le rapport de transformation m = U<sub>s</sub>/U<sub>p</sub>', 'Distinguer valeur efficace et valeur maximale : U<sub>max</sub> = U<sub>eff</sub>·√2'],
  steps: ['Placez MM1 (mode <b>V∿</b>) aux bornes du primaire (P1–P2) et relevez U<sub>p</sub>.', 'Déplacez MM1 aux bornes du secondaire (S1–S2) et relevez U<sub>s</sub> (à vide, le secondaire délivre un peu plus que 12 V).', 'Câblez l\'oscilloscope : CH1 sur S1, GND sur S2 (<i>le secondaire est isolé du secteur</i>). Mesurez U<sub>max</sub> et la période T.', 'Calculez m, U<sub>max</sub>/U<sub>eff</sub> et la fréquence.'],
  questions: [
    { q: 'Tension efficace primaire U<sub>p</sub> (en V)', answer: c => c.vd('TR1', 'P1', 'TR1', 'P2') && 230, tol: 0.03, unit: 'V' },
    { q: 'Tension efficace secondaire à vide U<sub>s</sub> (en V)', answer: c => c.measure(() => Math.pow(c.vd('TR1', 'S1', 'TR1', 'S2'), 2), 0.04, 200).mean ** 0.5, tol: 0.04, unit: 'V' },
    { q: 'Rapport de transformation m = U<sub>s</sub> / U<sub>p</sub> (sans unité, 3 décimales)', answer: c => c.measure(() => Math.pow(c.vd('TR1', 'S1', 'TR1', 'S2'), 2), 0.04, 200).mean ** 0.5 / 230, tol: 0.05, unit: '' },
    { q: 'Valeur maximale du secondaire U<sub>max</sub> relevée à l\'oscilloscope (en V)', answer: c => c.measure(() => c.vd('TR1', 'S1', 'TR1', 'S2'), 0.04, 200).max, tol: 0.05, unit: 'V' },
    { q: 'Période du signal (en ms)', answer: () => 20, tol: 0.05, unit: 'ms' },
    { q: 'Le transformateur d\'isolement…', type: 'choice', options: ['Transforme le courant alternatif en courant continu', 'Abaisse (ou élève) la tension alternative et isole galvaniquement le secondaire du secteur', 'Modifie la fréquence du réseau', 'Stocke l\'énergie électrique'], correct: 1 },
  ],
  build(c) {
    const L = mk(c); L.p('mains', 'SEC', 100, 200, {}); L.p('transformer', 'TR1', 300, 200, { model: '230V / 12V · 10 VA' }); L.p('ground', 'GND1', 400, 300);
    L.p('multimeter', 'MM1', 560, 220, { mode: 'VAC' }); L.p('scope', 'OSC1', 780, 220, { tdiv: 5e-3, v1: 5, v2: 5, on1: true, on2: false, trig: 0, src: 1 });
    L.w('SEC', 'L', 'TR1', 'P1'); L.w('SEC', 'N', 'TR1', 'P2'); L.w('TR1', 'S2', 'GND1', 'G');
  },
  solve(c) { const L = mk(c); L.w('MM1', 'V/Ω/A', 'TR1', 'S1'); L.w('MM1', 'COM', 'TR1', 'S2'); L.w('OSC1', 'CH1', 'TR1', 'S1'); L.w('OSC1', 'GND', 'TR1', 'S2'); },
  checks: [
    { label: 'Un voltmètre alternatif (V∿) est câblé aux bornes du secondaire', run: c => c.voltmeterAcross('TR1', 'S1', 'TR1', 'S2', true) },
    { label: 'L\'oscilloscope mesure le secondaire (CH1 sur S1)', run: c => c.scopeWired('', ['TR1', 'S1'], null) },
    { label: 'Le secondaire délivre bien ≈ 12–15 V efficaces', run: c => { const r = c.measure(() => Math.pow(c.vd('TR1', 'S1', 'TR1', 'S2'), 2), 0.04, 200).mean ** 0.5; return r > 11 && r < 16; } }],
  correction: '<p>m = U<sub>s</sub>/U<sub>p</sub> ≈ 14/230 ≈ <b>0,06</b> (transformateur abaisseur). À vide, U<sub>s</sub> dépasse la valeur nominale 12 V (la chute de tension en charge est due à la résistance des enroulements). U<sub>max</sub> = U<sub>eff</sub>·√2 ≈ 20 V, T = 20 ms soit f = 50 Hz. Le voltmètre en V∿ donne la valeur <b>efficace</b>, l\'oscilloscope la valeur <b>maximale</b>.</p>',
});

/* ============================================================ C2 — Redressement */
regScenario({
  id: 'redress', cat: '3 · Alimentations', diff: 2, title: 'Redressement simple et double alternance', level: 'Bac Pro CIEL (première)', duration: '1 h 15', variants: 2, variantLabel: '↻ Montage suivant', settle: 0.1,
  refs: 'Diode de redressement ; redressement mono et double alternance ; valeur moyenne ; oscilloscope',
  desc: 'Un transformateur alimente une résistance de charge à travers un redresseur. Visualisez la tension aux bornes de la charge, mesurez sa valeur moyenne (V⎓) et sa fréquence, et comparez le redressement <b>simple alternance</b> (1 diode) au <b>double alternance</b> (pont de 4 diodes).',
  objectives: ['Reconnaître le rôle d\'une diode (conduction dans un seul sens)', 'Observer la tension redressée à l\'oscilloscope', 'Mesurer la valeur moyenne avec un multimètre en V⎓', 'Comparer fréquence et valeur moyenne des deux montages'],
  steps: ['Câblez l\'oscilloscope : CH1 sur le secondaire (S1), CH2 sur la charge RL, masses reliées ; affichez les deux voies (5 V/div, 5 ms/div).', 'Observez et décrivez la tension u<sub>RL</sub> : combien de « bosses » par période du secteur ?', 'Mesurez la valeur moyenne de u<sub>RL</sub> avec MM1 en V⎓ et la valeur maximale à l\'oscilloscope. Comparez avec U<sub>smax</sub> − 0,7 V (simple) ou − 1,4 V (pont).', 'Cliquez « ↻ Montage suivant » pour étudier l\'autre redresseur.'],
  questions: [
    { q: 'Valeur maximale de la tension sur la charge (en V)', answer: c => c.measure(() => c.vd('RL', 'A', 'RL', 'B'), 0.04, 400).max, tol: 0.06, unit: 'V' },
    { q: 'Valeur moyenne de la tension sur la charge, mesurée en V⎓ (en V)', answer: c => c.measure(() => c.vd('RL', 'A', 'RL', 'B'), 0.1, 800).mean, tol: 0.07, unit: 'V' },
    { q: 'Fréquence de la tension redressée (en Hz)', answer: (c) => (c.part('D2') ? 100 : 50), tol: 0.05, unit: 'Hz' },
    { q: 'Dans le montage observé, combien de diodes conduisent en même temps ?', type: 'choice', options: ['Une seule (dans les deux cas)', 'Une seule', 'Deux (une sur chaque branche du pont)', 'Quatre'], correct: c => (c.part('D2') ? 2 : 1) },
    { q: 'Pour le même transformateur, quel montage donne la valeur moyenne la plus grande ?', type: 'choice', options: ['Simple alternance', 'Double alternance (pont)', 'Identique', 'Impossible à dire'], correct: 1 },
  ],
  build(c, o) {
    const L = mk(c); const pont = o.variant === 1;
    L.p('mains', 'SEC', 80, 200, {}); L.p('transformer', 'TR1', 240, 200, { model: '230V / 12V · 10 VA' }); L.p('ground', 'GND1', 340, 330); L.w('SEC', 'L', 'TR1', 'P1'); L.w('SEC', 'N', 'TR1', 'P2');
    R(L, 'RL', 740, 220, 100, 90, { W: 2 });
    if (!pont) { L.p('diode', 'D1', 460, 160, { model: '1N4007' }); L.w('TR1', 'S1', 'D1', 'A'); L.w('D1', 'K', 'RL', 'A'); L.w('RL', 'B', 'TR1', 'S2'); L.w('TR1', 'S2', 'GND1', 'G'); }
    else {
      ['D1', 'D2'].forEach((r, i) => L.p('diode', r, 480 + i * 60, 160, { model: '1N4007' }, 270)); ['D3', 'D4'].forEach((r, i) => L.p('diode', r, 480 + i * 60, 270, { model: '1N4007' }, 270));
      L.w('TR1', 'S1', 'D1', 'A'); L.w('TR1', 'S2', 'D2', 'A'); L.w('D1', 'K', 'D2', 'K'); L.w('TR1', 'S1', 'D3', 'K'); L.w('TR1', 'S2', 'D4', 'K'); L.w('D3', 'A', 'D4', 'A'); L.w('D1', 'K', 'RL', 'A'); L.w('D3', 'A', 'RL', 'B'); L.w('D3', 'A', 'GND1', 'G');
    }
    L.p('multimeter', 'MM1', 880, 240, { mode: 'VDC' }); L.p('scope', 'OSC1', 1060, 240, { tdiv: 5e-3, v1: 5, v2: 5, on1: true, on2: false, trig: 2, src: 2 });
  },
  solve(c) { const L = mk(c); const o = c.byRef('OSC1'); o.p.on2 = true; L.w('MM1', 'V/Ω/A', 'RL', 'A'); L.w('MM1', 'COM', 'RL', 'B'); L.w('OSC1', 'CH1', 'TR1', 'S1'); L.w('OSC1', 'CH2', 'RL', 'A'); L.w('OSC1', 'GND', 'GND1', 'G'); },
  checks: [
    { label: 'Oscilloscope câblé : CH1 sur le secondaire, CH2 sur la charge, GND à la masse', run: c => c.scopeWired('', ['TR1', 'S1'], ['RL', 'A']) },
    { label: 'La voie 2 est affichée', run: c => c.part('OSC1').p.on2 },
    { label: 'Un voltmètre continu mesure la tension de charge', run: c => c.voltmeterAcross('RL', 'A', 'RL', 'B') },
    { label: 'Montage fonctionnel (charge alimentée)', run: c => c.measure(() => c.vd('RL', 'A', 'RL', 'B'), 0.04, 200).mean > 5 }, noBurn],
  correction: '<p><b>Simple alternance :</b> la diode ne conduit que pendant l\'alternance positive : une bosse par période (f = 50 Hz), U<sub>max</sub> ≈ U<sub>smax</sub> − 0,7 V, valeur moyenne ≈ U<sub>max</sub>/π ≈ 6 V.</p><p><b>Double alternance (pont) :</b> deux diodes conduisent à chaque alternance (D1–D4 puis D2–D3) : deux bosses par période (f = 100 Hz), U<sub>max</sub> ≈ U<sub>smax</sub> − 1,4 V, valeur moyenne ≈ 2·U<sub>max</sub>/π ≈ 11 V : le double. Il reste une forte ondulation → il faudra filtrer (TP suivant).</p>',
});

/* ============================================================ C3 — Filtrage */
regScenario({
  id: 'filtrage', cat: '3 · Alimentations', diff: 3, title: 'Filtrage par condensateur : choix de C', level: 'Bac Pro CIEL (première)', duration: '1 h 15', settle: 0.6,
  refs: 'Filtrage capacitif ; ondulation ; condensateur électrolytique ; dimensionnement',
  desc: 'Un pont redresseur alimente une charge de 100 Ω. Un condensateur de filtrage de seulement 100 µF laisse une ondulation inacceptable. Mesurez l\'ondulation, calculez la capacité nécessaire pour qu\'elle reste inférieure à 1 V et corrigez le montage.',
  objectives: ['Mesurer l\'ondulation crête à crête à l\'oscilloscope (couplage AC)', 'Utiliser ΔV ≈ I / (2·f·C) pour le redressement double alternance', 'Choisir la capacité et la tension de service d\'un électrolytique', 'Vérifier le résultat'],
  steps: ['Câblez CH1 de l\'oscilloscope sur la charge RL et passez la voie en couplage <b>AC</b> avec 1 V/div pour voir l\'ondulation.', 'Mesurez la tension moyenne (MM1 en V⎓) et l\'ondulation ΔV pp. Calculez le courant dans la charge I = U/R.', 'Calculez la capacité C minimale pour ΔV ≤ 1 V : C = I / (2·f·ΔV). Choisissez la valeur normalisée supérieure.', 'Remplacez C1 dans l\'inspecteur (attention à la tension de service ≥ 1,5 × U<sub>max</sub>). Vérifiez à l\'oscilloscope.'],
  questions: [
    { q: 'Tension moyenne sur la charge avec C = 100 µF (en V)', answer: c => c.measure(() => c.vd('RL', 'A', 'RL', 'B'), 0.1, 400).mean, tol: 0.25, unit: 'V', hint: 'Mesurez avant de modifier C1.' },
    { q: 'Courant dans la charge I ≈ U<sub>moy</sub>/R (en mA), pour U<sub>moy</sub> ≈ 14 V', answer: () => 140, tol: 0.2, unit: 'mA' },
    { q: 'Capacité minimale pour ΔV ≤ 1 V : C = I/(2·f·ΔV) (en µF), I = 0,14 A, f = 50 Hz', answer: () => 1400, tol: 0.15, unit: 'µF' },
    { q: 'Valeur E12 à choisir (en µF)', answer: () => 1500, tol: 0.01, unit: 'µF' },
    { q: 'La tension de service du condensateur doit être…', type: 'choice', options: ['Inférieure à U<sub>max</sub>', 'Égale à U<sub>max</sub>', 'Supérieure à U<sub>max</sub> (marge ≥ 30 %)', 'Sans importance'], correct: 2 },
  ],
  build(c) {
    const L = mk(c);
    L.p('mains', 'SEC', 80, 200, {}); L.p('transformer', 'TR1', 240, 200, { model: '230V / 12V · 10 VA' }); L.p('ground', 'GND1', 340, 330); L.w('SEC', 'L', 'TR1', 'P1'); L.w('SEC', 'N', 'TR1', 'P2');
    ['D1', 'D2'].forEach((r, i) => L.p('diode', r, 480 + i * 60, 160, { model: '1N4007' }, 270)); ['D3', 'D4'].forEach((r, i) => L.p('diode', r, 480 + i * 60, 270, { model: '1N4007' }, 270));
    L.w('TR1', 'S1', 'D1', 'A'); L.w('TR1', 'S2', 'D2', 'A'); L.w('D1', 'K', 'D2', 'K'); L.w('TR1', 'S1', 'D3', 'K'); L.w('TR1', 'S2', 'D4', 'K'); L.w('D3', 'A', 'D4', 'A');
    L.p('capacitor', 'C1', 700, 220, { C: 1e-4, Vmax: 16, esr: 0.3, pol: true, tol: 20 }, 90); R(L, 'RL', 800, 220, 100, 90, { W: 2 });
    L.w('D1', 'K', 'C1', 'A'); L.w('D1', 'K', 'RL', 'A'); L.w('D3', 'A', 'C1', 'B'); L.w('D3', 'A', 'RL', 'B'); L.w('D3', 'A', 'GND1', 'G');
    L.p('multimeter', 'MM1', 920, 240, { mode: 'VDC' }); L.p('scope', 'OSC1', 1100, 240, { tdiv: 5e-3, v1: 1, v2: 5, c1: 'AC', on1: true, on2: false, trig: 0, src: 1 });
  },
  solve(c) { const L = mk(c); const C1 = c.byRef('C1'); C1.p.C = 1.5e-3; C1.p.Vmax = 25; NS.replacePart(C1); C1.replaced = 0; L.w('MM1', 'V/Ω/A', 'RL', 'A'); L.w('MM1', 'COM', 'RL', 'B'); L.w('OSC1', 'CH1', 'RL', 'A'); L.w('OSC1', 'GND', 'GND1', 'G'); },
  checks: [
    { label: 'L\'oscilloscope observe la charge (CH1 sur RL)', run: c => c.scopeWired('', ['RL', 'A'], null) },
    { label: 'Ondulation crête à crête sur la charge inférieure à 1 V', run: c => c.measure(() => c.vd('RL', 'A', 'RL', 'B'), 0.04, 400).pp < 1.0 },
    { label: 'Tension de service du condensateur ≥ 25 V', run: c => c.part('C1').p.Vmax >= 25 },
    { label: 'Le condensateur est polarisé correctement (sens +)', run: c => c.vd('C1', 'A', 'C1', 'B') > 0 },
    noBurn],
  correction: '<p>I ≈ 14 V / 100 Ω = 140 mA. Pour le redressement double alternance, la fréquence d\'ondulation est 2f = 100 Hz : C = I/(2·f·ΔV) = 0,14/(100 × 1) = 1,4 mF → on prend <b>1500 µF</b> (E12), tension de service 25 V (U<sub>max</sub> ≈ 17 V). Avec 100 µF l\'ondulation dépassait 10 V !</p><p>Un électrolytique est polarisé : le « + » doit être du côté positif, sinon il est détruit.</p>',
});

/* ============================================================ C4 — Régulateur 7805 */
regScenario({
  id: 'regul', cat: '3 · Alimentations', diff: 3, title: 'Régulation linéaire avec un 7805', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', variants: 2, variantLabel: '↻ Autre transformateur', settle: 1.5,
  refs: 'Régulation de tension ; régulateur intégré 78xx ; tension de déchet ; puissance dissipée ; dissipateur thermique',
  desc: 'Une alimentation complète (transformateur, pont, filtrage, régulateur 7805) alimente une charge de 5 V / 330 mA. Étudiez le rôle du régulateur : tension de sortie constante, ondulation, tension de déchet (dropout) et échauffement.',
  objectives: ['Mesurer la tension avant et après régulation', 'Calculer la puissance dissipée par le régulateur P = (U<sub>e</sub> − U<sub>s</sub>)·I', 'Comprendre la tension de déchet minimale (≈ 2 V)', 'Savoir quand un dissipateur thermique est nécessaire'],
  steps: ['Mesurez la tension d\'entrée du régulateur (aux bornes de C1) à l\'oscilloscope et au multimètre, puis la tension de sortie.', 'Calculez la puissance dissipée par U1 : P = (U<sub>e</sub> − U<sub>s</sub>)·I<sub>s</sub>. Quelle température atteint le boîtier sans dissipateur ? Observez le comportement dans l\'inspecteur de U1 (protection thermique).', 'Si nécessaire, ajoutez un dissipateur thermique (case dans l\'inspecteur) ou changez de transformateur.', 'Variante : avec le transformateur 6 V, mesurez l\'ondulation en sortie. Pourquoi la sortie n\'est-elle plus régulée ?'],
  questions: [
    { q: 'Tension moyenne en entrée du régulateur U<sub>e</sub> (en V)', answer: c => c.measure(() => c.v('U1', 'IN'), 0.04, 200).mean, tol: 0.1, unit: 'V' },
    { q: 'Tension de sortie U<sub>s</sub> (en V)', answer: c => c.v('U1', 'OUT'), tol: 0.08, unit: 'V' },
    { q: 'Courant de charge I<sub>s</sub> (en mA)', answer: c => Math.abs(c.I('RL')) * 1000, tol: 0.1, unit: 'mA' },
    { q: 'Puissance dissipée par le régulateur (en W)', answer: c => (c.measure(() => c.v('U1', 'IN'), 0.04, 200).mean - c.v('U1', 'OUT')) * Math.abs(c.I('RL')), tol: 0.2, unit: 'W' },
    { q: 'Quelle est la condition pour que le 7805 régule correctement ?', type: 'choice', options: ['U<sub>e</sub> doit toujours rester au-dessus de ≈ 7 V (5 V + tension de déchet)', 'U<sub>e</sub> doit être égale à 5 V', 'Il faut une charge nulle', 'Il faut une fréquence supérieure à 1 kHz'], correct: 0 },
  ],
  build(c, o) { const L = NS.buildPSU(c, { RL: 15, trafo: o.variant === 1 ? '230V / 6V · 3 VA' : '230V / 12V · 10 VA' }); L.p('multimeter', 'MM1', 640, 440, { mode: 'VDC' }); L.p('scope', 'OSC1', 860, 440, { tdiv: 5e-3, v1: 2, v2: 2, c1: 'AC', c2: 'AC', on1: true, on2: true, trig: 0, src: 1 }); },
  solve(c, ctx, v) { const L = mk(c); if (v === 0) c.byRef('U1').p.heatsink = true; else { const t = c.byRef('TR1'); t.p.model = '230V / 12V · 10 VA'; c.byRef('U1').p.heatsink = true; } L.w('MM1', 'V/Ω/A', 'U1', 'OUT'); L.w('MM1', 'COM', 'U1', 'GND'); L.w('OSC1', 'CH1', 'U1', 'IN'); L.w('OSC1', 'CH2', 'U1', 'OUT'); L.w('OSC1', 'GND', 'U1', 'GND'); },
  checks: [
    { label: 'Tension de sortie comprise entre 4,9 V et 5,1 V', run: c => { const m = c.measure(() => c.v('U1', 'OUT'), 0.04, 200); return m.min > 4.9 && m.max < 5.1; } },
    { label: 'Ondulation en sortie inférieure à 50 mV', run: c => c.measure(() => c.v('U1', 'OUT'), 0.04, 200).pp < 0.05 },
    { label: 'Température de jonction prévisible < 120 °C (pas de coupure thermique)', run: c => { const I = Math.abs(c.I('RL')), Ue = c.measure(() => c.v('U1', 'IN'), 0.04, 100).mean; return 25 + (Ue - c.v('U1', 'OUT')) * I * (c.part('U1').p.heatsink ? 12 : 65) < 120; } },
    { label: 'L\'oscilloscope est câblé sur l\'entrée et la sortie du régulateur', run: c => c.scopeWired('', ['U1', 'IN'], ['U1', 'OUT']) }, noBurn],
  correction: '<p>Le 7805 est un régulateur <b>linéaire</b> : il se comporte comme une résistance ajustable en série et dissipe P = (U<sub>e</sub> − 5 V)·I sous forme de chaleur. Avec U<sub>e</sub> ≈ 15 V et I = 333 mA : P ≈ 3,3 W → sans dissipateur le boîtier dépasse 150 °C et la protection thermique coupe la sortie. Solution : dissipateur ou transformateur de tension plus faible (ex. 9 V).</p><p>Avec le transformateur 6 V, la tension d\'entrée descend sous 7 V entre deux crêtes (tension de déchet de ≈ 2 V) : le régulateur ne régule plus et l\'ondulation passe en sortie.</p>',
});
})(typeof window !== 'undefined' ? window : globalThis);
