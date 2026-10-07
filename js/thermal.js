/* thermal.js — températures estimées des composants (« caméra thermique ») */
(function (g) {
'use strict';
const NS = g.NS; const T0 = 25;
/* cible : température d'équilibre selon la puissance dissipée / la puissance admissible */
function target(p, el) {
  const q = el.p || {}; const ratio = (P, Pn, dT) => T0 + (dT || 75) * Math.max(0, P) / Pn;
  switch (p.type) {
    case 'resistor': case 'ldr': case 'ctn': case 'pot': return { T: ratio(el.P || 0, p.type === 'resistor' ? (q.W || 0.25) : 0.25), tau: 4 };
    case 'diode': return { T: ratio(Math.abs((el.V || 0) * (el.I || 0)), (q.Imax || 1) * 0.9), tau: 4 };
    case 'led': return { T: ratio(Math.abs((el.V || 0) * (el.I || 0)), 0.06), tau: 3 };
    case 'zener': return { T: ratio(Math.abs((el.V || 0) * (el.I || 0)), q.Pz || 0.5), tau: 4 };
    case 'bjt': return { T: ratio(Math.abs((el.Vce || 0) * (el.Ic || 0)) + Math.abs((el.Vbe || 0) * (el.Ib || 0)), q.Pmax || 0.5), tau: 4 };
    case 'regulator': return { T: el.T !== undefined ? el.T : T0, tau: 0 };
    case 'transformer': return { T: ratio((el.I1 || 0) ** 2 * (q.Rp || 0) + (el.I2 || 0) ** 2 * (q.Rs || 0), (q.VA || 5) * 0.25), tau: 12 };
    case 'capacitor': return { T: ratio((el.I || 0) ** 2 * ((el.q && el.q.esr) || q.esr || 0), 0.25, 60), tau: 6 };
    case 'inductor': return { T: ratio((el.I || 0) ** 2 * (q.R || 0), Math.max(1e-6, (q.Imax || 1) ** 2 * (q.R || 0.1))), tau: 6 };
    case 'fuse': if (p.burnt || p.fault === 'blown') return { T: T0, tau: 2 }; return { T: T0 + 70 * ((el.s && el.s.ms) || 0) / (q.I * q.I), tau: 2 };
    case 'lamp': return { T: T0 + 130 * (el.bright || 0), tau: 1 };
    case 'relay': return { T: ratio((el.I || 0) ** 2 * q.Rc, (q.V * q.V / q.Rc) || 0.4, 40), tau: 8 };
    case 'opamp': return { T: T0 + 10 * Math.abs(el.Iout || 0) / 0.02, tau: 4 };
    case 'gate': case 'inv': case 'dff': case 'cnt4': return { T: T0 + 8 + 60 * Math.max(0, Math.abs(el.Iout || 0)) / 0.05, tau: 4 };
    case 'timer555': return { T: T0 + 8 + 50 * Math.abs(el.Iout || 0) / (q.Imax || 0.2), tau: 4 };
    case 'opto': return { T: ratio(Math.abs((el.I || 0) * (el.V || 0)) + Math.abs((el.Vce || 0) * (el.Ic || 0)), 0.15), tau: 4 };
    case 'mosfet': return { T: ratio(Math.abs((el.Vds || 0) * (el.Idr || 0)), q.Pmax || 0.4, 90), tau: 5 };
    default: return null;
  }
}
NS.thermal = {
  update(sim, dt) {
    if (sim.dirty) return;
    for (const p of sim.c.parts) {
      const el = sim.elOf.get(p.id); if (!el) continue; const tg = target(p, el); if (!tg) continue;
      const rt = p.rt || (p.rt = {}); let Tt = Math.min(350, tg.T); if (!isFinite(Tt)) Tt = T0; const Tc = rt.T === undefined ? T0 : rt.T;
      rt.T = tg.tau <= 0 ? Tt : Tc + (Tt - Tc) * (1 - Math.exp(-dt / tg.tau));
    }
  },
  /* palette « fer » des caméras thermiques */
  color(T) {
    const S = [[25, [32, 18, 90]], [40, [110, 30, 170]], [55, [200, 40, 90]], [75, [245, 110, 30]], [105, [255, 200, 40]], [150, [255, 250, 200]]];
    if (T <= S[0][0]) return 'rgb(' + S[0][1].join(',') + ')'; for (let i = 1; i < S.length; i++) if (T <= S[i][0]) { const a = S[i - 1], b = S[i], u = (T - a[0]) / (b[0] - a[0]); return 'rgb(' + a[1].map((x, k) => Math.round(x + (b[1][k] - x) * u)).join(',') + ')'; }
    return 'rgb(255,250,200)';
  },
};
})(typeof window !== 'undefined' ? window : globalThis);
