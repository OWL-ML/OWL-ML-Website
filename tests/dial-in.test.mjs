// Checks for the "Dial in the espresso" demo from docs/DEMOS.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BEANS,
  BUDGET,
  DOSES,
  GRINDS,
  WINDOW,
  trueTime,
  grindFor,
  brew,
  rng,
  verdict,
  fit,
  grid,
  bestGuess,
  explore,
  phi,
} from '../src/demos/dial-in/core.ts';

test('the machine: finer grind and more coffee make a slower shot; 30 s at g0 with 18 g', () => {
  for (let b = 0; b < BEANS.length; b++) {
    assert.ok(Math.abs(trueTime(BEANS[b].g0, 18, b) - 30) < 1e-9);
    assert.ok(trueTime(5, 18, b) > trueTime(6, 18, b));
    assert.ok(trueTime(10, 19, b) > trueTime(10, 17, b));
    assert.ok(Math.abs(trueTime(grindFor(25, 16, b), 16, b) - 25) < 1e-9);
  }
});

test('every bean has a good window inside the grind range at every dose', () => {
  for (let b = 0; b < BEANS.length; b++)
    for (const d of DOSES)
      assert.ok(
        GRINDS.some((g) => verdict(trueTime(g, d, b)) === 'good'),
        `bean ${b}, ${d} g`,
      );
});

test('shots are noisy, but only a little', () => {
  const r = rng(1);
  const times = Array.from({ length: 200 }, () => brew(7, 18, 0, r));
  assert.ok(new Set(times).size > 20, 'the same setting gives different shots');
  assert.ok(times.every((t) => t > 22 && t < 40));
});

test('verdicts use the window', () => {
  assert.deepEqual([19.9, 20, 35, 35.1].map(verdict), ['fast', 'good', 'good', 'slow']);
  assert.ok(WINDOW.fast < WINDOW.slow);
});

test('phi is the standard normal distribution function', () => {
  assert.ok(Math.abs(phi(0) - 0.5) < 1e-7);
  assert.ok(Math.abs(phi(1.959964) - 0.975) < 1e-6);
  assert.ok(Math.abs(phi(-1) - 0.158655) < 1e-6);
});

test('the model: rule of thumb before any shot, sure near shots, unsure far away', () => {
  const empty = fit([], 0).predict(15, 17);
  assert.ok(Math.abs(empty.time - 30) < 1e-9);
  const shots = [
    { grind: 10, dose: 18, time: 33, bean: 0 },
    { grind: 14, dose: 18, time: 25, bean: 0 },
  ];
  const m = fit(shots, 0);
  const near = m.predict(10, 18);
  assert.ok(Math.abs(near.time - 33) < 1.5, `near a shot: ${near.time}`);
  assert.ok(near.sd < m.predict(28, 14).sd / 3);
  for (const c of grid(m)) assert.ok(c.chance >= 0 && c.chance <= 1);
});

test('shots of an earlier bean count only as rough hints', () => {
  const s = { grind: 10, dose: 18, time: 40, bean: 0 };
  assert.ok(fit([s], 1).predict(10, 18).sd > fit([s], 0).predict(10, 18).sd * 2);
});

test('explore goes where no shot has been', () => {
  const m = fit([{ grind: 3, dose: 14, time: 60, bean: 0 }], 0);
  const e = explore(grid(m));
  assert.ok(e.grind > 15 || e.dose > 17, `${e.grind}, ${e.dose}`);
});

test('following the best guess finds a good shot within the budget (every bean, many seeds)', () => {
  for (let b = 0; b < BEANS.length; b++)
    for (let seed = 1; seed <= 25; seed++) {
      const r = rng(seed);
      const shots = [];
      let found = false;
      for (let i = 0; i < BUDGET && !found; i++) {
        const c = bestGuess(grid(fit(shots, b)));
        const time = brew(c.grind, c.dose, b, r);
        shots.push({ grind: c.grind, dose: c.dose, time, bean: b });
        found = verdict(time) === 'good';
      }
      assert.ok(found, `bean ${b}, seed ${seed}`);
    }
});
