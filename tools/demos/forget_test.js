const fs = require('fs'); eval(fs.readFileSync(__dirname + '/forget_core.js', 'utf8') + ';global.FG=FG;');
function run(seed, strategy, lam) {
  const D = FG.data(seed); const n = FG.net(seed + 100, 16);
  const s = { n, phase: 'A', D };
  for (let i = 0; i < 300; i++) FG.trainStep(s);
  const a0 = FG.acc(n, D.A.X, D.A.Y);
  const r = FG.rng(seed + 7); const idx = [...Array(60).keys()].sort(() => r() - 0.5).slice(0, 8);
  const s2 = { n: FG.clone(n), phase: 'B', strategy, lam, D, rep: idx, star: n.p.map((q) => q.slice()), F: FG.fisher(n, D.A.X, D.A.Y) };
  for (let i = 0; i < 300; i++) FG.trainStep(s2);
  return [a0, FG.acc(s2.n, D.A.X, D.A.Y), FG.acc(s2.n, D.B.X, D.B.Y)].map((v) => Math.round(v * 100));
}
const t0 = Date.now();
for (const seed of [1, 2, 3, 4]) {
  console.log(seed, 'plain', run(seed, 'plain'), 'replay', run(seed, 'replay'), 'ewc100', run(seed, 'ewc', 100), 'ewc300', run(seed, 'ewc', 300), 'ewc1000', run(seed, 'ewc', 1000), 'ewc3000', run(seed, 'ewc', 3000));
}
console.log('ms', Date.now() - t0);
