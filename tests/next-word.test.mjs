// The checks for the next-word demo from docs/DEMOS.md, against the real corpus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildModel,
  distribution,
  grow,
  parseStart,
  longestCopy,
  pretty,
  joinShown,
  percent,
} from '../src/demos/next-word/core.ts';

const text = readFileSync('public/demos/next-word/alice-tokens.txt', 'utf8');
const m = buildModel(text);
const toks = text.trim().split(/\s+/);

test('corpus as specified: 30,519 tokens, 2,653 distinct', () => {
  assert.equal(m.tokens.length, 30519);
  assert.equal(m.vocab.size, 2653);
});

test('counts and probabilities match a direct count in the corpus (T = 1)', () => {
  for (const ctx of [['the'], ['alice'], ['the', 'queen']]) {
    const direct = new Map();
    let total = 0;
    for (let i = ctx.length; i < toks.length; i++) {
      if (ctx.every((w, k) => toks[i - ctx.length + k] === w)) {
        direct.set(toks[i], (direct.get(toks[i]) ?? 0) + 1);
        total++;
      }
    }
    const d = distribution(m, ctx, ctx.length, 1);
    assert.equal(d.used, ctx.length);
    assert.equal(d.total, total);
    for (const c of d.cands) assert.ok(Math.abs(c.p - direct.get(c.w) / total) < 1e-12);
  }
});

test('two words of context fall back to one when the pair never occurs', () => {
  const d = distribution(m, ['cheshire', 'alice'], 2, 1);
  assert.equal(d.used, 1);
  assert.equal(d.ctx, 'alice');
});

test('T = 0.1 picks the most frequent word', () => {
  const d1 = distribution(m, ['the'], 1, 1);
  const out = grow(m, ['the'], 1, 1, 0.1, () => 0.5);
  assert.equal(out[1], d1.cands[0].w);
  const cold = distribution(m, ['the'], 1, 0.1).cands;
  assert.equal(cold[0].w, d1.cands[0].w);
  assert.ok(cold[0].p > 10 * d1.cands[0].p); // "queen" 4% → 56% after "the"
});

test('the copy detector finds a planted 8-word quote', () => {
  const quote = toks.slice(1000, 1008);
  const planted = ['the', 'the', ...quote, 'queen', 'queen'];
  const [a, b] = longestCopy(m, planted);
  assert.ok(b - a >= 8);
  assert.ok(planted.slice(a, b).join(' ').includes(quote.join(' ')));
});

test('an unknown start word gives a message naming it', () => {
  const r = parseStart(m, 'the zyxwv cat');
  assert.equal(r.ok, false);
  assert.match(r.msg, /“zyxwv”/);
  assert.deepEqual(parseStart(m, 'The Queen'), { ok: true, toks: ['the', 'queen'] });
});

test('display: capitals for sentence starts, I and Alice; punctuation attached', () => {
  assert.equal(
    joinShown(pretty(['alice', 'said', ',', 'i', 'think', '.', 'so', 'alice', 'went'])),
    'Alice said, I think. So Alice went',
  );
  assert.equal(percent(1), '100%');
  assert.equal(percent(0.004), '<1%');
  assert.equal(percent(0.236), '24%');
});
