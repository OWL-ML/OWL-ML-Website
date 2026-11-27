// Watch it forget (docs/DEMOS.md): a 2-16-16-1 tanh MLP learns task A, then task B, with nothing,
// replay or EWC protecting A. Ported from tools/demos/forget_core.js; same seeds, same numbers.
// Pure logic, no DOM: unit-tested in tests/watch-it-forget.test.mjs and used by ui.ts.

export type Rng = () => number;
export type Params = number[][];

export interface Net {
  h: number;
  /** W1 (2×h), b1, W2 (h×h), b2, W3 (h×1), b3 */
  p: Params;
  m: Params;
  v: Params;
  t: number;
}

export interface Task {
  X: [number, number][];
  Y: number[];
}

export interface Data {
  A: Task;
  B: Task;
}

export type Strategy = 'plain' | 'replay' | 'ewc';

export const DATA_SEED = 3;
export const NET_SEED = 103;
export const HIDDEN = 16;
export const STEPS = 300;
export const LR = 0.02;
export const LAMBDAS = [10, 30, 100, 300, 1000, 3000];
/**
 * The 8 points of task A kept for replay. The prototype drew them from seed 10 by sorting with a
 * random comparator, which picks different points in different browsers; these are the indices it
 * picked in Chromium and Node (and that the numbers in docs/DEMOS.md come from), fixed here.
 */
export const REPLAY = [13, 11, 58, 39, 23, 53, 26, 38];

/** Mulberry32. */
export function rng(seed: number): Rng {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (r: Rng) => {
  const u = Math.max(r(), 1e-12);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Two tasks of 60 points: A on the left, B on the right with the labels flipped. */
export function makeData(seed = DATA_SEED): Data {
  const r = rng(seed);
  const task = (lo: number, hi: number, flip: boolean, n: number): Task => {
    const X: [number, number][] = [];
    const Y: number[] = [];
    while (X.length < n) {
      const x = lo + (hi - lo) * r();
      const y = -1 + 2 * r();
      if (Math.abs(y) > 0.15) {
        X.push([x, y]);
        const up = y > 0 ? 1 : 0;
        Y.push(flip ? 1 - up : up);
      }
    }
    return { X, Y };
  };
  return { A: task(-1.6, -0.4, false, 60), B: task(0.4, 1.6, true, 60) };
}

const zeros = (p: Params) => p.map((q) => q.map(() => 0));

export function makeNet(seed = NET_SEED, h = HIDDEN): Net {
  const r = rng(seed);
  const mk = (a: number, b: number, s: number) => Array.from({ length: a * b }, () => gauss(r) * s);
  const p = [
    mk(2, h, 1 / Math.sqrt(2)),
    new Array(h).fill(0),
    mk(h, h, 1 / Math.sqrt(h)),
    new Array(h).fill(0),
    mk(h, 1, 1 / Math.sqrt(h)),
    [0],
  ];
  return { h, p, m: zeros(p), v: zeros(p), t: 0 };
}

/** A copy of the weights with fresh optimiser state. */
export function clone(n: Net): Net {
  return { h: n.h, p: n.p.map((q) => q.slice()), m: zeros(n.p), v: zeros(n.p), t: 0 };
}

export function forward(n: Net, x: [number, number]) {
  const h = n.h;
  const [W1, b1, W2, b2, W3, b3] = n.p as [
    number[],
    number[],
    number[],
    number[],
    number[],
    number[],
  ];
  const h1 = new Array<number>(h);
  const h2 = new Array<number>(h);
  for (let j = 0; j < h; j++) h1[j] = Math.tanh(x[0] * W1[j]! + x[1] * W1[h + j]! + b1[j]!);
  for (let k = 0; k < h; k++) {
    let s = b2[k]!;
    for (let j = 0; j < h; j++) s += h1[j]! * W2[j * h + k]!;
    h2[k] = Math.tanh(s);
  }
  let z = b3[0]!;
  for (let k = 0; k < h; k++) z += h2[k]! * W3[k]!;
  return { p: 1 / (1 + Math.exp(-z)), h1, h2 };
}

/** Gradient of the mean cross-entropy over (X, Y). */
export function gradients(n: Net, X: [number, number][], Y: number[]): Params {
  const h = n.h;
  const W2 = n.p[2]!;
  const W3 = n.p[4]!;
  const g = zeros(n.p) as [number[], number[], number[], number[], number[], number[]];
  for (let i = 0; i < X.length; i++) {
    const x = X[i]!;
    const f = forward(n, x);
    const dz = (f.p - Y[i]!) / X.length;
    for (let k = 0; k < h; k++) g[4][k]! += f.h2[k]! * dz;
    g[5][0]! += dz;
    const dh2 = new Array<number>(h);
    for (let k = 0; k < h; k++) dh2[k] = dz * W3[k]! * (1 - f.h2[k]! * f.h2[k]!);
    for (let j = 0; j < h; j++) {
      let s = 0;
      for (let k = 0; k < h; k++) {
        g[2][j * h + k]! += f.h1[j]! * dh2[k]!;
        s += dh2[k]! * W2[j * h + k]!;
      }
      const dh1 = s * (1 - f.h1[j]! * f.h1[j]!);
      g[0][j]! += x[0] * dh1;
      g[0][h + j]! += x[1] * dh1;
      g[1][j]! += dh1;
    }
    for (let k = 0; k < h; k++) g[3][k]! += dh2[k]!;
  }
  return g;
}

/** One Adam step (β1 0.9, β2 0.999). */
export function adam(n: Net, g: Params, lr = LR) {
  n.t++;
  const c1 = 1 - Math.pow(0.9, n.t);
  const c2 = 1 - Math.pow(0.999, n.t);
  for (let a = 0; a < n.p.length; a++) {
    const p = n.p[a]!;
    const m = n.m[a]!;
    const v = n.v[a]!;
    const ga = g[a]!;
    for (let i = 0; i < p.length; i++) {
      const gi = ga[i]!;
      m[i] = 0.9 * m[i]! + 0.1 * gi;
      v[i] = 0.999 * v[i]! + 0.001 * gi * gi;
      p[i]! -= (lr * (m[i]! / c1)) / (Math.sqrt(v[i]! / c2) + 1e-8);
    }
  }
}

/** Empirical Fisher of task A (squared per-point gradients), normalised by its maximum. */
export function fisher(n: Net, task: Task): Params {
  const F = zeros(n.p);
  for (let i = 0; i < task.X.length; i++) {
    const g = gradients(n, [task.X[i]!], [task.Y[i]!]);
    for (let a = 0; a < F.length; a++)
      for (let j = 0; j < F[a]!.length; j++) F[a]![j]! += g[a]![j]! * g[a]![j]!;
  }
  let mx = 0;
  F.forEach((f) => f.forEach((v) => (mx = Math.max(mx, v))));
  return F.map((f) => f.map((v) => v / (mx || 1)));
}

export function accuracy(n: Net, task: Task): number {
  let c = 0;
  for (let i = 0; i < task.X.length; i++)
    if (forward(n, task.X[i]!).p > 0.5 === task.Y[i]! > 0.5) c++;
  return c / task.X.length;
}

export interface Job {
  n: Net;
  phase: 'A' | 'B';
  data: Data;
  strategy?: Strategy;
  lambda?: number;
  /** weights after task A and their Fisher (EWC) */
  star?: Params;
  F?: Params;
}

/** One full-batch training step on the current task, with the chosen protection for A. */
export function trainStep(job: Job) {
  const { n, phase, data, strategy = 'plain', lambda = 100, star, F } = job;
  if (phase === 'A') return adam(n, gradients(n, data.A.X, data.A.Y));
  let g: Params;
  if (strategy === 'replay') {
    const X = data.B.X.concat(REPLAY.map((i) => data.A.X[i]!));
    const Y = data.B.Y.concat(REPLAY.map((i) => data.A.Y[i]!));
    g = gradients(n, X, Y);
  } else g = gradients(n, data.B.X, data.B.Y);
  if (strategy === 'ewc' && star && F)
    for (let a = 0; a < g.length; a++)
      for (let i = 0; i < g[a]!.length; i++)
        g[a]![i]! += lambda * F[a]![i]! * (n.p[a]![i]! - star[a]![i]!);
  adam(n, g);
}

/** The whole experiment without animation: [A after A, A after B, B after B] in percent. */
export function run(strategy: Strategy, lambda = 100): [number, number, number] {
  const data = makeData();
  const n = makeNet();
  for (let i = 0; i < STEPS; i++) trainStep({ n, phase: 'A', data });
  const a0 = accuracy(n, data.A);
  const job: Job = {
    n: clone(n),
    phase: 'B',
    data,
    strategy,
    lambda,
    star: n.p.map((q) => q.slice()),
    F: fisher(n, data.A),
  };
  for (let i = 0; i < STEPS; i++) trainStep(job);
  const pct = (v: number) => Math.round(v * 100);
  return [pct(a0), pct(accuracy(job.n, data.A)), pct(accuracy(job.n, data.B))];
}

/** The note under the accuracy bars after task B. */
export function outcomeNote(strategy: Strategy, accA: number, accB: number): string {
  if (strategy === 'plain')
    return 'Task B overwrote task A. The network now applies B’s rule everywhere. Try replay or EWC.';
  if (strategy === 'replay')
    return accA >= 0.8
      ? 'Replaying just eight remembered points from A (ringed) while learning B keeps both tasks.'
      : 'Replay helped only partly this time.';
  if (accA < 0.6)
    return 'This is too weak, and the network still forgets task A. Try holding on more strongly.';
  if (accB < 0.6)
    return 'This is too strong. Task A is safe, but the network can no longer learn task B. Try a weaker setting.';
  return 'This is a balance, and both tasks mostly survive. Finding it is the stability–plasticity dilemma.';
}
