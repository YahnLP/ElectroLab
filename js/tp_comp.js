/* tp_comp.js — TP « Composants » : test hors tension, zener, transistor en commutation, relais */
(function (g) {
'use strict';
const NS = g.NS; const { mk, near, regScenario } = NS;
const R = (L, ref, x, y, v, rot, ex) => L.p('resistor', ref, x, y, Object.assign({ R: v, tol: 5, W: 0.25 }, ex || {}), rot);
const noBurn = { label: 'Aucun composant n\'est détruit', run: c => c.anyBurnt().length === 0 };
const vfTest = (m, I) => { const p = NS.LIB.DIODES[m] || NS.LIB.LEDS[m]; let v = p.n * NS.VT * Math.log(I / p.Is + 1) + I * p.Rs; return v; };

/* ============================================================ B1 — Test des composants */
regScenario({
  id: 'test', cat: '2 · Composants', diff: 2, title: 'Tester les composants hors tension (ohmmètre, diode, continuité)', level: 'Bac Pro CIEL (seconde)', duration: '1 h', variants: 2, variantLabel: '↻ Autre fusible', settle: 0.3,
  refs: 'Composants passifs et actifs ; mesure de résistance ; test de diode ; contrôle de continuité ; maintenance',
  desc: 'Sur la paillasse : une résistance, une diode 1N4007, une LED, un transistor NPN et un fusible. Aucun n\'est alimenté. Avec le multimètre seul, vérifiez l\'état de chaque composant. <b>On mesure toujours hors tension !</b>',
  objectives: ['Mesurer une résistance à l\'ohmmètre et la comparer à sa valeur nominale (tolérance)', 'Tester une diode dans les deux sens : tension de seuil et blocage', 'Contrôler un fusible à l\'aide du mode « continuité » (bip)', 'Vérifier les jonctions base-émetteur et base-collecteur d\'un transistor'],
  steps: ['Mesurez R1 à l\'ohmmètre. Est-elle dans sa tolérance ?', 'Mode « Test diode » : placez le « + » (V/Ω/A) sur l\'anode de D1, le COM sur la cathode : relevez V<sub>F</sub>. Inversez : que lit-on (« OL » = circuit ouvert) ?', 'Même test pour la LED D2 : la LED s\'allume-t-elle faiblement ?', 'Contrôlez le fusible F1 en continuité : bip ou pas de bip ?', 'Transistor Q1 : testez les jonctions B–E et B–C (comme deux diodes) puis C–E (bloqué dans les deux sens).'],
  questions: [
    { q: 'Valeur de R1 mesurée à l\'ohmmètre (en Ω)', answer: c => c.el('R1').value(), tol: 0.03, unit: 'Ω' },
    { q: 'Tension de seuil de D1 au testeur de diode, sens passant (en V)', answer: c => vfTest('1N4007', 1e-3), tol: 0.08, unit: 'V' },
    { q: 'Tension de seuil de la LED D2 au testeur de diode (en V)', answer: c => vfTest('LED rouge', 1e-3), tol: 0.08, unit: 'V' },
    { q: 'Le fusible F1 est…', type: 'choice', options: ['En bon état', 'Grillé (coupé)'], correct: c => (c.part('F1').fault === 'blown' ? 1 : 0) },
    { q: 'Tension V<sub>BE</sub> du transistor au testeur de diode (B vers E, en V)', answer: c => vfTest('1N4007', 1e-3) * 0.97, tol: 0.15, unit: 'V' },
    { q: 'Au testeur de diode, une diode saine dans le sens bloqué affiche…', type: 'choice', options: ['0,6 V', '0 V', '« OL » (circuit ouvert)', 'Un bip continu'], correct: 2 },
  ],
  build(c, o) {
    const L = mk(c); R(L, 'R1', 160, 140, 3300, 0, { tol: 5 }); L.p('diode', 'D1', 360, 140, { model: '1N4007' }); L.p('led', 'D2', 560, 140, { model: 'LED rouge' }); L.p('fuse', 'F1', 160, 280, { I: 0.5, fast: true });
    L.p('bjt', 'Q1', 400, 280, { model: 'BC547B' }); L.p('multimeter', 'MM1', 760, 240, { mode: 'Ohm' });
    if (o.variant === 1) c.byRef('F1').fault = 'blown';
  },
  solve(c) { const L = mk(c); const m = c.byRef('MM1'); m.p.mode = 'Diode'; L.w('MM1', 'V/Ω/A', 'D1', 'A'); L.w('MM1', 'COM', 'D1', 'K'); },
  checks: [
    { label: 'Le multimètre est câblé sur un composant hors tension', run: c => c.meters().some(m => m.a !== m.b) },
    { label: 'Le mode « test diode » est utilisé sur D1 (anode sur +)', run: c => c.meters().some(m => m.mode === 'Diode' && m.a === c.net('D1', 'A') && m.b === c.net('D1', 'K')) }, noBurn],
  correction: '<p>Ohmmètre : 3,3 kΩ ± 5 % (3135 à 3465 Ω). Diode 1N4007 : V<sub>F</sub> ≈ 0,55–0,6 V à 1 mA dans le sens anode → cathode ; « OL » dans l\'autre. LED rouge : ≈ 1,6–1,7 V et elle s\'éclaire faiblement. Fusible : continuité (bip) = sain ; pas de bip = <b>grillé</b>. Transistor NPN : B→E et B→C se comportent comme des diodes (≈ 0,6 V) ; C–E est bloqué dans les deux sens.</p><p>⚠ Un composant se teste <b>hors tension</b> et si possible dessoudé d\'un côté : sinon les autres composants fausseront la mesure.</p>',
});

/* ============================================================ B2 — Zener */
regScenario({
  id: 'zener', cat: '2 · Composants', diff: 3, title: 'Diode Zener : stabilisation de tension', level: 'Bac Pro CIEL (première)', duration: '1 h 15', settle: 0.5,
  refs: 'Diode Zener ; régulation de tension ; résistance série ; puissance maximale',
  desc: 'On veut alimenter une charge sous 5,1 V à partir d\'une alimentation de 12 V avec une diode Zener BZX55C5V1 (0,5 W) et une résistance série R<sub>S</sub>. Dimensionnez R<sub>S</sub> de façon à garder un courant Zener d\'environ 15 mA.',
  objectives: ['Reconnaître le fonctionnement d\'une Zener en inverse (claquage contrôlé)', 'Calculer R<sub>S</sub> = (E − V<sub>Z</sub>) / (I<sub>Z</sub> + I<sub>charge</sub>)', 'Vérifier que la puissance dissipée reste < 0,5 W', 'Observer l\'effet d\'une variation de la tension d\'entrée'],
  steps: ['Mesurez V<sub>Z</sub> aux bornes de la Zener avec R<sub>S</sub> = 1 kΩ. Quel est le courant dans la Zener ?', 'La charge R<sub>L</sub> = 1 kΩ absorbe I<sub>L</sub> ≈ 5 mA. Calculez R<sub>S</sub> pour I<sub>Z</sub> ≈ 15 mA.', 'Remplacez R<sub>S</sub> par la valeur E12 la plus proche ; vérifiez I<sub>Z</sub> (ampèremètre en série avec la Zener) et la puissance.', 'Faites varier E de 10 à 14 V : la tension de sortie varie-t-elle beaucoup ?'],
  questions: [
    { q: 'Tension Zener V<sub>Z</sub> mesurée (en V)', answer: c => c.vd('DZ1', 'K', 'DZ1', 'A'), tol: 0.06, unit: 'V' },
    { q: 'Courant dans la charge I<sub>L</sub> = V<sub>Z</sub> / R<sub>L</sub> (en mA)', answer: c => c.vd('RL', 'A', 'RL', 'B') / c.el('RL').value() * 1000, tol: 0.08, unit: 'mA' },
    { q: 'Résistance R<sub>S</sub> théorique pour I<sub>Z</sub> = 15 mA (en Ω)', answer: () => (12 - 5.1) / 0.020, tol: 0.1, unit: 'Ω' },
    { q: 'Valeur E12 à choisir (en Ω)', answer: () => 330, tol: 0.01, unit: 'Ω' },
    { q: 'Puissance dissipée par la Zener avec cette valeur (en mW)', answer: c => Math.abs(c.vd('DZ1', 'K', 'DZ1', 'A') * c.I('DZ1')) * 1000, tol: 0.2, unit: 'mW' },
    { q: 'Que se passe-t-il si la charge est débranchée (R<sub>L</sub> infinie) ?', type: 'choice', options: ['Rien : la Zener absorbe tout le courant (I<sub>Z</sub> augmente)', 'La tension de sortie double', 'La Zener se bloque', 'R<sub>S</sub> chauffe moins'], correct: 0 },
  ],
  build(c) {
    const L = mk(c); L.p('psu', 'AL1', 100, 160, { V: 12, Ilim: 0.2 }); R(L, 'RS', 300, 140, 1000, 0, { W: 0.5 }); L.p('zener', 'DZ1', 480, 200, { model: 'BZX55C5V1' }, 90); R(L, 'RL', 600, 200, 1000, 90);
    L.p('ground', 'GND1', 200, 320); L.p('multimeter', 'MM1', 760, 240, { mode: 'VDC' }); L.p('multimeter', 'MM2', 940, 240, { mode: 'mA' });
    const jn = L.j(200, 280), j2 = L.j(480, 140), j3 = L.j(480, 280); L.w('AL1', '+', 'RS', 'A'); L.wj('RS', 'B', j2); L.wj('DZ1', 'K', j2); L.wj('RL', 'A', j2, [[600, 140]]); L.wj('DZ1', 'A', j3); L.wj('RL', 'B', j3, [[600, 280]]);
    L.jj(j3, jn); L.wj('AL1', '−', jn, [[200, 180]]); L.wj('GND1', 'G', jn);
  },
  solve(c) { const L = mk(c); const r = c.byRef('RS'); r.p.R = 330; r.p.W = 1; L.w('MM1', 'V/Ω/A', 'DZ1', 'K'); L.w('MM1', 'COM', 'DZ1', 'A'); },
  checks: [
    { label: 'Courant Zener entre 8 mA et 30 mA', run: c => { const I = Math.abs(c.I('DZ1')); return I > 0.008 && I < 0.03; } },
    { label: 'R<sub>S</sub> est une valeur E12', run: c => near(NS.nearestE(c.part('RS').p.R, NS.E12), c.part('RS').p.R, 0.005) },
    { label: 'Tension de sortie 5,1 V ± 5 %', run: c => near(c.vd('RL', 'A', 'RL', 'B'), 5.1, 0.07) },
    { label: 'Un voltmètre est câblé aux bornes de la Zener', run: c => c.voltmeterAcross('DZ1', 'K', 'DZ1', 'A') },
    { label: 'Aucun composant détruit (P<sub>Z</sub> < 0,5 W, P<sub>RS</sub> OK)', run: c => c.anyBurnt().length === 0 }],
  correction: '<p>La Zener polarisée en <b>inverse</b> impose V<sub>Z</sub> = 5,1 V tant que I<sub>Z</sub> reste dans sa plage. I<sub>RS</sub> = I<sub>Z</sub> + I<sub>L</sub> = 15 + 5 = 20 mA → R<sub>S</sub> = (12 − 5,1)/20 mA = 345 Ω → <b>330 Ω</b> (E12). P<sub>Z</sub> = V<sub>Z</sub>·I<sub>Z</sub> ≈ 100 mW < 0,5 W. P<sub>RS</sub> = R·I² ≈ 0,15 W. Si E varie de 10 à 14 V, V<sub>S</sub> ne varie que de quelques dizaines de mV : c\'est la stabilisation.</p>',
});

/* ============================================================ B3 — Transistor en commutation */
regScenario({
  id: 'transistor', cat: '2 · Composants', diff: 3, title: 'Transistor bipolaire en commutation', level: 'Bac Pro CIEL (première)', duration: '1 h 30', settle: 0.4,
  refs: 'Transistor bipolaire NPN ; régime bloqué / saturé ; gain en courant ; résistance de base ; commande de charge',
  desc: 'Un transistor BC547B doit allumer une LED (15 mA) commandée par un signal logique 5 V à travers une résistance de base R<sub>B</sub>. Actuellement R<sub>B</sub> = 470 kΩ : la LED brille à peine car le transistor n\'est pas saturé. Calculez R<sub>B</sub> pour une vraie commutation.',
  objectives: ['Distinguer les régimes bloqué, linéaire et saturé', 'Mesurer I<sub>B</sub>, I<sub>C</sub>, V<sub>BE</sub>, V<sub>CE</sub> et le gain β = I<sub>C</sub>/I<sub>B</sub>', 'Calculer R<sub>B</sub> pour saturer : I<sub>B</sub> ≥ 3·I<sub>C</sub>/β', 'Vérifier V<sub>CE sat</sub> < 0,3 V'],
  steps: ['Interrupteur SW1 fermé, mesurez V<sub>BE</sub> et V<sub>CE</sub> (voltmètre), I<sub>C</sub> (ampèremètre dans la branche LED) puis I<sub>B</sub> avec R<sub>B</sub> = 470 kΩ : le transistor est en régime <b>linéaire</b> (β·I<sub>B</sub> = I<sub>C</sub>).', 'I<sub>C</sub> voulu = 15 mA ; β<sub>min</sub> ≈ 200 : calculez I<sub>B</sub> avec un coefficient de sur-saturation de 3.', 'Calculez R<sub>B</sub> = (5 − 0,7)/I<sub>B</sub> et choisissez une valeur E12 ; remplacez R<sub>B</sub>.', 'Vérifiez V<sub>CE</sub> ≈ 0,1 V (saturé) et la LED à pleine luminosité.'],
  questions: [
    { q: 'Avec R<sub>B</sub> = 470 kΩ : courant de base I<sub>B</sub> (en µA)', answer: () => (5 - 0.69) / 470e3 * 1e6, tol: 0.15, unit: 'µA', hint: 'Mesuré avant de modifier R<sub>B</sub>.' },
    { q: 'Courant de base nécessaire pour saturer : I<sub>B</sub> = 3·I<sub>C</sub>/β avec I<sub>C</sub> = 15 mA, β = 200 (en µA)', answer: () => 225, tol: 0.1, unit: 'µA' },
    { q: 'R<sub>B</sub> théorique = (5 − 0,7)/I<sub>B</sub> (en kΩ)', answer: () => (5 - 0.7) / 225e-6 / 1000, tol: 0.1, unit: 'kΩ' },
    { q: 'Valeur E12 retenue (en kΩ)', answer: () => 18, tol: 0.01, unit: 'kΩ', hint: 'Prenez la valeur E12 ≤ calcul (18 ou 15 kΩ conviennent ; valeur la plus proche : 18).' },
    { q: 'Tension V<sub>CE</sub> du transistor saturé (en V)', answer: c => Math.abs(c.vd('Q1', 'C', 'Q1', 'E')), tol: 0.5, unit: 'V', hint: 'Valeur attendue ≈ 0,1 V.' },
    { q: 'Un transistor saturé se comporte comme…', type: 'choice', options: ['Un interrupteur fermé (V<sub>CE</sub> ≈ 0,1 V)', 'Un interrupteur ouvert', 'Une résistance de 1 MΩ', 'Une source de courant constant'], correct: 0 },
  ],
  build(c) {
    const L = mk(c); L.p('psu', 'AL1', 100, 160, { V: 5, Ilim: 0.2 }); L.p('switch', 'SW1', 280, 140, { closed: true }); R(L, 'RB', 440, 140, 470000, 0); R(L, 'RC', 600, 100, 220, 90); L.p('led', 'D1', 600, 200, { model: 'LED rouge' }, 90);
    L.p('bjt', 'Q1', 560, 340, { model: 'BC547B' }); L.p('ground', 'GND1', 200, 460);
    L.p('multimeter', 'MM1', 800, 240, { mode: 'VDC' }); L.p('multimeter', 'MM2', 980, 240, { mode: 'mA' });
    const jn = L.j(200, 420), jv = L.j(360, 80); L.w('AL1', '+', 'SW1', 'A'); L.w('SW1', 'B', 'RB', 'A'); L.w('RB', 'B', 'Q1', 'B'); L.wj('AL1', '+', jv, [[360, 140]]); L.wj('RC', 'A', jv, [[600, 80]]);
    L.w('RC', 'B', 'D1', 'A'); L.w('D1', 'K', 'Q1', 'C'); L.wj('Q1', 'E', jn, [[580, 420]]); L.wj('AL1', '−', jn, [[200, 180]]); L.wj('GND1', 'G', jn);
  },
  solve(c) { const L = mk(c); c.byRef('RB').p.R = 18000; L.w('MM1', 'V/Ω/A', 'Q1', 'C'); L.w('MM1', 'COM', 'Q1', 'E'); },
  checks: [
    { label: 'Le transistor est saturé (V<sub>CE</sub> < 0,3 V)', run: c => Math.abs(c.vd('Q1', 'C', 'Q1', 'E')) < 0.3 },
    { label: 'Courant dans la LED entre 10 et 20 mA', run: c => { const I = Math.abs(c.I('D1')); return I > 0.01 && I < 0.02; } },
    { label: 'R<sub>B</sub> est une valeur E12 comprise entre 4,7 kΩ et 33 kΩ', run: c => { const v = c.part('RB').p.R; return v >= 4700 && v <= 33000 && near(NS.nearestE(v, NS.E12), v, 0.005); } },
    { label: 'Un voltmètre mesure V<sub>CE</sub>', run: c => c.voltmeterAcross('Q1', 'C', 'Q1', 'E') }, noBurn],
  correction: '<p>I<sub>C</sub> = 15 mA, β<sub>min</sub> = 200 : I<sub>B(min)</sub> = 75 µA ; avec un coefficient de sur-saturation 3 → I<sub>B</sub> = 225 µA. R<sub>B</sub> = (5 − 0,7)/225 µA = 19 kΩ → <b>18 kΩ</b> (E12). Avec 470 kΩ : I<sub>B</sub> = 9 µA, le transistor fonctionne en <b>régime linéaire</b> (I<sub>C</sub> = β·I<sub>B</sub> ≈ 3 mA) : la LED brille peu et V<sub>CE</sub> est élevée (le transistor chauffe). Saturé, V<sub>CE sat</sub> ≈ 0,1 V : c\'est un interrupteur fermé.</p>',
});

/* ============================================================ B4 — Relais et diode de roue libre */
regScenario({
  id: 'relais', cat: '2 · Composants', diff: 3, title: 'Relais commandé par transistor : la diode de roue libre', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', settle: 0.5,
  refs: 'Relais électromécanique ; charge inductive ; surtension de coupure ; diode de roue libre ; commande de puissance',
  desc: 'Un relais 5 V commande une lampe 12 V. Le relais est piloté par un transistor lui-même commandé par un bouton. Sans protection, la coupure du courant dans la bobine provoque une <b>forte surtension</b> qui peut détruire le transistor. Observez-la à l\'oscilloscope et corrigez avec une diode de roue libre.',
  objectives: ['Mettre en œuvre un relais (bobine / contacts NO, COM, NC)', 'Observer la surtension à l\'ouverture d\'une charge inductive (u = −L·di/dt)', 'Placer une diode de roue libre en parallèle avec la bobine (cathode côté +)', 'Vérifier la protection du transistor'],
  steps: ['Fermez SW1 : le relais colle, la lampe s\'allume. Mesurez la tension de bobine et le courant (≈ 70 mA).', 'Placez la sonde CH1 sur le collecteur du transistor. Ouvrez SW1 en regardant la trace (mode « Run » / Auto) : relevez la surtension maximale.', 'Ajoutez une diode D1 (1N4148) en parallèle sur la bobine, <b>cathode vers le +5 V</b>. Refaites l\'essai.', 'Comparez les deux mesures et expliquez le rôle de D1.'],
  questions: [
    { q: 'Courant de bobine à l\'état collé, ordre de grandeur (en mA)', answer: c => 70, tol: 0.3, unit: 'mA' },
    { q: 'Sans diode, la tension au collecteur à l\'ouverture dépasse la tension d\'alimentation de…', type: 'choice', options: ['Rien du tout', 'Quelques dizaines de volts : surtension destructrice', 'Exactement 0,7 V', 'Elle devient négative de −0,7 V'], correct: 1 },
    { q: 'Avec la diode de roue libre, la tension au collecteur monte au maximum à… (en V, ≈ 5 + 0,7)', answer: () => 5.7, tol: 0.1, unit: 'V' },
    { q: 'Comment doit-on brancher la diode de roue libre ?', type: 'choice', options: ['Cathode côté + de la bobine, anode côté transistor', 'Anode côté +, cathode côté transistor', 'En série avec la bobine', 'Peu importe'], correct: 0 },
  ],
  build(c) {
    const L = mk(c); L.p('battery', 'G1', 100, 200, { V: 5, Ri: 0.2 }, 270); L.p('switch', 'SW1', 300, 360, { closed: false }); R(L, 'RB', 460, 360, 2200, 0); L.p('bjt', 'Q1', 600, 340, { model: 'BC547B' });
    L.p('relay', 'K1', 760, 200, { V: 5, Rc: 70, L: 0.2 }); L.p('ground', 'GND1', 400, 520);
    L.p('battery', 'G2', 940, 260, { V: 12, Ri: 0.5 }, 270); L.p('lamp', 'LP1', 1100, 260, { V: 12, P: 5 }, 90);
    L.p('scope', 'OSC1', 520, 480, { tdiv: 2e-3, v1: 10, v2: 5, on1: true, on2: false, trig: 7, src: 1, edge: 'up' });
    const jn = L.j(400, 460);
    L.w('K1', 'C1', 'G1', '+'); L.w('K1', 'C2', 'Q1', 'C'); L.w('G1', '+', 'SW1', 'A'); L.w('SW1', 'B', 'RB', 'A'); L.w('RB', 'B', 'Q1', 'B');
    L.wj('Q1', 'E', jn, [[620, 460]]); L.wj('G1', '−', jn, [[100, 460]]); L.wj('GND1', 'G', jn);
    L.w('G2', '+', 'K1', 'COM'); L.w('K1', 'NO', 'LP1', 'A'); L.w('LP1', 'B', 'G2', '−'); L.w('G2', '−', 'GND1', 'G');
  },
  solve(c) { const L = mk(c); c.byRef('SW1').p.closed = false; c.parts.push; const d = c.add('diode', 700, 100, { model: '1N4148' }, 'D1'); d.rot = 90; L.w('D1', 'K', 'K1', 'C1'); L.w('D1', 'A', 'K1', 'C2'); },
  checks: [
    { label: 'Une diode est placée en parallèle sur la bobine', run: c => c.part('D1') && c.net('D1', 'A') === c.net('K1', 'C2') && c.net('D1', 'K') === c.net('K1', 'C1') },
    { label: 'Le transistor Q1 survit à l\'ouverture du circuit (simulation de coupure)', run: c => { const sw = c.part('SW1'); sw.p.closed = true; c.sim.dirty = true; c.settle(0.3); sw.p.closed = false; c.sim.dirty = true; c.settle(0.3); return !c.part('Q1').burnt; } },
    { label: 'Le relais commande bien la lampe (SW1 fermé)', run: c => { c.part('SW1').p.closed = true; c.sim.dirty = true; c.settle(0.4); return Math.abs(c.I('LP1')) > 0.1; } }],
  correction: '<p>La bobine du relais est une <b>inductance</b> : à l\'ouverture du transistor, di/dt devient très grand et u = −L·di/dt crée une surtension de plusieurs dizaines de volts sur le collecteur (le BC547 supporte 45 V). Une <b>diode de roue libre</b> (cathode côté +) offre au courant de la bobine un chemin : la tension est limitée à V<sub>CC</sub> + 0,7 V et l\'énergie s\'évacue dans la résistance de la bobine.</p>',
});
})(typeof window !== 'undefined' ? window : globalThis);
