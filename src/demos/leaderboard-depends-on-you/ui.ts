// The leaderboard depends on you. The interactive part: what matters (presets and one slider per property)
// on the left, the ranking on the right, the methods' made-up scores below. Logic lives in core.ts.
import './leaderboard-depends-on-you.css';
import {
  CRITERIA,
  METHODS,
  PRESETS,
  DEFAULT_WEIGHTS,
  WEIGHT_LABELS,
  MAX_WEIGHT,
  rank,
  winner,
  type CriterionId,
  type Weights,
} from './core.ts';

const SKELETON = `
<div class="wb">
  <div class="wb-inputs">
    <div class="wb-group" role="group" aria-labelledby="wb-presets-label">
      <span class="wb-label" id="wb-presets-label">Try a point of view</span>
      <div class="wb-chips">${PRESETS.map((p) => `<button type="button" class="demo-chip" data-preset="${p.id}">${p.label}</button>`).join('')}</div>
    </div>
    <div class="wb-group" role="group" aria-labelledby="wb-weights-label">
      <span class="wb-label" id="wb-weights-label">Or say how much each property matters to you</span>
      ${CRITERIA.map(
        ([id, label]) => `<div class="wb-slider">
        <div class="wb-slider-head"><label for="wb-${id}">${label}</label><span class="wb-value" data-show="${id}" aria-hidden="true"></span></div>
        <input id="wb-${id}" type="range" min="0" max="${MAX_WEIGHT}" step="1" data-weight="${id}" />
      </div>`,
      ).join('')}
    </div>
  </div>
  <div class="wb-result">
    <span class="wb-label" id="wb-rank-label">Ranking under these weights</span>
    <ol class="wb-rank" data-rank aria-labelledby="wb-rank-label"></ol>
    <p class="wb-empty" data-empty hidden>Nothing matters yet. Set at least one property above “Not at all”.</p>
    <p class="sr-only" aria-live="polite" data-live></p>
    <div class="wb-challenge">
      <p class="wb-label">Can you put each method first?</p>
      <ul class="wb-badges">${METHODS.map((m) => `<li data-badge="${m.id}"><span aria-hidden="true" class="wb-tick"></span>${m.label}<span class="sr-only" data-badge-text></span></li>`).join('')}</ul>
    </div>
  </div>
</div>
<div class="wb-scores">
<p class="wb-caption" id="wb-caption">The four methods. Scores are made up to show the idea, and 10 is best on every property.</p>
<div class="wb-table-wrap" tabindex="0" role="region" aria-labelledby="wb-caption">
  <table class="wb-table" aria-labelledby="wb-caption">
    <thead><tr><th scope="col">Method</th>${CRITERIA.map(([id, l]) => `<th scope="col" data-col="${id}">${l}</th>`).join('')}</tr></thead>
    <tbody>${METHODS.map(
      (m) =>
        `<tr><th scope="row">${m.label}</th>${CRITERIA.map(
          ([id]) =>
            `<td data-col="${id}"><span class="wb-cell"><span class="wb-mini" aria-hidden="true"><span style="width:${m.scores[id] * 10}%"></span></span>${m.scores[id]}</span></td>`,
        ).join('')}</tr>`,
    ).join('')}</tbody>
  </table>
</div>
</div>`;

const same = (a: Weights, b: Weights) => CRITERIA.every(([id]) => a[id] === b[id]);

export function mount(root: HTMLElement, host: { motion: boolean }) {
  root.innerHTML = SKELETON;
  const w: Weights = { ...DEFAULT_WEIGHTS };
  const firsts = new Set<string>();
  let leader: string | null | undefined;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const list = $<HTMLOListElement>('[data-rank]');
  const rows = new Map(
    METHODS.map((m) => {
      const li = document.createElement('li');
      li.className = 'wb-row';
      li.dataset.method = m.id;
      li.innerHTML = `<span class="wb-name">${m.label}</span><span class="wb-track" aria-hidden="true"><span class="wb-fill"></span></span><span class="wb-score"></span>`;
      return [m.id, li];
    }),
  );

  const sliders = root.querySelectorAll<HTMLInputElement>('[data-weight]');
  sliders.forEach((input) =>
    input.addEventListener('input', () => {
      w[input.dataset.weight as CriterionId] = Number(input.value);
      render();
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      Object.assign(w, PRESETS.find((p) => p.id === b.dataset.preset)!.weights);
      render();
    }),
  );

  function render() {
    for (const p of PRESETS)
      $(`[data-preset="${p.id}"]`).setAttribute('aria-pressed', String(same(p.weights, w)));
    sliders.forEach((input) => {
      const id = input.dataset.weight as CriterionId;
      input.value = String(w[id]);
      input.setAttribute('aria-valuetext', WEIGHT_LABELS[w[id]]!);
      $(`[data-show="${id}"]`).textContent = WEIGHT_LABELS[w[id]]!;
      root
        .querySelectorAll(`[data-col="${id}"]`)
        .forEach((el) => el.classList.toggle('wb-off', w[id] === 0));
    });

    const ranked = rank(w);
    $('[data-empty]').hidden = ranked.length > 0;
    list.hidden = ranked.length === 0;
    // move the rows into their new order, then slide them from where they were (FLIP)
    const before = new Map([...rows].map(([id, li]) => [id, li.getBoundingClientRect().top]));
    list.replaceChildren(...ranked.map((r) => rows.get(r.id)!));
    ranked.forEach((r, i) => {
      const li = rows.get(r.id)!;
      li.classList.toggle('wb-first', i === 0 || r.tied);
      (li.querySelector('.wb-fill') as HTMLElement).style.width = `${r.score * 10}%`;
      li.querySelector('.wb-score')!.textContent = r.tied
        ? `${r.score.toFixed(1)} · tied`
        : r.score.toFixed(1);
      const dy = (before.get(r.id) ?? 0) - li.getBoundingClientRect().top;
      if (host.motion && dy && before.get(r.id)) {
        li.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
          duration: 300,
          easing: 'ease-out',
        });
      }
    });

    const top = winner(w);
    if (top) firsts.add(top);
    for (const m of METHODS) {
      const done = firsts.has(m.id);
      const badge = $(`[data-badge="${m.id}"]`);
      badge.classList.toggle('wb-done', done);
      badge.querySelector('[data-badge-text]')!.textContent = done
        ? ', has been first'
        : ', not yet';
    }
    if (leader !== undefined && top !== leader) {
      const name = METHODS.find((m) => m.id === top)?.label;
      $('[data-live]').textContent = !ranked.length
        ? 'No ranking, nothing matters yet.'
        : name
          ? `${name} is now first.`
          : 'Tied for first place.';
    }
    leader = top;
  }
  render();
}
