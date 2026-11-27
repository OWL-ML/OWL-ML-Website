// Step through Python: the interactive part. Guess the output first; then step through the
// recorded trace with the current line marked, names, objects and output. "Guess again" returns
// to the question. Logic lives in core.ts.
import './step-through-python.css';
import traces from './traces.json';
import {
  shared,
  changes,
  frameName,
  verdict,
  stepLabel,
  type Traces,
  type Snippet,
} from './core.ts';

const T = traces as Traces;

const SKELETON = `
<div class="py">
  <div class="py-tabs" role="group" aria-label="Programs">
    ${T.snippets.map((s, i) => `<button type="button" class="demo-chip" data-tab="${i}">${i + 1} · ${s.title}</button>`).join('')}
  </div>
  <div class="py-main">
    <div class="py-left">
      <ol class="py-code" aria-label="Program code" data-code></ol>
      <div class="py-nav" data-nav hidden>
        <button type="button" class="demo-btn demo-btn-outline" data-back>← Back</button>
        <button type="button" class="demo-btn demo-btn-primary" data-next>Next step →</button>
        <span class="py-step" aria-live="polite" data-step></span>
      </div>
    </div>
    <div class="py-right">
      <div class="py-ask" data-ask>
        <p class="py-question" id="py-q">What does this print?</p>
        <div class="py-options" role="group" aria-labelledby="py-q" data-options></div>
        <button type="button" class="py-skip" data-skip>Just show me</button>
      </div>
      <div data-revealed hidden>
        <div class="py-verdict" aria-live="polite" data-verdict-box>
          <p class="py-verdict-title" data-verdict></p>
          <p data-lesson></p>
        </div>
        <button type="button" class="py-skip py-again" data-again>Guess again</button>
        <div class="py-state">
          <div><p class="py-head">Names</p><div data-frames></div></div>
          <div><p class="py-head">Objects</p><div data-heap></div></div>
        </div>
        <p class="py-head">Printed so far</p>
        <pre class="py-out" data-out></pre>
      </div>
    </div>
  </div>
  <p class="py-foot">Every step shown here was recorded by running the program with real Python (${T.python}). An orange label marks an object that more than one name or object points to.</p>
</div>`;

const el = (tag: string, cls: string, text?: string) => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function mount(root: HTMLElement) {
  root.innerHTML = SKELETON;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  let si = 0;
  /** chosen option per snippet: index, or -1 for "Just show me" */
  const answers: Record<string, number> = {};
  const stepAt: Record<string, number> = {};

  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      si = Number(b.dataset.tab);
      render();
    }),
  );
  const answer = (choice: number) => {
    const sn = T.snippets[si]!;
    answers[sn.id] = choice;
    stepAt[sn.id] = 0;
    render();
    $<HTMLButtonElement>('[data-next]').focus();
  };
  $('[data-skip]').addEventListener('click', () => answer(-1));
  // back to the question of the current program, with its answer and steps forgotten
  $('[data-again]').addEventListener('click', () => {
    const sn = T.snippets[si]!;
    delete answers[sn.id];
    delete stepAt[sn.id];
    render();
    root.querySelector<HTMLButtonElement>('.py-option')?.focus();
  });
  const move = (d: number) => {
    const sn = T.snippets[si]!;
    stepAt[sn.id] = Math.max(0, Math.min(sn.steps.length - 1, (stepAt[sn.id] ?? 0) + d));
    render();
  };
  $('[data-back]').addEventListener('click', () => move(-1));
  $('[data-next]').addEventListener('click', () => move(1));

  function render() {
    const sn: Snippet = T.snippets[si]!;
    const revealed = answers[sn.id] !== undefined;
    const k = stepAt[sn.id] ?? 0;
    const step = sn.steps[k]!;
    const prev = k > 0 ? sn.steps[k - 1]! : null;

    root
      .querySelectorAll<HTMLButtonElement>('[data-tab]')
      .forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.tab) === si)));

    // code, with the line about to run marked
    const code = $('[data-code]');
    code.replaceChildren(
      ...sn.code
        .replace(/\n$/, '')
        .split('\n')
        .map((line, i) => {
          const cur = revealed && step.line === i + 1;
          const li = el('li', cur ? 'py-line py-current' : 'py-line');
          if (cur) li.setAttribute('aria-current', 'step');
          li.append(el('span', 'py-mark', cur ? '→' : ''), el('span', 'py-n', String(i + 1)));
          li.append(el('code', 'py-src', line || ' '));
          return li;
        }),
    );

    $('[data-ask]').hidden = revealed;
    $('[data-revealed]').hidden = !revealed;
    $('[data-nav]').hidden = !revealed;
    const opts = $('[data-options]');
    opts.replaceChildren(
      ...sn.options.map((o, i) => {
        const b = el('button', 'py-option', o) as HTMLButtonElement;
        b.type = 'button';
        b.addEventListener('click', () => answer(i));
        return b;
      }),
    );
    if (!revealed) return;

    const choice = answers[sn.id]!;
    $('[data-verdict]').textContent = verdict(sn, choice);
    $('[data-lesson]').textContent = sn.lesson;
    $('[data-verdict-box]').classList.toggle('py-right-answer', choice === sn.answer);
    // aria-disabled (not disabled) at the ends, so keyboard focus stays on the button
    $('[data-back]').setAttribute('aria-disabled', String(k === 0));
    $('[data-next]').setAttribute('aria-disabled', String(k === sn.steps.length - 1));
    $('[data-step]').textContent = stepLabel(sn, k);

    const multi = shared(step);
    const chip = (label: string, arrow = false) =>
      el(
        'span',
        multi.has(label) ? 'py-chip py-shared' : 'py-chip',
        `${arrow ? '→ ' : ''}${label}`,
      );

    $('[data-frames]').replaceChildren(
      ...step.frames.map((f) => {
        const box = el('div', 'py-box');
        box.append(el('p', 'py-frame', frameName(f.name)));
        if (!f.vars.length) box.append(el('p', 'py-empty', 'no names yet'));
        for (const v of f.vars) {
          const row = el('div', 'py-var');
          row.append(el('span', 'py-name', v.name));
          row.append('ref' in v.v ? chip(v.v.ref, true) : el('code', 'py-prim', v.v.prim));
          box.append(row);
        }
        return box;
      }),
    );
    const change = changes(step, prev);
    const heap = $('[data-heap]');
    heap.replaceChildren(
      ...step.heap.map((h) => {
        const box = el('div', change[h.label] ? 'py-box py-obj py-touched' : 'py-box py-obj');
        const head = el('div', 'py-obj-head');
        head.append(
          chip(h.label),
          el('span', 'py-type', `${h.type}${change[h.label] ? ` · ${change[h.label]}` : ''}`),
        );
        box.append(head, el('code', 'py-text', h.text));
        return box;
      }),
    );
    if (!step.heap.length) heap.append(el('p', 'py-empty', 'none yet'));
    $('[data-out]').textContent = step.out || ' ';
  }
  render();
}
