/* tp_osc.js — TP « Oscilloscope & signaux » : lire un signal (forme, période, fréquence, Umax, Umin, Upp, Umoy, Ueff, rapport cyclique, déphasage) à partir d'une source aux réglages masqués */
(function (g) {
'use strict';
const NS = g.NS; const { mk, near, regScenario } = NS;
const CAT = '8 · Oscilloscope & signaux';
const R = (L, ref, x, y, v, rot) => L.p('resistor', ref, x, y, { R: v, tol: 1, W: 0.25 }, rot);
const noBurn = { label: 'Aucun composant n\'est détruit', run: c => c.anyBurnt().length === 0 };
const TDIV = []; [1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1].forEach(d => [1, 2, 5].forEach(m => TDIV.push(m * d))); TDIV.push(1);
const VDIV = []; [1e-2, 1e-1, 1].forEach(d => [1, 2, 5].forEach(m => VDIV.push(m * d))); VDIV.push(10);
const W = { sin: (ph) => Math.sin(2 * Math.PI * ph), tri: ph => ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph };
/* statistiques numériques d'un signal GBF (sur une période) */
function stats(p) {
  const N = 20000; let s = 0, s2 = 0, mx = -1e9, mn = 1e9;
  for (let i = 0; i < N; i++) { const ph = i / N; const w = p.wave === 'carre' ? (ph < p.duty / 100 ? 1 : -1) : W[p.wave](ph); const v = p.off + p.A * w; s += v; s2 += v * v; mx = Math.max(mx, v); mn = Math.min(mn, v); }
  const mean = s / N, rms = Math.sqrt(s2 / N);
  return { T: 1 / p.f, f: p.f, max: mx, min: mn, pp: mx - mn, mean, rms, rmsAC: Math.sqrt(Math.max(0, rms * rms - mean * mean)), tH: p.wave === 'carre' ? p.duty / 100 / p.f : 0, shape: ['sin', 'carre', 'tri'].indexOf(p.wave) };
}
const pick = (arr, ok) => arr.find(ok) || arr[arr.length - 1];
/* réglages « corrects » de la voie 1 : au moins 2 divisions crête à crête, tout dans ±4 divisions, 2 à 10 périodes à l'écran */
function goodScope(pp, absMax, f, rng) { return { v1: pick(VDIV, v => absMax <= 3.8 * v && (pp / v) >= 2), tdiv: pick(TDIV, t => 10 * t * f >= 2.5) }; }
const fitV = (p, st, ch) => { const v = p['v' + (ch || 1)]; return Math.max(Math.abs(st.max), Math.abs(st.min)) <= 4 * v && st.pp / v >= 2; };
const fitT = (p, f) => { const n = 10 * p.tdiv * f; return n >= 1.5 && n <= 12; };
const gwire = c => c.scopeWired(null, ['R1', 'A']);

function board(c, sig) {
  const L = mk(c); L.p('gbf', 'GBF1', 100, 160, Object.assign({ duty: 50, hidden: true }, sig)); R(L, 'R1', 300, 180, 1000, 90); L.p('ground', 'GND1', 200, 320);
  L.p('scope', 'OSC1', 640, 200, { tdiv: 1, v1: 10, v2: 10, on1: true, on2: false, trig: 0, src: 1 }); L.p('multimeter', 'MM1', 820, 170, { mode: 'VDC' }); L.p('multimeter', 'MM2', 960, 170, { mode: 'VAC' });
  const jg = L.j(200, 260); L.w('GBF1', 'OUT', 'R1', 'A'); L.wj('R1', 'B', jg, [[300, 260]]); L.wj('GBF1', 'GND', jg, [[200, 180]]); L.wj('GND1', 'G', jg);
  return L;
}
function solveScope(c, sig, extra) { const L = mk(c); const st = stats(sig); L.w('OSC1', 'CH1', 'R1', 'A'); L.w('OSC1', 'GND', 'GND1', 'G'); Object.assign(c.byRef('OSC1').p, goodScope(st.pp, Math.max(Math.abs(st.max), Math.abs(st.min)), sig.f), extra || {}); return L; }
const settleSc = 0.05;

/* ============================================================ H1 — lire un signal */
const S1 = [
  { wave: 'sin', f: 440, A: 2.5, off: 0 }, { wave: 'carre', f: 3000, A: 1.5, off: 0, duty: 50 }, { wave: 'tri', f: 120, A: 4, off: 0 },
  { wave: 'sin', f: 25000, A: 0.4, off: 0 }, { wave: 'sin', f: 50, A: 6, off: -1 }, { wave: 'tri', f: 8000, A: 0.8, off: 0.5 },
];
const s1 = c => S1[c.tp.variant % S1.length];
regScenario({
  id: 'osc_lect', cat: CAT, diff: 2, title: 'Lire un signal à l\'oscilloscope : régler, mesurer T, f, U<sub>max</sub>, U<sub>pp</sub>… (6 signaux)', level: 'Bac Pro CIEL (seconde / première)', duration: '1 h 15', variants: 6, variantLabel: '↻ Autre signal', settle: settleSc,
  refs: 'Signaux périodiques ; oscilloscope : sensibilité verticale, base de temps, déclenchement ; période, fréquence, valeur maximale, crête à crête, moyenne, efficace',
  desc: 'Un générateur délivre un signal <b>inconnu</b> (réglages masqués), de fréquence et d\'amplitude très variables. L\'oscilloscope est volontairement mal réglé : il faut choisir <b>sensibilité verticale</b> (V/div) et <b>base de temps</b> (s/div) pour obtenir une belle image, puis lire toutes les caractéristiques du signal.',
  objectives: ['Régler V/div pour que le signal occupe au moins la moitié de l\'écran sans sortir', 'Régler s/div pour voir quelques périodes (2 à 10)', 'Lire T, en déduire f = 1/T', 'Lire U<sub>max</sub>, U<sub>min</sub>, U<sub>pp</sub>, en déduire amplitude et valeur moyenne', 'Distinguer valeur moyenne (V⎓) et efficace (V∿) et les comparer au calcul'],
  steps: ['Câblez <b>CH1 → sortie du GBF</b> (R1 côté GBF) et <b>GND → masse</b>. Ouvrez l\'oscilloscope.', 'Le signal est invisible ou écrasé : appuyez sur <b>Auto</b> puis affinez. <b>Règle</b> : ≈ 2 à 10 périodes à l\'écran (s/div) ; signal sur 4 à 6 divisions de haut (V/div) sans sortir de l\'écran.', 'Comptez les divisions : <b>T = nombre de divisions × s/div</b> ; <b>U<sub>pp</sub> = nombre de divisions × V/div</b>. Utilisez aussi les mesures affichées sous l\'écran pour vérifier.', 'Câblez MM1 (V⎓) et MM2 (V∿) aux bornes de R1 : valeur moyenne et valeur efficace de la partie alternative.', 'Identifiez la forme et répondez aux questions.'],
  questions: [
    { q: 'Forme du signal', type: 'choice', options: ['Sinusoïdale', 'Carrée', 'Triangulaire'], correct: c => stats(s1(c)).shape },
    { q: 'Période T (en ms)', answer: c => stats(s1(c)).T * 1000, tol: 0.05, unit: 'ms' },
    { q: 'Fréquence f (en Hz)', answer: c => s1(c).f, tol: 0.05, unit: 'Hz' },
    { q: 'Tension maximale U<sub>max</sub> (en V)', answer: c => stats(s1(c)).max, tol: 0.06, abs: 0.03, unit: 'V' },
    { q: 'Tension minimale U<sub>min</sub> (en V)', answer: c => stats(s1(c)).min, tol: 0.06, abs: 0.03, unit: 'V' },
    { q: 'Tension crête à crête U<sub>pp</sub> (en V)', answer: c => stats(s1(c)).pp, tol: 0.06, abs: 0.03, unit: 'V' },
    { q: 'Valeur moyenne (composante continue), lue en V⎓ (en V)', answer: c => stats(s1(c)).mean, tol: 0.06, abs: 0.05, unit: 'V' },
    { q: 'Valeur efficace de la partie alternative, lue en V∿ (en V)', answer: c => stats(s1(c)).rmsAC, tol: 0.06, abs: 0.03, unit: 'V' },
    { q: 'Pour un signal alternatif <b>sinusoïdal</b> sans composante continue, la valeur efficace vaut…', type: 'choice', options: ['U<sub>max</sub> / √2 ≈ 0,707·U<sub>max</sub>', 'U<sub>max</sub> / 2', 'U<sub>pp</sub>', 'U<sub>max</sub> × √2'], correct: 0 },
  ],
  build(c, o) { board(c, S1[((o && o.variant) || 0) % S1.length]); },
  solve(c, ctx, v) { const L = solveScope(c, S1[v % S1.length]); L.w('MM1', 'V/Ω/A', 'R1', 'A'); L.w('MM1', 'COM', 'R1', 'B'); L.w('MM2', 'V/Ω/A', 'R1', 'A'); L.w('MM2', 'COM', 'R1', 'B'); },
  checks: [
    { label: 'Oscilloscope : CH1 sur la sortie du GBF, GND à la masse', run: c => gwire(c) },
    { label: 'Sensibilité verticale adaptée (signal ≥ 2 div crête à crête et dans l\'écran)', run: c => fitV(c.part('OSC1').p, stats(s1(c))) },
    { label: 'Base de temps adaptée (entre 1,5 et 12 périodes à l\'écran)', run: c => fitT(c.part('OSC1').p, s1(c).f) },
    { label: 'Voltmètres V⎓ et V∿ câblés aux bornes de R1', run: c => c.voltmeterAcross('R1', 'A', 'R1', 'B') && c.voltmeterAcross('R1', 'A', 'R1', 'B', true) },
    noBurn],
  correction: v => { const p = S1[v % S1.length], s = stats(p); const nm = { sin: 'sinusoïdal', carre: 'carré', tri: 'triangulaire' }[p.wave]; const f3 = x => +x.toPrecision(3); return `<p>Signal <b>${nm}</b> : T = ${f3(s.T * 1000)} ms, <b>f = 1/T = ${p.f} Hz</b> ; U<sub>max</sub> = ${f3(s.max)} V, U<sub>min</sub> = ${f3(s.min)} V, U<sub>pp</sub> = ${f3(s.pp)} V (amplitude ${p.A} V) ; valeur moyenne = ${f3(s.mean)} V ; valeur efficace de la partie alternative = ${f3(s.rmsAC)} V.</p><p><b>Méthode</b> : T = nb de divisions × s/div ; U = nb de divisions × V/div. Pour un sinus U<sub>eff</sub> = U<sub>max</sub>/√2 ; pour un triangle U<sub>max</sub>/√3 ; pour un carré symétrique U<sub>eff</sub> = U<sub>max</sub>. Un réglage trop sensible écrête le signal, trop faible l\'écrase : on cherche 4 à 6 divisions.</p>`; },
});

/* ============================================================ H2 — signaux rectangulaires */
const S2 = [
  { wave: 'carre', f: 1000, A: 2.5, off: 2.5, duty: 25 }, { wave: 'carre', f: 200, A: 5, off: 0, duty: 70 }, { wave: 'carre', f: 5000, A: 1.65, off: 1.65, duty: 50 },
  { wave: 'carre', f: 50, A: 2, off: 2, duty: 10 }, { wave: 'carre', f: 2500, A: 2.5, off: 2.5, duty: 60 },
];
const s2 = c => S2[c.tp.variant % S2.length];
regScenario({
  id: 'osc_carre', cat: CAT, diff: 3, title: 'Signal rectangulaire : rapport cyclique, temps haut, valeur moyenne (5 signaux)', level: 'Bac Pro CIEL (première / terminale)', duration: '1 h 15', variants: 5, variantLabel: '↻ Autre signal', settle: settleSc,
  refs: 'Signaux logiques / rectangulaires ; rapport cyclique ; commande par MLI ; valeur moyenne et efficace',
  desc: 'Un signal rectangulaire (niveaux haut et bas inconnus, rapport cyclique inconnu) est produit par un générateur aux réglages masqués. Mesurez à l\'oscilloscope les <b>niveaux</b>, la <b>période</b>, le <b>temps à l\'état haut</b>, le <b>rapport cyclique</b>, puis comparez la valeur moyenne mesurée (V⎓) au calcul <b>U<sub>moy</sub> = α × U<sub>haut</sub> + (1 − α) × U<sub>bas</sub></b>.',
  objectives: ['Mesurer niveaux haut et bas d\'un signal rectangulaire', 'Mesurer t<sub>H</sub> et T, calculer le rapport cyclique α = t<sub>H</sub>/T', 'Calculer la valeur moyenne et la vérifier au multimètre (V⎓)', 'Faire le lien avec la commande d\'une LED ou d\'un moteur par MLI (PWM)'],
  steps: ['Câblez CH1 sur la sortie du GBF et GND à la masse ; réglez V/div et s/div (voir TP précédent).', 'Relevez les <b>niveaux haut et bas</b> : attention, le signal n\'est pas forcément centré sur 0 V (positionnez la masse de la voie si besoin).', 'Mesurez <b>t<sub>H</sub></b> (durée à l\'état haut) et <b>T</b> : α = t<sub>H</sub>/T.', 'Calculez U<sub>moy</sub> puis câblez MM1 (V⎓) aux bornes de R1 pour vérifier.', 'Répondez aux questions.'],
  questions: [
    { q: 'Niveau haut (en V)', answer: c => stats(s2(c)).max, tol: 0.06, abs: 0.05, unit: 'V' },
    { q: 'Niveau bas (en V)', answer: c => stats(s2(c)).min, tol: 0.06, abs: 0.05, unit: 'V' },
    { q: 'Période T (en ms)', answer: c => stats(s2(c)).T * 1000, tol: 0.05, unit: 'ms' },
    { q: 'Fréquence (en Hz)', answer: c => s2(c).f, tol: 0.05, unit: 'Hz' },
    { q: 'Durée t<sub>H</sub> à l\'état haut (en ms)', answer: c => stats(s2(c)).tH * 1000, tol: 0.08, unit: 'ms' },
    { q: 'Rapport cyclique α (en %)', answer: c => s2(c).duty, tol: 0.08, abs: 1.5, unit: '%' },
    { q: 'Valeur moyenne U<sub>moy</sub> (en V), lue en V⎓', answer: c => stats(s2(c)).mean, tol: 0.06, abs: 0.05, unit: 'V' },
    { q: 'Pour un rapport cyclique α, la valeur moyenne d\'un signal 0 / U<sub>haut</sub> est…', type: 'choice', options: ['α × U<sub>haut</sub>', 'U<sub>haut</sub> / 2 quel que soit α', 'U<sub>haut</sub> / α', 'U<sub>haut</sub> × (1 − α)²'], correct: 0 },
  ],
  build(c, o) { board(c, S2[((o && o.variant) || 0) % S2.length]); },
  solve(c, ctx, v) { const L = solveScope(c, S2[v % S2.length]); L.w('MM1', 'V/Ω/A', 'R1', 'A'); L.w('MM1', 'COM', 'R1', 'B'); },
  checks: [
    { label: 'Oscilloscope : CH1 sur la sortie du GBF, GND à la masse', run: c => gwire(c) },
    { label: 'Sensibilité verticale adaptée', run: c => fitV(c.part('OSC1').p, stats(s2(c))) },
    { label: 'Base de temps adaptée (1,5 à 12 périodes)', run: c => fitT(c.part('OSC1').p, s2(c).f) },
    { label: 'Voltmètre V⎓ câblé aux bornes de R1', run: c => c.voltmeterAcross('R1', 'A', 'R1', 'B') },
    noBurn],
  correction: v => { const p = S2[v % S2.length], s = stats(p); const f3 = x => +x.toPrecision(3); return `<p>Niveaux : haut ${f3(s.max)} V, bas ${f3(s.min)} V ; T = ${f3(s.T * 1000)} ms (f = ${p.f} Hz) ; t<sub>H</sub> = ${f3(s.tH * 1000)} ms ; <b>α = t<sub>H</sub>/T = ${p.duty} %</b> ; U<sub>moy</sub> = α·U<sub>haut</sub> + (1 − α)·U<sub>bas</sub> = ${f3(s.mean)} V.</p><p>Un signal MLI (PWM) de rapport cyclique α fait varier la puissance moyenne d\'une LED ou d\'un moteur : on règle α, pas la tension. Pour une LED, la valeur moyenne (V⎓) augmente avec α.</p>`; },
});

/* ============================================================ H3 — deux voies : gain et déphasage */
const F3 = [250, 1000, 2000, 5000];
const RC = c => c.el('R1').value() * c.el('C1').params().C;
const g3 = c => { const f = c.part('GBF1').p.f, fc = 1 / (2 * Math.PI * RC(c)); return { f, fc, G: 1 / Math.sqrt(1 + (f / fc) ** 2), phi: Math.atan(f / fc) * 180 / Math.PI }; };
regScenario({
  id: 'osc_phi', cat: CAT, diff: 3, title: 'Deux voies : gain et déphasage d\'un filtre RC (4 fréquences)', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', variants: 4, variantLabel: '↻ Autre fréquence', settle: settleSc,
  refs: 'Oscilloscope deux voies ; gain ; retard et déphasage ; filtre passe-bas RC',
  desc: 'Un filtre RC (R = 1,6 kΩ, C = 100 nF) est attaqué par un générateur dont la <b>fréquence est masquée</b>. En observant l\'entrée (CH1) et la sortie (CH2) à l\'oscilloscope, mesurez la fréquence, les amplitudes, le <b>gain</b>, le <b>retard</b> Δt de la sortie sur l\'entrée et le <b>déphasage</b> φ = 360° × Δt / T.',
  objectives: ['Visualiser deux signaux simultanément et les comparer', 'Mesurer le gain G = U<sub>s</sub>/U<sub>e</sub>', 'Mesurer un retard Δt entre deux signaux et en déduire le déphasage', 'Comparer aux valeurs théoriques du filtre'],
  steps: ['Câblez <b>CH1 sur l\'entrée</b> (côté GBF de R1), <b>CH2 sur la sortie</b> (aux bornes de C1) et <b>GND à la masse</b> ; activez les deux voies (ON1, ON2).', 'Réglez les V/div (les deux amplitudes sont différentes) et la base de temps ; déclenchez sur CH1.', 'Mesurez T (donc f), U<sub>e,max</sub> et U<sub>s,max</sub> ; G = U<sub>s</sub>/U<sub>e</sub>.', 'Mesurez le <b>retard Δt</b> entre deux passages par zéro montants (utilisez la position verticale pour superposer les deux voies si besoin) : φ = 360° × Δt/T. La sortie est en retard.', 'Comparez à la théorie : G = 1/√(1 + (f/f<sub>c</sub>)²) et φ = arctan(f/f<sub>c</sub>).'],
  questions: [
    { q: 'Fréquence du signal (en Hz)', answer: c => g3(c).f, tol: 0.05, unit: 'Hz' },
    { q: 'Amplitude (crête) de la tension d\'entrée U<sub>e</sub> (en V)', answer: c => c.part('GBF1').p.A, tol: 0.06, abs: 0.03, unit: 'V' },
    { q: 'Amplitude (crête) de la tension de sortie U<sub>s</sub> (en V)', answer: c => c.part('GBF1').p.A * g3(c).G, tol: 0.08, abs: 0.03, unit: 'V' },
    { q: 'Gain G = U<sub>s</sub> / U<sub>e</sub> (sans unité)', answer: c => g3(c).G, tol: 0.08, abs: 0.02 },
    { q: 'Retard Δt de la sortie sur l\'entrée (en µs)', answer: c => g3(c).phi / 360 / g3(c).f * 1e6, tol: 0.12, abs: 5, unit: 'µs' },
    { q: 'Déphasage de la sortie par rapport à l\'entrée (en degrés, valeur positive pour un retard)', answer: c => g3(c).phi, tol: 0.1, abs: 2, unit: '°' },
    { q: 'Fréquence de coupure théorique f<sub>c</sub> = 1/(2πRC) (en Hz)', answer: c => g3(c).fc, tol: 0.05, unit: 'Hz' },
    { q: 'Le signal de sortie est…', type: 'choice', options: ['en avance sur l\'entrée', 'en retard sur l\'entrée', 'en phase avec l\'entrée'], correct: 1 },
  ],
  build(c, o) {
    const f = F3[((o && o.variant) || 0) % F3.length]; const L = mk(c); L.p('gbf', 'GBF1', 100, 160, { wave: 'sin', f, A: 2, off: 0, duty: 50, hidden: true });
    R(L, 'R1', 300, 140, 1600); L.p('capacitor', 'C1', 460, 200, { C: 100e-9, esr: 0.01, tol: 2, Vmax: 63 }, 90); L.p('ground', 'GND1', 200, 320);
    L.p('scope', 'OSC1', 680, 200, { tdiv: 1, v1: 10, v2: 10, on1: true, on2: false, trig: 0, src: 1 });
    const jg = L.j(200, 260); L.w('GBF1', 'OUT', 'R1', 'A'); L.w('R1', 'B', 'C1', 'A'); L.wj('C1', 'B', jg, [[460, 260]]); L.wj('GBF1', 'GND', jg, [[200, 180]]); L.wj('GND1', 'G', jg);
  },
  solve(c, ctx, v) { const L = mk(c); const f = F3[v % F3.length], fc = 995, G = 1 / Math.sqrt(1 + (f / fc) ** 2); L.w('OSC1', 'CH1', 'R1', 'A'); L.w('OSC1', 'CH2', 'R1', 'B'); L.w('OSC1', 'GND', 'GND1', 'G'); Object.assign(c.byRef('OSC1').p, { on1: true, on2: true, v1: pick(VDIV, x => 2 <= 3.8 * x && 4 / x >= 2), v2: pick(VDIV, x => 2 * G <= 3.8 * x && 4 * G / x >= 2), tdiv: pick(TDIV, t => 10 * t * f >= 2.5) }); },
  checks: [
    { label: 'Oscilloscope : CH1 sur l\'entrée, CH2 sur la sortie, GND à la masse', run: c => c.scopeWired(null, ['R1', 'A'], ['R1', 'B']) },
    { label: 'Les deux voies sont activées', run: c => c.part('OSC1').p.on1 && c.part('OSC1').p.on2 },
    { label: 'Sensibilités adaptées : les deux signaux occupent au moins 2 divisions sans sortir de l\'écran', run: c => { const p = c.part('OSC1').p, a = c.part('GBF1').p.A, G = g3(c).G; return fitV(p, { max: a, min: -a, pp: 2 * a }, 1) && fitV(p, { max: a * G, min: -a * G, pp: 2 * a * G }, 2); } },
    { label: 'Base de temps adaptée (1,5 à 12 périodes)', run: c => fitT(c.part('OSC1').p, c.part('GBF1').p.f) },
    noBurn],
  correction: v => { const f = F3[v % F3.length], fc = 1 / (2 * Math.PI * 1600 * 100e-9), G = 1 / Math.sqrt(1 + (f / fc) ** 2), phi = Math.atan(f / fc) * 180 / Math.PI; const f3 = x => +x.toPrecision(3); return `<p>f = ${f} Hz ; f<sub>c</sub> ≈ ${Math.round(fc)} Hz ; gain G = ${f3(G)} ; déphasage φ ≈ ${f3(phi)}° (la sortie est <b>en retard</b>), soit Δt = φ/(360·f) ≈ ${f3(phi / 360 / f * 1e6)} µs.</p><p><b>Mesure du retard</b> : on repère le passage par zéro montant de CH1 et celui de CH2 ; Δt est l\'écart horizontal ; φ = 360° × Δt/T. À f = f<sub>c</sub> : G = 0,707 et φ = 45°.</p>`; },
});

/* ============================================================ H4 — couplage AC / DC */
const S4 = [
  { wave: 'sin', f: 100, A: 0.3, off: 12, lab: 'ondulation 100 Hz sur une alimentation 12 V' }, { wave: 'sin', f: 100, A: 0.15, off: 5, lab: 'ondulation 100 Hz sur 5 V' }, { wave: 'tri', f: 1000, A: 0.5, off: 9, lab: 'ondulation triangulaire sur 9 V' },
];
const s4 = c => S4[c.tp.variant % S4.length];
regScenario({
  id: 'osc_ac', cat: CAT, diff: 3, title: 'Couplage AC / DC : mesurer une ondulation sur une tension continue (3 signaux)', level: 'Bac Pro CIEL (terminale)', duration: '1 h', variants: 3, variantLabel: '↻ Autre signal', settle: settleSc,
  refs: 'Oscilloscope : couplage DC / AC ; composante continue et ondulation ; qualité d\'une alimentation',
  desc: 'Une tension continue de plusieurs volts porte une <b>petite ondulation</b> alternative (masquée). Avec la sensibilité nécessaire pour voir l\'ondulation, la composante continue sort de l\'écran : utilisez le <b>couplage AC</b> de la voie, qui bloque la composante continue.',
  objectives: ['Mesurer la composante continue en couplage DC (et au multimètre V⎓)', 'Utiliser le couplage AC pour zoomer sur l\'ondulation', 'Mesurer l\'amplitude crête à crête et la fréquence de l\'ondulation', 'Interpréter la qualité d\'une alimentation (taux d\'ondulation)'],
  steps: ['Câblez CH1 sur la source et GND à la masse. En couplage <b>DC</b>, relevez la valeur moyenne (V/div élevée) et vérifiez avec MM1 (V⎓).', 'Passez en sensibilité fine (ex. 100 mV/div) : le signal sort de l\'écran !', 'Basculez la voie en couplage <b>AC</b> : la composante continue disparaît, l\'ondulation apparaît au centre.', 'Mesurez U<sub>pp</sub> de l\'ondulation et sa fréquence.', 'Calculez le taux d\'ondulation U<sub>pp</sub>/U<sub>moy</sub> et répondez aux questions.'],
  questions: [
    { q: 'Composante continue (valeur moyenne) de la tension (en V)', answer: c => s4(c).off, tol: 0.05, abs: 0.05, unit: 'V' },
    { q: 'Ondulation : tension crête à crête (en mV)', answer: c => 2 * s4(c).A * 1000, tol: 0.08, abs: 10, unit: 'mV' },
    { q: 'Fréquence de l\'ondulation (en Hz)', answer: c => s4(c).f, tol: 0.05, unit: 'Hz' },
    { q: 'Taux d\'ondulation U<sub>pp</sub> / U<sub>moy</sub> (en %)', answer: c => 2 * s4(c).A / s4(c).off * 100, tol: 0.1, abs: 0.2, unit: '%' },
    { q: 'Quel couplage permet de voir l\'ondulation avec une sensibilité fine ?', type: 'choice', options: ['Couplage DC', 'Couplage AC', 'Couplage GND', 'Aucun, il faut changer de générateur'], correct: 1 },
    { q: 'Que fait le couplage AC ?', type: 'choice', options: ['Il supprime la composante continue (filtre passe-haut)', 'Il amplifie le signal', 'Il supprime l\'ondulation', 'Il inverse le signal'], correct: 0 },
  ],
  build(c, o) { board(c, S4[((o && o.variant) || 0) % S4.length]); c.byRef('OSC1').p.c1 = 'DC'; },
  solve(c, ctx, v) { const p = S4[v % S4.length]; const L = mk(c); L.w('OSC1', 'CH1', 'R1', 'A'); L.w('OSC1', 'GND', 'GND1', 'G'); L.w('MM1', 'V/Ω/A', 'R1', 'A'); L.w('MM1', 'COM', 'R1', 'B'); Object.assign(c.byRef('OSC1').p, { c1: 'AC', v1: pick(VDIV, x => 2 * p.A / x <= 5), tdiv: pick(TDIV, t => 10 * t * p.f >= 2.5) }); },
  checks: [
    { label: 'Oscilloscope : CH1 sur la source, GND à la masse', run: c => gwire(c) },
    { label: 'Couplage AC sélectionné sur CH1', run: c => c.part('OSC1').p.c1 === 'AC' },
    { label: 'L\'ondulation occupe au moins 2 divisions (sensibilité fine, ≤ 100 mV/div ou adaptée)', run: c => { const p = c.part('OSC1').p; return 2 * s4(c).A / p.v1 >= 2 && 2 * s4(c).A / p.v1 <= 8; } },
    { label: 'Base de temps adaptée (1,5 à 12 périodes)', run: c => fitT(c.part('OSC1').p, s4(c).f) },
    { label: 'Voltmètre V⎓ câblé aux bornes de R1 (mesure de la composante continue)', run: c => c.voltmeterAcross('R1', 'A', 'R1', 'B') },
    noBurn],
  correction: v => { const p = S4[v % S4.length]; return `<p>Signal : ${p.lab}. Composante continue ${p.off} V ; ondulation U<sub>pp</sub> = ${(2 * p.A * 1000).toFixed(0)} mV à ${p.f} Hz ; taux d\'ondulation ≈ ${(2 * p.A / p.off * 100).toPrecision(2)} %.</p><p>En <b>DC</b> l\'oscilloscope affiche tout (continu + alternatif) : avec une sensibilité de 100 mV/div, 12 V sortent de l\'écran. En <b>AC</b> un condensateur interne bloque la composante continue : on peut zoomer sur l\'ondulation. Le multimètre V⎓ donne la valeur moyenne, le V∿ la valeur efficace de l\'ondulation.</p>`; },
});
})(typeof window !== 'undefined' ? window : globalThis);
