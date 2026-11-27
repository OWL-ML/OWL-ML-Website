// Does efficiency save energy? (docs/DEMOS.md) The rebound effect in its textbook form:
// a model becomes `k` times more efficient per query; if the cost of a query follows its energy
// and usage responds to cost with a constant elasticity e (queries ∝ cost^−e), then
//   energy per query = 1/k,  queries = k^e,  total energy = k^(e − 1)   (today = 1).
// e < 1 keeps part of the saving, e = 1 uses it up, e > 1 backfires (Jevons' paradox).
// Pure logic, no DOM: unit-tested in tests/does-efficiency-save-energy.test.mjs and used by ui.ts.

/** the efficiency gain the demo is about: twice as efficient per query */
export const GAIN = 2;
export const MAX_RESPONSE = 2;

export interface Outcome {
  /** relative to today = 100 */
  perQuery: number;
  queries: number;
  total: number;
}

export function outcome(response: number, gain = GAIN): Outcome {
  return {
    perQuery: 100 / gain,
    queries: 100 * gain ** response,
    total: 100 * gain ** (response - 1),
  };
}

export type Regime = 'none' | 'partial' | 'full' | 'backfire';

const EPS = 1e-9;
export function regime(response: number): Regime {
  if (response < EPS) return 'none';
  if (Math.abs(response - 1) < EPS) return 'full';
  return response < 1 ? 'partial' : 'backfire';
}

export const REGIMES: Record<Regime, { title: string; text: string }> = {
  none: {
    title: 'Full saving',
    text: 'Usage stays the same, so total energy halves and the promise holds.',
  },
  partial: {
    title: 'Partial saving',
    text: 'Cheaper queries are used more. Total energy still falls, though by less than promised.',
  },
  full: {
    title: 'No saving',
    text: 'Usage doubles. The whole saving is used up and total energy stays where it was.',
  },
  backfire: {
    title: 'Higher consumption',
    text: "Usage grows faster than efficiency improves, so total energy rises. This is Jevons' paradox.",
  },
};

/** the four guesses, each true for some response; the value shows the visitor where */
export const GUESSES: { id: Regime; label: string; response: number }[] = [
  { id: 'none', label: 'It halves', response: 0 },
  { id: 'partial', label: 'It falls, but by less than half', response: 0.5 },
  { id: 'full', label: 'It stays the same', response: 1 },
  { id: 'backfire', label: 'It rises', response: 1.5 },
];

/** "71" for 70.7; "100" for 100 */
export const fmt = (x: number) => String(Math.round(x));
