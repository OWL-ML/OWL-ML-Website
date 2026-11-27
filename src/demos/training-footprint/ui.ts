// Training footprint. The interactive part: inputs on the left, result,
// formula and comparison on the right, recomputed on every change. Logic lives in core.ts.
import './training-footprint.css';
import {
  GPUS,
  GRIDS,
  DURATIONS,
  DEFAULTS,
  kwh,
  kgCo2,
  gridIntensity,
  formatEnergy,
  formatCo2,
  formula,
  comparison,
  type Inputs,
  type GpuId,
  type GridId,
} from './core.ts';

type NumKey = 'n' | 'durIdx' | 'runs' | 'load' | 'pue';
interface Slider {
  key: NumKey;
  label: string;
  min: number;
  max: number;
  step: number;
  hint?: string;
  show: (s: Inputs) => string;
}

const SLIDERS: Slider[] = [
  { key: 'n', label: 'Number of GPUs', min: 1, max: 64, step: 1, show: (s) => String(s.n) },
  {
    key: 'durIdx',
    label: 'Training time per run',
    min: 0,
    max: DURATIONS.length - 1,
    step: 1,
    show: (s) => DURATIONS[s.durIdx]![1],
  },
  {
    key: 'runs',
    label: 'Runs, including tuning and failed attempts',
    min: 1,
    max: 50,
    step: 1,
    hint: 'The final model is rarely the only one trained.',
    show: (s) => String(s.runs),
  },
  {
    key: 'load',
    label: 'Average GPU load',
    min: 30,
    max: 100,
    step: 5,
    hint: 'GPUs seldom draw their full rated power the whole time.',
    show: (s) => `${s.load}%`,
  },
  {
    key: 'pue',
    label: 'Data center overhead (PUE)',
    min: 1,
    max: 2,
    step: 0.01,
    hint: 'Cooling and power conversion on top of the IT load. A value of 1.00 would mean none. The 2024 industry average was 1.56.',
    show: (s) => s.pue.toFixed(2),
  },
];

const SKELETON = `
<div class="fp">
  <div class="fp-inputs">
    <div class="fp-group" role="group" aria-labelledby="fp-gpu-label">
      <span class="fp-label" id="fp-gpu-label">GPU</span>
      <div class="fp-chips">${GPUS.map(([id, l, w]) => `<button type="button" class="demo-chip" data-gpu="${id}">${l} · ${w} W</button>`).join('')}</div>
    </div>
    ${SLIDERS.map(
      (s) => `<div class="fp-slider">
      <div class="fp-slider-head"><label for="fp-${s.key}" class="fp-label">${s.label}</label><span class="fp-value" data-show="${s.key}" aria-hidden="true"></span></div>
      <input id="fp-${s.key}" type="range" min="${s.min}" max="${s.max}" step="${s.step}" data-key="${s.key}"${s.hint ? ` aria-describedby="fp-${s.key}-hint"` : ''} />
      ${s.hint ? `<p class="fp-hint" id="fp-${s.key}-hint">${s.hint}</p>` : ''}
    </div>`,
    ).join('')}
    <div class="fp-group" role="group" aria-labelledby="fp-grid-label">
      <span class="fp-label" id="fp-grid-label">Electricity</span>
      <div class="fp-chips">${GRIDS.map(([id, l, g]) => `<button type="button" class="demo-chip" data-grid="${id}">${l} · ${g} g</button>`).join('')}</div>
    </div>
  </div>
  <div class="fp-result">
    <div class="fp-tiles" aria-live="polite" aria-atomic="true">
      <div class="fp-tile"><span>Electricity</span><strong data-energy></strong></div>
      <div class="fp-tile fp-tile-co2"><span>Emissions</span><strong data-co2></strong></div>
    </div>
    <p class="fp-formula" data-formula></p>
    <div class="fp-compare">
      <p class="fp-label">The same runs, powered differently <span class="fp-unit">(CO₂e)</span></p>
      <ul class="fp-bars" data-bars></ul>
    </div>
  </div>
</div>`;

export function mount(root: HTMLElement) {
  root.innerHTML = SKELETON;
  const s: Inputs = { ...DEFAULTS };
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;

  root.querySelectorAll<HTMLButtonElement>('[data-gpu]').forEach((b) =>
    b.addEventListener('click', () => {
      s.gpu = b.dataset.gpu as GpuId;
      render();
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-grid]').forEach((b) =>
    b.addEventListener('click', () => {
      s.grid = b.dataset.grid as GridId;
      render();
    }),
  );
  root.querySelectorAll<HTMLInputElement>('[data-key]').forEach((input) => {
    const key = input.dataset.key as NumKey;
    input.value = String(s[key]);
    input.addEventListener('input', () => {
      s[key] = Number(input.value);
      render();
    });
  });

  function render() {
    root
      .querySelectorAll<HTMLButtonElement>('[data-gpu]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gpu === s.gpu)));
    root
      .querySelectorAll<HTMLButtonElement>('[data-grid]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.grid === s.grid)));
    for (const sl of SLIDERS) {
      $(`[data-show="${sl.key}"]`).textContent = sl.show(s);
      $(`#fp-${sl.key}`).setAttribute('aria-valuetext', sl.show(s));
    }
    const e = kwh(s);
    $('[data-energy]').textContent = formatEnergy(e);
    $('[data-co2]').textContent = formatCo2(kgCo2(e, gridIntensity(s.grid)));
    $('[data-formula]').textContent = formula(s);
    const list = $('[data-bars]');
    list.replaceChildren(
      ...comparison(s).map((c) => {
        const li = document.createElement('li');
        li.className = c.id === s.grid ? 'fp-bar fp-current' : 'fp-bar';
        const label = document.createElement('span');
        label.className = 'fp-bar-label';
        label.textContent = c.label;
        const track = document.createElement('span');
        track.className = 'fp-track';
        track.setAttribute('aria-hidden', 'true');
        const fill = document.createElement('span');
        fill.className = 'fp-fill';
        fill.style.width = `${(c.share * 100).toFixed(1)}%`;
        track.append(fill);
        const value = document.createElement('span');
        value.className = 'fp-bar-value';
        value.textContent = c.text;
        li.append(label, track, value);
        return li;
      }),
    );
  }
  render();
}
