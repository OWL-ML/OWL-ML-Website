// From data to noise: the interactive part. One slider for t; the points are redrawn on
// every change. Logic lives in core.ts.
import './data-to-noise.css';
import { makePoints, diffuse, alphaBar } from './core.ts';

const SKELETON = `
<div class="df">
  <canvas class="df-canvas" role="img" width="1320" height="900" data-canvas></canvas>
  <div class="df-control">
    <label for="df-t" class="df-label">t = <span data-t>0.00</span></label>
    <input id="df-t" type="range" min="0" max="100" step="1" value="0" />
  </div>
  <div class="df-ends" aria-hidden="true"><span>data</span><span>pure noise</span></div>
  <p class="sr-only" aria-live="polite" data-summary></p>
</div>`;

export function mount(root: HTMLElement) {
  root.innerHTML = SKELETON;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>('[data-canvas]');
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2); // drawn at twice the size for sharp high-density screens
  const css = getComputedStyle(root);
  const teal = css.getPropertyValue('--teal-600').trim();
  const orange = css.getPropertyValue('--orange').trim();
  const pts = makePoints();
  const input = $<HTMLInputElement>('#df-t');

  function render() {
    const t = Number(input.value) / 100;
    const W = canvas.width / 2;
    const H = canvas.height / 2;
    ctx.clearRect(0, 0, W, H);
    // the prototype's 440 × 300 frame: 80 px per unit, origin at (220, 150)
    const s = W / 440;
    const k = Math.min(1.8, Math.max(1, W / (canvas.clientWidth || W)));
    for (const p of diffuse(pts, t)) {
      ctx.fillStyle = p.upper ? teal : orange;
      ctx.beginPath();
      ctx.arc((220 + p.x * 80) * s, (150 - p.y * 80) * s, 4 * s * 0.75 * k, 0, 2 * Math.PI);
      ctx.fill();
    }
    $('[data-t]').textContent = t.toFixed(2);
    input.setAttribute('aria-valuetext', `t = ${t.toFixed(2)}`);
    const label = `Two crescent-shaped point clouds gradually blended with Gaussian noise at t = ${t.toFixed(2)}`;
    canvas.setAttribute('aria-label', label);
    const ab = alphaBar(t);
    $('[data-summary]').textContent =
      t === 0
        ? 'The data shows two crescents.'
        : t === 1
          ? 'Pure noise, nothing of the crescents is left.'
          : `At t = ${t.toFixed(2)} each point is ${Math.sqrt(ab).toFixed(2)} × its data position plus ${Math.sqrt(1 - ab).toFixed(2)} × its noise.`;
  }
  input.addEventListener('input', render);
  render();
}
