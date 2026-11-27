// Checks for the "Does efficiency save energy?" (rebound effect) demo from docs/DEMOS.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outcome, regime, GUESSES, fmt } from '../src/demos/does-efficiency-save-energy/core.ts';

const close = (a, b) => Math.abs(a - b) < 1e-9;

test('no response: per query and total both halve, usage unchanged', () => {
  const o = outcome(0);
  assert.ok(close(o.perQuery, 50) && close(o.queries, 100) && close(o.total, 50));
});

test('response 1: usage doubles and the saving is used up exactly', () => {
  const o = outcome(1);
  assert.ok(close(o.queries, 200) && close(o.total, 100));
});

test('total = per query × queries / 100, and it rises past response 1', () => {
  for (const e of [0, 0.3, 0.5, 1, 1.4, 2]) {
    const o = outcome(e);
    assert.ok(close(o.total, (o.perQuery * o.queries) / 100));
  }
  assert.equal(fmt(outcome(0.5).total), '71');
  assert.equal(fmt(outcome(2).total), '200');
  assert.ok(outcome(1.5).total > 100);
});

test('regimes; every guess is right for its own response', () => {
  assert.deepEqual([0, 0.5, 1, 1.5].map(regime), ['none', 'partial', 'full', 'backfire']);
  for (const g of GUESSES) assert.equal(regime(g.response), g.id);
});
