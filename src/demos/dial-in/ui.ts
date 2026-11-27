// Dial in the espresso. The interactive part: a map of grind × dose drawn from the model's
// predictions, sliders (and taps on the map) to choose a setting, "Brew", the model's two
// suggestions, the shots so far, a new bean, and the true window on request. Logic in core.ts.
import './dial-in.css';
import {
  GRIND,
  DOSE,
  GRINDS,
  DOSES,
  WINDOW,
  BUDGET,
  brew,
  rng,
  verdict,
  fit,
  grid,
  bestGuess,
  explore,
  grindFor,
  type Shot,
  type Cell,
  type Verdict,
} from './core.ts';

type View = 'chance' | 'time' | 'sd';
const VIEWS: [View, string][] = [
  ['chance', 'Chance of a good shot'],
  ['time', 'Predicted pull time'],
  ['sd', 'How unsure the model is'],
];
const LEGENDS: Record<View, string> = {
  chance:
    'Darker teal means the model expects a shot in the 20–35 s window. Pale means unlikely or unknown.',
  time: 'Peach is too fast (under 20 s). Teal is in the window. Dark is too slow (over 35 s). Colors fade where the model is unsure.',
  sd: 'Darker orange means the model knows little here. Pale means close to shots it has seen.',
};
const VERDICT_TEXT: Record<Verdict, string> = {
  fast: 'too fast',
  good: 'in the window',
  slow: 'too slow',
};

// map geometry (CSS pixels of the drawing; the canvas scales to its box)
const W = 600;
const H = 300;
const PAD = { l: 52, r: 10, t: 8, b: 36 };
const CW = (W - PAD.l - PAD.r) / GRINDS.length;
const CH = (H - PAD.t - PAD.b) / DOSES.length;
const cx = (g: number) => PAD.l + (g - GRIND.min + 0.5) * CW;
const cy = (d: number) => H - PAD.b - ((d - DOSE.min) / DOSE.step + 0.5) * CH;

const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((x, i) => Math.round(x + (b[i]! - x) * t)).join(',')})`;
const WHITE = [255, 255, 255];
const TEAL = [31, 107, 96];
const PEACH = [243, 181, 133];
const DARK = [38, 52, 70];
const ORANGE = [227, 138, 67];

function colour(c: Cell, view: View): string {
  if (view === 'chance') return mix(WHITE, TEAL, Math.min(c.chance / 0.9, 1));
  if (view === 'sd') return mix(WHITE, ORANGE, Math.min(c.sd / 0.7, 1));
  const sure = Math.max(0, 1 - c.sd / 0.7);
  const base = c.time < WINDOW.fast ? PEACH : c.time > WINDOW.slow ? DARK : TEAL;
  return mix(WHITE, base, 0.25 + 0.75 * sure);
}

const SKELETON = `
<div class="di">
  <div class="di-map-col">
    <div class="di-views" role="group" aria-label="What the map shows">${VIEWS.map(([v, l]) => `<button type="button" class="demo-chip" data-view="${v}">${l}</button>`).join('')}</div>
    <canvas class="di-map" width="${W}" height="${H}" role="img" data-map></canvas>
    <p class="di-legend">Each cell of the map is one combination of settings. The grind gets coarser from left (1, the finest) to right (30). The dose of ground coffee increases from bottom to top.</p>
    <p class="di-legend" data-legend></p>
    <p class="di-legend di-shapes"><span class="di-key di-good"></span> in the window <span class="di-key di-fast"></span> too fast <span class="di-key di-slow"></span> too slow <span class="di-key di-hint"></span> earlier bean</p>
  </div>
  <div class="di-side">
    <div class="di-slider"><div class="di-slider-head"><label for="di-grind">Grind setting</label><span class="di-value" data-show="grind" aria-hidden="true"></span></div>
      <input id="di-grind" type="range" min="${GRIND.min}" max="${GRIND.max}" step="1" data-input="grind" /></div>
    <div class="di-slider"><div class="di-slider-head"><label for="di-dose">Dose of ground coffee</label><span class="di-value" data-show="dose" aria-hidden="true"></span></div>
      <input id="di-dose" type="range" min="${DOSE.min}" max="${DOSE.max}" step="${DOSE.step}" data-input="dose" /></div>
    <p class="di-predict" data-predict></p>
    <div class="di-actions">
      <button type="button" class="demo-btn demo-btn-primary" data-brew>Brew this shot</button>
      <button type="button" class="demo-btn demo-btn-outline" data-suggest="best">Model's best guess</button>
      <button type="button" class="demo-btn demo-btn-outline" data-suggest="explore">Explore where it knows least</button>
    </div>
    <p class="di-result" data-result aria-live="polite"></p>
    <p class="di-left" data-left></p>
    <ol class="di-shots" data-shots aria-label="Shots so far"></ol>
    <div class="di-more">
      <button type="button" class="demo-chip-light" data-truth aria-pressed="false">Show the true window</button>
      <button type="button" class="demo-chip-light" data-bean>New bean</button>
      <button type="button" class="demo-chip-light" data-reset>Start over</button>
    </div>
  </div>
</div>`;

export function mount(root: HTMLElement) {
  root.innerHTML = SKELETON;
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>('[data-map]');
  const ctx = canvas.getContext('2d')!;
  const gIn = $<HTMLInputElement>('#di-grind');
  const dIn = $<HTMLInputElement>('#di-dose');

  let shots: Shot[] = [];
  let bean = 0;
  let left = BUDGET;
  let view: View = 'chance';
  let truth = false;
  let sel = { grind: 15, dose: 17 };
  let rand = rng(1);
  let cells: Cell[] = [];

  const refit = () => (cells = grid(fit(shots, bean)));
  const cellAt = (g: number, d: number) => cells.find((c) => c.grind === g && c.dose === d)!;

  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) =>
    b.addEventListener('click', () => {
      view = b.dataset.view as View;
      render();
    }),
  );
  gIn.addEventListener('input', () => {
    sel.grind = Number(gIn.value);
    render();
  });
  dIn.addEventListener('input', () => {
    sel.dose = Number(dIn.value);
    render();
  });
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    const i = Math.floor((x - PAD.l) / CW);
    const j = Math.floor((H - PAD.b - y) / CH);
    if (i < 0 || i >= GRINDS.length || j < 0 || j >= DOSES.length) return;
    sel = { grind: GRINDS[i]!, dose: DOSES[j]! };
    render();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-suggest]').forEach((b) =>
    b.addEventListener('click', () => {
      const c = b.dataset.suggest === 'best' ? bestGuess(cells) : explore(cells);
      sel = { grind: c.grind, dose: c.dose };
      $('[data-result]').textContent =
        b.dataset.suggest === 'best'
          ? `The model suggests grind ${c.grind} with ${c.dose} g, its best chance of a good shot (${pct(c.chance)}).`
          : `The model suggests grind ${c.grind} with ${c.dose} g, where it knows least. A shot here teaches it the most.`;
      render();
    }),
  );
  $('[data-brew]').addEventListener('click', () => {
    if (left === 0) {
      $('[data-result]').textContent =
        'No shots are left for this bean. Try a new bean or start over.';
      return;
    }
    const time = brew(sel.grind, sel.dose, bean, rand);
    shots.push({ ...sel, time, bean });
    left--;
    const v = verdict(time);
    $('[data-result]').textContent =
      `Shot ${BUDGET - left} with grind ${sel.grind} and ${sel.dose} g ran ${time.toFixed(1)} s, ${VERDICT_TEXT[v]}.` +
      (left === 0
        ? ' No shots are left for this bean. Compare with the true window or try a new bean.'
        : '');
    refit();
    render();
  });
  $('[data-truth]').addEventListener('click', () => {
    truth = !truth;
    render();
  });
  $('[data-bean]').addEventListener('click', () => {
    bean++;
    left = BUDGET;
    truth = false;
    $('[data-result]').textContent =
      'A new bean behaves differently. The earlier shots stay on the map as rough hints only.';
    refit();
    render();
  });
  $('[data-reset]').addEventListener('click', () => {
    shots = [];
    bean = 0;
    left = BUDGET;
    truth = false;
    sel = { grind: 15, dose: 17 };
    rand = rng(1);
    $('[data-result]').textContent = 'Started over with the first bean.';
    refit();
    render();
  });

  const pct = (x: number) => {
    const p = Math.round(x * 100);
    return p >= 100 ? 'over 99%' : p <= 0 ? 'under 1%' : `${p}%`;
  };

  function draw() {
    // labels and markers keep their size on small screens, where the drawing is scaled down
    const k = Math.min(Math.max(W / (canvas.clientWidth || W), 1), 2);
    ctx.clearRect(0, 0, W, H);
    for (const c of cells) {
      ctx.fillStyle = colour(c, view);
      ctx.fillRect(cx(c.grind) - CW / 2, cy(c.dose) - CH / 2, CW + 0.5, CH + 0.5);
    }
    if (truth) {
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#14201f';
      for (const t of [WINDOW.fast, WINDOW.slow]) {
        ctx.beginPath();
        DOSES.forEach((d, i) => {
          const x = PAD.l + (grindFor(t, d, bean) - GRIND.min + 0.5) * CW;
          if (i) ctx.lineTo(x, cy(d));
          else ctx.moveTo(x, cy(d));
        });
        ctx.stroke();
      }
      ctx.restore();
    }
    // shots: filled circle in the window, ring too fast, square too slow; earlier beans faded
    for (const s of shots) {
      const x = cx(s.grind);
      const y = cy(s.dose);
      const v = verdict(s.time);
      ctx.globalAlpha = s.bean === bean ? 1 : 0.4;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#14201f';
      ctx.beginPath();
      if (v === 'slow') ctx.rect(x - 6 * k, y - 6 * k, 12 * k, 12 * k);
      else ctx.arc(x, y, 6.5 * k, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      if (v === 'fast') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3 * k, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // the chosen setting
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e38a43';
    ctx.strokeRect(cx(sel.grind) - CW / 2, cy(sel.dose) - CH / 2, CW, CH);
    // axes
    ctx.fillStyle = '#3d4b49';
    ctx.font = `${12 * k}px "IBM Plex Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (const g of [1, 5, 10, 15, 20, 25, 30]) ctx.fillText(String(g), cx(g), H - PAD.b + 16 * k);
    ctx.textAlign = 'right';
    for (const d of [14, 16, 18, 20]) ctx.fillText(`${d} g`, PAD.l - 6, cy(d) + 4 * k);
  }

  function render() {
    gIn.value = String(sel.grind);
    dIn.value = String(sel.dose);
    gIn.setAttribute('aria-valuetext', `${sel.grind}${sel.grind === 1 ? ' (finest)' : ''}`);
    dIn.setAttribute('aria-valuetext', `${sel.dose} grams`);
    $('[data-show="grind"]').textContent = String(sel.grind);
    $('[data-show="dose"]').textContent = `${sel.dose} g`;
    root
      .querySelectorAll<HTMLButtonElement>('[data-view]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    $('[data-legend]').textContent = LEGENDS[view];
    $('[data-truth]').setAttribute('aria-pressed', String(truth));
    $('[data-truth]').textContent = truth ? 'Hide the true window' : 'Show the true window';
    const c = cellAt(sel.grind, sel.dose);
    $('[data-predict]').textContent =
      `The model expects about ${Math.round(c.time)} s here. The chance of a good shot is ${pct(c.chance)}.`;
    $('[data-left]').textContent = `Bean ${bean + 1}, ${left} of ${BUDGET} shots left.`;
    $('[data-brew]').setAttribute('aria-disabled', String(left === 0));
    const mine = shots.filter((s) => s.bean === bean);
    const list = $('[data-shots]');
    list.replaceChildren(
      ...mine.map((s) => {
        const li = document.createElement('li');
        const v = verdict(s.time);
        li.className = `di-shot di-${v}`;
        li.textContent = `Grind ${s.grind}, ${s.dose} g, ${s.time.toFixed(1)} s, ${VERDICT_TEXT[v]}`;
        return li;
      }),
    );
    const best = bestGuess(cells);
    canvas.setAttribute(
      'aria-label',
      `Map of grind setting against dose, showing ${VIEWS.find(([v]) => v === view)![1].toLowerCase()}. ` +
        `${mine.length ? `${mine.length} shots taken with this bean.` : 'No shots with this bean yet.'} ` +
        `The model's best guess is grind ${best.grind}, ${best.dose} g. The selected setting is grind ${sel.grind}, ${sel.dose} g.`,
    );
    draw();
  }

  refit();
  render();
  // the label size depends on the drawn width: redraw when it changes
  new ResizeObserver(() => draw()).observe(canvas);
}
