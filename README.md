# ElectroLab — simulateur de circuits électroniques (Bac Pro CIEL)

Simulateur **hors ligne** (HTML/CSS/JS pur, aucune dépendance) : éditeur de schémas, moteur de simulation réaliste, instruments de mesure et TP corrigés.

## Lancer
- Ouvrir `dist/electrolab.html` (fichier unique autonome) **ou** `index.html` (sources).
- Menu **TP ▾** → choisir un TP ; **Mode enseignant** révèle la panne injectée ; **? Aide** affiche la matrice de couverture du référentiel.

## Contenu
| Domaine | Détail |
|---|---|
| Moteur | Analyse nodale modifiée (MNA), LU creuse-dense, Newton-Raphson avec limitation SPICE (pnjlim), Euler implicite à pas adaptatif, cache LU pour circuits linéaires |
| Composants | R, LDR, CTN, potentiomètre, C (ESR, électrolytique polarisé), L, transformateur (couplé), diode / Zener / LED, BJT (Ebers-Moll + Early + avalanche), AOP, régulateur 78xx (protection thermique), relais (hystérésis, bobine inductive), lampe (inertie thermique), fusible (modèle thermique), interrupteur, bouton poussoir |
| Sources | Alimentation de labo (CV/CC), GBF, pile, secteur 230 V |
| Mesure | Multimètre (V⎓, V∿, mA, A, Ω, diode, continuité ; 10 MΩ, shunt, **fusible interne**), oscilloscope 2 voies (déclenchement, couplage AC, mesures auto) |
| Pannes | Défauts injectables (ouvert, court-circuit, dérive, électrolytique séché, …), destruction thermique/électrique, pannes en cascade |

## TP (22 TP, avec variantes)
1 · Lois fondamentales : `ohm`, `assoc`, `kirchhoff`, `diviseur`, `puissance`, `led`, `rc`, `signaux`, `filtre`
2 · Composants : `test`, `zener`, `transistor`, `relais`
3 · Alimentations : `transfo`, `redress`, `filtrage`, `regul`
4 · Dépannage : `dep1` (alimentation 5 V, 7 pannes), `dep2` (platine transistor, 6 pannes), `dep3` (AOP, 4 pannes)
5 · Amplification : `inverseur`, `cre` (interrupteur crépusculaire)

Chaque TP : sujet, objectifs, questions (numériques, QCM, choix de composant, texte), vérification automatique du câblage et du fonctionnement, correction.

## Développement
```
node tests/t_engine.js     # validation du moteur (cas analytiques)
node tests/t_sc.js [id]    # tous les TP : construction → vérifs « avant » → solution → vérifs « après »
node tools/build.js        # génère dist/electrolab.html
node tests/ui_interact.js  # test souris réel (Playwright)
```
Arborescence : `js/engine.js` (MNA) · `models.js` (composants) · `parts.js` (catalogue, symboles) · `circuit.js` · `editor*.js` · `instruments.js` · `app.js` · `scenarios.js` + `tp_*.js` · `coverage.js`.

## Référentiel
La matrice de couverture (`js/coverage.js`) a été établie de mémoire : **à valider** avec le référentiel officiel du Bac Pro CIEL.
