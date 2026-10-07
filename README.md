# ElectroLab — simulateur de circuits électroniques (Bac Pro CIEL)

Simulateur **hors ligne** (HTML/CSS/JS pur, aucune dépendance) : éditeur de schémas, moteur de simulation réaliste, instruments de mesure et TP corrigés.

## Lancer
- Ouvrir `dist/electrolab.html` (fichier unique autonome) **ou** `index.html` (sources).
- Menu **TP ▾** → choisir un TP ; **Mode enseignant** révèle la panne injectée ; **? Aide** affiche la matrice de couverture du référentiel.

## Contenu
| Domaine | Détail |
|---|---|
| Moteur | Analyse nodale modifiée (MNA), LU creuse-dense, Newton-Raphson avec limitation SPICE (pnjlim), Euler implicite à pas adaptatif, cache LU pour circuits linéaires |
| Composants | R, LDR, CTN, potentiomètre, C (ESR, électrolytique polarisé), L, transformateur (couplé), diode / Zener / LED, BJT (Ebers-Moll + Early + avalanche), AOP, régulateur 78xx (protection thermique), relais (hystérésis, bobine inductive), lampe (inertie thermique), fusible (modèle thermique), interrupteur, bouton poussoir ; **circuits intégrés** : portes logiques (ET, OU, NON-ET, NON-OU, OU-X, NON, buffer, trigger de Schmitt ; familles 74HC / 74LS / CD4000), bascule D, compteur 4 bits, **NE555 / TLC555**, **optocoupleurs** (PC817, PC817C, 4N25), **MOSFET** N et P (2N7000, IRF540N, IRLZ44N, BS250, IRF9540N) |
| Sources | Alimentation de labo (CV/CC), GBF, pile, secteur 230 V ; **générateurs de trames** : UART / RS-232 (±12 V), RS-485 Modbus RTU (maître + esclave, CRC16), I²C (ACK / NACK, pull-up), SPI (modes 0 à 3) |
| Mesure | Multimètre (V⎓, V∿, mA, A, Ω, diode, continuité ; 10 MΩ, shunt, **fusible interne**), oscilloscope 2 voies (déclenchement, couplage AC, mesures auto), **analyseur logique 8 voies** (chronogrammes, curseurs, seuil, déclenchement, décodeurs UART / RS-232, Modbus RTU, I²C, SPI) |
| Thermographie | Bouton « 🌡 Thermographie » : température estimée de chaque composant (puissance dissipée / admissible, inertie thermique), palette de caméra thermique |
| Pannes | Défauts injectables (ouvert, court-circuit, dérive, électrolytique séché, …), destruction thermique/électrique, pannes en cascade |

## TP (31 TP, avec variantes)
1 · Lois fondamentales : `ohm`, `assoc`, `kirchhoff`, `diviseur`, `puissance`, `led`, `rc`, `signaux`, `filtre`
2 · Composants : `test`, `zener`, `transistor`, `relais`
3 · Alimentations : `transfo`, `redress`, `filtrage`, `regul`
4 · Dépannage : `dep1` (alimentation 5 V, 7 pannes), `dep2` (platine transistor, 6 pannes), `dep3` (AOP, 4 pannes)
5 · Amplification : `inverseur`, `cre` (interrupteur crépusculaire)
6 · Circuits intégrés & numérique : `portes` (6 portes), `ne555` (4 fréquences), `opto` (3 optocoupleurs), `mosfet` (2 cas) + `dep_log` (dépannage logique, 5 pannes, catégorie Dépannage)
7 · Communication série : `uart` (5 liaisons dont RS-232), `modbus` (4 échanges : lecture, écriture, CRC faux, exception), `i2c` (4 cas dont NACK et pull-up manquantes), `spi` (4 modes) — les paramètres de l'émetteur sont masqués, l'élève les retrouve à l'analyseur logique

Chaque TP : sujet, objectifs, questions (numériques, QCM, choix de composant, texte), vérification automatique du câblage et du fonctionnement, correction.

## Développement
```
node tests/t_engine.js     # validation du moteur (cas analytiques)
node tests/t_ic.js         # portes, 555, opto, MOSFET
node tests/t_proto.js      # générateurs et décodeurs de protocoles
node tests/t_frames.js     # générateurs + analyseur logique dans le simulateur
node tests/t_sc.js [id]    # tous les TP : construction → vérifs « avant » → solution → vérifs « après »
node tools/build.js        # génère dist/electrolab.html
node tests/ui_interact.js  # test souris réel (Playwright)
```
Arborescence : `js/engine.js` (MNA) · `models.js` (composants) · `parts.js` (catalogue, symboles) · `circuit.js` · `editor*.js` · `instruments.js` · `app.js` · `scenarios.js` + `tp_*.js` · `models_ic.js` / `parts_ic.js` (circuits intégrés) · `protocols.js` / `models_frames.js` / `parts_frames.js` / `instruments_logic.js` (trames et analyseur) · `coverage.js`.

## Référentiel
La matrice de couverture (`js/coverage.js`) a été établie de mémoire : **à valider** avec le référentiel officiel du Bac Pro CIEL.
