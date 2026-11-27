// Training footprint (docs/DEMOS.md) The footprint of training on GPUs:
// kWh = GPUs × rated power × average load × hours × PUE × runs; kg CO₂e = kWh × grid / 1000.
// Every constant describing the real world has its source in the demo's notes (registry.ts).
// Pure logic, no DOM: unit-tested in tests/training-footprint.test.mjs and used by ui.ts.

/** [id, label, rated board power in W] (manufacturers' figures) */
export const GPUS = [
  ['rtx4090', 'RTX 4090', 450],
  ['rtx5090', 'RTX 5090', 575],
  ['rtx6000ada', 'RTX 6000 Ada', 300],
  ['a100', 'A100 SXM', 400],
  ['h100', 'H100 SXM', 700],
] as const;

/**
 * [id, label, g CO₂e per kWh]. German mix 2024: Umweltbundesamt estimate (CO₂ only); EU 2024: Ember
 * via Our World in Data; wind, solar PV, gas, coal: lifecycle medians, IPCC AR5 WG3 Annex III (2014).
 * Update the 2024 values yearly, with source and year (docs/DEMOS.md).
 */
export const GRIDS = [
  ['wind', 'Wind', 11],
  ['solar', 'Solar PV', 48],
  ['eu', 'EU mix 2024', 211],
  ['de', 'German mix 2024', 363],
  ['gas', 'Gas', 490],
  ['coal', 'Coal', 820],
] as const;

/** [hours, label] for the training-time slider */
export const DURATIONS = [
  [1, '1 hour'],
  [6, '6 hours'],
  [24, '1 day'],
  [72, '3 days'],
  [168, '1 week'],
  [336, '2 weeks'],
  [720, '1 month'],
  [2160, '3 months'],
] as const;

export type GpuId = (typeof GPUS)[number][0];
export type GridId = (typeof GRIDS)[number][0];

export interface Inputs {
  gpu: GpuId;
  /** number of GPUs, 1–64 */
  n: number;
  /** index into DURATIONS */
  durIdx: number;
  /** average load in percent, 30–100 */
  load: number;
  /** power usage effectiveness, 1.00–2.00 (2024 industry average 1.56, Uptime Institute) */
  pue: number;
  /** runs, including tuning and failed attempts, 1–50 */
  runs: number;
  grid: GridId;
}

export const DEFAULTS: Inputs = {
  gpu: 'rtx6000ada',
  n: 4,
  durIdx: 3,
  load: 70,
  pue: 1.56,
  runs: 1,
  grid: 'de',
};

export const gpuWatts = (id: GpuId) => GPUS.find((g) => g[0] === id)![2];
export const gridIntensity = (id: GridId) => GRIDS.find((g) => g[0] === id)![2];
export const hours = (s: Inputs) => DURATIONS[s.durIdx]![0];

export function kwh(s: Inputs): number {
  return s.n * (gpuWatts(s.gpu) / 1000) * (s.load / 100) * hours(s) * s.pue * s.runs;
}

/** kg CO₂e of `energy` kWh at `gPerKwh` grams per kWh. */
export const kgCo2 = (energy: number, gPerKwh: number) => (energy * gPerKwh) / 1000;

const num = (v: number, digits: number) =>
  v.toLocaleString('en-GB', { maximumFractionDigits: digits });

export function formatEnergy(v: number): string {
  return v >= 10000 ? `${num(v / 1000, 1)} MWh` : `${num(v, v < 10 ? 1 : 0)} kWh`;
}

export function formatCo2(v: number): string {
  return v >= 1000 ? `${num(v / 1000, 2)} t CO₂e` : `${num(v, v < 10 ? 1 : 0)} kg CO₂e`;
}

/** Short form for the comparison bars. */
export function formatMass(v: number): string {
  return v >= 1000 ? `${num(v / 1000, 1)} t` : `${num(v, v < 10 ? 1 : 0)} kg`;
}

/** The formula with the current numbers, as printed under the result. */
export function formula(s: Inputs): string {
  const e = kwh(s);
  const g = gridIntensity(s.grid);
  return (
    `${s.n} × ${gpuWatts(s.gpu)} W × ${s.load}% × ${hours(s)} h × PUE ${s.pue.toFixed(2)}` +
    (s.runs > 1 ? ` × ${s.runs} runs` : '') +
    ` = ${formatEnergy(e)} · × ${g} g/kWh = ${formatCo2(kgCo2(e, g))}`
  );
}

/** One bar per electricity source, scaled to coal (the largest). */
export function comparison(s: Inputs) {
  const e = kwh(s);
  const max = kgCo2(e, 820);
  return GRIDS.map(([id, label, g]) => {
    const kg = kgCo2(e, g);
    return { id, label, kg, text: formatMass(kg), share: Math.max(0.006, kg / max) };
  });
}
