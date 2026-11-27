// Every validation rule from docs/CONTENT_MODEL.md, checked against a broken copy of the real content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAndValidate } from '../src/lib/content/validate.ts';
import { copyProject, editEntry } from './helpers.mjs';

test('the real content passes', async () => {
  const { problems } = await loadAndValidate();
  assert.deepEqual(problems, []);
});

/** Applies `mutate` to a fresh copy and returns all problem messages as "file: message" lines. */
async function problemsAfter(mutate) {
  const p = await copyProject();
  try {
    await mutate(p);
    const { problems } = await loadAndValidate(p.dir);
    return problems.map((x) => `${x.file}: ${x.message}`);
  } finally {
    await p.remove();
  }
}

function expectProblem(lines, pattern) {
  assert.ok(
    lines.some((l) => pattern.test(l)),
    `expected ${pattern}\ngot:\n${lines.join('\n') || '(no problems)'}`,
  );
}

const cases = [
  [
    'unknown theme id in a person file',
    (p) =>
      p.edit('src/content/people/mundt.md', (t) =>
        t.replace('themes: [gd, mc, cl, pai]', 'themes: [gd, memory]'),
      ),
    /people\/mundt\.md: themes: unknown theme id "memory"\. .*src\/data\/themes\.yml/,
  ],
  [
    'unknown theme id in a publication (with suggestion)',
    (p) =>
      p.edit('src/data/publications.bib', (t) =>
        editEntry(t, 'mundt2022clevacompass', (e) =>
          e.replace('themes      = {cl}', 'themes      = {cl, pia}'),
        ),
      ),
    /mundt2022clevacompass: themes: unknown theme id "pia"\. Did you mean "pai"\?/,
  ],
  [
    'unknown member id in a publication',
    (p) =>
      p.edit('src/data/publications.bib', (t) =>
        editEntry(t, 'mundt2023wholistic', (e) =>
          e.replace('members     = {mundt}', 'members     = {mundt, nobody}'),
        ),
      ),
    /mundt2023wholistic: members: unknown person id "nobody"/,
  ],
  [
    'member not found in the author list',
    (p) =>
      p.edit('src/data/publications.bib', (t) =>
        editEntry(t, 'delfosse2024rational', (e) =>
          e.replace('members     = {mundt}', 'members     = {mundt, storch}'),
        ),
      ),
    /delfosse2024rational: members: "storch" \(Gabriel Storch\) is not in the author list/,
  ],
  [
    'duplicate BibTeX key',
    (p) =>
      p.edit(
        'src/data/publications.bib',
        (t) =>
          t +
          '\n@misc{mundt2022clevacompass, title={X}, author={Mundt, M.}, howpublished={Y}, year={2022}, members={mundt}}\n',
      ),
    /duplicate BibTeX key "mundt2022clevacompass"/,
  ],
  [
    'unknown person id in news',
    (p) =>
      p.edit('src/content/news/2026-05-15-gabriel-storch-joins.md', (t) =>
        t.replace('people: [storch]', 'people: [storck]'),
      ),
    /news\/2026-05-15-gabriel-storch-joins\.md: people: unknown person id "storck"\. Did you mean "storch"\?/,
  ],
  [
    'unknown paper key in news',
    (p) =>
      p.edit('src/content/news/2026-04-30-modular-memory-icml-2026.md', (t) =>
        t.replace('paper: dorovatas2026modular', 'paper: dorovatas2025modular'),
      ),
    /unknown BibTeX key "dorovatas2025modular"\. Did you mean "dorovatas2026modular"\?/,
  ],
  [
    'unknown speaker in a talk',
    (p) =>
      p.write(
        'src/content/talks/2026-05-12-example.md',
        '---\ndate: 2026-05-12\ntitle: "[Talk title]"\nevent: "[Event]"\nspeakers: [mundtt]\nkind: talk\n---\n',
      ),
    /talks\/2026-05-12-example\.md: speakers: unknown person id "mundtt"/,
  ],
  [
    'unknown course id in `next` and in a profile',
    async (p) => {
      await p.edit('src/data/courses.yml', (t) => t.replace('next: [traki]', 'next: [trakki]'));
      await p.edit('src/content/people/mundt.md', (t) =>
        t.replace('teaching: [traki,', 'teaching: [dlm,'),
      );
    },
    /courses\.yml: python\.next: unknown course id "trakki"[\s\S]*|people\/mundt\.md: teaching: unknown course id "dlm"/,
  ],
  [
    'unknown demo slug',
    (p) => p.edit('src/data/courses.yml', (t) => t.replace('demo: next-word', 'demo: next-words')),
    /traki\.demo: unknown demo slug "next-words"\. Did you mean "next-word"\?/,
  ],
  [
    'a course with both demo and centrepiece',
    (p) =>
      p.edit('src/data/courses.yml', (t) =>
        t.replace('demo: next-word', 'demo: next-word\n  centrepiece: dimensions'),
      ),
    /entry 2 \("traki"\): centrepiece: a course has either `demo` or `centrepiece`, not both/,
  ],
  [
    'showcase entry without consent',
    (p) =>
      p.write(
        'src/content/teaching/showcase/ws-2026-27-example.md',
        '---\ncourse: mocca\nterm: WS 2026/27\ntitle: "[Project]"\n---\n',
      ),
    /showcase\/ws-2026-27-example\.md: consent: showcase entries need `consent: true`/,
  ],
  [
    'unknown theme id in a seminar dimension',
    (p) =>
      p.edit('src/data/courses.yml', (t) =>
        t.replace('      theme: mc\n', '      theme: memory\n'),
      ),
    /courses\.yml: sem-lifelong\.dimensions\.0\.theme: unknown theme id "memory"/,
  ],
  [
    'seminar dimensions without a demo or `centrepiece: dimensions`',
    (p) =>
      p.edit('src/data/courses.yml', (t) =>
        t.replace('demo: leaderboard-depends-on-you\n', 'centrepiece: theses\n'),
      ),
    /dimensions: `dimensions` are shown with a `demo` or with `centrepiece: dimensions`/,
  ],
  [
    'date not in ISO format',
    (p) =>
      p.edit('src/content/news/2026-05-15-gabriel-storch-joins.md', (t) =>
        t.replace('date: 2026-05-15', 'date: 15.05.2026'),
      ),
    /gabriel-storch-joins\.md: date: must be an ISO date \(YYYY-MM-DD\)/,
  ],
  [
    'missing required field',
    (p) => p.edit('src/content/people/storch.md', (t) => t.replace('role: PhD candidate\n', '')),
    /people\/storch\.md: role:/,
  ],
  [
    'photo referenced but missing',
    (p) =>
      p.edit('src/content/people/storch.md', (t) =>
        t.replace('photo: storch.jpg', 'photo: storch-2.jpg'),
      ),
    /people\/storch\.md: photo "storch-2\.jpg" not found in src\/assets\/people\//,
  ],
  [
    'paper thumbnail referenced but missing',
    (p) =>
      p.edit('src/data/publications.bib', (t) =>
        editEntry(t, 'kamath2025bowl', (e) => e.replace('kamath2025bowl.png', 'bowl.png')),
      ),
    /kamath2025bowl: thumbnail: "bowl\.png" not found in src\/assets\/papers\//,
  ],
  [
    'project logo referenced but missing',
    (p) => p.edit('src/data/projects.yml', (t) => t.replace('logo: rai.png', 'logo: rai.svg')),
    /projects\.yml: rai\.logo: "rai\.svg" not found in src\/assets\/projects\//,
  ],
  [
    'project ending before it starts',
    (p) => p.edit('src/data/projects.yml', (t) => t.replace('end: 2032', 'end: 2024')),
    /projects\.yml: entry 2 \("rai"\): end: `end` must not be before `start`/,
  ],
  [
    'duplicate theme id',
    (p) => p.edit('src/data/themes.yml', (t) => t.replace('- id: mc', '- id: gd')),
    /themes\.yml: duplicate theme id "gd"/,
  ],
  [
    'unknown theme id in a thesis',
    (p) =>
      p.edit('src/data/theses.yml', (t) =>
        t.replace('Universität Bremen, themes: [mc] }', 'Universität Bremen, themes: [mc, xx] }'),
      ),
    /theses\.yml: Etienne Steuer: themes: unknown theme id "xx"/,
  ],
  [
    'times and rooms in a course (they belong on Stud.IP)',
    (p) =>
      p.edit('src/data/courses.yml', (t) =>
        t.replace(
          '  stage: foundations\n',
          '  stage: foundations\n  offerings:\n    - { term: WS 2026/27, where: Room 1 }\n',
        ),
      ),
    /courses\.yml: .*offerings: times, rooms and dates are not published/,
  ],
];

for (const [name, mutate, pattern] of cases) {
  test(`fails on: ${name}`, async () => expectProblem(await problemsAfter(mutate), pattern));
}
