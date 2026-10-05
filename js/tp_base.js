/* tp_base.js — TP « Lois fondamentales » : multimètre, Ohm, associations, Kirchhoff, diviseur, puissance, LED */
(function (g) {
'use strict';
const NS = g.NS; const { mk, near, regScenario } = NS;
const R = (L, ref, x, y, v, rot, ex) => L.p('resistor', ref, x, y, Object.assign({ R: v, tol: 5, W: 0.25 }, ex || {}), rot);
const noBurn = { label: 'Aucun composant n\'est détruit', run: c => c.anyBurnt().length === 0 };

/* ============================================================ A1 — Loi d'Ohm */
regScenario({
  id: 'ohm', cat: '1 · Lois fondamentales', diff: 1, title: 'Découverte du multimètre : tension, courant, loi d\'Ohm', level: 'Bac Pro CIEL (seconde)', duration: '1 h',
  refs: 'Grandeurs électriques ; loi d\'Ohm ; puissance ; mesures au multimètre',
  desc: 'Une alimentation de laboratoire alimente une résistance de 470 Ω. Vous apprenez à brancher un <b>voltmètre en dérivation</b> et un <b>ampèremètre en série</b>, puis à vérifier la loi d\'Ohm.',
  objectives: ['Régler une alimentation de laboratoire (tension, limitation de courant)', 'Brancher correctement un voltmètre (parallèle) et un ampèremètre (série)', 'Mesurer une résistance à l\'ohmmètre (hors tension !)', 'Vérifier U = R × I et calculer la puissance P = U × I'],
  steps: ['Ouvrez l\'alimentation AL1 (double-clic) : réglez <b>10 V</b>. Gardez la limitation de courant à 0,2 A.', 'Avec <b>MM1</b> en mode <b>V⎓</b>, câblez-le <b>aux bornes de R1</b> (cordon rouge sur le côté +, noir côté −) et relevez U.', 'Coupez la sortie de l\'alimentation (OFF), puis mesurez R1 avec le mode <b>Ω</b> aux bornes de R1. Que se passe-t-il si la sortie reste ON ?', 'Pour mesurer le courant il faut <b>ouvrir le circuit</b> : supprimez le fil entre AL1(+) et R1, insérez <b>MM2</b> (mode mA) à la place, remettez la sortie ON et relevez I.', 'Calculez R = U / I et P = U × I, puis répondez aux questions.'],
  questions: [
    { q: 'Valeur de R1 mesurée à l\'ohmmètre, alimentation coupée (en Ω)', answer: c => c.el('R1').value(), tol: 0.03, unit: 'Ω', hint: 'Le multimètre doit être en mode Ω et la sortie de l\'alimentation sur OFF.' },
    { q: 'Tension U aux bornes de R1 pour une alimentation réglée à 10 V (en V)', answer: c => Math.abs(c.vd('R1', 'A', 'R1', 'B')), tol: 0.03, unit: 'V' },
    { q: 'Courant I dans le circuit (en mA)', answer: c => Math.abs(c.I('R1')) * 1000, tol: 0.05, unit: 'mA' },
    { q: 'Puissance dissipée par R1 (en mW)', answer: c => Math.abs(c.el('R1').P) * 1000, tol: 0.07, unit: 'mW' },
    { q: 'Quelle loi relie U, R et I ?', type: 'choice', options: ['Loi de Joule', 'Loi d\'Ohm', 'Loi des mailles', 'Loi de Faraday'], correct: 1 },
    { q: 'La résistance R1 est du type 1/4 W. À 15 V (P = U²/R ≈ 480 mW), que se passe-t-il ?', type: 'choice', options: ['Rien de particulier', 'Elle surchauffe et finit par être détruite', 'Sa valeur diminue de moitié', 'Le courant devient nul'], correct: 1 },
  ],
  build(c) {
    const L = mk(c); L.p('psu', 'AL1', 100, 160, { V: 5, Ilim: 0.2 }); R(L, 'R1', 340, 140, 470); L.p('ground', 'GND1', 200, 300);
    L.p('multimeter', 'MM1', 560, 190, { mode: 'VDC' }); L.p('multimeter', 'MM2', 740, 190, { mode: 'mA' });
    const jn = L.j(200, 260); L.w('AL1', '+', 'R1', 'A'); L.wj('R1', 'B', jn, [[420, 140], [420, 260]]); L.wj('AL1', '−', jn, [[200, 180]]); L.wj('GND1', 'G', jn);
  },
  solve(c) {
    const L = mk(c); c.byRef('AL1').p.V = 10; c.byRef('MM1').p.mode = 'VDC'; c.byRef('MM2').p.mode = 'mA';
    L.w('MM1', 'V/Ω/A', 'R1', 'A'); L.w('MM1', 'COM', 'R1', 'B');
    NS.cutWire(c, 'AL1', '+', 'R1', 'A'); L.w('AL1', '+', 'MM2', 'V/Ω/A'); L.w('MM2', 'COM', 'R1', 'A');
  },
  checks: [
    { label: 'Alimentation réglée à 10 V (± 0,2 V)', run: c => Math.abs(c.part('AL1').p.V - 10) <= 0.2 && c.part('AL1').p.on },
    { label: 'Un voltmètre (V⎓) est câblé aux bornes de R1', run: c => c.voltmeterAcross('R1', 'A', 'R1', 'B') },
    { label: 'Un ampèremètre est câblé EN SÉRIE avec R1', run: c => c.ammeterIn('R1') },
    { label: 'Le circuit est alimenté (courant ≈ 21 mA)', run: c => near(Math.abs(c.I('R1')), 10 / c.el('R1').value(), 0.03) },
    noBurn],
  correction: '<p>R1 ≈ 470 Ω (tolérance 5 %). Sous 10 V : I = U/R ≈ 21,3 mA ; P = U×I ≈ 213 mW (&lt; 250 mW).</p><p><b>Points clés :</b> le voltmètre se place <i>en parallèle</i> (impédance 10 MΩ), l\'ampèremètre <i>en série</i> (quasi court-circuit : ne jamais le brancher en dérivation sur une source, il fait sauter son fusible). L\'ohmmètre ne se branche que <i>hors tension</i> et sur un composant isolé : avec la sortie de l\'alimentation ON, il mesure environ 0 Ω (résistance de sortie de la source) et risque d\'être endommagé.</p>',
});

/* ============================================================ A2 — Associations */
regScenario({
  id: 'assoc', cat: '1 · Lois fondamentales', diff: 1, title: 'Associations de résistances et diviseur de courant', level: 'Bac Pro CIEL (seconde)', duration: '1 h',
  refs: 'Association série / parallèle ; résistance équivalente ; loi des nœuds',
  desc: 'Trois résistances forment un montage mixte : R1 en série avec R2 ∥ R3. Mesures hors tension, puis sous tension : tensions et courants dans chaque branche.',
  objectives: ['Calculer et mesurer une résistance équivalente', 'Constater qu\'une mesure « en circuit » mesure l\'ensemble du réseau', 'Appliquer la loi des nœuds (I = I2 + I3)'],
  steps: ['<b>Sortie de l\'alim sur OFF.</b> Mesurez avec l\'ohmmètre la résistance vue entre les bornes + et − de l\'alimentation. Comparez au calcul R1 + (R2 ∥ R3).', 'Mesurez aux bornes de R2 (toujours hors tension) : pourquoi ne lit-on pas la valeur de R2 seule ?', 'Réglez 12 V, sortie ON. Mesurez la tension aux bornes de l\'association R2 ∥ R3.', 'Insérez l\'ampèremètre successivement dans R1, R2 puis R3 et vérifiez I1 = I2 + I3.'],
  questions: [
    { q: 'R2 ∥ R3 calculée avec les valeurs nominales (en Ω)', answer: 1000 * 0 + (2200 * 3300) / (5500), tol: 0.02, unit: 'Ω' },
    { q: 'Résistance équivalente vue par l\'alimentation (en Ω, mesurée à l\'ohmmètre sortie OFF)', answer: c => { const a = c.el('R1').value(), b = c.el('R2').value(), d = c.el('R3').value(); return a + b * d / (b + d); }, tol: 0.03, unit: 'Ω' },
    { q: 'Sous 12 V : courant total fourni par l\'alimentation (en mA)', answer: c => Math.abs(c.I('R1')) * 1000, tol: 0.05, unit: 'mA', hint: 'Réglez bien 12 V, sortie ON.' },
    { q: 'Tension aux bornes de R2 ∥ R3 (en V)', answer: c => Math.abs(c.vd('R2', 'A', 'R2', 'B')), tol: 0.04, unit: 'V' },
    { q: 'Courant dans R3 (en mA)', answer: c => Math.abs(c.I('R3')) * 1000, tol: 0.05, unit: 'mA' },
    { q: 'La branche qui reçoit le plus de courant est celle de…', type: 'choice', options: ['R2 (2,2 kΩ)', 'R3 (3,3 kΩ)', 'Les deux reçoivent le même courant'], correct: 0 },
  ],
  build(c) {
    const L = mk(c); L.p('psu', 'AL1', 100, 160, { V: 12, Ilim: 0.2, on: false }); R(L, 'R1', 300, 140, 1000); R(L, 'R2', 440, 180, 2200, 90); R(L, 'R3', 560, 180, 3300, 90); L.p('ground', 'GND1', 200, 320);
    L.p('multimeter', 'MM1', 760, 170, { mode: 'Ohm' }); L.p('multimeter', 'MM2', 920, 170, { mode: 'mA' });
    const jn = L.j(200, 260); L.w('AL1', '+', 'R1', 'A'); L.w('R1', 'B', 'R2', 'A'); L.w('R2', 'A', 'R3', 'A'); L.w('R3', 'B', 'R2', 'B'); L.wj('R2', 'B', jn, [[440, 260]]); L.wj('AL1', '−', jn, [[200, 180]]); L.wj('GND1', 'G', jn, []);
    c.byRef('AL1').p.on = false;
  },
  solve(c) { const L = mk(c); c.byRef('AL1').p.on = true; c.byRef('AL1').p.V = 12; L.w('MM1', 'V/Ω/A', 'R2', 'A'); L.w('MM1', 'COM', 'R2', 'B'); c.byRef('MM1').p.mode = 'VDC'; NS.cutWire(c, 'AL1', '+', 'R1', 'A'); L.w('AL1', '+', 'MM2', 'V/Ω/A'); L.w('MM2', 'COM', 'R1', 'A'); },
  checks: [
    { label: 'Alimentation réglée à 12 V et sortie active', run: c => Math.abs(c.part('AL1').p.V - 12) <= 0.2 && c.part('AL1').p.on },
    { label: 'Voltmètre câblé aux bornes de R2 ∥ R3', run: c => c.voltmeterAcross('R2', 'A', 'R2', 'B') },
    { label: 'Ampèremètre en série (dans R1 ou une branche)', run: c => c.ammeterIn('R1') || c.ammeterIn('R2') || c.ammeterIn('R3') },
    noBurn],
  correction: '<p>R2 ∥ R3 = 2200×3300/5500 = <b>1320 Ω</b> ; R<sub>eq</sub> = 1000 + 1320 = <b>2320 Ω</b>. Sous 12 V : I = 5,17 mA ; U<sub>parallèle</sub> = 6,83 V ; I2 = 3,10 mA ; I3 = 2,07 mA (I2 + I3 = I : loi des nœuds).</p><p>Hors tension, l\'ohmmètre branché sur R2 mesure R2 en parallèle avec le reste du réseau (R3 en série avec R1 si la sortie est coupée, la source étant en circuit ouvert) : il faut <b>dessouder une patte</b> pour mesurer un composant seul.</p>',
});

/* ============================================================ A3 — Kirchhoff */
regScenario({
  id: 'kirchhoff', cat: '1 · Lois fondamentales', diff: 2, title: 'Lois de Kirchhoff : nœuds et mailles', level: 'Bac Pro CIEL (première)', duration: '1 h 15',
  refs: 'Lois de Kirchhoff ; réseau à deux sources ; théorème de Millman',
  desc: 'Deux sources (une alimentation 12 V et une pile 9 V) alimentent un nœud commun N relié à la masse par R3. Vérifiez expérimentalement la loi des nœuds et la loi des mailles.',
  objectives: ['Mesurer des tensions et des courants dans un réseau à deux mailles', 'Vérifier la loi des nœuds au nœud N', 'Vérifier la loi des mailles dans chaque maille', 'Calculer la tension du nœud par la méthode de Millman'],
  steps: ['Repérez le nœud N (jonction de R1, R2 et R3). Mesurez la tension V<sub>N</sub> par rapport à la masse.', 'Mesurez les tensions aux bornes de R1, R2 et R3 (précisez le sens).', 'Mesurez les trois courants I1, I2, I3 (ampèremètre en série, un à la fois) et vérifiez I1 + I2 = I3.', 'Écrivez la loi des mailles pour la maille AL1–R1–R3 et vérifiez-la avec vos mesures.'],
  questions: [
    { q: 'Tension V<sub>N</sub> du nœud N par rapport à la masse (en V)', answer: c => Math.abs(c.v('R3', 'A')), tol: 0.03, unit: 'V' },
    { q: 'Courant I1 dans R1 (en mA)', answer: c => Math.abs(c.I('R1')) * 1000, tol: 0.05, unit: 'mA' },
    { q: 'Courant I2 dans R2 (en mA)', answer: c => Math.abs(c.I('R2')) * 1000, tol: 0.06, unit: 'mA' },
    { q: 'Courant I3 dans R3 (en mA)', answer: c => Math.abs(c.I('R3')) * 1000, tol: 0.05, unit: 'mA' },
    { q: 'V<sub>N</sub> théorique par Millman (en V) : (E1/R1 + E2/R2) / (1/R1 + 1/R2 + 1/R3), valeurs nominales', answer: (12 / 220 + 9 / 330) / (1 / 220 + 1 / 330 + 1 / 470), tol: 0.02, unit: 'V' },
    { q: 'Loi des mailles dans AL1–R1–R3 : E1 = …', type: 'choice', options: ['U(R1) + U(R3)', 'U(R1) − U(R3)', 'U(R2) + U(R3)', 'U(R1) × U(R3)'], correct: 0 },
  ],
  build(c) {
    const L = mk(c); L.p('psu', 'AL1', 100, 160, { V: 12, Ilim: 0.3 }); L.p('battery', 'BT1', 100, 330, { V: 9, Ri: 1.5 }, 270);
    R(L, 'R1', 280, 140, 220); R(L, 'R2', 280, 290, 330); R(L, 'R3', 520, 215, 470, 90); L.p('ground', 'GND1', 200, 440);
    L.p('multimeter', 'MM1', 740, 170, { mode: 'VDC' }); L.p('multimeter', 'MM2', 900, 170, { mode: 'mA' });
    const jn = L.j(420, 140), g = L.j(200, 400); L.w('AL1', '+', 'R1', 'A'); L.wj('R1', 'B', jn); L.w('BT1', '+', 'R2', 'A', [[100, 290]]); L.wj('R2', 'B', jn, [[420, 290]]);
    L.wj('R3', 'A', jn, [[520, 140]]); L.wj('AL1', '−', g, [[200, 180]]); L.wj('BT1', '−', g, [[100, 400]]); L.wj('R3', 'B', g, [[520, 400]]); L.wj('GND1', 'G', g);
  },
  solve(c) { const L = mk(c); L.w('MM1', 'V/Ω/A', 'R3', 'A'); L.w('MM1', 'COM', 'R3', 'B'); NS.cutWire(c, 'AL1', '+', 'R1', 'A'); L.w('AL1', '+', 'MM2', 'V/Ω/A'); L.w('MM2', 'COM', 'R1', 'A'); },
  checks: [
    { label: 'Voltmètre câblé entre le nœud N et la masse (aux bornes de R3)', run: c => c.voltmeterAcross('R3', 'A', 'R3', 'B') },
    { label: 'Ampèremètre en série dans une branche', run: c => c.ammeterIn('R1') || c.ammeterIn('R2') || c.ammeterIn('R3') },
    { label: 'Alimentation à 12 V (non modifiée par erreur)', run: c => Math.abs(c.part('AL1').p.V - 12) < 0.3 },
    noBurn],
  correction: '<p>V<sub>N</sub> = (12/220 + 9/330) / (1/220 + 1/330 + 1/470) ≈ <b>8,4 V</b>. I1 = (12 − 8,4)/220 ≈ 16,3 mA ; I2 = (9 − 8,4)/330 ≈ 1,8 mA ; I3 = 8,4/470 ≈ 17,9 mA. On vérifie bien <b>I1 + I2 = I3</b> (loi des nœuds) et <b>E1 = U(R1) + U(R3)</b> (loi des mailles).</p><p>Attention au sens des courants : ici I2 est faible car la pile 9 V est peu au-dessus de V<sub>N</sub> ; si E2 était inférieure à V<sub>N</sub>, la pile serait <i>rechargée</i> par l\'alimentation (I2 négatif).</p>',
});

/* ============================================================ A4 — Diviseur de tension */
regScenario({
  id: 'diviseur', cat: '1 · Lois fondamentales', diff: 2, title: 'Diviseur de tension et influence du voltmètre', level: 'Bac Pro CIEL (première)', duration: '1 h',
  refs: 'Diviseur de tension ; impédance d\'entrée d\'un appareil de mesure ; potentiomètre',
  desc: 'Un diviseur 1 MΩ / 1 MΩ alimenté en 10 V devrait délivrer 5 V. Mais le voltmètre n\'est pas parfait : son impédance d\'entrée (10 MΩ) perturbe la mesure. Étudiez aussi l\'effet d\'une charge et d\'un potentiomètre.',
  objectives: ['Calculer la tension de sortie d\'un diviseur U<sub>s</sub> = E·R2/(R1+R2)', 'Mettre en évidence l\'erreur de méthode due à la résistance interne du voltmètre', 'Observer l\'effet d\'une charge sur la sortie du diviseur'],
  steps: ['Câblez MM1 (V⎓) entre le point milieu S (R1/R2) et la masse. Relevez U<sub>s</sub>. Comparez à la valeur théorique 5 V : quel écart observez-vous ?', 'Calculez la résistance équivalente de R2 en parallèle avec l\'entrée du voltmètre (10 MΩ) et expliquez l\'écart.', 'Remplacez le diviseur par R1 = R2 = 10 kΩ (modifiez les valeurs) : l\'erreur est-elle toujours visible ? Pourquoi ?', 'Ajoutez une charge R<sub>L</sub> = 10 kΩ entre S et la masse (c\'est R3 déjà placée en bas, à relier) et mesurez U<sub>s</sub>.'],
  questions: [
    { q: 'Tension de sortie théorique du diviseur à vide, valeurs nominales (en V)', answer: 5, tol: 0.01, unit: 'V' },
    { q: 'Tension relevée au voltmètre sur le diviseur 1 MΩ / 1 MΩ (en V)', answer: c => { const r1 = c.el('R1').value(), r2 = c.el('R2').value(); const rp = 1 / (1 / r2 + 1 / 1e7); return c.v('AL1', '+') * rp / (r1 + rp); }, tol: 0.02, unit: 'V', hint: 'Câblez MM1 entre S et la masse, mode V⎓, et laissez la mesure se stabiliser.' },
    { q: 'Résistance équivalente de R2 ∥ 10 MΩ (en kΩ)', answer: 909, tol: 0.03, unit: 'kΩ' },
    { q: 'Avec R1 = R2 = 10 kΩ, la valeur lue est…', type: 'choice', options: ['Très différente de 5 V', 'Quasiment 5 V (erreur &lt; 0,1 %)', 'Égale à 10 V'], correct: 1 },
  ],
  build(c) {
    const L = mk(c); L.p('psu', 'AL1', 100, 160, { V: 10, Ilim: 0.1 }); R(L, 'R1', 340, 140, 1e6, 0, { tol: 1 }); R(L, 'R2', 440, 220, 1e6, 90, { tol: 1 }); R(L, 'R3', 560, 220, 10000, 90); L.p('ground', 'GND1', 200, 340);
    L.p('multimeter', 'MM1', 740, 190, { mode: 'VDC' });
    const g = L.j(200, 300), js = L.j(440, 140); L.w('AL1', '+', 'R1', 'A'); L.wj('R1', 'B', js); L.wj('R2', 'A', js); L.wj('R2', 'B', g, [[440, 300]]); L.wj('AL1', '−', g, [[200, 180]]); L.wj('GND1', 'G', g); L.w('R3', 'B', 'R2', 'B', [[560, 300], [440, 300]]);
  },
  solve(c) { const L = mk(c); L.w('MM1', 'V/Ω/A', 'R2', 'A'); L.w('MM1', 'COM', 'R2', 'B'); },
  checks: [{ label: 'Voltmètre câblé entre S et la masse', run: c => c.voltmeterAcross('R2', 'A', 'R2', 'B') }, { label: 'Alimentation à 10 V', run: c => Math.abs(c.part('AL1').p.V - 10) < 0.2 }, noBurn],
  correction: '<p>À vide : U<sub>s</sub> = 10 × 1/(1+1) = 5 V. Avec le voltmètre (10 MΩ) en parallèle sur R2 : R2′ = 1 MΩ ∥ 10 MΩ = 909 kΩ → U<sub>s</sub> = 10 × 909/(1000+909) ≈ <b>4,76 V</b> (erreur ≈ 5 %). Avec 10 kΩ l\'erreur tombe à 0,05 % : la règle est <i>R<sub>source</sub> ≪ R<sub>entrée voltmètre</sub></i>.</p>',
});

/* ============================================================ A5 — Puissance / effet Joule */
regScenario({
  id: 'puissance', cat: '1 · Lois fondamentales', diff: 2, title: 'Puissance, effet Joule et dimensionnement d\'une résistance', level: 'Bac Pro CIEL (seconde)', duration: '1 h', settle: 2,
  refs: 'Puissance électrique ; effet Joule ; choix d\'un composant (puissance admissible)',
  desc: 'Une résistance de charge de 100 Ω (1/4 W) doit être alimentée sous 8 V. Calculez la puissance dissipée, constatez ce qui arrive à un composant sous-dimensionné, puis choisissez la bonne puissance admissible.',
  objectives: ['Calculer P = U²/R = R·I² = U·I', 'Reconnaître la limite de puissance d\'un composant', 'Dimensionner une résistance avec une marge de sécurité (× 2)'],
  steps: ['L\'alimentation est réglée à 2 V. Relevez U et I avec les multimètres et calculez P.', 'Calculez la tension maximale admissible par une 100 Ω / 1/4 W.', '<b>Augmentez la tension à 8 V</b> : observez R1 (couleur, journal). Que se passe-t-il ?', 'Ramenez l\'alimentation à 0 V, remplacez R1 par une résistance <b>100 Ω</b> de puissance adaptée (cliquez R1 → « Puissance max. » puis « Remplacer par un composant neuf »), puis rétablissez 8 V.'],
  questions: [
    { q: 'Puissance maximale admissible par R1 (en W)', answer: 0.25, tol: 0.02, unit: 'W' },
    { q: 'Tension maximale admissible par R1 : U = √(P·R) (en V)', answer: 5, tol: 0.03, unit: 'V' },
    { q: 'Puissance dissipée par une résistance de 100 Ω sous 8 V (en W)', answer: 0.64, tol: 0.03, unit: 'W' },
    { q: 'Quelle puissance admissible choisir (marge ×2) ?', type: 'choice', options: ['1/4 W', '1/2 W', '1 W', '2 W'], correct: 3 },
    { q: 'Sous 8 V, la 1/4 W…', type: 'choice', options: ['Fonctionne normalement', 'Surchauffe puis est détruite', 'Voit sa valeur doubler', 'Fait disjoncter l\'alimentation'], correct: 1 },
  ],
  build(c) {
    const L = mk(c); L.p('psu', 'AL1', 100, 160, { V: 2, Ilim: 1 }); R(L, 'R1', 340, 140, 100, 0, { tol: 5, W: 0.25 }); L.p('ground', 'GND1', 200, 300);
    L.p('multimeter', 'MM1', 560, 190, { mode: 'VDC' }); L.p('multimeter', 'MM2', 740, 190, { mode: 'mA' });
    const jn = L.j(200, 260); L.w('AL1', '+', 'R1', 'A'); L.wj('R1', 'B', jn, [[420, 140], [420, 260]]); L.wj('AL1', '−', jn, [[200, 180]]); L.wj('GND1', 'G', jn);
  },
  solve(c) { const r = c.byRef('R1'); r.p.W = 2; NS.replacePart(r); c.byRef('AL1').p.V = 8; },
  checks: [
    { label: 'R1 vaut toujours 100 Ω (± 5 %)', run: c => near(c.el('R1').value(), 100, 0.12) },
    { label: 'Puissance admissible de R1 ≥ 1 W', run: c => c.part('R1').p.W >= 1 },
    { label: 'Alimentation réglée à 8 V', run: c => Math.abs(c.part('AL1').p.V - 8) <= 0.2 },
    { label: 'R1 n\'est pas détruite et fonctionne sous 8 V', run: c => !c.part('R1').burnt && Math.abs(c.I('R1')) > 0.07 },
    { label: 'La résistance ne dépasse pas la moitié de sa puissance admissible', run: c => Math.abs(c.el('R1').P) <= 0.5 * c.part('R1').p.W + 1e-6 }],
  correction: '<p>P = U²/R = 8²/100 = <b>0,64 W</b> &gt; 0,25 W : la 1/4 W s\'échauffe puis est détruite en quelques secondes. On choisit P<sub>nominale</sub> ≥ 2 × P<sub>dissipée</sub> = 1,28 W → <b>2 W</b>. Tension maximale d\'une 1/4 W / 100 Ω : √(0,25×100) = 5 V.</p>',
});

/* ============================================================ A6 — LED */
regScenario({
  id: 'led', cat: '1 · Lois fondamentales', diff: 2, title: 'LED : calcul de la résistance de limitation', level: 'Bac Pro CIEL (seconde)', duration: '1 h', variants: 3, variantLabel: '↻ Autre couleur de LED', settle: 1,
  refs: 'Diode électroluminescente ; tension de seuil ; résistance série ; loi des mailles',
  desc: 'Une LED doit être alimentée en 5 V. Une LED n\'est pas une résistance : sans limitation, le courant explose et elle est détruite. Calculez la résistance de protection, choisissez une valeur normalisée et vérifiez à l\'ampèremètre.',
  objectives: ['Relever la tension de seuil d\'une LED', 'Calculer R = (E − V<sub>F</sub>) / I<sub>F</sub> avec la loi des mailles', 'Choisir une valeur de la série E12 et vérifier le courant'],
  steps: ['Avec MM1 (mode V⎓) mesurez la tension V<sub>F</sub> aux bornes de la LED. La résistance R1 est pour l\'instant de 1 kΩ : relevez le courant avec MM2 (mA, en série). La LED brille-t-elle fort ?', 'On veut I<sub>F</sub> = 15 mA. Calculez R avec la loi des mailles E = R·I + V<sub>F</sub>. Choisissez la valeur E12 la plus proche.', 'Modifiez R1 (inspecteur), vérifiez I<sub>F</sub> et la puissance dissipée par R1.', '<i>Pour réfléchir :</i> que se passerait-il avec R1 = 0 Ω ? (ne le faites pas : la LED serait détruite !)'],
  questions: [
    { q: 'Tension V<sub>F</sub> mesurée aux bornes de la LED (en V)', answer: c => Math.abs(c.vd('D1', 'A', 'D1', 'K')), tol: 0.05, unit: 'V', hint: 'MM1 en V⎓ entre l\'anode et la cathode.' },
    { q: 'Résistance théorique pour I<sub>F</sub> = 15 mA : R = (5 − V<sub>F</sub>)/I<sub>F</sub> (en Ω)', answer: c => (5 - ({ 'LED rouge': 1.9, 'LED verte': 2.1, 'LED bleue': 3.0 }[c.part('D1').p.model])) / 0.015, tol: 0.08, unit: 'Ω' },
    { q: 'Valeur normalisée E12 la plus proche (en Ω)', answer: c => NS.nearestE((5 - ({ 'LED rouge': 1.9, 'LED verte': 2.1, 'LED bleue': 3.0 }[c.part('D1').p.model])) / 0.015, NS.E12), tol: 0.01, unit: 'Ω' },
    { q: 'Courant mesuré avec cette résistance (en mA)', answer: c => Math.abs(c.I('D1')) * 1000, tol: 0.06, unit: 'mA' },
    { q: 'Puissance dissipée par R1 (en mW)', answer: c => Math.abs(c.el('R1').P) * 1000, tol: 0.1, unit: 'mW' },
    { q: 'Si l\'on inverse la LED, elle…', type: 'choice', options: ['Brille plus fort', 'Reste éteinte (diode bloquée, I ≈ 0)', 'Est détruite à coup sûr', 'Change de couleur'], correct: 1 },
  ],
  build(c, o) {
    const L = mk(c); const model = ['LED rouge', 'LED verte', 'LED bleue'][o.variant % 3];
    L.p('psu', 'AL1', 100, 160, { V: 5, Ilim: 0.1 }); R(L, 'R1', 300, 140, 1000); L.p('led', 'D1', 460, 140, { model }); L.p('ground', 'GND1', 200, 300);
    L.p('multimeter', 'MM1', 640, 190, { mode: 'VDC' }); L.p('multimeter', 'MM2', 800, 190, { mode: 'mA' });
    const jn = L.j(200, 260); L.w('AL1', '+', 'R1', 'A'); L.w('R1', 'B', 'D1', 'A'); L.wj('D1', 'K', jn, [[540, 140], [540, 260]]); L.wj('AL1', '−', jn, [[200, 180]]); L.wj('GND1', 'G', jn);
  },
  solve(c) { const L = mk(c); const m = c.byRef('D1').p.model; const r = c.byRef('R1'); r.p.R = NS.nearestE((5 - ({ 'LED rouge': 1.9, 'LED verte': 2.1, 'LED bleue': 3.0 }[m])) / 0.015, NS.E12); L.w('MM1', 'V/Ω/A', 'D1', 'A'); L.w('MM1', 'COM', 'D1', 'K'); NS.cutWire(c, 'AL1', '+', 'R1', 'A'); L.w('AL1', '+', 'MM2', 'V/Ω/A'); L.w('MM2', 'COM', 'R1', 'A'); },
  checks: [
    { label: 'Courant dans la LED entre 8 et 20 mA', run: c => { const I = Math.abs(c.I('D1')); return I >= 0.008 && I <= 0.02; } },
    { label: 'R1 est une valeur normalisée E12', run: c => { const v = c.part('R1').p.R; return near(NS.nearestE(v, NS.E12), v, 0.005); } },
    { label: 'La LED n\'est pas détruite', run: c => !c.part('D1').burnt },
    { label: 'Un voltmètre est câblé aux bornes de la LED', run: c => c.voltmeterAcross('D1', 'A', 'D1', 'K') },
    { label: 'Un ampèremètre est câblé en série', run: c => c.ammeterIn('D1') }],
  correction: '<p>Loi des mailles : E = R·I<sub>F</sub> + V<sub>F</sub> → R = (E − V<sub>F</sub>)/I<sub>F</sub>. LED rouge (V<sub>F</sub> ≈ 1,9 V) : (5 − 1,9)/15 mA ≈ 207 Ω → <b>220 Ω</b> (E12) → I<sub>F</sub> ≈ 14 mA. LED verte (2,1 V) : 193 Ω → 180 Ω. LED bleue (3,0 V) : 133 Ω → 120 Ω. P<sub>R</sub> = R·I² ≈ 45 mW (une 1/4 W suffit).</p><p>Une LED a une caractéristique exponentielle : au-delà de V<sub>F</sub> une faible hausse de tension fait exploser le courant, d\'où la nécessité de limiter le courant par une résistance.</p>',
});

/* ============================================================ A7 — Circuit RC */
regScenario({
  id: 'rc', cat: '1 · Lois fondamentales', diff: 2, title: 'Charge et décharge d\'un condensateur (circuit RC)', level: 'Bac Pro CIEL (première)', duration: '1 h 15', settle: 0.02,
  refs: 'Condensateur ; constante de temps ; régime transitoire ; oscilloscope ; GBF',
  desc: 'Un générateur délivre un signal carré 0 / 5 V à 1 kHz sur un circuit R = 10 kΩ, C = 10 nF. À l\'oscilloscope, observez la charge et la décharge exponentielles et mesurez la constante de temps τ = R·C.',
  objectives: ['Câbler correctement un oscilloscope (CH1, CH2, masse)', 'Observer la charge/décharge exponentielle d\'un condensateur', 'Mesurer τ (63 % de la valeur finale) et la comparer à R·C', 'Calculer la fréquence de coupure f<sub>c</sub> = 1/(2πRC)'],
  steps: ['Câblez l\'oscilloscope : <b>CH1</b> sur la sortie du GBF (entrée du circuit), <b>CH2</b> aux bornes de C1, <b>GND</b> à la masse. Activez la voie 2 (« Afficher »).', 'Réglez la base de temps à 100 µs/div, 1 V/div. Utilisez le déclenchement sur CH1 (front montant, niveau 2,5 V).', 'Mesurez τ : temps pour que V<sub>C</sub> atteigne 63 % de 5 V (3,15 V) après le front montant.', 'Remplacez C1 par 100 nF (inspecteur) : que devient le signal de sortie ? Pourquoi ?'],
  questions: [
    { q: 'Constante de temps théorique τ = R·C (en µs)', answer: c => c.el('R1').value() * c.el('C1').params().C * 1e6, tol: 0.04, unit: 'µs' },
    { q: 'Constante de temps τ mesurée à l\'oscilloscope (en µs)', answer: c => c.el('R1').value() * c.el('C1').params().C * 1e6, tol: 0.12, unit: 'µs', hint: 'Mesurez le temps pour atteindre 63 % de la valeur finale.' },
    { q: 'Durée de charge à 99 % ≈ 5τ (en µs)', answer: c => 5 * c.el('R1').value() * c.el('C1').params().C * 1e6, tol: 0.12, unit: 'µs' },
    { q: 'Fréquence de coupure f<sub>c</sub> = 1/(2πRC) (en Hz)', answer: c => 1 / (2 * Math.PI * c.el('R1').value() * c.el('C1').params().C), tol: 0.06, unit: 'Hz' },
    { q: 'À t = τ, la tension aux bornes du condensateur chargé vaut environ…', type: 'choice', options: ['37 % de la valeur finale', '50 % de la valeur finale', '63 % de la valeur finale', '95 % de la valeur finale'], correct: 2 },
  ],
  build(c) {
    const L = mk(c); L.p('gbf', 'GBF1', 100, 160, { wave: 'carre', f: 1000, A: 2.5, off: 2.5, duty: 50 }); R(L, 'R1', 300, 140, 10000); L.p('capacitor', 'C1', 440, 180, { C: 1e-8, Vmax: 50, esr: 0.01, pol: false, tol: 10 }, 90); L.p('ground', 'GND1', 200, 320);
    L.p('scope', 'OSC1', 680, 200, { tdiv: 5e-4, v1: 1, v2: 1, on1: true, on2: false, trig: 2.5, src: 1 });
    const jg = L.j(200, 260); L.w('GBF1', 'OUT', 'R1', 'A'); L.w('R1', 'B', 'C1', 'A'); L.wj('C1', 'B', jg, [[440, 260]]); L.wj('GBF1', 'GND', jg, [[200, 180]]); L.wj('GND1', 'G', jg);
  },
  solve(c) { const L = mk(c); const o = c.byRef('OSC1'); o.p.on2 = true; o.p.tdiv = 1e-4; L.w('OSC1', 'CH1', 'R1', 'A'); L.w('OSC1', 'CH2', 'C1', 'A'); L.w('OSC1', 'GND', 'GND1', 'G'); },
  checks: [
    { label: 'Oscilloscope : CH1 sur l\'entrée (sortie GBF), CH2 sur C1, GND à la masse', run: c => c.scopeWired('', ['R1', 'A'], ['C1', 'A']) },
    { label: 'La voie 2 est affichée', run: c => c.part('OSC1').p.on2 },
    { label: 'Le GBF délivre toujours un signal carré', run: c => c.part('GBF1').p.wave === 'carre' && c.part('GBF1').p.on },
    { label: 'Le signal sur C1 atteint (presque) 5 V', run: c => { const m = c.measure(() => c.v('C1', 'A'), 0.002, 200); return m.max > 4.5; } }],
  correction: '<p>τ = R·C = 10 kΩ × 10 nF = <b>100 µs</b>. À t = τ, V<sub>C</sub> = 5 × (1 − e<sup>−1</sup>) = 3,16 V. Charge complète en ≈ 5τ = 500 µs, soit exactement une demi-période à 1 kHz : le condensateur a juste le temps de se charger. f<sub>c</sub> = 1/(2πRC) ≈ 1,59 kHz.</p><p>Avec C = 100 nF, τ = 1 ms &gt; T/2 : le condensateur n\'a plus le temps de se charger, la sortie devient un signal quasi triangulaire de faible amplitude (intégrateur).</p>',
});

/* ============================================================ A8 — Signaux */
const SIG = [
  { wave: 'sin', f: 2500, A: 3, off: 0 }, { wave: 'carre', f: 800, A: 2, off: 1 }, { wave: 'tri', f: 5000, A: 4, off: 0 }, { wave: 'sin', f: 50, A: 5, off: 2 },
];
function sigStats(p) {
  const k = { sin: Math.SQRT1_2, carre: 1, tri: Math.sqrt(1 / 3) }[p.wave]; const rmsAC = p.A * k;
  return { T: 1 / p.f, f: p.f, max: p.off + p.A, min: p.off - p.A, pp: 2 * p.A, mean: p.off, rmsAC, rms: Math.sqrt(p.off * p.off + rmsAC * rmsAC), shape: ['sin', 'carre', 'tri'].indexOf(p.wave) };
}
regScenario({
  id: 'signaux', cat: '1 · Lois fondamentales', diff: 2, title: 'Signaux périodiques : GBF, oscilloscope et multimètre', level: 'Bac Pro CIEL (première)', duration: '1 h 15', variants: 4, variantLabel: '↻ Autre signal', settle: 0.03,
  refs: 'Signaux périodiques ; période, fréquence ; valeur moyenne, valeur efficace ; oscilloscope',
  desc: 'Un générateur délivre un signal <b>inconnu</b> (réglages masqués). À l\'aide de l\'oscilloscope et du multimètre, caractérisez-le complètement : forme, période, fréquence, valeurs crête, moyenne et efficace.',
  objectives: ['Régler correctement un oscilloscope (sensibilités, base de temps, déclenchement)', 'Mesurer T, f, V<sub>max</sub>, V<sub>min</sub>, V<sub>pp</sub>', 'Distinguer valeur moyenne (V⎓) et valeur efficace alternative (V∿)'],
  steps: ['Câblez l\'oscilloscope : CH1 aux bornes de R1 (sortie GBF), GND à la masse. Utilisez « Auto » pour obtenir une image stable puis affinez les réglages.', 'Relevez la forme du signal, sa période T et sa fréquence f = 1/T.', 'Relevez V<sub>max</sub>, V<sub>min</sub> et V<sub>pp</sub>. Déduisez l\'amplitude et la valeur moyenne (composante continue).', 'Câblez MM1 (V⎓) puis MM2 (V∿) aux bornes de R1 et comparez avec l\'oscilloscope.', 'Cliquez « ↻ Autre signal » pour recommencer avec un autre signal.'],
  questions: [
    { q: 'Forme du signal', type: 'choice', options: ['Sinusoïdale', 'Carrée', 'Triangulaire'], correct: c => sigStats(c.part('GBF1').p).shape },
    { q: 'Période T (en ms)', answer: c => sigStats(c.part('GBF1').p).T * 1000, tol: 0.05, unit: 'ms' },
    { q: 'Fréquence f (en Hz)', answer: c => sigStats(c.part('GBF1').p).f, tol: 0.05, unit: 'Hz' },
    { q: 'Tension maximale V<sub>max</sub> (en V)', answer: c => sigStats(c.part('GBF1').p).max, tol: 0.06, unit: 'V' },
    { q: 'Tension crête à crête V<sub>pp</sub> (en V)', answer: c => sigStats(c.part('GBF1').p).pp, tol: 0.06, unit: 'V' },
    { q: 'Valeur moyenne du signal (en V) — lue en V⎓', answer: c => sigStats(c.part('GBF1').p).mean, tol: 0.06, abs: 0.08, unit: 'V' },
    { q: 'Valeur efficace de la composante alternative, lue en V∿ (en V)', answer: c => sigStats(c.part('GBF1').p).rmsAC, tol: 0.06, unit: 'V' },
  ],
  build(c, o) {
    const L = mk(c); const s = SIG[o.variant % SIG.length]; L.p('gbf', 'GBF1', 100, 160, Object.assign({ duty: 50, hidden: true }, s)); R(L, 'R1', 300, 180, 1000, 90); L.p('ground', 'GND1', 200, 320);
    L.p('scope', 'OSC1', 640, 200, { tdiv: 1e-3, v1: 1, v2: 1, on1: true, on2: false, trig: 0, src: 1 }); L.p('multimeter', 'MM1', 820, 170, { mode: 'VDC' }); L.p('multimeter', 'MM2', 960, 170, { mode: 'VAC' });
    const jg = L.j(200, 260); L.w('GBF1', 'OUT', 'R1', 'A'); L.wj('R1', 'B', jg, [[300, 260]]); L.wj('GBF1', 'GND', jg, [[200, 180]]); L.wj('GND1', 'G', jg);
  },
  solve(c) { const L = mk(c); L.w('OSC1', 'CH1', 'R1', 'A'); L.w('OSC1', 'GND', 'GND1', 'G'); L.w('MM1', 'V/Ω/A', 'R1', 'A'); L.w('MM1', 'COM', 'R1', 'B'); L.w('MM2', 'V/Ω/A', 'R1', 'A'); L.w('MM2', 'COM', 'R1', 'B'); },
  checks: [
    { label: 'Oscilloscope câblé sur la sortie du GBF (CH1) et à la masse', run: c => c.scopeWired('', ['R1', 'A'], null) },
    { label: 'Un voltmètre V⎓ est câblé aux bornes de R1', run: c => c.voltmeterAcross('R1', 'A', 'R1', 'B') },
    { label: 'Un voltmètre V∿ est câblé aux bornes de R1', run: c => c.voltmeterAcross('R1', 'A', 'R1', 'B', true) }],
  correction: v => { const s = sigStats(SIG[v % SIG.length]); const nm = { sin: 'sinusoïdal', carre: 'carré', tri: 'triangulaire' }[SIG[v % SIG.length].wave]; return `<p>Signal <b>${nm}</b> : f = ${s.f} Hz (T = ${(s.T * 1000).toPrecision(3)} ms) ; V<sub>max</sub> = ${s.max} V ; V<sub>min</sub> = ${s.min} V ; V<sub>pp</sub> = ${s.pp} V ; valeur moyenne = ${s.mean} V ; valeur efficace de la partie alternative = ${s.rmsAC.toFixed(3)} V.</p><p>Rappel : sinus V<sub>eff</sub> = V<sub>max</sub>/√2 ; carré V<sub>eff</sub> = V<sub>max</sub> ; triangle V<sub>eff</sub> = V<sub>max</sub>/√3. Le multimètre en V⎓ affiche la valeur moyenne ; en V∿ (RMS vrai) la valeur efficace de la composante alternative.</p>`; },
});
NS.sigStats = sigStats;

/* ============================================================ A9 — Filtre RC passe-bas */
regScenario({
  id: 'filtre', cat: '1 · Lois fondamentales', diff: 3, title: 'Filtre RC passe-bas : gain et fréquence de coupure', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', settle: 0.03,
  refs: 'Filtrage ; réponse en fréquence ; fréquence de coupure ; oscilloscope',
  desc: 'Un signal sinusoïdal de 1 V crête traverse un filtre RC (R = 1,6 kΩ, C = 100 nF). Relevez le gain G = V<sub>s</sub>/V<sub>e</sub> pour plusieurs fréquences et déterminez la fréquence de coupure à −3 dB.',
  objectives: ['Mesurer l\'amplitude d\'entrée et de sortie à l\'oscilloscope', 'Tracer (ou noter) le gain en fonction de la fréquence', 'Trouver f<sub>c</sub> (gain = 0,707) et la comparer à 1/(2πRC)'],
  steps: ['Câblez CH1 sur l\'entrée (sortie GBF), CH2 sur la sortie (aux bornes de C1), GND à la masse.', 'Pour f = 100 Hz, 500 Hz, 1 kHz, 2 kHz, 5 kHz, 10 kHz : réglez le GBF (double-clic), relevez V<sub>e</sub> et V<sub>s</sub> (crête à crête) et calculez G = V<sub>s</sub>/V<sub>e</sub>.', 'Trouvez par essais la fréquence où G = 0,707 : c\'est f<sub>c</sub>.', 'Observez le déphasage entre les deux voies à f<sub>c</sub> (≈ 45°, sortie en retard).'],
  questions: [
    { q: 'Fréquence de coupure théorique 1/(2πRC) (en Hz)', answer: c => 1 / (2 * Math.PI * c.el('R1').value() * c.el('C1').params().C), tol: 0.05, unit: 'Hz' },
    { q: 'Gain mesuré à f = 100 Hz (en valeur, sans unité)', answer: c => { const f = 100, w = 2 * Math.PI * f, RC = c.el('R1').value() * c.el('C1').params().C; return 1 / Math.sqrt(1 + (w * RC) ** 2); }, tol: 0.06 },
    { q: 'Gain à f = 10 kHz (sans unité)', answer: c => { const f = 1e4, w = 2 * Math.PI * f, RC = c.el('R1').value() * c.el('C1').params().C; return 1 / Math.sqrt(1 + (w * RC) ** 2); }, tol: 0.1, abs: 0.01 },
    { q: 'Ce filtre laisse passer…', type: 'choice', options: ['Les basses fréquences (passe-bas)', 'Les hautes fréquences (passe-haut)', 'Une bande étroite (passe-bande)', 'Toutes les fréquences'], correct: 0 },
    { q: 'Au-delà de f<sub>c</sub>, chaque fois que la fréquence est multipliée par 10, le gain est divisé par environ…', type: 'choice', options: ['2', '10', '100', '1,4'], correct: 1 },
  ],
  build(c) {
    const L = mk(c); L.p('gbf', 'GBF1', 100, 160, { wave: 'sin', f: 1000, A: 1, off: 0, duty: 50 }); R(L, 'R1', 300, 140, 1600); L.p('capacitor', 'C1', 440, 180, { C: 1e-7, Vmax: 50, esr: 0.01, pol: false, tol: 10 }, 90); L.p('ground', 'GND1', 200, 320);
    L.p('scope', 'OSC1', 680, 200, { tdiv: 5e-4, v1: 0.5, v2: 0.5, on1: true, on2: true, trig: 0, src: 1 });
    const jg = L.j(200, 260); L.w('GBF1', 'OUT', 'R1', 'A'); L.w('R1', 'B', 'C1', 'A'); L.wj('C1', 'B', jg, [[440, 260]]); L.wj('GBF1', 'GND', jg, [[200, 180]]); L.wj('GND1', 'G', jg);
  },
  solve(c) { const L = mk(c); L.w('OSC1', 'CH1', 'R1', 'A'); L.w('OSC1', 'CH2', 'C1', 'A'); L.w('OSC1', 'GND', 'GND1', 'G'); },
  checks: [{ label: 'Oscilloscope câblé : CH1 entrée, CH2 sortie (C1), GND masse', run: c => c.scopeWired('', ['R1', 'A'], ['C1', 'A']) }, { label: 'Les deux voies sont affichées', run: c => c.part('OSC1').p.on1 && c.part('OSC1').p.on2 }],
  correction: '<p>f<sub>c</sub> = 1/(2πRC) = 1/(2π × 1600 × 100 nF) ≈ <b>995 Hz</b>. Gain théorique G = 1/√(1+(f/f<sub>c</sub>)²) : 0,995 à 100 Hz ; 0,707 à f<sub>c</sub> ; ≈ 0,1 à 10 kHz. Pente : −20 dB/décade (le gain est divisé par 10 quand f est multipliée par 10, au-delà de f<sub>c</sub>). Déphasage −45° à f<sub>c</sub>.</p>',
});
})(typeof window !== 'undefined' ? window : globalThis);
