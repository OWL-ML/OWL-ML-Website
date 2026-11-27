import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  layout,
  renderSvg,
  renderPanel,
  renderPaperBox,
  paperLabel,
  wrap,
  selectionFromSearch,
} from '../src/lib/map.ts';

const themes = [
  {
    id: 'gd',
    name: 'Generative',
    short: 'Gen',
    oneliner: 'Changing the model itself, not only its weights',
    description: 'D',
    x: 140,
  },
  {
    id: 'mc',
    name: 'Memory',
    short: 'Mem',
    oneliner: 'What is worth keeping',
    description: 'D',
    x: 380,
  },
  {
    id: 'cl',
    name: 'Continual',
    short: 'Cont',
    oneliner: 'New without losing the old',
    description: 'D',
    x: 620,
  },
];
const people = [
  { id: 'mundt', name: 'Martin Mundt', role: 'Head', themes: ['gd', 'mc', 'cl'] },
  { id: 'paul', name: 'Subarnaduti Paul', role: 'PhD', themes: ['cl', 'mc'] },
  { id: 'hederich', name: 'Marlott Hederich', role: 'Admin', themes: [] },
];
const papers = Array.from({ length: 8 }, (_, i) => ({
  key: `p${i}`,
  title: `Paper ${i}: a subtitle`,
  venue: `Venue ${2026 - i}`,
  year: 2026 - i,
  themes: i % 2 ? ['mc'] : ['gd', 'cl'],
  members: i < 3 ? ['paul', 'mundt'] : ['mundt'],
  featured: i < 4,
}));
const text = { overviewTitle: 'O', overviewText: 'T', personText: 'P', paperHint: 'H' };

test('layout is deterministic and inside the canvas', () => {
  const a = layout(themes, people, papers);
  const b = layout(themes, [...people].reverse(), papers);
  assert.deepEqual(
    a.people.map((p) => [p.id, p.x, p.y]).sort(),
    b.people.map((p) => [p.id, p.x, p.y]).sort(),
  );
  for (const view of Object.values(a.views))
    for (const p of view) assert.ok(p.x >= 0 && p.x <= a.width, `x ${p.x}`);
});

test('people are spread evenly between the first and last theme, alternating rows', () => {
  const many = Array.from({ length: 7 }, (_, i) => ({
    id: `p${i}`,
    name: `Person ${i}`,
    role: 'PhD',
    themes: [i < 5 ? 'cl' : 'gd'], // most work on one theme: they must not bunch up there
  }));
  const placed = layout(themes, many, []).people.sort((a, b) => a.x - b.x);
  assert.equal(placed[0].x, 140);
  assert.equal(placed.at(-1).x, 620);
  const gaps = placed.slice(1).map((p, i) => p.x - placed[i].x);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 1, `${gaps}`);
  // neighbours alternate between the two rows, so names in one row are two steps apart
  for (let i = 1; i < placed.length; i++) assert.notEqual(placed[i].y, placed[i - 1].y);
  // the two people on the left theme come first
  assert.deepEqual(
    placed.slice(0, 2).map((p) => p.id),
    ['p5', 'p6'],
  );
});

test('people without themes are not on the map', () => {
  assert.ok(!layout(themes, people, papers).people.some((p) => p.id === 'hederich'));
});

test('default view shows the six most recent papers; a theme shows at most five, newest first', () => {
  const d = layout(themes, people, papers);
  assert.deepEqual(d.views.default.map((p) => p.id).sort(), ['p0', 'p1', 'p2', 'p3', 'p4', 'p5']);
  assert.equal(d.views['theme:gd'].length, 4);
  assert.equal(d.views['theme:mc'].length, 4);
  const panel = renderPanel(d, { kind: 'theme', id: 'gd' }, text);
  assert.ok(panel.indexOf('Paper 0') < panel.indexOf('Paper 2'));
  assert.ok(d.views['person:mundt'].length <= 5);
});

test('items in the same row keep a minimum gap', () => {
  const d = layout(themes, people, papers);
  for (const view of Object.values(d.views)) {
    for (const y of new Set(view.map((p) => p.y))) {
      const xs = view
        .filter((p) => p.y === y)
        .map((p) => p.x)
        .sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 150, `${xs}`);
    }
  }
});

test('five papers of the rightmost theme keep their gap and their labels stay inside', () => {
  const right = [{ ...themes[0], id: 'pai', x: 860 }];
  const five = Array.from({ length: 5 }, (_, i) => ({
    key: `s${i}`,
    title: `Paper ${i}`,
    year: 2026,
    themes: ['pai'],
    members: [],
    featured: false,
  }));
  const view = layout(right, [], five).views['theme:pai'];
  assert.equal(view.length, 5);
  for (const y of new Set(view.map((p) => p.y))) {
    const xs = view
      .filter((p) => p.y === y)
      .map((p) => p.x)
      .sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 200, `${xs}`);
    // half a label's width (about 115 units) must fit on either side of the square
    assert.ok(xs[0] >= 115 && xs.at(-1) <= 885, `${xs}`);
  }
});

test('all edges have the same weight (no metrics)', () => {
  const svg = renderSvg(layout(themes, people, papers), { kind: 'theme', id: 'mc' });
  assert.doesNotMatch(svg, /stroke-width/);
  assert.match(svg, /class="edge hot"/);
});

test('papers in the map are links to their entry, with the full title for screen readers', () => {
  const svg = renderSvg(layout(themes, people, papers), { kind: 'theme', id: 'mc' });
  assert.match(
    svg,
    /<a href="\/publications\/#p1" data-paper="p1" aria-label="Paper 1: a subtitle \(Venue 2025\)" data-key="x:p1">/,
  );
});

test('every element of the map has a stable key, so a new selection can be animated', () => {
  const d = layout(themes, people, papers);
  for (const sel of [null, { kind: 'theme', id: 'mc' }, { kind: 'person', id: 'paul' }]) {
    const svg = renderSvg(d, sel);
    const keys = [...svg.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(keys).size, keys.length, 'keys are unique');
    // every edge, theme, person and paper has one
    const parts = (svg.match(/<(path|a) |class="(theme|person)/g) ?? []).length;
    assert.equal(keys.length, parts);
  }
  // a paper keeps its key across selections, while its position may change
  const a = renderSvg(d, null).match(/data-key="x:p1"[\s\S]*?translate\(([^)]*)\)/)?.[1];
  const b = renderSvg(d, { kind: 'theme', id: 'mc' }).match(
    /data-key="x:p1"[\s\S]*?translate\(([^)]*)\)/,
  )?.[1];
  assert.ok(a && b);
});

test('panel: theme and person titles come first, no label above them', () => {
  const d = layout(themes, people, papers);
  const theme = renderPanel(d, { kind: 'theme', id: 'mc' }, text);
  assert.ok(theme.startsWith('<h3 class="mp-title">Memory</h3>'));
  assert.doesNotMatch(theme, /What is worth keeping/); // the one-liner stays in the map
  assert.match(theme, /<a class="mp-pill" href="\/people\/paul\/">/); // people as pills
  const person = renderPanel(d, { kind: 'person', id: 'paul' }, text);
  assert.match(person, /^<h3 class="mp-title">Subarnaduti Paul<\/h3><p class="mp-role">PhD<\/p>/);
  assert.doesNotMatch(person, /Person ·/);
  // the paper list stays in the markup for phones (hidden on desktop by CSS)
  assert.match(theme, /class="mp-papers"/);
});

test('paper box: hint until a paper is chosen, then its full title and link', () => {
  const d = layout(themes, people, papers);
  assert.equal(renderPaperBox(d, null, 'H'), '<p class="pb-hint">H</p>');
  const box = renderPaperBox(d, 'p2', 'H');
  assert.match(box, /<p class="pb-title">Paper 2: a subtitle<\/p>/);
  assert.match(box, /Venue 2024 · <a href="\/publications\/#p2">Open in publications →<\/a>/);
  assert.equal(renderPaperBox(d, 'unknown', 'H'), '<p class="pb-hint">H</p>');
});

test('rendering escapes text', () => {
  const d = layout([{ ...themes[0], short: 'A <b>&' }], [], []);
  assert.match(renderSvg(d, null), /A &lt;b&gt;&amp;/);
});

test('helpers', () => {
  assert.equal(paperLabel('CLEVA-Compass: A Continual Learning Compass'), 'CLEVA-Compass');
  assert.match(
    paperLabel('Adaptive Rational Activations to Boost Deep Reinforcement Learning'),
    /…$/,
  );
  assert.deepEqual(wrap('one two three four', 9), ['one two', 'three', 'four']);
  const d = layout(themes, people, papers);
  assert.deepEqual(selectionFromSearch('?theme=mc', d), { kind: 'theme', id: 'mc' });
  assert.deepEqual(selectionFromSearch('?person=paul', d), { kind: 'person', id: 'paul' });
  assert.equal(selectionFromSearch('?theme=nope', d), null);
});
