// Checks for the Python demo from docs/DEMOS.md: the recorded traces are consistent, and the real
// output of each snippet equals the option marked as correct.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  shared,
  changes,
  verdict,
  stepLabel,
  outputAsOption,
} from '../src/demos/step-through-python/core.ts';

const traces = JSON.parse(readFileSync('src/demos/step-through-python/traces.json', 'utf8'));

test('four snippets, recorded with a stated Python version', () => {
  assert.deepEqual(
    traces.snippets.map((s) => s.id),
    ['alias', 'plus', 'default', 'late'],
  );
  assert.match(traces.python, /^3\.\d+\.\d+$/);
});

test('the recorded output of each snippet equals its marked correct option', () => {
  for (const sn of traces.snippets) assert.equal(outputAsOption(sn), sn.options[sn.answer], sn.id);
});

test('each trace ends with the finished state and the full output', () => {
  for (const sn of traces.snippets) {
    const last = sn.steps.at(-1);
    assert.equal(last.line, null, sn.id);
    assert.equal(last.out, sn.output, sn.id);
    for (let i = 1; i < sn.steps.length; i++)
      assert.ok(sn.steps[i].out.startsWith(sn.steps[i - 1].out), `${sn.id}: output only grows`);
  }
});

test('two names, one list: the list is shared and changes at append', () => {
  const sn = traces.snippets[0];
  const last = sn.steps.at(-1);
  const [a, b] = last.frames[0].vars;
  assert.deepEqual([a.name, b.name], ['a', 'b']);
  assert.equal(a.v.ref, b.v.ref);
  assert.ok(shared(last).has(a.v.ref));
  const k = sn.steps.findIndex((s) => s.heap.some((h) => h.text === '[1, 2, 3, 4]'));
  assert.equal(changes(sn.steps[k], sn.steps[k - 1])[a.v.ref], 'changed');
});

test('texts: verdicts and step labels', () => {
  const sn = traces.snippets[0];
  assert.equal(verdict(sn, sn.answer), 'Right, it prints [1, 2, 3, 4].');
  assert.equal(verdict(sn, 0), 'Not quite, it prints [1, 2, 3, 4].');
  assert.equal(verdict(sn, -1), 'It prints [1, 2, 3, 4].');
  assert.equal(stepLabel(sn, 0), `step 1 of ${sn.steps.length} · next line 1`);
  assert.match(stepLabel(sn, sn.steps.length - 1), /^finished · /);
});
