// The leaderboard depends on you (docs/DEMOS.md) Four made-up continual learners, scored on five properties
// (10 is best on every one); the ranking is the weighted average under the visitor's weights.
// The numbers are invented to show the idea and say so in the demo; they describe no real method.
// They are chosen so that each method wins under one of the presets.
// Pure logic, no DOM: unit-tested in tests/leaderboard-depends-on-you.test.mjs and used by ui.ts.

/** [id, label]; every property is phrased so that higher is better */
export const CRITERIA = [
  ['acc', 'Accuracy'],
  ['forget', 'Little forgetting'],
  ['memory', 'Small memory'],
  ['compute', 'Low compute'],
  ['data', 'Keeps no raw data'],
] as const;
export type CriterionId = (typeof CRITERIA)[number][0];
export type Weights = Record<CriterionId, number>;

export const METHODS: { id: string; label: string; scores: Weights }[] = [
  { id: 'a', label: 'Method A', scores: { acc: 10, forget: 8, memory: 2, compute: 4, data: 1 } },
  { id: 'b', label: 'Method B', scores: { acc: 7, forget: 3, memory: 10, compute: 10, data: 10 } },
  { id: 'c', label: 'Method C', scores: { acc: 8, forget: 7, memory: 8, compute: 6, data: 10 } },
  { id: 'd', label: 'Method D', scores: { acc: 9, forget: 10, memory: 1, compute: 2, data: 9 } },
];

/** weights run from 0 (does not matter) to 3 (matters most) */
export const WEIGHT_LABELS = ['Not at all', 'A little', 'Matters', 'Matters most'] as const;
export const MAX_WEIGHT = WEIGHT_LABELS.length - 1;

const w = (
  acc: number,
  forget: number,
  memory: number,
  compute: number,
  data: number,
): Weights => ({
  acc,
  forget,
  memory,
  compute,
  data,
});

export const PRESETS: { id: string; label: string; weights: Weights }[] = [
  { id: 'leaderboard', label: 'Leaderboard, accuracy only', weights: w(3, 0, 0, 0, 0) },
  { id: 'never-forget', label: 'Never forget', weights: w(3, 3, 0, 0, 0) },
  { id: 'balanced', label: 'Accurate, stable and small', weights: w(3, 3, 3, 0, 0) },
  { id: 'equal', label: 'Everything equally', weights: w(1, 1, 1, 1, 1) },
];
export const DEFAULT_WEIGHTS = PRESETS[0]!.weights;

/** weighted average of a method's scores (0 to 10); null when nothing matters */
export function score(scores: Weights, weights: Weights): number | null {
  let sum = 0;
  let total = 0;
  for (const [id] of CRITERIA) {
    sum += weights[id] * scores[id];
    total += weights[id];
  }
  return total === 0 ? null : sum / total;
}

export interface Ranked {
  id: string;
  label: string;
  score: number;
  /** shares first place with another method */
  tied: boolean;
}

/** methods from best to worst; ties keep the order A–D. Empty when no weight is set. */
export function rank(weights: Weights): Ranked[] {
  const rows = METHODS.map((m) => ({ id: m.id, label: m.label, score: score(m.scores, weights) }));
  if (rows.some((r) => r.score === null)) return [];
  const sorted = (rows as { id: string; label: string; score: number }[]).sort(
    (x, y) => y.score - x.score,
  );
  const top = sorted[0]!.score;
  const ties = sorted.filter((r) => Math.abs(r.score - top) < 1e-9).length;
  return sorted.map((r) => ({ ...r, tied: ties > 1 && Math.abs(r.score - top) < 1e-9 }));
}

/** the single best method, or null when there is a tie for first place or no weight is set */
export function winner(weights: Weights): string | null {
  const r = rank(weights);
  return r.length && !r[0]!.tied ? r[0]!.id : null;
}
