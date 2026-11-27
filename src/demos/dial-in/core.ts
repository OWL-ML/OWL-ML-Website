// Dial in the espresso (docs/DEMOS.md). A simulated grinder and espresso machine, and a small
// Gaussian-process model that learns the pull time from the shots taken so far.
// The machine is made up: only its directions are real (finer grind and more coffee make a slower
// shot). The rules of thumb (a pull of 20–35 s, about twice the dose in the cup) are from the MOCCA
// course. Pure logic, no DOM: unit-tested in tests/dial-in.test.mjs and used by ui.ts.

export const GRIND = { min: 1, max: 30 } as const; // 1 = finest
export const DOSE = { min: 14, max: 20, step: 0.5 } as const; // grams of ground coffee
export const WINDOW = { fast: 20, slow: 35 } as const; // seconds: a good pull lies in between
export const BUDGET = 8; // shots per bean

/** grind settings 1–30 × doses 14–20 g in 0.5 g steps */
export const GRINDS = Array.from({ length: GRIND.max - GRIND.min + 1 }, (_, i) => GRIND.min + i);
export const DOSES = Array.from(
  { length: (DOSE.max - DOSE.min) / DOSE.step + 1 },
  (_, j) => DOSE.min + j * DOSE.step,
);

// ---------------------------------------------------------------------------------------------
// The simulated machine: pull time = 30 s · e^(−K·(grind − g0)) · (dose / 18 g)^1.5, times noise.
// Each bean has its own g0 (the grind that gives 30 s with 18 g).

const K = 0.083;
export const BEANS = [{ g0: 7 }, { g0: 17 }, { g0: 11 }] as const;
const SHOT_NOISE = 0.06; // standard deviation of log pull time: about ±2 s at 30 s

export function trueTime(grind: number, dose: number, bean: number): number {
  const g0 = BEANS[bean % BEANS.length]!.g0;
  return 30 * Math.exp(-K * (grind - g0)) * (dose / 18) ** 1.5;
}

/** the grind at which a dose gives pull time t (for drawing the true window) */
export function grindFor(t: number, dose: number, bean: number): number {
  const g0 = BEANS[bean % BEANS.length]!.g0;
  return g0 + Math.log((30 * (dose / 18) ** 1.5) / t) / K;
}

/** small seeded random generator (mulberry32), so a visit can be replayed in tests */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** one shot from the machine, in seconds (one decimal) */
export function brew(grind: number, dose: number, bean: number, rand: () => number): number {
  const t = trueTime(grind, dose, bean) * Math.exp(SHOT_NOISE * gaussian(rand));
  return Math.round(t * 10) / 10;
}

export type Verdict = 'fast' | 'good' | 'slow';
export function verdict(t: number): Verdict {
  return t < WINDOW.fast ? 'fast' : t > WINDOW.slow ? 'slow' : 'good';
}

// ---------------------------------------------------------------------------------------------
// The model: Gaussian-process regression on log pull time over normalised (grind, dose), with a
// squared-exponential kernel. Before any shot it assumes the rule of thumb, about 30 s, with wide
// uncertainty. Shots of an earlier bean count as rough hints (much larger noise).

const PRIOR_MEAN = Math.log(30);
const SIGNAL_VAR = 0.7 ** 2;
const LENGTH = [0.25, 0.6] as const; // in normalised grind and dose
const NOISE_VAR = SHOT_NOISE ** 2;
const HINT_VAR = 0.3 ** 2;

export interface Shot {
  grind: number;
  dose: number;
  time: number;
  bean: number;
}

const norm = (g: number, d: number) =>
  [(g - GRIND.min) / (GRIND.max - GRIND.min), (d - DOSE.min) / (DOSE.max - DOSE.min)] as const;

function kernel(a: readonly [number, number], b: readonly [number, number]): number {
  const du = (a[0] - b[0]) / LENGTH[0];
  const dv = (a[1] - b[1]) / LENGTH[1];
  return SIGNAL_VAR * Math.exp(-0.5 * (du * du + dv * dv));
}

/** Cholesky factor L of a symmetric positive definite matrix (row-major, n × n) */
function cholesky(A: number[][]): number[][] {
  const n = A.length;
  const L = A.map(() => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = A[i]![j]!;
      for (let k = 0; k < j; k++) s -= L[i]![k]! * L[j]![k]!;
      L[i]![j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j]![j]!;
    }
  return L;
}

const forward = (L: number[][], b: number[]) => {
  const x: number[] = [];
  for (let i = 0; i < b.length; i++) {
    let s = b[i]!;
    for (let k = 0; k < i; k++) s -= L[i]![k]! * x[k]!;
    x.push(s / L[i]![i]!);
  }
  return x;
};
const backward = (L: number[][], b: number[]) => {
  const n = b.length;
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i]!;
    for (let k = i + 1; k < n; k++) s -= L[k]![i]! * x[k]!;
    x[i] = s / L[i]![i]!;
  }
  return x;
};

export interface Prediction {
  /** predicted pull time in seconds */
  time: number;
  /** standard deviation of log pull time: how unsure the model is */
  sd: number;
  /** chance that a shot here lands in the window */
  chance: number;
}

export interface Model {
  predict(grind: number, dose: number): Prediction;
}

/** standard normal distribution function (Abramowitz & Stegun 7.1.26, error below 1e-7) */
export function phi(x: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(x) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

export function fit(shots: Shot[], bean: number): Model {
  const X = shots.map((s) => norm(s.grind, s.dose));
  const y = shots.map((s) => Math.log(s.time) - PRIOR_MEAN);
  const K = X.map((a, i) =>
    X.map(
      (b, j) => kernel(a, b) + (i === j ? (shots[i]!.bean === bean ? NOISE_VAR : HINT_VAR) : 0),
    ),
  );
  const L = cholesky(K);
  const alpha = backward(L, forward(L, y));
  const lo = Math.log(WINDOW.fast);
  const hi = Math.log(WINDOW.slow);
  return {
    predict(grind, dose) {
      const x = norm(grind, dose);
      const k = X.map((b) => kernel(x, b));
      const mean = PRIOR_MEAN + k.reduce((s, ki, i) => s + ki * alpha[i]!, 0);
      const v = forward(L, k);
      const variance = Math.max(SIGNAL_VAR - v.reduce((s, vi) => s + vi * vi, 0), 1e-9);
      const sd = Math.sqrt(variance);
      const spread = Math.sqrt(variance + NOISE_VAR);
      const chance = phi((hi - mean) / spread) - phi((lo - mean) / spread);
      return { time: Math.exp(mean), sd, chance };
    },
  };
}

export interface Cell extends Prediction {
  grind: number;
  dose: number;
}

export function grid(model: Model): Cell[] {
  return GRINDS.flatMap((g) => DOSES.map((d) => ({ grind: g, dose: d, ...model.predict(g, d) })));
}

const centre = (c: { grind: number; dose: number }) =>
  Math.hypot(...norm(c.grind, c.dose).map((x) => x - 0.5));

/** "Model's best guess": the setting most likely to land in the window */
export function bestGuess(cells: Cell[]): Cell {
  return cells.reduce((b, c) =>
    c.chance > b.chance + 1e-9 || (Math.abs(c.chance - b.chance) <= 1e-9 && centre(c) < centre(b))
      ? c
      : b,
  );
}

/** "Explore where we know least": the setting the model is most unsure about */
export function explore(cells: Cell[]): Cell {
  return cells.reduce((b, c) =>
    c.sd > b.sd + 1e-9 || (Math.abs(c.sd - b.sd) <= 1e-9 && centre(c) < centre(b)) ? c : b,
  );
}
