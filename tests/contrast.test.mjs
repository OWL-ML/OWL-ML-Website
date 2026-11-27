import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, textPairs } from '../src/lib/contrast.ts';

test('known reference values', () => {
  assert.equal(contrast('#000000', '#FFFFFF').toFixed(1), '21.0');
  assert.equal(contrast('#FFFFFF', '#FFFFFF').toFixed(1), '1.0');
});

for (const p of textPairs) {
  test(`contrast: ${p.use} (${p.fg} on ${p.bg}) >= ${p.min}`, () => {
    const c = contrast(p.fg, p.bg);
    assert.ok(c >= p.min, `${c.toFixed(2)} < ${p.min}`);
  });
}

test('tokens.css values match the pairs checked here', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = (await readFile('src/styles/tokens.css', 'utf8')).toUpperCase();
  for (const p of textPairs) {
    assert.ok(css.includes(p.fg), `${p.fg} not in tokens.css`);
    assert.ok(css.includes(p.bg), `${p.bg} not in tokens.css`);
  }
});
