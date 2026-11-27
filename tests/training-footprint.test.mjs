// Checks for the footprint demo from docs/DEMOS.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULTS,
  kwh,
  kgCo2,
  formatEnergy,
  formatCo2,
  formula,
  comparison,
  gridIntensity,
} from '../src/demos/training-footprint/core.ts';

test('defaults: 4 × RTX 6000 Ada, 3 days, 70%, PUE 1.56, German mix → 94 kWh, 34 kg', () => {
  const e = kwh(DEFAULTS);
  assert.ok(Math.abs(e - 4 * 0.3 * 0.7 * 72 * 1.56) < 1e-9);
  assert.equal(formatEnergy(e), '94 kWh');
  assert.equal(formatCo2(kgCo2(e, gridIntensity('de'))), '34 kg CO₂e');
});

test('the formula is printed with the current numbers', () => {
  assert.equal(
    formula(DEFAULTS),
    '4 × 300 W × 70% × 72 h × PUE 1.56 = 94 kWh · × 363 g/kWh = 34 kg CO₂e',
  );
  assert.match(formula({ ...DEFAULTS, runs: 5 }), /× 5 runs =/);
});

test('linear in GPUs, runs, load and PUE; units switch to MWh and t', () => {
  assert.ok(Math.abs(kwh({ ...DEFAULTS, runs: 10 }) - 10 * kwh(DEFAULTS)) < 1e-9);
  assert.ok(Math.abs(kwh({ ...DEFAULTS, n: 8 }) - 2 * kwh(DEFAULTS)) < 1e-9);
  assert.equal(formatEnergy(12345), '12.3 MWh');
  assert.equal(formatCo2(2345.6), '2.35 t CO₂e');
  assert.equal(formatEnergy(4.25), '4.3 kWh');
});

test('comparison: one bar per source, coal is the full width', () => {
  const bars = comparison(DEFAULTS);
  assert.deepEqual(
    bars.map((b) => b.id),
    ['wind', 'solar', 'eu', 'de', 'gas', 'coal'],
  );
  assert.equal(bars.at(-1).share, 1);
  assert.ok(bars.every((b, i) => i === 0 || b.kg >= bars[i - 1].kg));
});
