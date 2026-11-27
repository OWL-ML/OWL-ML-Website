// Watch it forget: the interactive part. Trains live (5 steps per frame), pauses while off-screen,
// and jumps to the end under prefers-reduced-motion. Logic lives in core.ts.
import './watch-it-forget.css';
import type { DemoHost } from '../frame.ts';
import {
  makeData,
  makeNet,
  clone,
  forward,
  fisher,
  accuracy,
  trainStep,
  outcomeNote,
  REPLAY,
  LAMBDAS,
  STEPS,
  type Net,
  type Params,
  type Strategy,
  type Job,
} from './core.ts';

type Stage = 'init' | 'trainingA' | 'afterA' | 'trainingB' | 'afterB';

const STRATEGIES: [Strategy, string][] = [
  ['plain', 'Nothing'],
  ['replay', 'Replay 8 old points'],
  ['ewc', 'EWC'],
];

const SKELETON = `
<div class="fg">
  <div class="fg-plot">
    <div class="fg-tasks" aria-hidden="true"><span>Task A</span><span>Task B</span></div>
    <canvas class="fg-canvas" role="img" width="1320" height="858" data-canvas></canvas>
    <div class="fg-legend">
      <span><span class="fg-dot fg-orange"></span>orange class</span>
      <span><span class="fg-dot fg-teal"></span>teal class</span>
      <span>The background shows the network's current answer for every point</span>
      <span data-ring-legend hidden><span class="fg-dot fg-orange fg-ring"></span>remembered for replay</span>
    </div>
  </div>
  <div class="fg-side">
    <div class="fg-group" role="group" aria-labelledby="fg-strategy-label">
      <span class="fg-label" id="fg-strategy-label">While learning task B, protect task A with</span>
      <div class="fg-chips">
        ${STRATEGIES.map(([k, l]) => `<button type="button" class="demo-chip" data-strategy="${k}" aria-pressed="${k === 'plain'}">${l}</button>`).join('')}
      </div>
    </div>
    <div class="fg-lambda" data-lambda hidden>
      <label for="fg-lam" class="fg-label">How strongly to hold on to important weights</label>
      <input id="fg-lam" type="range" min="0" max="5" step="1" value="2" />
      <div class="fg-ends" aria-hidden="true"><span>weaker, keeps learning</span><span>stronger, keeps what it knows</span></div>
    </div>
    <div class="fg-buttons">
      <button type="button" class="demo-btn demo-btn-primary" data-primary>1 · Learn task A</button>
      <button type="button" class="demo-btn demo-btn-outline" data-reset>Start over</button>
    </div>
    <div class="fg-bars">
      ${['A', 'B']
        .map(
          (t) => `<div class="fg-bar">
        <div class="fg-bar-head"><span>${t === 'A' ? 'Task A, left' : 'Task B, right'}</span><span class="fg-bar-text" data-bar-text="${t}"></span></div>
        <div class="fg-track" aria-hidden="true"><div class="fg-fill" data-bar-fill="${t}"></div></div>
      </div>`,
        )
        .join('')}
    </div>
    <p class="fg-note" aria-live="polite" data-note></p>
  </div>
</div>`;

const HEAT_ORANGE = [0xf6, 0xbe, 0x8e];
const HEAT_TEAL = [0x9f, 0xd0, 0xc4];

export function mount(root: HTMLElement, host: DemoHost) {
  root.innerHTML = SKELETON;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>('[data-canvas]');
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2); // drawn at twice the size for sharp high-density screens
  const css = getComputedStyle(root);
  const color = (name: string) => css.getPropertyValue(name).trim();

  const data = makeData();
  let net: Net = makeNet();
  let snapA: Net | null = null;
  let F: Params | null = null;
  let stage: Stage = 'init';
  let strategy: Strategy = 'plain';
  let lamIdx = 2;
  let job: Job | null = null;
  let done = 0;
  let visible = true;
  let frame = 0;

  // training pauses while the demo is off-screen
  new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting;
    if (visible && job && !frame) frame = requestAnimationFrame(tick);
  }).observe(root);

  function train(phase: 'A' | 'B') {
    if (phase === 'B') {
      net = clone(snapA!);
      F ??= fisher(snapA!, data.A);
    }
    job = {
      n: net,
      phase,
      data,
      strategy,
      lambda: LAMBDAS[lamIdx],
      star: snapA?.p.map((q) => q.slice()),
      F: F ?? undefined,
    };
    done = 0;
    stage = phase === 'A' ? 'trainingA' : 'trainingB';
    render();
    frame = requestAnimationFrame(tick);
  }

  function tick() {
    frame = 0;
    if (!job || !visible) return;
    const per = host.motion ? 5 : STEPS;
    for (let i = 0; i < per && done < STEPS; i++, done++) trainStep(job);
    if (done < STEPS) {
      draw();
      frame = requestAnimationFrame(tick);
      return;
    }
    if (job.phase === 'A') {
      snapA = clone(net);
      F = null;
      stage = 'afterA';
    } else stage = 'afterB';
    job = null;
    render();
  }

  const backToA = () => {
    net = clone(snapA!);
    stage = 'afterA';
  };

  const busy = () => stage === 'trainingA' || stage === 'trainingB';
  root.querySelectorAll<HTMLButtonElement>('[data-strategy]').forEach((b) =>
    b.addEventListener('click', () => {
      if (busy()) return;
      strategy = b.dataset.strategy as Strategy;
      if (stage === 'afterB') backToA();
      render();
    }),
  );
  const lam = $<HTMLInputElement>('#fg-lam');
  lam.addEventListener('input', () => {
    if (busy()) {
      lam.value = String(lamIdx);
      return;
    }
    lamIdx = Number(lam.value);
    if (stage === 'afterB') backToA();
    render();
  });
  $('[data-primary]').addEventListener('click', () => {
    if (busy()) return;
    if (stage === 'init') train('A');
    else if (stage === 'afterA') train('B');
    else if (stage === 'afterB') {
      backToA();
      render();
    }
  });
  $('[data-reset]').addEventListener('click', () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    job = null;
    net = makeNet();
    snapA = null;
    F = null;
    stage = 'init';
    render();
  });

  function draw() {
    const W = canvas.width / 2;
    const H = canvas.height / 2;
    const px = (x: number) => ((x + 2) / 4) * W;
    const py = (y: number) => ((1.3 - y) / 2.6) * H;
    // background: the network's answer on a 36 × 24 grid, paler where it is unsure
    const cw = W / 36;
    const ch = H / 24;
    for (let r = 0; r < 24; r++)
      for (let c = 0; c < 36; c++) {
        const x = -2 + (c + 0.5) * (4 / 36);
        const y = 1.3 - (r + 0.5) * (2.6 / 24);
        const p = forward(net, [x, y]).p;
        const conf = Math.pow(Math.abs(p - 0.5) * 2, 0.6);
        const tint = p > 0.5 ? HEAT_ORANGE : HEAT_TEAL;
        const mix = tint.map((v) => Math.round(255 * (1 - conf) + v * conf));
        ctx.fillStyle = `rgb(${mix.join(',')})`;
        ctx.fillRect(Math.floor(c * cw), Math.floor(r * ch), Math.ceil(cw), Math.ceil(ch));
      }
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();

    const seenB = stage === 'trainingB' || stage === 'afterB';
    // points keep about the same size on screen when the plot is shown smaller (phones)
    const k = Math.min(1.8, Math.max(1, W / (canvas.clientWidth || W)));
    const orange = color('--orange');
    const teal = color('--teal-600');
    const ink = color('--ink');
    const points = (isB: boolean) => {
      const t = isB ? data.B : data.A;
      t.X.forEach(([x, y], i) => {
        const cx = px(x);
        const cy = py(y);
        ctx.globalAlpha = isB && !seenB ? 0.3 : 1;
        if (!isB && strategy === 'replay' && REPLAY.includes(i)) {
          ctx.beginPath();
          ctx.arc(cx, cy, 10 * k, 0, 2 * Math.PI);
          ctx.fillStyle = ink;
          ctx.fill();
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (isB) ctx.rect(cx - 7.5 * k, cy - 7.5 * k, 15 * k, 15 * k);
        else ctx.arc(cx, cy, 7.5 * k, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = t.Y[i] ? orange : teal;
        ctx.beginPath();
        if (isB) ctx.rect(cx - 5.5 * k, cy - 5.5 * k, 11 * k, 11 * k);
        else ctx.arc(cx, cy, 5.5 * k, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };
    points(false);
    points(true);
  }

  function render() {
    // aria-disabled rather than disabled while training, so keyboard focus stays where it is
    root
      .querySelectorAll<HTMLElement>('[data-strategy], [data-primary], #fg-lam')
      .forEach((el) => el.setAttribute('aria-disabled', String(busy())));
    root
      .querySelectorAll<HTMLButtonElement>('[data-strategy]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.strategy === strategy)));
    $('[data-lambda]').hidden = strategy !== 'ewc';
    lam.value = String(lamIdx);
    lam.setAttribute('aria-valuetext', `λ = ${LAMBDAS[lamIdx]}`);
    $('[data-ring-legend]').hidden = strategy !== 'replay';
    $('[data-primary]').textContent =
      stage === 'init'
        ? '1 · Learn task A'
        : stage === 'afterA'
          ? '2 · Learn task B'
          : stage === 'afterB'
            ? 'Back to after task A'
            : 'Training…';

    const seenB = stage === 'trainingB' || stage === 'afterB';
    const accA = accuracy(net, data.A);
    const accB = accuracy(net, data.B);
    const accA0 = snapA ? accuracy(snapA, data.A) : null;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const bar = (t: 'A' | 'B', v: number, show: boolean, before: number | null) => {
      $(`[data-bar-text="${t}"]`).textContent = show
        ? before !== null
          ? `${pct(before)} → ${pct(v)}`
          : pct(v)
        : 'not learned yet';
      const fill = $(`[data-bar-fill="${t}"]`);
      fill.style.width = `${show ? v * 100 : 0}%`;
      fill.classList.toggle('fg-low', v < 0.6);
    };
    bar('A', accA, stage !== 'init', seenB && stage === 'afterB' ? accA0 : null);
    bar('B', accB, seenB, null);

    const notes: Record<Stage, () => string> = {
      init: () =>
        'The network is untrained and its answers are random. Start by teaching it task A.',
      trainingA: () => 'Learning task A…',
      afterA: () =>
        'Task A is learned. The network now separates orange from teal on the left. Pick how to protect it and teach task B.',
      trainingB: () => 'Learning task B…',
      afterB: () =>
        `Task A accuracy went from ${pct(accA0!)} to ${pct(accA)}, and task B reached ${pct(accB)}. ${outcomeNote(strategy, accA, accB)}`,
    };
    const note = notes[stage]();
    const noteEl = $('[data-note]');
    noteEl.textContent = note;
    noteEl.classList.toggle('fg-note-result', stage === 'afterB');
    canvas.setAttribute(
      'aria-label',
      `Decision regions of the network, with task A on the left and task B on the right. ${note}`,
    );
    draw();
  }

  render();
}
