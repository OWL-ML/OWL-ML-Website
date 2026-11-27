// Guess the next word: the interactive part. Renders into `root`, keeps its own small state and
// re-renders the changing parts on every action. Logic lives in core.ts.
import './next-word.css';
import type { DemoHost } from '../frame.ts';
import {
  buildModel,
  distribution,
  grow,
  parseStart,
  longestCopy,
  pretty,
  joinShown,
  percent,
  temperatureHint,
  contextNote,
  type Model,
} from './core.ts';

const STARTERS = ['alice', 'the queen', 'she said', 'the cat', 'off with'];

const SKELETON = `
<div class="nw">
  <div class="nw-main">
    <form class="nw-start" data-start>
      <label for="nw-start-input">Start with</label>
      <input id="nw-start-input" type="text" value="alice" placeholder="e.g. the queen" autocomplete="off" spellcheck="false" />
      <button type="submit" class="demo-btn demo-btn-outline">Start over</button>
    </form>
    <div class="nw-starters" role="group" aria-label="Example start texts">
      <span>or try</span>
      ${STARTERS.map((s) => `<button type="button" class="demo-chip-light" data-starter="${s}">${s}</button>`).join('')}
    </div>
    <p class="nw-msg" data-msg hidden></p>
    <div class="nw-text" data-text aria-label="Text so far"></div>
    <p class="sr-only" aria-live="polite" data-announce></p>
    <div class="nw-actions">
      <button type="button" class="demo-btn demo-btn-primary" data-add="1">Add a word</button>
      <button type="button" class="demo-btn demo-btn-outline" data-add="10">Add ten words</button>
      <div class="nw-temp">
        <label for="nw-temp-input">Temperature <span data-temp-value>1.0</span></label>
        <input id="nw-temp-input" type="range" min="0.1" max="2" step="0.1" value="1" aria-describedby="nw-temp-hint" />
      </div>
    </div>
    <p class="nw-hint" id="nw-temp-hint" data-temp-hint></p>
  </div>
  <div class="nw-side">
    <div class="nw-context" role="group" aria-labelledby="nw-context-label">
      <span id="nw-context-label">Context</span>
      <button type="button" class="demo-chip" data-n="1" aria-pressed="true">1 word</button>
      <button type="button" class="demo-chip" data-n="2" aria-pressed="false">2 words</button>
    </div>
    <div class="nw-cands">
      <p class="nw-box-title">Most likely next words</p>
      <p class="nw-note" data-ctx-note></p>
      <div class="nw-list" data-cands></div>
      <p class="nw-note" data-cands-help></p>
    </div>
    <div class="nw-copy" data-copy hidden>
      <p class="nw-box-title">Copied from the book</p>
      <p data-copy-text></p>
      <p class="nw-quote" data-copy-quote hidden></p>
    </div>
  </div>
</div>`;

interface State {
  toks: string[];
  /** index of the first generated token (the start text is not highlighted) */
  start: number;
  n: 1 | 2;
  temp: number;
  msg: string;
}

export async function mount(root: HTMLElement, host: DemoHost) {
  root.innerHTML = '<p class="demo-loading">Loading the book…</p>';
  const model: Model = buildModel(await host.file('alice-tokens.txt'));
  root.innerHTML = SKELETON;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const s: State = { toks: ['alice'], start: 1, n: 1, temp: 1, msg: '' };

  /** length of the longest run copied from the book, 0 while shorter than five words */
  let copied = 0;
  const input = $<HTMLInputElement>('#nw-start-input');
  const temp = $<HTMLInputElement>('#nw-temp-input');
  const announce = $('[data-announce]');

  const restart = (text: string) => {
    const r = parseStart(model, text);
    if (!r.ok) s.msg = r.msg;
    else Object.assign(s, { toks: r.toks, start: r.toks.length, msg: '' });
    render();
  };
  const add = (words: string[]) => {
    const before = s.toks.length;
    s.toks = words;
    s.msg = '';
    render();
    const added = joinShown(pretty(s.toks, before, s.toks.length, false));
    // the box appears without a page reload, so screen readers hear about a copied run here
    const copy = copied ? ` ${copied} words in a row are copied from the book.` : '';
    announce.textContent = added ? `Added ${added}.${copy}` : 'The book never continues this.';
  };

  $('[data-start]').addEventListener('submit', (e) => {
    e.preventDefault();
    restart(input.value);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-starter]').forEach((b) =>
    b.addEventListener('click', () => {
      input.value = b.dataset.starter!;
      restart(input.value);
    }),
  );
  root
    .querySelectorAll<HTMLButtonElement>('[data-add]')
    .forEach((b) =>
      b.addEventListener('click', () =>
        add(grow(model, s.toks, Number(b.dataset.add), s.n, s.temp)),
      ),
    );
  root.querySelectorAll<HTMLButtonElement>('[data-n]').forEach((b) =>
    b.addEventListener('click', () => {
      s.n = Number(b.dataset.n) as 1 | 2;
      render();
    }),
  );
  temp.addEventListener('input', () => {
    s.temp = Number(temp.value);
    render();
  });

  function render() {
    const d = distribution(model, s.toks, s.n, s.temp);

    const msg = $('[data-msg]');
    msg.hidden = !s.msg;
    msg.textContent = s.msg;

    // the text: punctuation attached to the previous word; generated words highlighted
    const text = $('[data-text]');
    text.replaceChildren();
    const groups: { t: string; generated: boolean }[] = [];
    pretty(s.toks).forEach((x, i) => {
      const last = groups.at(-1);
      if (x.punct && last) last.t += x.w;
      else groups.push({ t: x.w, generated: i >= s.start });
    });
    for (const g of groups) {
      const span = document.createElement('span');
      span.className = g.generated ? 'nw-word nw-new' : 'nw-word';
      span.textContent = g.t;
      // a real space between words for screen readers and copying (flex ignores it in layout)
      text.append(span, ' ');
    }
    const caret = document.createElement('span');
    caret.className = 'nw-caret';
    caret.setAttribute('aria-hidden', 'true');
    text.append(caret);

    root
      .querySelectorAll<HTMLButtonElement>('[data-n]')
      .forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.n) === s.n)));
    $('[data-temp-value]').textContent = s.temp.toFixed(1);
    $('[data-temp-hint]').textContent = temperatureHint(s.temp);

    // candidates
    $('[data-ctx-note]').textContent = contextNote(d, s.n);
    const list = $('[data-cands]');
    list.replaceChildren();
    for (const c of d.cands.slice(0, 5)) {
      const pct = percent(c.p);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nw-cand';
      const bar = document.createElement('span');
      bar.className = 'nw-bar';
      bar.style.width = `${(c.p * 100).toFixed(1)}%`;
      const w = document.createElement('span');
      w.className = 'nw-cand-word';
      w.textContent =
        c.w === '.'
          ? '. (end of sentence)'
          : c.w === ','
            ? ', (comma)'
            : c.w === 'i' || c.w === 'alice'
              ? pretty([c.w], 0, 1, false)[0]!.w
              : c.w;
      const p = document.createElement('span');
      p.className = 'nw-pct';
      p.textContent = pct;
      // name read by screen readers: "Add was, probability 4%" (the visible text in order)
      const verb = document.createElement('span');
      verb.className = 'sr-only';
      verb.textContent = 'Add ';
      const prob = document.createElement('span');
      prob.className = 'sr-only';
      prob.textContent = ', probability';
      b.append(bar, verb, w, prob, p);
      b.addEventListener('click', () => add(s.toks.concat([c.w])));
      list.append(b);
    }
    $('[data-cands-help]').textContent = d.cands.length
      ? 'Click a word to choose it yourself.'
      : 'The book never continues this, so the model is stuck. Start over or add a word yourself.';

    // copied from the book: the box appears from five words in a row on, darker from eight
    const [a, b] = longestCopy(model, s.toks);
    const len = b - a;
    copied = len >= 5 ? len : 0;
    const box = $('[data-copy]');
    box.hidden = !copied;
    box.classList.toggle('nw-copy-long', len >= 8);
    $('[data-copy-text]').textContent = copied
      ? `${len} words in a row appear word for word in the book.`
      : '';
    const quote = $('[data-copy-quote]');
    quote.hidden = !copied;
    quote.textContent = copied ? `“${joinShown(pretty(s.toks, a, b))}”` : '';
  }

  render();
}
