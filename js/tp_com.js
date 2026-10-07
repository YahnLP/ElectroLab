/* tp_com.js — TP « Communication série » : analyse de trames à l'analyseur logique (UART / RS-232, Modbus RTU / RS-485, I²C, SPI) */
(function (g) {
'use strict';
const NS = g.NS; const { mk, regScenario } = NS; const P = NS.PROTO;
const CAT = '7 · Communication série';
const R = (L, ref, x, y, v, rot) => L.p('resistor', ref, x, y, { R: v, tol: 1, W: 0.25 }, rot);
const noBurn = { label: 'Aucun composant n\'est détruit', run: c => c.anyBurnt().length === 0 };
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const hex2 = v => '0x' + v.toString(16).toUpperCase().padStart(2, '0');

/* ---------- aides communes ---------- */
const LA = c => c.part('LA').p;
const ring = c => { const e = c.el('LA'); return e && e.s && e.s.ring && e.s.ring.n > 4 ? e.s.ring : null; };
const evs = (c, ch, ch2) => { const r = ring(c); return r ? P.ringEvents(r, ch, LA(c).thr, ch2) : []; };
const tEnd = c => { const r = ring(c); return r ? r.at(r.n - 1) : 0; };
const sync = c => { const r = ring(c); return !!r && r.n >= r.cap; };
/* voie de l'analyseur câblée sur la broche donnée (−1 si aucune) */
const chOf = (c, ref, pin) => { const n = c.net(ref, pin); if (n === 0) return -1; for (let k = 0; k < 8; k++) if (c.net('LA', 'D' + k) === n) return k; return -1; };
const laGnd = c => c.net('LA', 'GND') === 0;
const wiredLbl = pins => 'Analyseur logique : ' + pins + ' câblées, GND à la masse';
function gnd(L, ref, pin) { L.w(ref, pin, 'GND1', 'G'); }
const laPart = L => L.p('logic', 'LA', 640, 420, { tdiv: 1e-3, thr: 1.65 });
const COMMON = { settle: 0.5 };
const proto = (c, name) => LA(c).proto === name;

/* ============================================================ G1 — UART / RS-232 */
const U = [
  { baud: 9600, bits: 8, parity: 'N', stop: 1, level: 'ttl', vhi: 5, msg: 'Bonjour\\r\\n', lab: 'UART TTL 5 V' },
  { baud: 19200, bits: 7, parity: 'E', stop: 1, level: 'ttl', vhi: 5, msg: 'T=23C\\r\\n', lab: 'UART TTL 5 V' },
  { baud: 4800, bits: 8, parity: 'N', stop: 2, level: 'ttl', vhi: 3.3, msg: 'OK\\r\\n', lab: 'UART TTL 3,3 V' },
  { baud: 9600, bits: 8, parity: 'N', stop: 1, level: 'rs232', vhi: 5, vrs: 12, msg: 'RS232\\r\\n', lab: 'RS-232 ±12 V' },
  { baud: 115200, bits: 8, parity: 'O', stop: 1, level: 'ttl', vhi: 3.3, msg: 'AT\\r\\n', lab: 'UART TTL 3,3 V' },
];
const uv = c => U[c.tp.variant % U.length];
const uartDecode = c => { const p = LA(c), r = ring(c); if (!r) return []; let ev = evs(c, p.chA); if (p.inv) ev = P.invert(ev); return P.uartDecode(ev, { baud: p.baud, bits: p.bits, parity: p.parity, stop: p.stop, sync: sync(c) }, tEnd(c)); };
regScenario({
  id: 'uart', cat: CAT, diff: 3, title: 'Analyse d\'une liaison série UART / RS-232 (5 variantes)', level: 'Bac Pro CIEL (première / terminale)', duration: '1 h 30', variants: 5, variantLabel: '↻ Autre liaison', ...COMMON,
  refs: 'Transmission série asynchrone ; trame UART ; débit ; parité ; niveaux TTL et RS-232 ; analyseur logique',
  desc: 'Un émetteur série (dont les paramètres sont <b>inconnus</b>) envoie un message de façon répétée. À l\'aide de l\'<b>analyseur logique</b>, retrouvez le débit, le format de la trame (bits de données, parité, stops) et le niveau électrique, puis configurez le décodeur pour lire le message.',
  objectives: ['Relier un analyseur logique à une ligne série (voie + masse commune)', 'Mesurer la durée d\'un bit aux curseurs et en déduire le débit', 'Identifier le format de trame : start, bits de données (LSB d\'abord), parité, stop', 'Distinguer UART TTL / RS-232 (±12 V, logique inversée) et régler le seuil', 'Décoder le message ASCII'],
  steps: ['Câblez l\'analyseur logique : <b>D0 → TX</b> de l\'émetteur et <b>GND → masse</b>. Double-clic sur LA pour l\'ouvrir.', 'Observez le chronogramme (AUTO règle la base de temps). Au repos la ligne est à quel niveau ? Quelle est la durée du plus petit créneau ? <b>T<sub>bit</sub> = 1/débit</b>.', 'Mesurez avec les curseurs, choisissez le décodeur <b>UART</b> et réglez le débit. Un débit faux donne du « bruit » ou des erreurs.', 'Ajustez nombre de bits, parité, stops jusqu\'à ce que le décodeur n\'indique <b>aucune erreur</b>. Si les niveaux sont ±12 V (RS-232) : seuil à 0 V et case « inversé ».', 'Lisez le message puis répondez aux questions.'],
  questions: [
    { q: 'Débit de la liaison (en bauds)', answer: c => uv(c).baud, tol: 0.03, unit: 'bauds' },
    { q: 'Durée d\'un bit (en µs)', answer: c => 1e6 / uv(c).baud, tol: 0.05, unit: 'µs' },
    { q: 'Nombre de bits de données par caractère', answer: c => uv(c).bits, abs: 0.1 },
    { q: 'Parité utilisée', type: 'choice', options: ['Aucune', 'Paire', 'Impaire'], correct: c => 'NEO'.indexOf(uv(c).parity) },
    { q: 'Nombre de bits de stop', answer: c => uv(c).stop, abs: 0.1 },
    { q: 'Code ASCII (décimal) du premier caractère du message', answer: c => P.parseText(uv(c).msg)[0], abs: 0.1, hint: 'Lecture hexadécimale du décodeur : 0x42 = 66.' },
    { q: 'Nombre de caractères du message (retour chariot et saut de ligne compris)', answer: c => P.parseText(uv(c).msg).length, abs: 0.1 },
    { q: 'Durée d\'un caractère complet (start + données + parité + stop), en ms', answer: c => P.frameLen(uv(c)) * 1000, tol: 0.05, unit: 'ms' },
    { q: 'Au repos, une ligne UART TTL est à…', type: 'choice', options: ['0 (niveau bas)', '1 (niveau haut)'], correct: 1 },
    { q: 'En RS-232, un « 1 » logique correspond à une tension…', type: 'choice', options: ['positive de +3 à +15 V', 'négative de −3 à −15 V', 'nulle'], correct: 1 },
  ],
  build(c, o) {
    const u = U[((o && o.variant) || 0) % U.length]; const L = mk(c);
    L.p('fg_uart', 'TX', 200, 200, { on: true, baud: u.baud, bits: u.bits, parity: u.parity, stop: u.stop, level: u.level, vhi: u.vhi, vrs: u.vrs || 12, msg: u.msg, every: 0.08, hidden: true });
    L.p('ground', 'GND1', 340, 340); gnd(L, 'TX', 'GND'); laPart(L);
  },
  solve(c, ctx, v) { const u = U[v % U.length]; const L = mk(c); L.w('LA', 'D0', 'TX', 'TX'); L.w('LA', 'GND', 'GND1', 'G'); Object.assign(c.byRef('LA').p, { proto: 'uart', chA: 0, baud: u.baud, bits: u.bits, parity: u.parity, stop: u.stop, tdiv: 1e-3 }); if (u.level === 'rs232') Object.assign(c.byRef('LA').p, { thr: 0, inv: true }); },
  checks: [
    { label: wiredLbl('D0…D7 sur TX'), run: c => chOf(c, 'TX', 'TX') >= 0 && laGnd(c) },
    { label: 'Décodeur UART sélectionné sur la voie où TX est câblée', run: c => proto(c, 'uart') && LA(c).chA === chOf(c, 'TX', 'TX') },
    { label: 'Débit réglé correctement (± 3 %)', run: c => Math.abs(LA(c).baud / uv(c).baud - 1) < 0.03 },
    { label: 'Format de trame correct (bits de données, parité, stops)', run: c => { const u = uv(c), p = LA(c); return +p.bits === u.bits && p.parity === u.parity && +p.stop === u.stop; } },
    { label: 'Niveaux logiques correctement interprétés (seuil, inversion RS-232)', run: c => { const p = LA(c); return uv(c).level === 'rs232' ? (p.inv && Math.abs(p.thr) < 1.5) : (!p.inv && p.thr > 0.5 && p.thr < uv(c).vhi * 0.7); } },
    { label: 'Le message est décodé sans erreur', run: c => { const d = uartDecode(c); const exp = P.parseText(uv(c).msg); const b = d.map(x => x.err ? -1 : x.byte); for (let i = 0; i + exp.length <= b.length; i++) if (same(b.slice(i, i + exp.length), exp)) return true; return false; } },
    noBurn],
  correction: '<p>Une trame UART : <b>start</b> (0), <b>bits de données LSB en premier</b>, bit de <b>parité</b> éventuel, <b>stop(s)</b> (1). Le débit se lit sur le plus petit créneau : T<sub>bit</sub> = 1/débit (9600 bauds → 104 µs ; 115200 → 8,7 µs). Au repos la ligne TTL est à 1.</p><p><b>RS-232</b> : mêmes trames mais <b>niveaux ±12 V et logique inversée</b> (1 = tension négative) : il faut régler le seuil à 0 V et inverser pour décoder.</p><p>Solutions : 9600 8N1 « Bonjour » ; 19200 7E1 « T=23C » ; 4800 8N2 « OK » (3,3 V) ; RS-232 9600 8N1 « RS232 » ; 115200 8O1 « AT ». Une parité ou un format faux provoque des erreurs de décodage : c\'est la méthode pour <b>retrouver le format d\'une liaison inconnue</b>.</p>',
});

/* ============================================================ G2 — Modbus RTU / RS-485 */
const M = [
  { baud: 9600, parity: 'E', stop: 1, addr: 1, func: 3, reg: 0, qty: 2, regs: '230, 1013, 45, 12', lab: 'lecture de 2 registres' },
  { baud: 19200, parity: 'N', stop: 2, addr: 5, func: 6, reg: 3, qty: 500, regs: '0, 0, 0, 0, 0', lab: 'écriture d\'un registre' },
  { baud: 9600, parity: 'E', stop: 1, addr: 12, func: 3, reg: 1, qty: 3, regs: '10, 2500, 1, 77, 4', corrupt: true, lab: 'réponse corrompue' },
  { baud: 19200, parity: 'E', stop: 1, addr: 7, func: 3, reg: 10, qty: 2, regs: '100, 200, 300', lab: 'registre inexistant' },
];
const mv = c => M[c.tp.variant % M.length];
const mf = c => P.modbusFrames(mv(c));
const mbInfo = c => { const m = mv(c), f = mf(c), rsp = f.rsp; const exc = (rsp[1] & 0x80) !== 0; return { addr: m.addr, func: m.func, reg: m.reg, exc, code: exc ? rsp[2] : 0, val: exc ? 0 : (m.func === 6 ? (rsp[4] << 8) | rsp[5] : (rsp[3] << 8) | rsp[4]) }; };
const mbFrames = c => { const p = LA(c); if (!ring(c)) return []; return P.modbusDecode(evs(c, p.chB, p.chA), { baud: p.baud, parity: p.parity, stop: p.stop, sync: sync(c) }, tEnd(c)); };
regScenario({
  id: 'modbus', cat: CAT, diff: 4, title: 'Analyse d\'une trame Modbus RTU sur bus RS-485 (4 cas)', level: 'Bac Pro CIEL (terminale)', duration: '2 h', variants: 4, variantLabel: '↻ Autre échange', ...COMMON,
  refs: 'Bus de terrain ; RS-485 différentiel ; protocole Modbus RTU ; adresse, fonction, registres, CRC16 ; analyse de trames',
  desc: 'Un maître Modbus interroge un esclave sur une liaison <b>RS-485</b> (deux fils A et B, transmission différentielle). Capturez l\'échange à l\'analyseur logique, décodez la <b>requête</b> et la <b>réponse</b>, et diagnostiquez le résultat (réponse valide, CRC erroné ou exception).',
  objectives: ['Comprendre la transmission différentielle RS-485 (A et B, niveau = A − B)', 'Décoder une trame Modbus RTU : adresse, code fonction, données, CRC16', 'Interpréter les fonctions 03 (lecture) et 06 (écriture)', 'Détecter une trame corrompue (CRC) ou une réponse d\'exception'],
  steps: ['Câblez <b>D0 → A</b>, <b>D1 → B</b> et <b>GND → masse</b> sur l\'analyseur logique.', 'Sélectionnez le décodeur <b>Modbus RTU</b> : ligne A = D0, ligne B = D1. Le niveau logique est lu sur <b>A − B</b> : réglez le seuil près de <b>0 V</b>.', 'Trouvez le débit et la parité (le décodeur signale les erreurs de trame/parité). Les silences ≥ 3,5 caractères séparent les trames.', 'Relevez pour la requête : adresse, fonction, adresse du registre, quantité/valeur. Pour la réponse : données, ou code d\'exception, et état du CRC.', 'Répondez aux questions.'],
  questions: [
    { q: 'Adresse de l\'esclave interrogé', answer: c => mbInfo(c).addr, abs: 0.1 },
    { q: 'Code fonction de la requête (décimal)', answer: c => mbInfo(c).func, abs: 0.1 },
    { q: 'Adresse du premier registre concerné', answer: c => mbInfo(c).reg, abs: 0.1 },
    { q: 'Valeur (décimale) du premier registre lu ou écrit (0 si la réponse est une exception)', answer: c => mbInfo(c).val, abs: 0.6 },
    { q: 'Code d\'exception renvoyé par l\'esclave (0 s\'il n\'y en a pas)', answer: c => mbInfo(c).code, abs: 0.1 },
    { q: 'Qualité de la réponse de l\'esclave', type: 'choice', options: ['Réponse normale, CRC correct', 'CRC erroné : trame corrompue', 'Réponse d\'exception (le registre n\'existe pas)'], correct: c => mv(c).corrupt ? 1 : (mbInfo(c).exc ? 2 : 0) },
    { q: 'Débit du bus (en bauds)', answer: c => mv(c).baud, tol: 0.03, unit: 'bauds' },
    { q: 'Pourquoi RS-485 utilise-t-il deux fils A et B (transmission différentielle) ?', type: 'choice', options: ['Pour transmettre deux bits en parallèle', 'Les parasites s\'ajoutent aux deux fils et s\'éliminent dans la différence A − B : bonne immunité sur de longues distances', 'Pour alimenter les esclaves', 'Pour doubler le débit'], correct: 1 },
  ],
  build(c, o) {
    const L = mk(c); const m = M[((o && o.variant) || 0) % M.length];
    L.p('fg_rs485', 'MB', 200, 220, { on: true, baud: m.baud, parity: m.parity, stop: m.stop, addr: m.addr, func: m.func, reg: m.reg, qty: m.qty, regs: m.regs, corrupt: !!m.corrupt, every: 0.3, hidden: true });
    L.p('ground', 'GND1', 340, 360); gnd(L, 'MB', 'GND'); laPart(L);
  },
  solve(c, ctx, v) { const m = M[v % M.length]; const L = mk(c); L.w('LA', 'D0', 'MB', 'A'); L.w('LA', 'D1', 'MB', 'B'); L.w('LA', 'GND', 'GND1', 'G'); Object.assign(c.byRef('LA').p, { proto: 'modbus', chA: 0, chB: 1, baud: m.baud, parity: m.parity, stop: m.stop, thr: 0 }); },
  checks: [
    { label: wiredLbl('D0 sur A, D1 sur B'), run: c => chOf(c, 'MB', 'A') >= 0 && chOf(c, 'MB', 'B') >= 0 && chOf(c, 'MB', 'A') !== chOf(c, 'MB', 'B') && laGnd(c) },
    { label: 'Décodeur Modbus RTU : lignes A et B sur les bonnes voies', run: c => proto(c, 'modbus') && LA(c).chA === chOf(c, 'MB', 'A') && LA(c).chB === chOf(c, 'MB', 'B') },
    { label: 'Seuil différentiel adapté (≈ 0 V, signal ± 1,2 V)', run: c => Math.abs(LA(c).thr) < 0.6 },
    { label: 'Débit et parité corrects', run: c => { const m = mv(c), p = LA(c); return Math.abs(p.baud / m.baud - 1) < 0.03 && p.parity === m.parity && +p.stop === m.stop; } },
    { label: 'La requête du maître et la réponse de l\'esclave sont décodées', run: c => { const f = mbFrames(c), e = mf(c); return f.length >= 2 && f.slice(-2).some(x => same(x.bytes, e.req)) && f.slice(-2).some(x => same(x.bytes, e.rsp)); } },
    noBurn],
  correction: '<p><b>RS-485</b> : paire différentielle A/B ; l\'information est la tension <b>A − B</b> (≈ ±1,2 V ici autour de 2,5 V) : le décodeur compare les deux lignes. <b>Trame Modbus RTU</b> : adresse (1 octet) · fonction (1) · données · CRC16 (2, poids faible d\'abord). Fonction 03 : requête « adresse registre + quantité » ; réponse « nb d\'octets + valeurs (16 bits, poids fort d\'abord) ». Fonction 06 : écho de la requête. <b>Exception</b> : fonction | 0x80 suivie d\'un code (02 = adresse de donnée illégale). Un <b>CRC</b> faux signale une trame altérée (parasites, mauvais câblage).</p><p>Cas : lecture de 2 registres à l\'adresse 1 (230 puis 1013) ; écriture du registre 3 de l\'esclave 5 à 500 ; réponse corrompue (CRC faux) de l\'esclave 12 ; esclave 7 : lecture au registre 10 inexistant → exception 0x83 code 02.</p>',
});

/* ============================================================ G3 — I²C */
const I = [
  { freq: 100000, addr: 0x48, rw: 'W', data: '01 A5', ack: 'oui', pullup: '4k7', vhi: 3.3, lab: 'capteur de température, écriture' },
  { freq: 400000, addr: 0x3C, rw: 'W', data: '00 AF', ack: 'oui', pullup: 'none', vhi: 3.3, lab: 'afficheur, résistances à câbler' },
  { freq: 100000, addr: 0x68, rw: 'R', data: '12 34', ack: 'oui', pullup: '4k7', vhi: 3.3, lab: 'horloge RTC, lecture' },
  { freq: 100000, addr: 0x27, rw: 'W', data: '0F', ack: 'non', pullup: '4k7', vhi: 3.3, lab: 'esclave absent' },
];
const iv = c => I[c.tp.variant % I.length];
const i2cTr = c => { const p = LA(c); if (!ring(c)) return []; return P.i2cDecode(evs(c, p.chA), evs(c, p.chB)); };
const hasPull = (c, ln) => { const n = c.net('I2C', ln), vs = c.net('AL1', '+'); return c.c.parts.some(p => p.type === 'resistor' && (() => { const a = c.net(p.ref, 'A'), b = c.net(p.ref, 'B'); const r = c.el(p.ref).value(); return r >= 1000 && r <= 20000 && ((a === n && b === vs) || (b === n && a === vs)); })()); };
regScenario({
  id: 'i2c', cat: CAT, diff: 4, title: 'Analyse d\'un bus I²C : adresse, ACK, résistances de rappel (4 cas)', level: 'Bac Pro CIEL (terminale)', duration: '1 h 45', variants: 4, variantLabel: '↻ Autre cas', ...COMMON,
  refs: 'Bus série synchrone I²C ; START / STOP ; adresse 7 bits ; ACK / NACK ; sortie à drain ouvert ; résistances de rappel',
  desc: 'Un maître I²C communique avec un esclave sur deux lignes : <b>SCL</b> (horloge) et <b>SDA</b> (données). Capturez la transaction, décodez adresse et données et diagnostiquez : esclave présent (ACK) ou absent (NACK) ? Certains cas demandent de câbler les <b>résistances de rappel</b> (bus à drain ouvert).',
  objectives: ['Câbler l\'analyseur sur SCL et SDA', 'Reconnaître START (SDA↓ pendant SCL = 1), STOP, ACK / NACK', 'Décoder l\'adresse 7 bits et le bit R/W, puis les données', 'Comprendre pourquoi le bus I²C exige des résistances de rappel (pull-up)'],
  steps: ['Câblez <b>D0 → SCL</b>, <b>D1 → SDA</b>, <b>GND → masse</b>. Si le bus est « à plat » (aucun signal haut), il manque des <b>résistances de rappel</b> : reliez SCL et SDA au +3,3 V par R<sub>P1</sub>, R<sub>P2</sub> (4,7 kΩ).', 'Décodeur <b>I²C</b> : SCL = D0, SDA = D1. Seuil 1,65 V.', 'Lisez : adresse 7 bits, bit R/W, ACK de l\'esclave, octets de données.', 'Mesurez la période de SCL pour en déduire la fréquence du bus.', 'Répondez aux questions.'],
  questions: [
    { q: 'Adresse 7 bits de l\'esclave (décimal)', answer: c => iv(c).addr, abs: 0.1, hint: 'Ex. 0x48 = 72.' },
    { q: 'Premier octet envoyé après le START (adresse + R/W), en décimal', answer: c => (iv(c).addr << 1) | (iv(c).rw === 'R' ? 1 : 0), abs: 0.1 },
    { q: 'Sens du transfert', type: 'choice', options: ['Écriture (le maître envoie des données)', 'Lecture (le maître reçoit des données)'], correct: c => iv(c).rw === 'R' ? 1 : 0 },
    { q: 'Réponse à l\'adresse', type: 'choice', options: ['ACK : l\'esclave répond', 'NACK : personne ne répond à cette adresse'], correct: c => iv(c).ack === 'non' ? 1 : 0 },
    { q: 'Nombre d\'octets de données transférés après l\'adresse', answer: c => iv(c).ack === 'non' ? 0 : P.parseHex(iv(c).data).length, abs: 0.1 },
    { q: 'Valeur (décimale) du premier octet de données (0 s\'il n\'y en a pas)', answer: c => iv(c).ack === 'non' ? 0 : P.parseHex(iv(c).data)[0], abs: 0.1 },
    { q: 'Fréquence de l\'horloge SCL (en kHz)', answer: c => iv(c).freq / 1000, tol: 0.06, unit: 'kHz' },
    { q: 'Pourquoi SCL et SDA ont-elles besoin de résistances de rappel ?', type: 'choice', options: ['Pour limiter le courant dans les LED', 'Les sorties sont à drain ouvert : elles ne savent que tirer la ligne à 0, la résistance la ramène à 1', 'Pour filtrer les parasites', 'Pour adapter l\'impédance'], correct: 1 },
  ],
  build(c, o) {
    const m = I[((o && o.variant) || 0) % I.length]; const L = mk(c);
    L.p('fg_i2c', 'I2C', 200, 220, { on: true, freq: m.freq, addr: m.addr, rw: m.rw, data: m.data, ack: m.ack, pullup: m.pullup, vhi: m.vhi, every: 0.05, hidden: true });
    L.p('ground', 'GND1', 340, 380); gnd(L, 'I2C', 'GND'); laPart(L);
    if (m.pullup === 'none') { L.p('psu', 'AL1', 80, 400, { V: 3.3, Ilim: 0.1 }); L.w('AL1', '−', 'GND1', 'G'); R(L, 'RP1', 360, 80, 4700, 90); R(L, 'RP2', 440, 80, 4700, 90); }
  },
  solve(c, ctx, v) { const m = I[v % I.length]; const L = mk(c); L.w('LA', 'D0', 'I2C', 'SCL'); L.w('LA', 'D1', 'I2C', 'SDA'); L.w('LA', 'GND', 'GND1', 'G'); Object.assign(c.byRef('LA').p, { proto: 'i2c', chA: 0, chB: 1 }); if (m.pullup === 'none') { L.w('RP1', 'A', 'AL1', '+'); L.w('RP1', 'B', 'I2C', 'SCL'); L.w('RP2', 'A', 'AL1', '+'); L.w('RP2', 'B', 'I2C', 'SDA'); } },
  checks: [
    { label: wiredLbl('D0 sur SCL, D1 sur SDA'), run: c => chOf(c, 'I2C', 'SCL') >= 0 && chOf(c, 'I2C', 'SDA') >= 0 && chOf(c, 'I2C', 'SCL') !== chOf(c, 'I2C', 'SDA') && laGnd(c) },
    { label: 'Bus à drain ouvert : résistances de rappel (1 à 20 kΩ) sur SCL et SDA', run: c => iv(c).pullup !== 'none' || (hasPull(c, 'SCL') && hasPull(c, 'SDA')) },
    { label: 'Décodeur I²C : SCL et SDA sur les bonnes voies', run: c => proto(c, 'i2c') && LA(c).chA === chOf(c, 'I2C', 'SCL') && LA(c).chB === chOf(c, 'I2C', 'SDA') },
    { label: 'La transaction est décodée (adresse, R/W, ACK, données)', run: c => { const t = i2cTr(c); if (!t.length) return false; const x = t[t.length - 1], m = iv(c); if (x.addr !== m.addr || (x.rw || 'W') !== m.rw) return false; if (m.ack === 'non') return !x.ack; return x.ack && same(x.bytes.map(b => b.v), P.parseHex(m.data)); } },
    noBurn],
  correction: '<p><b>START</b> : SDA passe à 0 alors que SCL = 1. Puis 7 bits d\'adresse (MSB d\'abord) + <b>R/W</b> (0 écriture, 1 lecture) + bit <b>ACK</b> (l\'esclave tire SDA à 0). Les octets suivants sont aussi suivis d\'un ACK. <b>STOP</b> : SDA passe à 1 alors que SCL = 1. SDA ne change que quand SCL est bas (sauf START/STOP).</p><p>Les sorties étant à <b>drain ouvert</b>, le niveau haut est fourni par des <b>résistances de rappel</b> (≈ 4,7 kΩ à 100 kHz). Sans elles, le bus reste « à plat ». <b>NACK</b> sur l\'adresse : aucun esclave ne répond (mauvaise adresse, composant absent ou non alimenté).</p><p>Cas : 0x48 écriture 01 A5 ; 0x3C (afficheur) 00 AF à 400 kHz ; 0x68 lecture 12 34 ; 0x27 absent → NACK.</p>',
});

/* ============================================================ G4 — SPI */
const S = [
  { mode: 0, freq: 100000, data: 'A5 3C 00', reply: '00 12 34' },
  { mode: 1, freq: 100000, data: '9F 00 00', reply: '00 EF 40' },
  { mode: 2, freq: 1000000, data: '03 00 10', reply: '00 00 7E' },
  { mode: 3, freq: 100000, data: 'D0 00', reply: '00 58' },
];
const sv = c => S[c.tp.variant % S.length];
const spiTr = c => { const p = LA(c); if (!ring(c)) return []; return P.spiDecode({ cs: evs(c, p.chA), clk: evs(c, p.chB), mosi: evs(c, p.chC), miso: evs(c, p.chD) }, p.mode, 8); };
regScenario({
  id: 'spi', cat: CAT, diff: 4, title: 'Analyse d\'un bus SPI : retrouver le mode (CPOL / CPHA) (4 cas)', level: 'Bac Pro CIEL (terminale)', duration: '1 h 30', variants: 4, variantLabel: '↻ Autre mode', ...COMMON,
  refs: 'Bus série synchrone SPI ; signaux CS, SCK, MOSI, MISO ; modes 0 à 3 (polarité et phase d\'horloge)',
  desc: 'Un maître SPI échange des octets avec un esclave. Le <b>mode SPI</b> (CPOL, CPHA) est inconnu : un mauvais mode donne des octets décalés ou faux. Observez le niveau de repos de SCK et le front d\'échantillonnage, trouvez le mode et décodez les données.',
  objectives: ['Câbler les 4 signaux SPI à l\'analyseur (CS, SCK, MOSI, MISO)', 'Déterminer CPOL (niveau de repos de SCK) et CPHA (front d\'échantillonnage)', 'Décoder les octets envoyés (MOSI) et reçus (MISO)', 'Comprendre le rôle de CS (sélection de l\'esclave)'],
  steps: ['Câblez <b>D0 → CS</b>, <b>D1 → SCK</b>, <b>D2 → MOSI</b>, <b>D3 → MISO</b>, <b>GND → masse</b>.', 'Observez SCK quand CS est à 1 (repos) : niveau haut ou bas ? C\'est <b>CPOL</b>.', 'Observez à quel front de SCK les données sont stables : au 1<sup>er</sup> front (CPHA = 0) ou au 2<sup>e</sup> (CPHA = 1) ? Mode = 2·CPOL + CPHA.', 'Choisissez le décodeur SPI et essayez les modes jusqu\'à obtenir des octets cohérents (aucun bit incomplet).', 'Répondez aux questions.'],
  questions: [
    { q: 'Niveau de repos de SCK (CPOL) : 0 si bas, 1 si haut', answer: c => (sv(c).mode >> 1) & 1, abs: 0.1 },
    { q: 'Phase d\'échantillonnage CPHA : 0 (1<sup>er</sup> front) ou 1 (2<sup>e</sup> front)', answer: c => sv(c).mode & 1, abs: 0.1 },
    { q: 'Mode SPI (0 à 3)', answer: c => sv(c).mode, abs: 0.1 },
    { q: 'Premier octet envoyé par le maître sur MOSI (en décimal)', answer: c => P.parseHex(sv(c).data)[0], abs: 0.1, hint: 'Ex. 0xA5 = 165.' },
    { q: 'Nombre d\'octets échangés pendant que CS est actif', answer: c => P.parseHex(sv(c).data).length, abs: 0.1 },
    { q: 'Dernier octet reçu sur MISO (en décimal)', answer: c => { const r = P.parseHex(sv(c).reply); return r[r.length - 1]; }, abs: 0.1 },
    { q: 'Fréquence de l\'horloge SCK (en kHz)', answer: c => sv(c).freq / 1000, tol: 0.06, unit: 'kHz' },
    { q: 'À quoi sert la ligne CS (chip select) ?', type: 'choice', options: ['À fournir l\'horloge', 'À sélectionner l\'esclave : il ne communique que lorsque CS est à 0', 'À transmettre les données du maître', 'À alimenter l\'esclave'], correct: 1 },
  ],
  build(c, o) {
    const m = S[((o && o.variant) || 0) % S.length]; const L = mk(c);
    L.p('fg_spi', 'SPI', 200, 240, { on: true, freq: m.freq, mode: m.mode, data: m.data, reply: m.reply, vhi: 3.3, every: 0.05, hidden: true });
    L.p('ground', 'GND1', 340, 400); gnd(L, 'SPI', 'GND'); laPart(L);
  },
  solve(c, ctx, v) { const m = S[v % S.length]; const L = mk(c); L.w('LA', 'D0', 'SPI', 'CS'); L.w('LA', 'D1', 'SPI', 'SCK'); L.w('LA', 'D2', 'SPI', 'MOSI'); L.w('LA', 'D3', 'SPI', 'MISO'); L.w('LA', 'GND', 'GND1', 'G'); Object.assign(c.byRef('LA').p, { proto: 'spi', chA: 0, chB: 1, chC: 2, chD: 3, mode: m.mode }); },
  checks: [
    { label: wiredLbl('D0 CS, D1 SCK, D2 MOSI, D3 MISO'), run: c => ['CS', 'SCK', 'MOSI', 'MISO'].every(n => chOf(c, 'SPI', n) >= 0) && laGnd(c) },
    { label: 'Décodeur SPI : CS, SCK, MOSI, MISO sur les bonnes voies', run: c => { const p = LA(c); return proto(c, 'spi') && p.chA === chOf(c, 'SPI', 'CS') && p.chB === chOf(c, 'SPI', 'SCK') && p.chC === chOf(c, 'SPI', 'MOSI') && p.chD === chOf(c, 'SPI', 'MISO'); } },
    { label: 'Mode SPI correct (CPOL / CPHA)', run: c => +LA(c).mode === sv(c).mode },
    { label: 'Les octets MOSI et MISO sont décodés sans bit incomplet', run: c => { const t = spiTr(c); if (!t.length) return false; const x = t[t.length - 1]; return !x.partial && same(x.mosi, P.parseHex(sv(c).data)) && same(x.miso, P.parseHex(sv(c).reply)); } },
    noBurn],
  correction: '<p><b>CPOL</b> = niveau de repos de SCK (0 bas, 1 haut). <b>CPHA</b> = 0 : l\'esclave échantillonne au <i>premier</i> front de SCK (la donnée est présentée avant) ; CPHA = 1 : au <i>second</i> front. <b>Mode = 2·CPOL + CPHA</b> : mode 0 (0,0), 1 (0,1), 2 (1,0), 3 (1,1). Les octets sont transmis <b>MSB en premier</b>, simultanément sur MOSI (maître → esclave) et MISO (esclave → maître), tant que CS est à 0.</p><p>Un mauvais mode décale les bits d\'un demi-période : les octets décodés sont faux ou incomplets. Cas : mode 0 « A5 3C 00 » ; mode 1 « 9F 00 00 » ; mode 2 « 03 00 10 » à 1 MHz ; mode 3 « D0 00 ».</p>',
});
})(typeof window !== 'undefined' ? window : globalThis);
