import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pubMatches,
  pubFilterLabel,
  readPubFilter,
  writePubFilter,
  emptyPubFilter,
  bibExport,
} from '../src/lib/filters.ts';

const item = {
  title: 'Lifelong Learning für Modelle',
  themes: ['cl', 'mc'],
  members: ['mundt'],
  year: 2025,
};

test('matches by theme, member and diacritics-insensitive words', () => {
  assert.ok(pubMatches(item, emptyPubFilter));
  assert.ok(pubMatches(item, { q: 'fur lifelong', theme: 'cl', member: 'mundt', year: '2025' }));
  assert.ok(!pubMatches(item, { ...emptyPubFilter, year: '2024' }));
  assert.ok(!pubMatches(item, { ...emptyPubFilter, theme: 'gd' }));
  assert.ok(!pubMatches(item, { ...emptyPubFilter, member: 'storch' }));
  assert.ok(!pubMatches(item, { ...emptyPubFilter, q: 'lifelong memory' }));
});

test('URL state round-trips and drops empty fields', () => {
  const f = { q: ' memory ', theme: 'mc', member: '', year: '2025' };
  const url = writePubFilter(new URL('https://x.test/publications/?member=old'), f);
  assert.equal(url.search, '?q=memory&theme=mc&year=2025');
  assert.deepEqual(readPubFilter(url.search), {
    q: 'memory',
    theme: 'mc',
    member: '',
    year: '2025',
  });
});

test('status text uses words, never counts', () => {
  const label = pubFilterLabel(
    { q: 'x', theme: 'mc', member: 'mundt', year: '' },
    () => 'Memory & Consolidation',
    () => 'Martin Mundt',
  );
  assert.equal(label, 'Filtered to Memory & Consolidation · with Martin Mundt · matching “x”.');
  assert.doesNotMatch(label, /\d/);
  assert.equal(
    pubFilterLabel(
      emptyPubFilter,
      () => '',
      () => '',
    ),
    '',
  );
});

test('the year shows in the status text', () => {
  const label = pubFilterLabel(
    { ...emptyPubFilter, year: '2025' },
    () => '',
    () => '',
  );
  assert.equal(label, 'Filtered from 2025.');
});

test('BibTeX export says which entries it holds', () => {
  const all = bibExport(['@a{x}', '@b{y}'], '');
  assert.match(all, /^% Publications of the Open World[^\n]*\n\n@a\{x\}\n\n@b\{y\}\n$/);
  const some = bibExport(['@a{x}'], 'Filtered with Martin Mundt.');
  assert.match(some, /\n% Filtered with Martin Mundt\.\n\n@a\{x\}\n$/);
});
