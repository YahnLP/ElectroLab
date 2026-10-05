/* util.js — espace de noms, helpers DOM, formats d'ingénieur, PRNG */
(function (g) {
'use strict';
const NS = g.NS = g.NS || {};
/* ---- DOM ---- */
NS.$ = (s, r) => (r || document).querySelector(s);
NS.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
NS.clear = e => { while (e.firstChild) e.removeChild(e.firstChild); return e; };
const SVGNS = 'http://www.w3.org/2000/svg';
NS.h = function (tag, attrs, ...kids) {
  let id, cls; const m = /^([a-zA-Z0-9]+)?(?:#([\w-]+))?((?:\.[\w-]+)*)$/.exec(tag) || [];
  const name = m[1] || 'div'; id = m[2]; cls = (m[3] || '').split('.').filter(Boolean);
  const svg = ['svg', 'g', 'path', 'rect', 'circle', 'line', 'text', 'polyline', 'polygon', 'ellipse', 'defs', 'marker', 'title'].includes(name) && (attrs && attrs.__svg || name === 'svg' || NS._inSvg);
  const el = svg ? document.createElementNS(SVGNS, name) : document.createElement(name);
  if (id) el.id = id; if (cls.length) el.setAttribute('class', cls.join(' '));
  if (attrs && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs) || typeof attrs === 'string')) { kids.unshift(attrs); attrs = null; }
  if (attrs) for (const k in attrs) {
    const v = attrs[k]; if (v == null || v === false || k === '__svg') continue;
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value' && !svg) el.value = v;
    else if (k === 'checked' && !svg) el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = k => { if (k == null || k === false) return; if (Array.isArray(k)) return k.forEach(add); el.appendChild(k.nodeType ? k : document.createTextNode(String(k))); };
  kids.forEach(add); return el;
};
/* ---- formats ---- */
const PRE = [[1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
NS.fmt = function (v, unit, sig) {
  unit = unit || ''; sig = sig || 4;
  if (v === null || v === undefined || isNaN(v)) return '—';
  if (!isFinite(v)) return (v < 0 ? '-' : '') + '∞ ' + unit;
  if (v === 0) return '0 ' + unit;
  const a = Math.abs(v); let p = PRE[PRE.length - 1];
  for (const q of PRE) if (a >= q[0] * 0.9995) { p = q; break; }
  let x = v / p[0]; let s = x.toPrecision(sig); if (s.indexOf('e') >= 0) s = String(+s);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s + ' ' + p[1] + unit;
};
/* « 4k7 », « 2.2µ », « 10n », « 1M », « 100 » → nombre */
NS.parseVal = function (str) {
  if (typeof str === 'number') return str; if (str == null) return NaN;
  let s = String(str).trim().replace(/,/g, '.').replace(/\s+/g, '').replace(/Ω|ohms?|F$|H$|V$|A$|W$|Hz$/gi, '');
  const mult = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9, R: 1 };
  let m = /^([0-9]*)([pnuµmkKMGR])([0-9]+)$/.exec(s); // 4k7
  if (m) return parseFloat((m[1] || '0') + '.' + m[3]) * mult[m[2]];
  m = /^([+-]?[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?)([pnuµmkKMGR]?)$/.exec(s);
  if (m) return parseFloat(m[1]) * (m[2] ? mult[m[2]] : 1);
  return NaN;
};
NS.E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
NS.E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
NS.nearestE = function (v, series) { // plus proche valeur normalisée
  series = series || NS.E12; if (!(v > 0)) return v;
  const d = Math.floor(Math.log10(v)); let best = 0, be = 1e9;
  for (const dd of [d - 1, d, d + 1]) for (const m of series) { const c = m * Math.pow(10, dd); const e = Math.abs(Math.log(c / v)); if (e < be) { be = e; best = c; } }
  return +best.toPrecision(3);
};
NS.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
NS.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
})(typeof window !== 'undefined' ? window : globalThis);
