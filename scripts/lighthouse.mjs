// Lighthouse budget (CLAUDE.md): performance, accessibility, best practices and
// SEO at least 95 on the homepage, on a simulated phone and on desktop.
// Usage: npm run build && node scripts/lighthouse.mjs [/path/ ...]
// Each page is measured three times and the median counts, because single runs vary by a few
// points. The site is served gzipped, as every real web host does.
import lighthouse, { desktopConfig } from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import { serveDist } from './lib/dist.mjs';

const BUDGET = 95;
const RUNS = 3;
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['/'];

const server = await serveDist({ compress: true });
const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox'],
});
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

let failed = false;
for (const path of paths)
  for (const [label, config] of [
    ['phone', undefined],
    ['desktop', desktopConfig],
  ]) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const r = await lighthouse(
        server.base + path,
        { port: chrome.port, output: 'json', logLevel: 'error' },
        config,
      );
      runs.push(r.lhr);
    }
    const scores = Object.fromEntries(
      Object.keys(runs[0].categories).map((c) => [
        c,
        median(runs.map((r) => Math.round(r.categories[c].score * 100))),
      ]),
    );
    const low = Object.entries(scores).filter(([, s]) => s < BUDGET);
    console.log(
      `${low.length ? '✖' : '✓'} ${path} (${label}): ` +
        Object.entries(scores)
          .map(([c, s]) => `${c} ${s}`)
          .join(', '),
    );
    if (low.length) {
      failed = true;
      // what Lighthouse suggests, from the median-performance run
      const run = runs.find(
        (r) => Math.round(r.categories.performance.score * 100) === scores.performance,
      );
      for (const a of Object.values(run.audits))
        if (a.score !== null && a.score < 0.9 && a.details?.type === 'opportunity')
          console.log(`    ${a.title}${a.displayValue ? `: ${a.displayValue}` : ''}`);
    }
  }

chrome.kill();
await server.close();
if (failed) {
  console.log(`At least one category is below the budget of ${BUDGET}.`);
  process.exitCode = 1;
}
