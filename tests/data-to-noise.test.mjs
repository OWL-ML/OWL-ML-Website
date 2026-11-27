// Checks for the diffusion demo from docs/DEMOS.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alphaBar, makePoints, diffuse } from '../src/demos/data-to-noise/core.ts';

const pts = makePoints();

test('cosine schedule: ᾱ(0) = 1, falls monotonically, ᾱ(1) ≈ 0', () => {
  assert.equal(alphaBar(0), 1);
  assert.ok(alphaBar(1) < 1e-6);
  for (let t = 0.01; t <= 1; t += 0.01) assert.ok(alphaBar(t) <= alphaBar(t - 0.01));
});

test('160 points, two crescents, deterministic', () => {
  assert.equal(pts.length, 160);
  assert.equal(pts.filter((p) => p.upper).length, 80);
  assert.deepEqual(makePoints(), pts);
});

test('t = 0 is the data, t = 1 is the fixed noise; the slider is reversible', () => {
  diffuse(pts, 0).forEach((q, i) => {
    assert.ok(Math.abs(q.x - pts[i].x0) < 1e-12 && Math.abs(q.y - pts[i].y0) < 1e-12);
  });
  diffuse(pts, 1).forEach((q, i) => {
    assert.ok(Math.abs(q.x - pts[i].ex) < 1e-3 && Math.abs(q.y - pts[i].ey) < 1e-3);
  });
  assert.deepEqual(diffuse(pts, 0.37), diffuse(pts, 0.37));
});

test('variance is preserved: √ᾱ² + √(1−ᾱ)² = 1 at every t', () => {
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const ab = alphaBar(t);
    assert.ok(Math.abs(Math.sqrt(ab) ** 2 + Math.sqrt(1 - ab) ** 2 - 1) < 1e-12);
  }
});
