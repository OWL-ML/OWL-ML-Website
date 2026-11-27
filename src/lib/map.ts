// Research map: deterministic layout and rendering, shared by the build (static default view)
// and the browser (selection). Pure functions only, no DOM, so it can be unit-tested.
//
// Rules (docs/DESIGN.md): themes on one row at their x from themes.yml, current members above,
// papers below; uniform edge weights; the default view shows the six most recent papers; a
// selected theme shows up to five of its most recent papers, a selected person up to five of theirs.

export interface MapTheme {
  id: string;
  name: string;
  short: string;
  oneliner: string;
  description: string;
  x: number;
}
export interface MapPerson {
  id: string;
  name: string;
  /** name with academic title, for the panel (labels in the graph stay short) */
  titled?: string;
  role: string;
  themes: string[];
}
export interface MapPaper {
  key: string;
  title: string;
  /** short venue label, e.g. "arXiv 2026", shown in the paper box */
  venue: string;
  year: number;
  themes: string[];
  members: string[];
  featured: boolean;
}
export type Selection = { kind: 'theme' | 'person'; id: string } | null;

export interface Placed {
  id: string;
  x: number;
  y: number;
}
export interface MapData {
  width: number;
  height: number;
  themes: (MapTheme & { y: number; lines: string[] })[];
  people: (MapPerson & { x: number; y: number })[];
  papers: Record<string, MapPaper & { label: string }>;
  /** paper positions per view: 'default', 'theme:<id>', 'person:<id>' */
  views: Record<string, Placed[]>;
}

export const WIDTH = 1000;
export const HEIGHT = 590;
const THEME_Y = 260;
const PEOPLE_ROWS = [70, 140];
const PAPER_ROWS = [470, 540];
export const MAX_PAPERS = 5;
/** papers keep half a label's width from both edges, so a label centred under its square
 *  (up to about 230 units wide, more when bold on hover) stays inside the map */
export const PAPER_MARGIN = 125;
/** papers in the default view: two rows of three keep the labels readable */
export const DEFAULT_PAPERS = 6;

/** Wraps text into lines of at most `max` characters (words are not split). */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** Short paper label: the part before a colon if short enough, else the first words. */
export function paperLabel(title: string, max = 24): string {
  const head = title.split(':')[0]!.trim();
  if (head.length <= max) return head;
  let out = '';
  for (const w of head.split(/\s+/)) {
    if ((out + ' ' + w).trim().length > max - 1) break;
    out = (out + ' ' + w).trim();
  }
  return `${out}…`;
}

/**
 * Places items with preferred x positions on alternating rows, keeping a minimum gap within a
 * row and staying inside the canvas. Sorted by preferred x, then id: deterministic.
 */
export function placeRows(
  items: { id: string; prefer: number }[],
  rows: number[],
  gap: number,
  margin = 70,
): Placed[] {
  const sorted = [...items].sort((a, b) => a.prefer - b.prefer || a.id.localeCompare(b.id));
  const lastX = rows.map(() => -Infinity);
  const placed = sorted.map((it) => {
    let best = 0;
    let bestX = Infinity;
    rows.forEach((_, r) => {
      const x = Math.max(it.prefer, lastX[r]! + gap, margin);
      if (Math.abs(x - it.prefer) < Math.abs(bestX - it.prefer)) {
        best = r;
        bestX = x;
      }
    });
    lastX[best] = bestX;
    return { id: it.id, x: bestX, y: rows[best]! };
  });
  // a row that overflows on the right is first shifted left, keeping the gap (labels would
  // otherwise overlap); only if it is wider than the canvas is it squeezed
  rows.forEach((y) => {
    const row = placed.filter((p) => p.y === y);
    if (!row.length) return;
    const min = Math.min(...row.map((p) => p.x));
    const over = Math.max(...row.map((p) => p.x)) - (WIDTH - margin);
    if (over <= 0) return;
    const shift = Math.min(over, min - margin);
    for (const p of row) p.x -= shift;
    const left = Math.min(...row.map((p) => p.x));
    const cur = Math.max(...row.map((p) => p.x)) - left;
    const span = WIDTH - margin - left;
    if (cur > span) for (const p of row) p.x = left + ((p.x - left) * span) / cur;
  });
  return placed.map((p) => ({ ...p, x: Math.round(p.x) }));
}

const preferX = (themeIds: string[], themes: Map<string, number>) =>
  themeIds.length
    ? themeIds.reduce((s, t) => s + (themes.get(t) ?? WIDTH / 2), 0) / themeIds.length
    : WIDTH / 2;

/**
 * People are spread evenly from the first to the last theme column, in the order of where their
 * themes are (so edges barely cross), alternating between the rows so that neighbouring names
 * do not collide. Sorted by preferred x, then id: deterministic.
 */
export function spreadRows(
  items: { id: string; prefer: number }[],
  rows: number[],
  from: number,
  to: number,
): Placed[] {
  const sorted = [...items].sort((a, b) => a.prefer - b.prefer || a.id.localeCompare(b.id));
  const step = sorted.length > 1 ? (to - from) / (sorted.length - 1) : 0;
  return sorted.map((it, i) => ({
    id: it.id,
    x: Math.round(sorted.length > 1 ? from + i * step : (from + to) / 2),
    y: rows[i % rows.length]!,
  }));
}

/** Papers are given newest first; the file order breaks ties. */
export function layout(themes: MapTheme[], people: MapPerson[], papers: MapPaper[]): MapData {
  const themeX = new Map(themes.map((t) => [t.id, t.x]));
  const shown = people.filter((p) => p.themes.length > 0);
  const xs = themes.map((t) => t.x);
  const placedPeople = spreadRows(
    shown.map((p) => ({ id: p.id, prefer: preferX(p.themes, themeX) })),
    PEOPLE_ROWS,
    xs.length ? Math.min(...xs) : WIDTH / 2,
    xs.length ? Math.max(...xs) : WIDTH / 2,
  );
  const byKey = Object.fromEntries(
    papers.map((p) => [p.key, { ...p, label: paperLabel(p.title) }]),
  );
  const place = (list: MapPaper[]) =>
    placeRows(
      list.map((p) => ({ id: p.key, prefer: preferX(p.themes, themeX) })),
      PAPER_ROWS,
      230, // about the width of a 24-character label
      PAPER_MARGIN,
    );
  const views: Record<string, Placed[]> = {
    default: place(papers.slice(0, DEFAULT_PAPERS)),
  };
  for (const t of themes)
    views[`theme:${t.id}`] = place(
      papers.filter((p) => p.themes.includes(t.id)).slice(0, MAX_PAPERS),
    );
  for (const p of shown)
    views[`person:${p.id}`] = place(
      papers.filter((x) => x.members.includes(p.id)).slice(0, MAX_PAPERS),
    );

  return {
    width: WIDTH,
    height: HEIGHT,
    themes: themes.map((t) => ({ ...t, y: THEME_Y, lines: wrap(t.oneliner, 24) })),
    people: placedPeople.map((pl) => ({ ...shown.find((p) => p.id === pl.id)!, x: pl.x, y: pl.y })),
    papers: byKey,
    views,
  };
}

export const viewKey = (sel: Selection) => (sel ? `${sel.kind}:${sel.id}` : 'default');

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Which nodes are emphasised for a selection (null = everything is). */
export function activeSets(d: MapData, sel: Selection) {
  if (!sel) return { themes: null, people: null };
  if (sel.kind === 'theme')
    return {
      themes: new Set([sel.id]),
      people: new Set(d.people.filter((p) => p.themes.includes(sel.id)).map((p) => p.id)),
    };
  const person = d.people.find((p) => p.id === sel.id);
  return { themes: new Set(person?.themes ?? []), people: new Set([sel.id]) };
}

/** The SVG contents (without the <svg> element) for a selection. */
export function renderSvg(d: MapData, sel: Selection): string {
  const { themes: aT, people: aP } = activeSets(d, sel);
  const on = (set: Set<string> | null, id: string) => !set || set.has(id);
  const tPos = new Map(d.themes.map((t) => [t.id, t]));
  const papers = d.views[viewKey(sel)] ?? [];
  // Every element carries a stable data-key, so that the browser can update the drawing in
  // place when the selection changes and animate it (ResearchMap.astro): papers glide to their
  // new position (a CSS transform), their edges follow (the CSS d property), highlights fade.
  const edge = (key: string, x1: number, y1: number, x2: number, y2: number, hot: boolean) => {
    const path = `M ${x1} ${y1} L ${x2} ${y2}`;
    return `<path data-key="${esc(key)}" d="${path}" style="d: path('${path}')" class="edge${sel ? (hot ? ' hot' : ' cold') : ''}"/>`;
  };
  const out: string[] = ['<g class="edges">'];
  for (const p of d.people)
    for (const t of p.themes) {
      const tp = tPos.get(t);
      if (tp) out.push(edge(`e:${p.id}:${t}`, p.x, p.y, tp.x, tp.y, on(aP, p.id) && on(aT, t)));
    }
  for (const pl of papers)
    for (const t of d.papers[pl.id]?.themes ?? []) {
      const tp = tPos.get(t);
      if (tp) out.push(edge(`e:${pl.id}:${t}`, pl.x, pl.y, tp.x, tp.y, on(aT, t)));
    }
  out.push('</g><g class="nodes">');
  for (const t of d.themes) {
    const hot = !!sel && on(aT, t.id);
    const dim = sel && !on(aT, t.id) ? ' dim' : '';
    out.push(
      `<g class="theme${hot ? ' hot' : ''}${dim}" data-key="t:${t.id}" data-select="theme:${t.id}"><circle cx="${t.x}" cy="${t.y}" r="20"/>` +
        `<text x="${t.x}" y="${t.y + 48}" class="t-name">${esc(t.short)}</text>` +
        t.lines
          .map(
            (l, i) => `<text x="${t.x}" y="${t.y + 72 + i * 20}" class="t-line">${esc(l)}</text>`,
          )
          .join('') +
        '</g>',
    );
  }
  for (const p of d.people) {
    const dim = !on(aP, p.id) ? ' dim' : '';
    out.push(
      `<g class="person${sel?.kind === 'person' && sel.id === p.id ? ' hot' : ''}${dim}" data-key="p:${p.id}" data-select="person:${p.id}">` +
        `<circle cx="${p.x}" cy="${p.y}" r="8"/><text x="${p.x}" y="${p.y - 18}" class="p-name">${esc(p.name)}</text></g>`,
    );
  }
  for (const pl of papers) {
    const paper = d.papers[pl.id];
    if (!paper) continue;
    // each paper is a link to its entry in the publication list; the paper box beside the map
    // shows its full title when it is pointed at or focused
    // (positioned by a transform, so that a move can be animated)
    out.push(
      `<a href="/publications/#${esc(pl.id)}" data-paper="${esc(pl.id)}" aria-label="${esc(`${paper.title} (${paper.venue})`)}" data-key="x:${esc(pl.id)}">` +
        `<g class="paper${sel ? ' hot' : ''}" style="transform: translate(${pl.x}px, ${pl.y}px)"><rect x="-8" y="-8" width="16" height="16" rx="3"/>` +
        `<text x="0" y="32" class="x-name">${esc(paper.label)}</text></g></a>`,
    );
  }
  out.push('</g>');
  return out.join('');
}

export interface PanelText {
  overviewTitle: string;
  overviewText: string;
  personText: string;
  /** shown in the paper box until a paper is pointed at or focused */
  paperHint: string;
}

/** The side panel (HTML) for a selection. On desktop the papers are links in the map itself; the
 *  list of recent papers (`.mp-papers`) is shown on phones only, where there is no map. */
export function renderPanel(d: MapData, sel: Selection, text: PanelText): string {
  const pills = (items: string[]) => `<div class="mp-pills">${items.join('')}</div>`;
  // newest first: d.papers keeps the order the papers were given in
  const order = Object.keys(d.papers);
  const papers = (d.views[viewKey(sel)] ?? [])
    .map((p) => p.id)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const paperList = papers.length
    ? `<div class="mp-papers"><h4 class="mp-h">Recent papers</h4><ul class="mp-list">${papers
        .map((k) => `<li><a href="/publications/#${esc(k)}">${esc(d.papers[k]!.title)}</a></li>`)
        .join('')}</ul></div>`
    : '';
  if (!sel) {
    return (
      `<p class="mp-kind">Overview</p><h3 class="mp-title">${esc(text.overviewTitle)}</h3>` +
      `<p class="mp-text">${esc(text.overviewText)}</p><h4 class="mp-h">Themes</h4>` +
      pills(d.themes.map((t) => `<span class="mp-pill">${esc(t.short)}</span>`))
    );
  }
  if (sel.kind === 'theme') {
    const t = d.themes.find((x) => x.id === sel.id)!;
    const ppl = d.people.filter((p) => p.themes.includes(t.id));
    return (
      `<h3 class="mp-title">${esc(t.name)}</h3>` +
      `<p class="mp-text">${esc(t.description)}</p>` +
      (ppl.length
        ? `<h4 class="mp-h">People</h4>` +
          pills(
            ppl.map(
              (p) => `<a class="mp-pill" href="/people/${p.id}/">${esc(p.titled ?? p.name)}</a>`,
            ),
          )
        : '') +
      paperList +
      `<a class="mp-more" href="/publications/?theme=${t.id}">All publications in this theme →</a>`
    );
  }
  const p = d.people.find((x) => x.id === sel.id)!;
  return (
    `<h3 class="mp-title">${esc(p.titled ?? p.name)}</h3><p class="mp-role">${esc(p.role)}</p>` +
    `<p class="mp-text">${esc(text.personText)}</p><h4 class="mp-h">Themes</h4>` +
    pills(
      p.themes.map(
        (id) =>
          `<span class="mp-pill">${esc(d.themes.find((t) => t.id === id)?.short ?? id)}</span>`,
      ),
    ) +
    paperList +
    `<a class="mp-more" href="/people/${p.id}/">Profile →</a>`
  );
}

/** The paper box beside the map: the full title of the paper last pointed at or focused, or a
 *  hint while there is none. */
export function renderPaperBox(d: MapData, key: string | null, hint: string): string {
  const paper = key ? d.papers[key] : undefined;
  if (!paper) return `<p class="pb-hint">${esc(hint)}</p>`;
  return (
    `<p class="pb-title">${esc(paper.title)}</p>` +
    `<p class="pb-meta">${esc(paper.venue)} · <a href="/publications/#${esc(key!)}">Open in publications →</a></p>`
  );
}

/** Reads ?theme= or ?person= from a URL search string. */
export function selectionFromSearch(search: string, d: MapData): Selection {
  const q = new URLSearchParams(search);
  const theme = q.get('theme');
  if (theme && d.themes.some((t) => t.id === theme)) return { kind: 'theme', id: theme };
  const person = q.get('person');
  if (person && d.people.some((p) => p.id === person)) return { kind: 'person', id: person };
  return null;
}
