import { test } from 'node:test';
import assert from 'node:assert/strict';

test('site URL defaults to owl-ml.com and can be overridden', async () => {
  delete process.env.SITE_URL;
  const a = (await import('../astro.config.mjs?a')).default;
  assert.equal(a.site, 'https://owl-ml.com');
  process.env.SITE_URL = 'https://example.org';
  const b = (await import('../astro.config.mjs?b')).default;
  assert.equal(b.site, 'https://example.org');
  assert.equal(b.output, 'static');
});
