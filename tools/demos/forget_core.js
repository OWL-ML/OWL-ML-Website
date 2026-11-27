const FG = (() => {
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = (r) => { const u = Math.max(r(), 1e-12), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  function data(seed) {
    const r = rng(seed);
    const task = (lo, hi, flip, n) => { const X = [], Y = []; while (X.length < n) { const x = lo + (hi - lo) * r(), y = -1 + 2 * r(); if (Math.abs(y) > 0.15) { X.push([x, y]); const up = y > 0 ? 1 : 0; Y.push(flip ? 1 - up : up); } } return { X, Y }; };
    return { A: task(-1.6, -0.4, false, 60), B: task(0.4, 1.6, true, 60) };
  }
  function net(seed, h) {
    const r = rng(seed); const mk = (a, b, s) => Array.from({ length: a * b }, () => gauss(r) * s);
    const p = [mk(2, h, 1 / Math.sqrt(2)), new Array(h).fill(0), mk(h, h, 1 / Math.sqrt(h)), new Array(h).fill(0), mk(h, 1, 1 / Math.sqrt(h)), [0]];
    return { h, p, m: p.map((q) => q.map(() => 0)), v: p.map((q) => q.map(() => 0)), t: 0 };
  }
  function fwd(n, x) {
    const h = n.h, [W1, b1, W2, b2, W3, b3] = n.p, h1 = new Array(h), h2 = new Array(h);
    for (let j = 0; j < h; j++) h1[j] = Math.tanh(x[0] * W1[j] + x[1] * W1[h + j] + b1[j]);
    for (let k = 0; k < h; k++) { let s = b2[k]; for (let j = 0; j < h; j++) s += h1[j] * W2[j * h + k]; h2[k] = Math.tanh(s); }
    let z = b3[0]; for (let k = 0; k < h; k++) z += h2[k] * W3[k];
    return { p: 1 / (1 + Math.exp(-z)), h1, h2 };
  }
  function grads(n, X, Y, w) {
    const h = n.h, [W1, , W2, , W3] = n.p, g = n.p.map((q) => q.map(() => 0));
    let ws = 0; for (let i = 0; i < X.length; i++) ws += w ? w[i] : 1;
    for (let i = 0; i < X.length; i++) {
      const x = X[i], f = fwd(n, x), dz = (f.p - Y[i]) * (w ? w[i] : 1) / ws;
      for (let k = 0; k < h; k++) g[4][k] += f.h2[k] * dz; g[5][0] += dz;
      const dh2 = new Array(h); for (let k = 0; k < h; k++) dh2[k] = dz * W3[k] * (1 - f.h2[k] * f.h2[k]);
      for (let j = 0; j < h; j++) { let s = 0; for (let k = 0; k < h; k++) { g[2][j * h + k] += f.h1[j] * dh2[k]; s += dh2[k] * W2[j * h + k]; } const dh1 = s * (1 - f.h1[j] * f.h1[j]); g[0][j] += x[0] * dh1; g[0][h + j] += x[1] * dh1; g[1][j] += dh1; }
      for (let k = 0; k < h; k++) g[3][k] += dh2[k];
    }
    return g;
  }
  function step(n, g, lr) {
    n.t++; const c1 = 1 - Math.pow(0.9, n.t), c2 = 1 - Math.pow(0.999, n.t);
    for (let a = 0; a < n.p.length; a++) for (let i = 0; i < n.p[a].length; i++) {
      const gi = g[a][i]; n.m[a][i] = 0.9 * n.m[a][i] + 0.1 * gi; n.v[a][i] = 0.999 * n.v[a][i] + 0.001 * gi * gi;
      n.p[a][i] -= lr * (n.m[a][i] / c1) / (Math.sqrt(n.v[a][i] / c2) + 1e-8);
    }
  }
  function fisher(n, X, Y) {
    const F = n.p.map((q) => q.map(() => 0));
    for (let i = 0; i < X.length; i++) { const g = grads(n, [X[i]], [Y[i]]); for (let a = 0; a < F.length; a++) for (let j = 0; j < F[a].length; j++) F[a][j] += g[a][j] * g[a][j]; }
    let mx = 0; F.forEach((f) => f.forEach((v) => { if (v > mx) mx = v; }));
    return F.map((f) => f.map((v) => v / (mx || 1)));
  }
  function acc(n, X, Y) { let c = 0; for (let i = 0; i < X.length; i++) if ((fwd(n, X[i]).p > 0.5) === (Y[i] > 0.5)) c++; return c / X.length; }
  const clone = (n) => ({ h: n.h, p: n.p.map((q) => q.slice()), m: n.p.map((q) => q.map(() => 0)), v: n.p.map((q) => q.map(() => 0)), t: 0 });
  function trainStep(s) {
    const { n, phase, strategy, lam, D, rep, star, F } = s;
    if (phase === 'A') { step(n, grads(n, D.A.X, D.A.Y), 0.02); return; }
    let g;
    if (strategy === 'replay') {
      const X = D.B.X.concat(rep.map((i) => D.A.X[i])), Y = D.B.Y.concat(rep.map((i) => D.A.Y[i]));
      g = grads(n, X, Y);
    } else g = grads(n, D.B.X, D.B.Y);
    if (strategy === 'ewc') for (let a = 0; a < g.length; a++) for (let i = 0; i < g[a].length; i++) g[a][i] += lam * F[a][i] * (n.p[a][i] - star[a][i]);
    step(n, g, 0.02);
  }
  return { data, net, fwd, grads, fisher, acc, clone, trainStep, rng };
})();
