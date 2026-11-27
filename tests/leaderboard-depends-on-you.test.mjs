// Checks for the "The leaderboard depends on you" demo from docs/DEMOS.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  METHODS,
  CRITERIA,
  PRESETS,
  DEFAULT_WEIGHTS,
  score,
  rank,
  winner,
} from '../src/demos/leaderboard-depends-on-you/core.ts';

test('every method wins under exactly one preset', () => {
  const winners = PRESETS.map((p) => winner(p.weights));
  assert.deepEqual([...winners].sort(), METHODS.map((m) => m.id).sort());
});

test('the default is the leaderboard view: accuracy only, Method A first', () => {
  assert.equal(winner(DEFAULT_WEIGHTS), 'a');
  assert.deepEqual(
    rank(DEFAULT_WEIGHTS).map((r) => r.id),
    ['a', 'd', 'c', 'b'],
  );
});

test('no method is best at everything (each is beaten somewhere)', () => {
  for (const m of METHODS)
    assert.ok(
      CRITERIA.some(([c]) => METHODS.some((o) => o.scores[c] > m.scores[c])),
      `${m.label} is never beaten`,
    );
});

test('score is a weighted average; nothing weighted gives no ranking', () => {
  const zero = { acc: 0, forget: 0, memory: 0, compute: 0, data: 0 };
  assert.equal(score(METHODS[0].scores, zero), null);
  assert.deepEqual(rank(zero), []);
  assert.equal(winner(zero), null);
  assert.equal(score(METHODS[1].scores, { ...zero, acc: 1, memory: 1 }), (7 + 10) / 2);
});

test('ties for first place are marked and give no single winner', () => {
  // keeping no raw data only: B and C both score 10
  const exact = { acc: 0, forget: 0, memory: 0, compute: 0, data: 1 };
  const r = rank(exact);
  assert.deepEqual(
    r.slice(0, 2).map((x) => [x.id, x.tied]),
    [
      ['b', true],
      ['c', true],
    ],
  );
  assert.equal(winner(exact), null);
});
