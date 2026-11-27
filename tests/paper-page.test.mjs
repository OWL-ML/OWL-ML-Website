// Papers link to their landing page, not to the PDF file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landingPage } from '../src/lib/paper-page.ts';

test('PDF links become landing pages', () => {
  assert.equal(
    landingPage({ pdf: 'https://arxiv.org/pdf/2402.04814.pdf' }),
    'https://arxiv.org/abs/2402.04814',
  );
  assert.equal(
    landingPage({ pdf: 'https://arxiv.org/pdf/2606.24007' }),
    'https://arxiv.org/abs/2606.24007',
  );
  assert.equal(
    landingPage({ pdf: 'https://arxiv.org/pdf/2402.04814v2' }),
    'https://arxiv.org/abs/2402.04814v2',
  );
  assert.equal(
    landingPage({ pdf: 'https://openreview.net/pdf?id=h8D75pVKja' }),
    'https://openreview.net/forum?id=h8D75pVKja',
  );
  assert.equal(
    landingPage({ pdf: 'https://proceedings.mlr.press/v208/mundt23a/mundt23a.pdf' }),
    'https://proceedings.mlr.press/v208/mundt23a.html',
  );
});

test('a landing page in `url` wins; arXiv id and DOI are fallbacks', () => {
  const url = 'https://www.nature.com/articles/s42256-025-01109-4';
  assert.equal(landingPage({ url, pdf: 'https://arxiv.org/pdf/1' }), url);
  assert.equal(
    landingPage({ url: 'https://arxiv.org/pdf/2510.17381' }),
    'https://arxiv.org/abs/2510.17381',
  );
  assert.equal(landingPage({ arxiv: '2105.08997' }), 'https://arxiv.org/abs/2105.08997');
  assert.equal(landingPage({ doi: '10.1/x' }), 'https://doi.org/10.1/x');
  assert.equal(
    landingPage({ pdf: 'https://example.org/paper.pdf' }),
    'https://example.org/paper.pdf',
  );
  assert.equal(landingPage({}), undefined);
});
