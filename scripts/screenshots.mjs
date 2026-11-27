// Full-page screenshots of built pages at 1440 px and 390 px, for pull request descriptions.
// Usage: npm run build && node scripts/screenshots.mjs [/path/ ...]   (writes to screenshots/)
// Serves dist/ itself, so no other server is needed.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { serveDist, pages } from './lib/dist.mjs';

const server = await serveDist();

// --all: every page (CI); otherwise the given paths, or the homepage
const args = process.argv.slice(2);
const paths = args.includes('--all') ? await pages() : args.length ? args : ['/'];
// CHROMIUM_PATH lets environments with a preinstalled browser skip the Playwright download.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
await mkdir('screenshots', { recursive: true });
const errors = [];
for (const [label, width] of [
  ['desktop', 1440],
  ['phone', 390],
]) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  });
  page.on('console', (m) => m.type() === 'error' && errors.push(`${m.text()}`));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    if (!r.url().startsWith(server.base)) errors.push(`external request: ${r.url()}`);
  });
  for (const p of paths) {
    await page.goto(`${server.base}${p}`, { waitUntil: 'networkidle' });
    // scroll through the page so lazily loaded images are fetched before the screenshot
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    const slug = p
      .replace(/^\/|\/$/g, '')
      .replace(/\/(?=\?)/, '')
      .replace(/\//g, '_')
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/^-/, 'home-');
    const name = (slug || 'home') + `-${label}.png`;
    await page.screenshot({ path: join('screenshots', name), fullPage: true });
    console.log('wrote', name);
  }
  await page.close();
}
await browser.close();
await server.close();
if (errors.length) {
  console.error('Console errors or external requests:\n' + errors.join('\n'));
  process.exitCode = 1;
}
