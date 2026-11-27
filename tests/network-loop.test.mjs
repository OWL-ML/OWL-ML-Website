// The hero figure (src/components/home/network-loop.ts): size, determinism, a seamless loop, and
// colours taken from the design tokens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  frame,
  toSvg,
  nodePositions,
  DARK,
  WIDTH,
  HEIGHT,
  STILL_T,
} from '../src/components/home/network-loop.ts';

test('the figure has the size of the original script output (1600 × 467)', () => {
  assert.equal(WIDTH, 1600);
  assert.equal(HEIGHT, 467);
  assert.match(toSvg(frame(STILL_T)), /^<svg [^>]*viewBox="0 0 1600 467"/);
});

test('frames are deterministic', () => {
  assert.deepEqual(frame(0.37), frame(0.37));
});

test('the loop closes: the network at the end looks as at the start', () => {
  for (let li = 0; li < 4; li++) {
    const at = (t) =>
      nodePositions(li, t)
        .filter(([, , av]) => av > 0.01)
        .map(([x, y]) => [Math.round(x), Math.round(y)]);
    assert.deepEqual(at(0.9999), at(0), `layer ${li}`);
  }
  // and the whole picture: same shapes, positions within a fraction of a pixel
  const a = frame(0);
  const b = frame(1);
  assert.equal(a.length, b.length);
  a.forEach((s, i) => {
    for (const [k, v] of Object.entries(s)) {
      const w = b[i][k];
      if (typeof v === 'number') assert.ok(Math.abs(v - w) < 0.5, `${i}.${k}`);
      else if (Array.isArray(v)) v.forEach((n, j) => assert.ok(Math.abs(n - w[j]) < 0.5));
      else assert.equal(v, w, `${i}.${k}`);
    }
  });
});

test('colours come from the design tokens', () => {
  const tokens = readFileSync('src/styles/tokens.css', 'utf8');
  const tok = (name) =>
    tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1].toLowerCase();
  assert.equal(DARK.teal100, tok('teal-750'));
  assert.equal(DARK.teal200, tok('field-3'));
  assert.equal(DARK.teal300, tok('field-1'));
  assert.equal(DARK.teal500, tok('field-2'));
  assert.equal(DARK.teal800, tok('on-dark'));
  assert.equal(DARK.orange, tok('orange'));
  assert.equal(DARK.orange600, tok('peach-light'));
  // the uncertain bands: orange mixed half-way into the panel colour
  const mix = [1, 3, 5]
    .map((i) =>
      Math.trunc(
        (parseInt(DARK.orange.slice(i, i + 2), 16) + parseInt(DARK.teal100.slice(i, i + 2), 16)) /
          2,
      )
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
  assert.equal(DARK.orange300, `#${mix}`);
});
