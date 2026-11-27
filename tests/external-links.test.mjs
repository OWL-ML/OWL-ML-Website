// Links to other sites open in a new tab and tell screen readers so (src/lib/external-links.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isExternal, markExternalLinks } from '../src/lib/external-links.ts';

const HOST = 'owl-ml.com';
const page = (body, lang = 'en') => `<html lang="${lang}"><body>${body}</body></html>`;
const NOTE = '<span class="sr-only"> (opens in a new tab)</span>';

test('isExternal: other hosts only', () => {
  assert.equal(isExternal('https://arxiv.org/abs/1', HOST), true);
  assert.equal(isExternal('//example.org/x', HOST), true);
  assert.equal(isExternal('https://owl-ml.com/people/', HOST), false);
  assert.equal(isExternal('https://OWL-ML.com', HOST), false);
  assert.equal(isExternal('/publications/', HOST), false);
  assert.equal(isExternal('#top', HOST), false);
  assert.equal(isExternal('mailto:someone@example.org', HOST), false);
});

test('external link: new tab, noopener, hidden note', () => {
  assert.equal(
    markExternalLinks(page('<a class="link" href="https://arxiv.org/abs/1">Paper</a>'), HOST),
    page(
      `<a class="link" href="https://arxiv.org/abs/1" rel="noopener" target="_blank">Paper${NOTE}</a>`,
    ),
  );
});

test('internal, anchor and mailto links stay unchanged', () => {
  const html = page(
    '<a href="/news/">News</a><a href="#x">x</a><a href="mailto:a@b.org">Mail</a>' +
      '<a href="https://owl-ml.com/">Home</a>',
  );
  assert.equal(markExternalLinks(html, HOST), html);
});

test('a link that already sets a target is left alone', () => {
  const html = page('<a href="https://example.org" target="_self">x</a>');
  assert.equal(markExternalLinks(html, HOST), html);
});

test('aria-label gets the note instead of hidden text', () => {
  assert.equal(
    markExternalLinks(
      page('<a href="https://github.com/x" aria-label="GitHub"><svg></svg></a>'),
      HOST,
    ),
    page(
      '<a href="https://github.com/x" aria-label="GitHub (opens in a new tab)" rel="noopener" target="_blank"><svg></svg></a>',
    ),
  );
});

test('an existing rel keeps its value and gains noopener', () => {
  const out = markExternalLinks(page('<a href="https://example.org" rel="me">x</a>'), HOST);
  assert.match(out, /rel="me noopener"/);
  assert.equal(out.match(/rel=/g).length, 1);
});

test('German pages get a German note', () => {
  const out = markExternalLinks(page('<a href="https://www.uni-bremen.de/">Uni</a>', 'de'), HOST);
  assert.match(out, /<span class="sr-only"> \(öffnet in neuem Tab\)<\/span><\/a>/);
});

test('links spanning several lines with nested markup', () => {
  const out = markExternalLinks(
    page(
      '<a\n  href="https://example.org"\n  class="pill"><img alt="Logo" src="/l.png">\n  Text</a>',
    ),
    HOST,
  );
  assert.match(out, /target="_blank"/);
  assert.match(out, /Text<span class="sr-only">/);
});
