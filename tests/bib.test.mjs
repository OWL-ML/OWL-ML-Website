import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBib,
  deriveVenueShort,
  initialsOf,
  shortName,
  fullName,
  matchMember,
} from '../src/lib/content/bib.ts';
import { authorParts } from '../src/lib/content/authors.ts';

const entry = (fields) => `@inproceedings{k2024x,\n${fields}\n}`;

test('parses an entry and maps the custom fields', () => {
  const { publications, problems } = parseBib(
    entry(`title = {{CLEVA-Compass}: A Compass}, author = {Mundt, Martin and Lang, Steven},
      booktitle = {International Conference on Learning Representations (ICLR)}, year = {2022},
      members = {mundt}, themes = {cl, pai}, review = {themes}, featured = {true},
      award = {Best Paper}, pdf = {https://example.org/p.pdf}`),
  );
  assert.deepEqual(problems, []);
  const p = publications[0];
  assert.equal(p.title, 'CLEVA-Compass: A Compass');
  assert.equal(p.venue_short, 'ICLR 2022');
  assert.deepEqual(p.members, ['mundt']);
  assert.deepEqual(p.themes, ['cl', 'pai']);
  assert.deepEqual(p.review, ['themes']);
  assert.equal(p.featured, true);
  assert.equal(p.award, 'Best Paper');
});

test('exported BibTeX keeps standard fields and drops the site fields', () => {
  const { publications } = parseBib(
    entry(`title = {T}, author = {Mundt, M.}, booktitle = {B}, year = {2024}, members = {mundt},
      themes = {cl}, review = {themes}, doi = {10.1000/xyz}, pdf = {https://example.org/x.pdf}`),
  );
  const b = publications[0].bibtex;
  assert.match(b, /^@inproceedings\{k2024x,/);
  assert.match(b, /doi\s+= \{10\.1000\/xyz\}/);
  for (const f of ['members', 'themes', 'review', 'pdf'])
    assert.doesNotMatch(b, new RegExp(`\\b${f}\\b`));
});

test('reports duplicate keys, missing members and bad years', () => {
  const src = `${entry('title={A}, author={X, Y}, booktitle={B}, year={2024}, members={a}')}
${entry('title={B}, author={X, Y}, booktitle={B}, year={2024}, members={a}')}
@article{nomembers, title={C}, author={X, Y}, journal={J}, year={2024}}
@article{badyear, title={D}, author={X, Y}, journal={J}, year={soon}, members={a}}`;
  const msgs = parseBib(src).problems.map((p) => `${p.key}: ${p.message}`);
  assert.ok(
    msgs.some((m) => m.includes('duplicate BibTeX key "k2024x"')),
    msgs.join('\n'),
  );
  assert.ok(
    msgs.some((m) => m.startsWith('nomembers: missing required field `members`')),
    msgs.join('\n'),
  );
  assert.ok(
    msgs.some((m) => m.startsWith('badyear: year')),
    msgs.join('\n'),
  );
});

test('venue labels', () => {
  assert.equal(
    deriveVenueShort('International Conference on Machine Learning (ICML)', 2026, 'inproceedings'),
    'ICML 2026',
  );
  assert.equal(deriveVenueShort('Neural Networks', 2023, 'article'), 'Neural Networks');
});

test('initials and short names', () => {
  assert.equal(initialsOf('Martin'), 'M.');
  assert.equal(initialsOf('Jean-Pierre'), 'J.-P.');
  assert.equal(initialsOf('Q.'), 'Q.');
  assert.equal(shortName({ first: 'Joana', last: 'Vale Sousa', prefix: 'de' }), 'J. de Vale Sousa');
});

test('full names keep particles and literal names', () => {
  assert.equal(fullName({ first: 'Gido M.', last: 'Ven', prefix: 'van de' }), 'Gido M. van de Ven');
  assert.equal(fullName({ first: '', last: 'St John', literal: 'St John' }), 'St John');
});

test('extra links and notes are parsed', () => {
  const { publications, problems } = parseBib(
    entry(`title={T}, author={Mundt, Martin}, booktitle={B}, year={2024}, members={mundt},
      url={https://example.org/p}, note={A and B contributed equally.},
      links={Dataset=https://example.org/d; Simulator=https://example.org/s}`),
  );
  assert.deepEqual(problems, []);
  assert.equal(publications[0].url, 'https://example.org/p');
  assert.equal(publications[0].note, 'A and B contributed equally.');
  assert.deepEqual(publications[0].links, [
    { label: 'Dataset', url: 'https://example.org/d' },
    { label: 'Simulator', url: 'https://example.org/s' },
  ]);
  assert.match(publications[0].bibtex, /note/);
  assert.doesNotMatch(publications[0].bibtex, /links/);
});

test('member matching uses family name + first initial and handles diacritics', () => {
  const authors = [
    { first: 'Q.', last: 'Delfosse' },
    { first: 'Martin', last: 'Mundt' },
    { first: 'Joana', last: 'Vale Sousa' },
    { first: 'Jörg', last: 'Müller' },
  ];
  assert.deepEqual(matchMember(authors, 'Martin Mundt'), [1]);
  assert.deepEqual(matchMember(authors, 'Joana Vale Sousa'), [2]);
  assert.deepEqual(matchMember(authors, 'Jorg Muller'), [3]);
  assert.deepEqual(matchMember(authors, 'Gabriel Storch'), []);
  assert.deepEqual(matchMember(authors, 'Anna Mundt'), [], 'different first initial');
});

test('author parts mark members for linking', () => {
  const names = new Map([['mundt', 'Martin Mundt']]);
  const parts = authorParts(
    {
      authors: [
        { first: 'Q.', last: 'Delfosse' },
        { first: 'Martin', last: 'Mundt' },
      ],
      members: ['mundt'],
    },
    names,
  );
  assert.deepEqual(parts, [
    { text: 'Q. Delfosse', person: undefined },
    { text: 'Martin Mundt', person: 'mundt' },
  ]);
  assert.deepEqual(
    authorParts(
      { authors: [{ first: '', last: '[Authors]', literal: '[Authors]' }], members: [] },
      names,
    ),
    [{ text: '[Authors]' }],
  );
});
