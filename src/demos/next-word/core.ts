// Guess the next word (docs/DEMOS.md): bigram/trigram counts over Alice's Adventures in
// Wonderland, sampling with temperature, and a detector for text copied verbatim from the book.
// Pure logic, no DOM: unit-tested in tests/next-word.test.mjs and used by ui.ts.

export interface Model {
  tokens: string[];
  bi: Map<string, Map<string, number>>;
  tri: Map<string, Map<string, number>>;
  vocab: Set<string>;
  /** the corpus as one space-joined string with a space on each side (for the copy detector) */
  corpus: string;
}

export interface Candidate {
  w: string;
  p: number;
}

export interface Distribution {
  cands: Candidate[];
  /** context length actually used: 2 (trigram), 1 (bigram, also the fallback) or 0 (none) */
  used: 0 | 1 | 2;
  /** the context words, space-joined */
  ctx: string;
  /** how often the context occurs in the book (sum of the counts behind the candidates) */
  total: number;
}

export function buildModel(text: string): Model {
  const tokens = text.trim().split(/\s+/);
  const bi = new Map<string, Map<string, number>>();
  const tri = new Map<string, Map<string, number>>();
  const inc = (m: Map<string, Map<string, number>>, k: string, w: string) => {
    let e = m.get(k);
    if (!e) m.set(k, (e = new Map()));
    e.set(w, (e.get(w) ?? 0) + 1);
  };
  for (let i = 1; i < tokens.length; i++) {
    inc(bi, tokens[i - 1]!, tokens[i]!);
    if (i > 1) inc(tri, `${tokens[i - 2]} ${tokens[i - 1]}`, tokens[i]!);
  }
  return { tokens, bi, tri, vocab: new Set(tokens), corpus: ` ${tokens.join(' ')} ` };
}

/** The tokeniser used to build the corpus (tools/demos/make_alice_corpus.py). */
export function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z]+(?:[-'][a-z]+)*|[.,!?]/g) ?? [];
}

/**
 * Next-word distribution after `toks` with `n` words of context (1 or 2) and temperature `temp`:
 * p(w) ∝ count(w)^(1/temp). With two words of context, falls back to one word when the pair
 * never occurs in the book.
 */
export function distribution(m: Model, toks: string[], n: 1 | 2, temp: number): Distribution {
  let table: Map<string, number> | undefined;
  let used: Distribution['used'] = 0;
  let ctx = '';
  if (n === 2 && toks.length >= 2) {
    ctx = `${toks[toks.length - 2]} ${toks[toks.length - 1]}`;
    table = m.tri.get(ctx);
    if (table) used = 2;
  }
  if (!table && toks.length >= 1) {
    const last = toks[toks.length - 1]!;
    table = m.bi.get(last);
    if (table) {
      used = 1;
      ctx = last;
    }
  }
  if (!table) return { cands: [], used: 0, ctx: toks.at(-1) ?? '', total: 0 };
  let total = 0;
  const items: [string, number][] = [];
  table.forEach((c, w) => {
    total += c;
    items.push([w, Math.pow(c, 1 / temp)]);
  });
  const z = items.reduce((a, b) => a + b[1], 0);
  const cands = items.map(([w, v]) => ({ w, p: v / z })).sort((a, b) => b.p - a.p);
  return { cands, used, ctx, total };
}

/** Draws one word; `r` is a uniform random number in [0, 1). */
export function sample(cands: Candidate[], r: number): string | null {
  let acc = 0;
  for (const c of cands) {
    acc += c.p;
    if (r <= acc) return c.w;
  }
  return cands.at(-1)?.w ?? null;
}

/** Adds up to `k` sampled words; stops early when the book never continues the text. */
export function grow(
  m: Model,
  toks: string[],
  k: number,
  n: 1 | 2,
  temp: number,
  random: () => number = Math.random,
): string[] {
  const out = toks.slice();
  for (let i = 0; i < k; i++) {
    const d = distribution(m, out, n, temp);
    const w = sample(d.cands, random());
    if (w === null) break;
    out.push(w);
  }
  return out;
}

/** Checks a start text: its tokens, or a message naming the first word the book never uses. */
export function parseStart(
  m: Model,
  text: string,
): { ok: true; toks: string[] } | { ok: false; msg: string } {
  const t = tokenize(text);
  if (!t.length) return { ok: false, msg: 'Type a word or two to start from.' };
  const unknown = t.find((w) => !m.vocab.has(w));
  if (unknown !== undefined)
    return {
      ok: false,
      msg: `The book never uses “${unknown}”, so the model has nothing to go on. Try another word.`,
    };
  return { ok: true, toks: t };
}

/**
 * The longest run toks[a..b) that occurs word for word in the book (two-pointer scan: the run
 * starting at i+1 is at least as long as the one at i minus its first word).
 */
export function longestCopy(m: Model, toks: string[]): [number, number] {
  let best: [number, number] = [0, 0];
  let j = 0;
  const found = (a: number, b: number) => m.corpus.includes(` ${toks.slice(a, b).join(' ')} `);
  for (let i = 0; i < toks.length; i++) {
    if (j < i) j = i;
    while (j < toks.length && found(i, j + 1)) j++;
    if (j - i > best[1] - best[0]) best = [i, j];
  }
  return best;
}

export interface Shown {
  w: string;
  punct: boolean;
}

/** Display form: sentence starts, "I" and "Alice" capitalised; punctuation marked. */
export function pretty(toks: string[], from = 0, to = toks.length, capStart = true): Shown[] {
  const out: Shown[] = [];
  let cap = capStart;
  for (let i = from; i < to; i++) {
    let w = toks[i]!;
    const punct = /^[.,!?]$/.test(w);
    if (!punct) {
      if (cap || w === 'i' || w.startsWith("i'") || w === 'alice' || w.startsWith("alice'"))
        w = w.charAt(0).toUpperCase() + w.slice(1);
      cap = false;
    }
    if (/^[.!?]$/.test(toks[i]!)) cap = true;
    out.push({ w, punct });
  }
  return out;
}

/** Joins displayed tokens into a string, punctuation attached to the previous word. */
export function joinShown(shown: Shown[]): string {
  return shown.map((x, i) => (i === 0 || x.punct ? '' : ' ') + x.w).join('');
}

/** "100%", "<1%" or a rounded percentage. */
export function percent(p: number): string {
  return p >= 0.995 ? '100%' : p < 0.01 ? '<1%' : `${Math.round(p * 100)}%`;
}

/** The one-line hint under the temperature slider. */
export function temperatureHint(t: number): string {
  if (t < 0.5)
    return 'At low temperature the most frequent next word is chosen almost every time, so the text repeats itself.';
  if (t > 1.4)
    return 'At high temperature the probabilities even out, so rare words are chosen more often and the text becomes more diverse but less coherent.';
  return 'At a temperature of 1, each next word is chosen with the probability the counts give it.';
}

/** The note above the candidate list, saying which context was used and how often it occurs. */
export function contextNote(d: Distribution, n: 1 | 2): string {
  if (!d.used) return '';
  const words = d.ctx.split(' ');
  const shown = joinShown(pretty(words, 0, words.length, false));
  const times = `${d.total} ${d.total === 1 ? 'time' : 'times'}`;
  if (d.used === 1 && n === 2)
    return `The book never has these two words in a row, so it falls back to “${shown}” (seen ${times})`;
  return `After “${shown}” (seen ${times} in the book)`;
}
