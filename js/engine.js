/* engine.js — moteur de simulation : analyse nodale modifiée (MNA), Newton-Raphson,
   intégration d'Euler implicite à pas adaptatif.  Indépendant de l'interface. */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
const VT = 0.025852;                      // tension thermique à 300 K
NS.VT = VT;
/* exponentielle prolongée linéairement (évite les débordements) */
NS.sexp = x => x > 100 ? 2.6881171418161356e43 * (1 + x - 100) : Math.exp(x);
const GMIN = 1e-12;

class Engine {
  constructor() {
    this.t = 0; this.els = []; this.N = 0; this.nNodes = 1; this.hasNL = false;
    this.key = ''; this.warn = null; this.x = new Float64Array(0); this.xp = this.x;
    this.stats = { steps: 0, iters: 0, fails: 0 }; this.onEvent = null; this.h = 1e-6;
    this.dtMax = 1e-2; this.dtMin = 1e-8; this.dtNext = 1e-6; this.lastDelta = 0;
  }
  /* els : éléments dont .nodes sont des numéros de nœuds globaux (0 = masse) */
  build(els, nNodes) {
    this.els = els; this.nNodes = Math.max(1, nNodes);
    let next = this.nNodes - 1;
    for (const e of els) {
      e.ix = e.nodes.map(k => k - 1);
      e.ii = []; for (let i = 0; i < (e.nInt || 0); i++) e.ii.push(next++);
      e.br = []; for (let i = 0; i < (e.nBr || 0); i++) e.br.push(next++);
    }
    const N = this.N = next;
    this.A = new Float64Array(N * N); this.Alin = new Float64Array(N * N); this.LU = new Float64Array(N * N);
    this.piv = new Int32Array(N); this.b = new Float64Array(N); this.blin = new Float64Array(N);
    this.x = new Float64Array(N); this.xp = new Float64Array(N); this.xo = new Float64Array(N);
    this.hasNL = els.some(e => e.nl);
    this.key = ''; this.warn = null;
    for (const e of els) if (e.attach) e.attach(this);
    this.recomputeDtMax();
  }
  recomputeDtMax() {
    let T = Infinity;
    for (const e of this.els) if (e.period) { const p = e.period(); if (p > 0 && p < T) T = p; }
    this.hasAC = isFinite(T);
    this.dtMax = isFinite(T) ? Math.min(T / 250, 1e-2) : 2e-2;
    this.dtMin = Math.min(1e-8, this.dtMax / 100);
    if (this.dtNext > this.dtMax) this.dtNext = this.dtMax;
  }
  /* --- primitives de remplissage (indices d'inconnues, -1 = masse) --- */
  add(i, j, v) { if (i >= 0 && j >= 0) this.A[i * this.N + j] += v; }
  cond(a, b, G) { if (a >= 0) this.A[a * this.N + a] += G; if (b >= 0) this.A[b * this.N + b] += G; if (a >= 0 && b >= 0) { this.A[a * this.N + b] -= G; this.A[b * this.N + a] -= G; } }
  rhs(i, v) { if (i >= 0) this.b[i] += v; }
  /* linéarisation d'un multipôle non linéaire : courants ENTRANT I0[k] au point v0, jacobienne J[k][j] */
  nlStamp(nodes, I0, J, v0) {
    for (let r = 0; r < nodes.length; r++) { let sum = 0; for (let c = 0; c < nodes.length; c++) { this.add(nodes[r], nodes[c], J[r][c]); sum += J[r][c] * v0[c]; } this.rhs(nodes[r], sum - I0[r]); }
  }
  v(i) { return i < 0 ? 0 : this.x[i]; }        // solution courante (itération)
  vp(i) { return i < 0 ? 0 : this.xp[i]; }      // dernier pas accepté
  /* --- algèbre linéaire dense (LU, pivot partiel) --- */
  static factor(LU, piv, N) {
    for (let k = 0; k < N; k++) {
      let p = k, mx = Math.abs(LU[k * N + k]);
      for (let i = k + 1; i < N; i++) { const a = Math.abs(LU[i * N + k]); if (a > mx) { mx = a; p = i; } }
      piv[k] = p;
      if (mx < 1e-300) return false;
      if (p !== k) for (let j = 0; j < N; j++) { const t = LU[k * N + j]; LU[k * N + j] = LU[p * N + j]; LU[p * N + j] = t; }
      const d = LU[k * N + k];
      for (let i = k + 1; i < N; i++) {
        const f = LU[i * N + k] / d; LU[i * N + k] = f;
        if (f !== 0) for (let j = k + 1; j < N; j++) LU[i * N + j] -= f * LU[k * N + j];
      }
    }
    return true;
  }
  static solve(LU, piv, N, b, x) {
    for (let i = 0; i < N; i++) x[i] = b[i];
    for (let k = 0; k < N; k++) { const p = piv[k]; if (p !== k) { const t = x[k]; x[k] = x[p]; x[p] = t; } }
    for (let k = 0; k < N; k++) { const xk = x[k]; if (xk !== 0) for (let i = k + 1; i < N; i++) x[i] -= LU[i * N + k] * xk; }
    for (let i = N - 1; i >= 0; i--) { let s = x[i]; for (let j = i + 1; j < N; j++) s -= LU[i * N + j] * x[j]; x[i] = s / LU[i * N + i]; }
  }
  signature(h) { let s = h.toPrecision(6); for (const e of this.els) s += '|' + (e.ver || 0); return s; }
  /* --- un pas de temps de durée h ; renvoie true si convergé --- */
  tryStep(h) {
    const N = this.N, A = this.A, b = this.b, t1 = this.t + h; this.h = h; this.t1 = t1;
    if (N === 0) return true;
    for (const e of this.els) if (e.beginStep) e.beginStep(this, h, t1);
    const key = this.signature(h);
    if (key !== this.key) {
      this.key = key; this.Alin.fill(0); const sv = this.A; this.A = this.Alin;
      for (let i = 0; i < this.nNodes - 1; i++) this.A[i * N + i] += GMIN;
      for (const e of this.els) if (e.stampLin) e.stampLin(this, h);
      this.A = sv; this.linOK = true;
      if (!this.hasNL) { this.LU.set(this.Alin); this.linOK = Engine.factor(this.LU, this.piv, N); }
    }
    this.blin.fill(0); const sb = this.b; this.b = this.blin;
    for (const e of this.els) if (e.rhsLin) e.rhsLin(this, h, t1);
    this.b = sb;
    if (!this.hasNL) {
      if (!this.linOK) { this.warn = 'Matrice singulière'; return false; }
      Engine.solve(this.LU, this.piv, N, this.blin, this.x);
      for (let i = 0; i < N; i++) if (!isFinite(this.x[i])) { this.warn = 'Résultat non numérique'; return false; }
      this.stats.iters++; return true;
    }
    this.x.set(this.xp);
    const nv = this.nNodes - 1;
    for (let it = 0; it < 80; it++) {
      this.A.set(this.Alin); this.b.set(this.blin); this.noncon = false;
      this.xo.set(this.x);
      for (const e of this.els) if (e.nl) e.stampNL(this, h, it);
      this.LU.set(this.A);
      if (!Engine.factor(this.LU, this.piv, N)) { this.warn = 'Matrice singulière'; return false; }
      Engine.solve(this.LU, this.piv, N, this.b, this.x);
      this.stats.iters++;
      let ok = it > 0 && !this.noncon;
      for (let i = 0; i < N; i++) {
        const xn = this.x[i], xo = this.xo[i];
        if (!isFinite(xn)) { this.warn = 'Résultat non numérique'; return false; }
        if (ok) { const tol = 1e-4 * Math.max(Math.abs(xn), Math.abs(xo)) + (i < nv ? 1e-7 : 1e-10); if (Math.abs(xn - xo) > tol) ok = false; }
      }
      if (ok) return true;
      if (it >= 30) { const al = it < 50 ? 0.5 : it < 65 ? 0.25 : 0.1; for (let i = 0; i < N; i++) this.x[i] = this.xo[i] + al * (this.x[i] - this.xo[i]); }
    }
    return false;
  }
  /* avance de h ; réduit le pas en cas de non-convergence */
  step(h) {
    let hh = h, ok = false;
    for (let k = 0; k < 7; k++) {
      ok = this.tryStep(hh);
      if (ok) break;
      this.stats.fails++; hh /= 4; if (hh < 1e-12) break;
    }
    if (!ok) { this.warn = this.warn || 'Non-convergence'; this.x.set(this.xp); hh = h; this.stats.bad = (this.stats.bad || 0) + 1; }
    else if (this.warn && this.warn !== 'Matrice singulière') this.warn = null;
    // variation maximale des tensions de nœuds (critère de pas adaptatif)
    let dmax = 0, vmax = 0; const nv = this.nNodes - 1;
    for (let i = 0; i < nv; i++) { const d = Math.abs(this.x[i] - this.xp[i]); if (d > dmax) dmax = d; const a = Math.abs(this.x[i]); if (a > vmax) vmax = a; }
    this.lastDelta = dmax;
    this.t += hh; this.h = hh; this.dtCap = Infinity;
    for (const e of this.els) if (e.accept) e.accept(this, hh);
    this.xp.set(this.x); this.stats.steps++;
    // choix du pas suivant
    if (this.hasAC && !this.eventDt) this.dtNext = Math.min(this.dtMax, hh * 2);
    else {
      const lim = 2e-3 + 2e-3 * vmax;
      if (dmax > lim) this.dtNext = Math.max(this.dtMin, hh * 0.5);
      else if (dmax < lim * 0.25) this.dtNext = Math.min(this.dtMax, hh * 1.3);
    }
    if (this.dtCap < this.dtNext) this.dtNext = Math.max(this.dtMin, this.dtCap);   // les circuits à seuils (555, logique) demandent des pas fins près d'un basculement
    if (this.dtNext > this.dtMax) this.dtNext = this.dtMax;
    return ok;
  }
  /* « choc » : un élément ou l'utilisateur a changé quelque chose → on repart avec de petits pas */
  kick() { this.dtNext = Math.min(this.dtNext, 2e-6); }
  /* avance la simulation de dT secondes simulées (borné par le budget temps réel en ms) */
  advance(dT, budgetMs) {
    const tEnd = this.t + dT, t0 = Date.now(); let n = 0;
    while (this.t < tEnd - 1e-15) {
      // pas courant, jamais inférieur à dtMin (sinon un pas « reste de trame » minuscule faisait avaler toute la trame suivante en un seul pas de 16 ms)
      const dn = Math.max(this.dtNext, this.dtMin); let h = Math.min(dn, tEnd - this.t); if (h <= 0) break;
      this.step(h);
      if (h < dn * 0.5) this.dtNext = Math.max(this.dtNext, Math.min(dn, this.dtCap));   // pas tronqué par la fin de la trame d'affichage : on garde le pas précédent
      if ((++n & 31) === 0 && budgetMs && Date.now() - t0 > budgetMs) break;
    }
    return this.t;
  }
}
NS.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
