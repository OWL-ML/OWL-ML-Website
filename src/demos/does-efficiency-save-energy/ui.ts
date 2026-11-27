// Does efficiency save energy? The interactive part: guess first, then explore how
// strongly usage responds; bars and a curve show energy per query, queries and the total.
// Logic lives in core.ts.
import './does-efficiency-save-energy.css';
import { outcome, regime, GUESSES, REGIMES, MAX_RESPONSE, fmt, type Regime } from './core.ts';

const SCALE = 400; // bar length: the most queries the slider can reach (2² × 100)
const W = 320;
const H = 184;
const X0 = 44;
const X1 = W - 12;
const Y0 = H - 38;
const Y1 = 12;
const YMAX = 200;
const x = (e: number) => X0 + (e / MAX_RESPONSE) * (X1 - X0);
const y = (t: number) => Y0 - (t / YMAX) * (Y0 - Y1);

function curve(): string {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const e = (i / 40) * MAX_RESPONSE;
    pts.push(`${i ? 'L' : 'M'}${x(e).toFixed(1)},${y(outcome(e).total).toFixed(1)}`);
  }
  return pts.join('');
}

const BARS = [
  ['perQuery', 'Energy per query'],
  ['queries', 'Number of queries'],
  ['total', 'Total energy'],
] as const;

const SKELETON = `
<div class="rb">
  <div class="rb-left">
    <div class="rb-ask" role="group" aria-labelledby="rb-q">
      <p class="rb-q" id="rb-q">We made the model <strong>twice as efficient</strong> per query. What happens to the total energy used by all queries?</p>
      <div class="rb-guesses">${GUESSES.map((g) => `<button type="button" class="demo-chip" data-guess="${g.id}">${g.label}</button>`).join('')}</div>
      <button type="button" class="demo-chip-light" data-skip>Just show me</button>
    </div>
    <p class="rb-feedback" data-feedback hidden></p>
    <div class="rb-explore" data-explore hidden>
      <div class="rb-slider">
        <div class="rb-slider-head"><label for="rb-e">How strongly usage responds when queries get cheaper</label><span class="rb-value" data-e aria-hidden="true"></span></div>
        <input id="rb-e" type="range" min="0" max="${MAX_RESPONSE}" step="0.1" aria-describedby="rb-e-hint" />
        <p class="rb-hint" id="rb-e-hint">At 0, usage stays the same however cheap queries get. At 1, half the cost means twice the usage. Economists call this the price elasticity of demand.</p>
      </div>
      <div class="rb-regime" data-regime aria-live="polite"><strong data-regime-title></strong> <span data-regime-text></span></div>
    </div>
  </div>
  <div class="rb-right" data-explore hidden>
    <p class="rb-label">Compared with today <span class="rb-unit">(today = 100)</span></p>
    <ul class="rb-bars">${BARS.map(
      ([id, l]) =>
        `<li class="rb-bar" data-bar="${id}"><span class="rb-bar-label">${l}</span><span class="rb-track" aria-hidden="true"><span class="rb-fill"></span><span class="rb-today" style="left:${(100 / SCALE) * 100}%"></span></span><span class="rb-bar-value"></span></li>`,
    ).join('')}</ul>
    <svg class="rb-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Total energy against how strongly usage responds. It halves at 0, is back at today's level at 1 and doubles at 2.">
      <rect x="${x(1)}" y="${Y1}" width="${X1 - x(1)}" height="${Y0 - Y1}" class="rb-zone" />
      <line x1="${X0}" x2="${X1}" y1="${y(100)}" y2="${y(100)}" class="rb-ref" />
      <text x="${X1}" y="${y(100) - 5}" text-anchor="end" class="rb-small">Today</text>
      <line x1="${X0}" x2="${X0}" y1="${Y1}" y2="${Y0}" class="rb-axis" />
      <line x1="${X0}" x2="${X1}" y1="${Y0}" y2="${Y0}" class="rb-axis" />
      ${[0, 100, 200].map((t) => `<text x="${X0 - 6}" y="${y(t) + 4}" text-anchor="end" class="rb-small">${t}</text>`).join('')}
      ${[0, 1, 2].map((e) => `<text x="${x(e)}" y="${Y0 + 16}" text-anchor="middle" class="rb-small">${e}</text>`).join('')}
      <text x="${(X0 + X1) / 2}" y="${H - 4}" text-anchor="middle" class="rb-small">How Strongly Usage Responds</text>
      <text x="${x(1.5)}" y="${y(40)}" text-anchor="middle" class="rb-small rb-zone-label">Higher Consumption</text>
      <path d="${curve()}" class="rb-curve" />
      <circle r="6" class="rb-dot" data-dot />
    </svg>
  </div>
</div>`;

export function mount(root: HTMLElement) {
  root.innerHTML = SKELETON;
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const slider = $<HTMLInputElement>('#rb-e');
  let e = 0;

  const reveal = (guess?: Regime) => {
    root.querySelectorAll<HTMLElement>('[data-explore]').forEach((el) => (el.hidden = false));
    root
      .querySelectorAll<HTMLButtonElement>('[data-guess]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.guess === guess)));
    const fb = $<HTMLElement>('[data-feedback]');
    fb.hidden = !guess;
    if (guess) {
      const g = GUESSES.find((x) => x.id === guess)!;
      e = g.response;
      fb.textContent = `That can happen. Here usage responds with ${g.response}. Each of the four answers is right for some response. Move the slider to see where each one holds.`;
    } else e = 1;
    render();
  };
  root
    .querySelectorAll<HTMLButtonElement>('[data-guess]')
    .forEach((b) => b.addEventListener('click', () => reveal(b.dataset.guess as Regime)));
  $('[data-skip]').addEventListener('click', () => reveal());
  slider.addEventListener('input', () => {
    e = Number(slider.value);
    render();
  });

  function render() {
    const o = outcome(e);
    const r = regime(e);
    slider.value = String(e);
    slider.setAttribute('aria-valuetext', `${e.toFixed(1)}, ${REGIMES[r].title.toLowerCase()}`);
    $('[data-e]').textContent = e.toFixed(1);
    $('[data-regime-title]').textContent = `${REGIMES[r].title}.`;
    $('[data-regime-text]').textContent = REGIMES[r].text;
    $('[data-regime]').className = `rb-regime rb-${r}`;
    for (const [id] of BARS) {
      const li = $(`[data-bar="${id}"]`);
      li.querySelector<HTMLElement>('.rb-fill')!.style.width =
        `${(Math.min(o[id], SCALE) / SCALE) * 100}%`;
      li.querySelector('.rb-bar-value')!.textContent = fmt(o[id]);
      li.classList.toggle('rb-up', id === 'total' && o.total > 100 + 1e-9);
    }
    const dot = $<SVGCircleElement>('[data-dot]');
    dot.setAttribute('cx', x(e).toFixed(1));
    dot.setAttribute('cy', y(o.total).toFixed(1));
  }
}
