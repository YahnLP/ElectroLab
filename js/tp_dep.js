/* tp_dep.js — TP « Dépannage » : méthode (symptôme → hypothèses → mesures → localisation → réparation → contrôle) */
(function (g) {
'use strict';
const NS = g.NS; const { mk, near, regScenario } = NS;
const R = (L, ref, x, y, v, rot, ex) => L.p('resistor', ref, x, y, Object.assign({ R: v, tol: 5, W: 0.25 }, ex || {}), rot);
const METHODE = '<p><b>Méthode de dépannage :</b> 1) constater le symptôme ; 2) formuler des hypothèses ; 3) mesurer en remontant la chaîne fonctionnelle (secteur → transformateur → redresseur → filtrage → régulation → charge) ; 4) localiser le composant défectueux ; 5) <b>chercher la cause</b> avant de remplacer ; 6) remplacer ; 7) contrôler le fonctionnement complet.</p><p><b>⚠ Sécurité :</b> alimentation secteur : on ne touche jamais le montage sous tension ; on coupe le secteur (interrupteur « actif » du secteur dans l\'inspecteur), on attend la décharge des condensateurs, puis on mesure à l\'ohmmètre / au testeur de diode <i>hors tension</i>.</p>';
const cut = (c, ra, pa, rb, pb) => NS.cutWire(c, ra, pa, rb, pb);

/* ============================================================ D1 — alimentation 5 V en panne */
const PANNES = [
  { ref: 'F1', fault: 'blown', nature: 0, sortie: 0, sym: 'Aucune tension en sortie, rien ne chauffe.', info: 'F1 fondu (vieillissement / surtension passée)' },
  { ref: 'D2', fault: 'open', nature: 0, sortie: 1, sym: 'La sortie est à 5 V mais la tension de C1 est fortement ondulée à 50 Hz ; le transformateur ronfle.', info: 'D2 ouverte : le pont ne redresse plus qu\'une alternance sur deux' },
  { ref: 'C1', fault: 'dried', nature: 2, sortie: 1, sym: 'Tension de sortie bruyante, ondulation anormale en entrée du régulateur.', info: 'C1 électrolytique séché (capacité effondrée, ESR élevée)' },
  { ref: 'U1', fault: 'dead', nature: 0, sortie: 0, sym: 'Pas de tension en sortie ; en amont du régulateur la tension est normale.', info: 'U1 (7805) hors service (coupé)' },
  { ref: 'U1', fault: 'short', nature: 1, sortie: 2, sym: 'Tension de sortie beaucoup trop élevée : danger pour le montage alimenté !', info: 'U1 en court-circuit entrée-sortie' },
  { ref: 'D1', fault: 'short', nature: 1, sortie: 0, sym: 'Le fusible F1 est grillé. Plusieurs diodes du pont semblent en court-circuit. (À vous de trouver pourquoi.)', info: 'D1 s\'est mise en court-circuit, a court-circuité le secondaire à chaque alternance : D2 et F1 ont suivi (panne en cascade). Remplacer D1, D2 et F1.', also: ['D2', 'F1'], any: ['D1', 'D2'] },
  { ref: 'TR1', fault: 'openS', nature: 0, sortie: 0, sym: 'Aucune tension en sortie. Le fusible est bon.', info: 'Secondaire du transformateur coupé' },
];
const NATURES = ['Circuit ouvert / composant coupé', 'Court-circuit', 'Composant dégradé (dérive, vieillissement)'];
const SORTIES = ['0 V', '≈ 5 V mais avec une forte ondulation / un ronflement', '≈ 15–17 V (tension trop élevée)', '5 V stable (alimentation correcte)'];
regScenario({
  id: 'dep1', cat: '4 · Dépannage', diff: 3, title: 'Dépannage d\'une alimentation 5 V (7 pannes)', level: 'Bac Pro CIEL (terminale)', duration: '2 h', variants: 7, variantLabel: '↻ Autre panne', settle: 1.2,
  refs: 'Maintenance ; recherche de panne ; méthode de dépannage ; mesures au multimètre et à l\'oscilloscope ; sécurité électrique',
  faultInfo: v => PANNES[v % PANNES.length].info,
  desc: 'Une alimentation stabilisée 5 V / 110 mA (secteur → fusible → transformateur → pont → filtrage → régulateur 7805) ne fonctionne plus correctement. Le client décrit le symptôme. À vous de <b>localiser la panne</b>, de <b>proposer et réaliser le dépannage</b>, puis de <b>contrôler</b> le fonctionnement. La panne change à chaque « ↻ Autre panne ».',
  objectives: ['Appliquer une démarche de dépannage structurée', 'Mesurer en remontant la chaîne fonctionnelle (secteur → charge)', 'Utiliser ohmmètre, testeur de diode, voltmètre et oscilloscope pour localiser le défaut', 'Remplacer uniquement le composant défectueux et rechercher la cause', 'Contrôler le résultat'],
  steps: ['<b>Constat :</b> lisez le symptôme (« Sujet » / carnet). Mesurez la tension de sortie sur RL.', '<b>Hypothèses :</b> quels blocs peuvent expliquer ce symptôme ? Notez-les dans le carnet.', '<b>Caméra thermique :</b> activez « 🌡 Thermographie » (barre du haut) : un composant anormalement chaud (court-circuit, surcharge, électrolytique qui chauffe) se repère tout de suite, comme à la caméra thermique en maintenance. Attention : un composant déjà détruit refroidit ensuite.', '<b>Mesures :</b> avancez bloc par bloc : tension après F1, secondaire du transformateur (V∿), tension sur C1 (V⎓ + oscilloscope), entrée/sortie de U1. Les composants se testent hors tension à l\'ohmmètre ou au testeur de diode.', '<b>Localisation :</b> désignez le composant en cause dans la question ci-dessous.', '<b>Réparation :</b> remplacez-le (inspecteur → « Remplacer le composant ») puis remettez sous tension. Pensez à chercher la <i>cause</i> de la panne (un fusible qui saute n\'est jamais la cause ! Chaque remise sous tension sur un court-circuit échauffe le transformateur).', '<b>Contrôle :</b> 5 V stables, ondulation faible, aucun échauffement anormal.'],
  questions: [
    { q: 'Quelle est la tension de sortie constatée <b>avant</b> toute réparation ?', type: 'choice', options: SORTIES, correct: c => PANNES[c.tp.variant % PANNES.length].sortie },
    { q: 'Quel composant est défectueux ?', type: 'part', correct: c => { const f = PANNES[c.tp.variant % PANNES.length]; return f.any || f.ref; } },
    { q: 'Nature de la panne', type: 'choice', options: NATURES, correct: c => PANNES[c.tp.variant % PANNES.length].nature },
    { q: 'Décrivez votre démarche : mesures effectuées, conclusion, composant remplacé.', type: 'text' },
  ],
  build(c, o) {
    const L = NS.buildPSU(c, { RL: 47, RLW: 10 }); const f = PANNES[o.variant % PANNES.length];
    const p = c.byRef(f.ref); p.fault = f.fault;
    L.p('multimeter', 'MM1', 620, 440, { mode: 'VDC' }); L.p('scope', 'OSC1', 860, 440, { tdiv: 5e-3, v1: 5, v2: 1, on1: true, on2: false, trig: 0, src: 1 });
  },
  solve(c, ctx, v) { const f = PANNES[v % PANNES.length]; NS.replacePart(c.byRef(f.ref)); (f.also || []).forEach(r => NS.replacePart(c.byRef(r))); },
  checks: [
    { label: 'Tension de sortie 5 V ± 2 % sous charge', run: c => { const m = c.measure(() => c.v('U1', 'OUT'), 0.04, 200); return m.min > 4.9 && m.max < 5.1; } },
    { label: 'Ondulation à l\'entrée du régulateur inférieure à 0,8 V', run: c => c.measure(() => c.v('U1', 'IN'), 0.04, 200).pp < 0.8 },
    { label: 'Pont complet fonctionnel : ondulation faible (100 Hz) et tension de C1 ≈ 15 V', run: c => { const m = c.measure(() => c.v('U1', 'IN'), 0.08, 800); return m.pp < 0.8 && m.mean > 12; } },
    { label: 'Aucun composant détruit en cours de dépannage', run: c => c.anyBurnt().length === 0 },
    { label: 'Le composant défectueux a été remplacé', run: c => { const f = PANNES[c.tp.variant % PANNES.length]; return c.replaced(f.ref) >= 1; } },
    { label: 'Pas de remplacement inutile (on ne change que ce qui est défectueux)', run: c => { const f = PANNES[c.tp.variant % PANNES.length]; return c.c.parts.every(p => p.ref === f.ref || (f.also || []).includes(p.ref) || !(p.replaced > 0)); } },
  ],
  correction: '<p>Démarche : on remonte la chaîne. <b>F1 grillé</b> : tension nulle après F1 (mesure hors tension : ohmmètre ∞ sur F1). <b>D2 ouverte</b> : sur C1 on observe 50 Hz au lieu de 100 Hz. <b>C1 séché</b> : ondulation énorme, ESR haute. <b>U1 hors service</b> : 17 V à l\'entrée, 0 V à la sortie. <b>U1 en court-circuit</b> : 17 V en sortie. <b>D1 en court-circuit</b> : le secondaire est court-circuité à chaque alternance → F1 saute et D2 est détruite par la surintensité. Au testeur de diode D1 et D2 conduisent dans les deux sens : on remplace D1, D2 <i>et</i> F1, sinon le fusible resauterait aussitôt. <b>Secondaire coupé</b> : fusible bon, 230 V au primaire, 0 V au secondaire (le primaire se contrôle à l\'ohmmètre).</p><p>Attention : remettre un fusible sur un court-circuit non éliminé échauffe à chaque fois le transformateur (le fusible protège le câblage, pas le bobinage) ; au bout de quelques essais le primaire du transformateur est détruit. On ne remplace jamais un fusible sans avoir cherché la cause.</p><p>Contrôle final : 5,00 V en sortie, ondulation faible, boîtier de U1 tiède.</p>' + METHODE,
});

/* ============================================================ D2 — platine transistor + LED */
const NAT2 = ['Composant ouvert / coupé', 'Court-circuit', 'Connexion coupée (fil, soudure)'];
const P2 = [
  { ref: 'RB', fault: 'open', nature: 0, sym: 'La LED reste éteinte même interrupteur fermé. Le transistor est froid.', info: 'RB coupée' },
  { ref: 'Q1', fault: 'ce', nature: 1, sym: 'La LED reste allumée en permanence, interrupteur ouvert ou fermé.', info: 'Q1 collecteur-émetteur en court-circuit' },
  { ref: 'Q1', fault: 'be_open', nature: 0, sym: 'La LED reste éteinte. La tension de base est présente.', info: 'Jonction base-émetteur de Q1 ouverte' },
  { ref: 'D1', fault: 'open', nature: 0, sym: 'La LED reste éteinte ; le transistor conduit pourtant.', info: 'LED D1 coupée' },
  { ref: 'RC', fault: 'open', nature: 0, sym: 'La LED reste éteinte ; la base reçoit bien son courant.', info: 'RC coupée' },
  { ref: 'RB', cut: ['RB', 'B', 'Q1', 'B'], nature: 2, any: ['RB', 'Q1'], sym: 'La LED reste éteinte. Aucune tension n\'arrive sur la base.', info: 'Fil / soudure coupée entre RB et la base de Q1' },
];
function boardLED(c, o) {
  const L = mk(c); L.p('psu', 'AL1', 100, 160, { V: 5, Ilim: 0.3 }); L.p('switch', 'SW1', 280, 140, { closed: true }); R(L, 'RB', 440, 140, 18000, 0); R(L, 'RC', 600, 100, 220, 90); L.p('led', 'D1', 600, 200, { model: 'LED rouge' }, 90);
  L.p('bjt', 'Q1', 560, 340, { model: 'BC547B' }); L.p('ground', 'GND1', 200, 460); L.p('multimeter', 'MM1', 800, 240, { mode: 'VDC' });
  const jn = L.j(200, 420), jv = L.j(360, 80); L.w('AL1', '+', 'SW1', 'A'); L.w('SW1', 'B', 'RB', 'A'); L.w('RB', 'B', 'Q1', 'B'); L.wj('AL1', '+', jv, [[360, 140]]); L.wj('RC', 'A', jv, [[600, 80]]);
  L.w('RC', 'B', 'D1', 'A'); L.w('D1', 'K', 'Q1', 'C'); L.wj('Q1', 'E', jn, [[580, 420]]); L.wj('AL1', '−', jn, [[200, 180]]); L.wj('GND1', 'G', jn);
  const f = P2[o.variant % P2.length]; if (f.cut) cut(c, ...f.cut); else c.byRef(f.ref).fault = f.fault;
}
regScenario({
  id: 'dep2', cat: '4 · Dépannage', diff: 3, title: 'Dépannage d\'une platine transistor + LED (6 pannes)', level: 'Bac Pro CIEL (première / terminale)', duration: '1 h 30', variants: 6, variantLabel: '↻ Autre panne', settle: 0.4,
  refs: 'Maintenance ; recherche de panne ; transistor en commutation ; mesures de tensions ; contrôle de composants',
  faultInfo: v => P2[v % P2.length].info,
  desc: 'Une platine de signalisation commande une LED à l\'aide d\'un transistor : LED allumée quand l\'interrupteur SW1 est fermé, éteinte quand il est ouvert. Elle ne fonctionne plus. Trouvez la panne par des mesures (V<sub>BE</sub>, V<sub>CE</sub>, tensions aux bornes de R<sub>B</sub> et R<sub>C</sub>), réparez, puis contrôlez les deux états.',
  objectives: ['Déduire un état du transistor (bloqué, saturé, court-circuité) des tensions mesurées', 'Séparer commande (R<sub>B</sub>, base) et puissance (R<sub>C</sub>, LED, collecteur)', 'Localiser un composant défectueux ou une connexion coupée', 'Contrôler les deux états de fonctionnement après réparation'],
  steps: ['<b>Constat</b> : testez SW1 ouvert / fermé et lisez le symptôme.', '<b>Mesures</b> : V<sub>BE</sub> (≈ 0,7 V si la base est alimentée), V<sub>CE</sub> (≈ 0,1 V saturé, ≈ 5 V bloqué), tension sur R<sub>B</sub> et sur R<sub>C</sub>.', '<b>Localisation</b> : quelle partie est en cause, commande ou puissance ? Confirmez hors tension (ohmmètre, testeur de diode, continuité).', '<b>Réparation</b> (remplacer le composant, ou rétablir la connexion avec un fil).', '<b>Contrôle</b> : SW1 fermé → LED allumée ; SW1 ouvert → éteinte.'],
  questions: [
    { q: 'Quel élément est défectueux ? (pour une connexion coupée, indiquer l\'un des deux composants reliés)', type: 'part', correct: c => { const f = P2[c.tp.variant % P2.length]; return f.any || f.ref; } },
    { q: 'Nature de la panne', type: 'choice', options: NAT2, correct: c => P2[c.tp.variant % P2.length].nature },
    { q: 'Décrivez les mesures qui vous ont permis de conclure.', type: 'text' },
  ],
  build(c, o) { boardLED(c, o); },
  solve(c, ctx, v) { const f = P2[v % P2.length]; if (f.cut) mk(c).w(...f.cut); else NS.replacePart(c.byRef(f.ref)); },
  checks: [
    { label: 'SW1 fermé : LED allumée (10–20 mA) et transistor saturé (V<sub>CE</sub> < 0,3 V)', run: c => { c.part('SW1').p.closed = true; c.sim.dirty = true; c.settle(0.3); const I = Math.abs(c.I('D1')); return I > 0.01 && I < 0.02 && Math.abs(c.vd('Q1', 'C', 'Q1', 'E')) < 0.3; } },
    { label: 'SW1 ouvert : LED éteinte', run: c => { c.part('SW1').p.closed = false; c.sim.dirty = true; c.settle(0.3); return Math.abs(c.I('D1')) < 0.0002; } },
    { label: 'Aucun composant détruit', run: c => c.anyBurnt().length === 0 },
    { label: 'Dépannage ciblé (réparation effectuée, pas de remplacement inutile)', run: c => { const f = P2[c.tp.variant % P2.length]; return c.c.parts.every(p => (f.cut ? !(p.replaced > 0) : (p.ref === f.ref ? p.replaced >= 1 : !(p.replaced > 0)))); } },
  ],
  correction: '<p>On sépare le circuit de <b>commande</b> (SW1, R<sub>B</sub>, base) du circuit de <b>puissance</b> (R<sub>C</sub>, LED, collecteur-émetteur). <b>R<sub>B</sub> coupée / fil coupé</b> : pas de tension aux bornes de R<sub>B</sub> (0 V) ou 0 V sur la base alors que 5 V arrivent avant R<sub>B</sub>. <b>Q1 C–E en court-circuit</b> : V<sub>CE</sub> ≈ 0 V même SW1 ouvert ; LED allumée en permanence. <b>Base-émetteur ouverte</b> : V<sub>BE</sub> monte à 4 V mais pas de courant de collecteur. <b>LED coupée</b> : V<sub>CE</sub> ≈ 0,1 V mais I = 0 ; tension à ses bornes ≈ 4,9 V. <b>R<sub>C</sub> coupée</b> : mêmes symptômes, mais 0 V sur la LED et 5 V aux bornes de R<sub>C</sub> (c\'est elle qui coupe le circuit).</p>' + METHODE,
});

/* ============================================================ D3 — platine AOP inverseur */
const P3 = [
  { ref: 'RF', fault: 'open', nature: 0, sym: 'La sortie est écrêtée à ±10 V (saturée) quelle que soit l\'entrée.', info: 'RF coupée : plus de contre-réaction, l\'AOP fonctionne en comparateur' },
  { ref: 'R1', fault: 'open', nature: 0, sym: 'La sortie reste à 0 V, aucun signal en sortie.', info: 'R1 coupée : le signal n\'arrive plus à l\'AOP' },
  { ref: 'U1', fault: 'dead', nature: 0, sym: 'Aucun signal en sortie (0 V).', info: 'U1 hors service' },
  { ref: 'G2', cut: ['G2', '−', 'U1', 'V−'], nature: 2, any: ['G2', 'U1'], sym: 'Aucun signal en sortie. Le +12 V est bien présent sur l\'AOP.', info: 'Fil d\'alimentation négative (−12 V) coupé vers U1' },
];
regScenario({
  id: 'dep3', cat: '4 · Dépannage', diff: 4, title: 'Dépannage d\'un amplificateur inverseur à AOP (4 pannes)', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', variants: 4, variantLabel: '↻ Autre panne', settle: 0.02,
  refs: 'Maintenance ; recherche de panne ; AOP ; alimentation symétrique ; oscilloscope',
  faultInfo: v => P3[v % P3.length].info,
  desc: 'Un amplificateur inverseur de gain −10 (R<sub>1</sub> = 10 kΩ, R<sub>f</sub> = 100 kΩ, TL081 en ±12 V) ne fonctionne plus. Avec l\'oscilloscope et le multimètre, trouvez la panne et réparez.',
  objectives: ['Analyser la sortie d\'un AOP (saturation, absence de signal, signal déformé)', 'Vérifier l\'alimentation symétrique d\'un AOP avant tout autre test', 'Localiser un défaut dans une boucle de contre-réaction'],
  steps: ['<b>Constat</b> : câblez l\'oscilloscope (CH1 entrée, CH2 sortie) et décrivez la sortie.', '<b>Alimentation d\'abord</b> : mesurez V+ et V− sur les broches de l\'AOP (±12 V attendus).', '<b>Tensions aux entrées</b> : l\'entrée − doit être à ≈ 0 V (masse virtuelle) si le montage est bouclé.', '<b>Localisation et réparation</b>, puis <b>contrôle</b> du gain (−10) sans écrêtage.'],
  questions: [
    { q: 'Quel élément est défectueux ? (pour une connexion coupée, l\'un des deux éléments reliés)', type: 'part', correct: c => { const f = P3[c.tp.variant % P3.length]; return f.any || f.ref; } },
    { q: 'Nature de la panne', type: 'choice', options: NAT2, correct: c => P3[c.tp.variant % P3.length].nature },
    { q: 'Décrivez votre démarche.', type: 'text' },
  ],
  build(c, o) {
    const L = mk(c); L.p('gbf', 'GBF1', 100, 260, { wave: 'sin', f: 1000, A: 0.5, off: 0 }); R(L, 'R1', 300, 200, 10000); R(L, 'RF', 500, 120, 100000); L.p('opamp', 'U1', 500, 260, { model: 'TL081' }); L.p('ground', 'GND1', 200, 360);
    NS.symSupply(L, 760, 100, 12); L.p('scope', 'OSC1', 760, 480, { tdiv: 2e-4, v1: 2, v2: 5, on1: true, on2: true, trig: 0, src: 1 }); L.p('multimeter', 'MM1', 560, 480, { mode: 'VDC' });
    L.w('GBF1', 'OUT', 'R1', 'A'); L.w('R1', 'B', 'U1', '−'); L.w('RF', 'A', 'U1', '−'); L.w('RF', 'B', 'U1', 'S'); L.w('U1', '+', 'GND1', 'G'); L.w('GBF1', 'GND', 'GND1', 'G');
    L.w('G1', '+', 'U1', 'V+'); L.w('G2', '−', 'U1', 'V−'); L.w('GND2', 'G', 'GND1', 'G'); L.w('OSC1', 'CH1', 'GBF1', 'OUT'); L.w('OSC1', 'CH2', 'U1', 'S'); L.w('OSC1', 'GND', 'GND1', 'G');
    const f = P3[o.variant % P3.length]; if (f.cut) cut(c, ...f.cut); else c.byRef(f.ref).fault = f.fault;
  },
  solve(c, ctx, v) { const f = P3[v % P3.length]; if (f.cut) mk(c).w(...f.cut); else NS.replacePart(c.byRef(f.ref)); },
  checks: [
    { label: 'Gain compris entre −9 et −11', run: c => { const a = c.measure(() => c.v('GBF1', 'OUT'), 0.004, 400), b = c.measure(() => c.v('U1', 'S'), 0.004, 400); return a.pp > 0.1 && b.pp / a.pp > 9 && b.pp / a.pp < 11; } },
    { label: 'Sortie symétrique et non écrêtée', run: c => { const b = c.measure(() => c.v('U1', 'S'), 0.004, 400); return b.max > 4 && b.min < -4 && b.max < 10; } },
    { label: 'Aucun composant détruit', run: c => c.anyBurnt().length === 0 },
    { label: 'Dépannage ciblé (pas de remplacement inutile)', run: c => { const f = P3[c.tp.variant % P3.length]; return c.c.parts.every(p => (f.cut ? !(p.replaced > 0) : (p.ref === f.ref ? p.replaced >= 1 : !(p.replaced > 0)))); } },
  ],
  correction: '<p>Toujours <b>vérifier d\'abord l\'alimentation</b> de l\'AOP (V+ et V−). <b>R<sub>f</sub> coupée</b> : plus de contre-réaction négative, gain énorme : sortie saturée ±10 V. <b>R<sub>1</sub> coupée</b> : le signal n\'atteint pas l\'entrée −, sortie ≈ 0 V. <b>AOP mort</b> : sortie 0 V avec entrées normales. <b>−12 V coupé</b> : V− mesure ≈ +12 V au lieu de −12 V (le point flotte), l\'AOP n\'est plus alimenté : plus de signal. Retrouver la rupture du fil d\'alimentation.</p>' + METHODE,
});
})(typeof window !== 'undefined' ? window : globalThis);
