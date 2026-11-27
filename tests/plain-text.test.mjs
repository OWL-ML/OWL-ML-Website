// Plain-text previews of news bodies (src/lib/plain-text.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainParagraphs } from '../src/lib/plain-text.ts';

test('links keep their text, emphasis and images go, paragraphs stay apart', () => {
  const md = [
    'We are happy to welcome [Peter](/people/stegmaier/) to the **lab**.',
    '',
    '![A figure](/x.png)',
    '',
    'In his _PhD_ he will use `code`.',
  ].join('\n');
  assert.deepEqual(plainParagraphs(md), [
    'We are happy to welcome Peter to the lab.',
    'In his PhD he will use code.',
  ]);
});

test('headings and list items become plain paragraphs; line breaks inside join', () => {
  assert.deepEqual(plainParagraphs('## Call\n\n- first item\n- second\nline'), [
    'Call',
    'first item second line',
  ]);
});

test('underscores inside words and URLs are kept', () => {
  assert.deepEqual(plainParagraphs('See owl_ml and 2 * 3 = 6.'), ['See owl_ml and 2 * 3 = 6.']);
});
