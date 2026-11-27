// The expected numbers for the forgetting demo from docs/DEMOS.md (data seed 3, network seed 103,
// replay points from seed 10), with a tolerance of ±5 points.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, makeData, REPLAY } from '../src/demos/watch-it-forget/core.ts';

const near = (got, want, what) =>
  assert.ok(Math.abs(got - want) <= 5, `${what}: got ${got}%, expected ${want}% ± 5`);

test('data: two tasks of 60 points, margin |y| > 0.15, B flips the labels', () => {
  const { A, B } = makeData();
  assert.equal(A.X.length, 60);
  assert.equal(B.X.length, 60);
  for (const [x, y] of A.X) assert.ok(x >= -1.6 && x <= -0.4 && Math.abs(y) > 0.15);
  A.X.forEach(([, y], i) => assert.equal(A.Y[i], y > 0 ? 1 : 0));
  B.X.forEach(([, y], i) => assert.equal(B.Y[i], y > 0 ? 0 : 1));
  assert.equal(new Set(REPLAY).size, 8);
});

test('nothing: task A is forgotten (A 5%, B 100%)', () => {
  const [a0, a, b] = run('plain');
  assert.equal(a0, 100);
  near(a, 5, 'A after B');
  near(b, 100, 'B');
});

test('replay: A 90%, B 100%', () => {
  const [, a, b] = run('replay');
  near(a, 90, 'A');
  near(b, 100, 'B');
});

test('EWC λ = 100: A 75%, B 100%; λ = 300: A 100%, B 90%', () => {
  let [, a, b] = run('ewc', 100);
  near(a, 75, 'A (λ 100)');
  near(b, 100, 'B (λ 100)');
  [, a, b] = run('ewc', 300);
  near(a, 100, 'A (λ 300)');
  near(b, 90, 'B (λ 300)');
});

test('EWC λ ≥ 1000: too stable to learn B (A 100%, B ≤ 15%)', () => {
  for (const lam of [1000, 3000]) {
    const [, a, b] = run('ewc', lam);
    near(a, 100, `A (λ ${lam})`);
    assert.ok(b <= 15, `B (λ ${lam}): ${b}%`);
  }
});
