// Runs axe-core (WCAG 2.1 A/AA rules) on built pages. Usage: npm run build && node scripts/a11y.mjs [/path/ ...]
// Without paths it checks every page in dist/ (redirect pages from old URLs are skipped).
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { serveDist, pages } from './lib/dist.mjs';

const axeSource = await readFile(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
);
const server = await serveDist();

const paths = process.argv.slice(2).length ? process.argv.slice(2) : await pages();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let failures = 0;
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const p of paths) {
    await page.goto(`${server.base}${p}`);
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(() =>
      // eslint-disable-next-line no-undef
      axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }),
    );
    for (const v of result.violations) {
      failures++;
      console.log(`✖ ${p} @${width}px  ${v.id} (${v.impact}): ${v.help}`);
      for (const n of v.nodes.slice(0, 5))
        console.log(`    ${n.target.join(' ')}  ${n.failureSummary?.split('\n')[1] ?? ''}`);
    }
  }
  await page.close();
}
await browser.close();
await server.close();
console.log(
  failures
    ? `${failures} accessibility violation(s).`
    : `No axe violations on ${paths.length} page(s) at 1440 and 390 px.`,
);
process.exitCode = failures ? 1 : 0;
