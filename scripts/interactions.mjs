// Checks the interactive parts of the built site in a real browser (docs/DESIGN.md and docs/DEMOS.md):
// keyboard use, no-JavaScript fallbacks, URL parameters, and that no request leaves the site
// before "Load video" is pressed. Usage: npm run build && node scripts/interactions.mjs
import { chromium } from 'playwright';
import { serveDist, pages } from './lib/dist.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = await serveDist();
const base = server.base;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const checks = [];
async function check(name, fn) {
  try {
    await fn();
    checks.push(`✓ ${name}`);
  } catch (e) {
    checks.push(`✖ ${name}\n    ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}

async function page(opts = {}) {
  const p = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    ...opts,
  });
  p.errors = [];
  p.external = [];
  p.on('pageerror', (e) => p.errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && p.errors.push(m.text()));
  p.on('request', (r) => !r.url().startsWith(base) && p.external.push(r.url()));
  return p;
}

await check('research map: keyboard selection, URL parameter, panel', async () => {
  const p = await page();
  await p.goto(`${base}/`);
  const chip = p.locator('button[data-select="theme:mc"]');
  await chip.focus();
  await p.keyboard.press('Enter');
  assert.equal(await chip.getAttribute('aria-pressed'), 'true');
  assert.match(p.url(), /\?theme=mc/);
  assert.match(await p.textContent('[data-map-panel]'), /Memory & Consolidation/);
  await p.keyboard.press('Enter'); // pressing again returns to the overview
  assert.match(await p.textContent('[data-map-panel]'), /Perspectives on lifelong learning/);
  await p.goto(`${base}/?person=mundt`);
  assert.equal(await p.getAttribute('button[data-select="person:mundt"]', 'aria-pressed'), 'true');
  assert.deepEqual(p.errors, []);
});

await check('research map: phone shows the theme explorer without the graph', async () => {
  const p = await page({ viewport: { width: 390, height: 900 } });
  await p.goto(`${base}/`);
  assert.ok(await p.locator('[data-map-svg]').isHidden());
  // a theme is selected, not the overview; without a map the panel lists its papers instead
  assert.equal(await p.locator('[data-map-panel] .mp-kind').count(), 0);
  assert.ok(await p.locator('[data-map-panel] .mp-papers').isVisible());
  assert.ok(await p.locator('[data-paper-box]').isHidden());
});

await check(
  'research map: papers are links, the box shows the full title, labels inside',
  async () => {
    const p = await page();
    await p.goto(`${base}/`);
    const height = () =>
      p.evaluate(() =>
        Math.round(document.querySelector('[data-map]').getBoundingClientRect().height),
      );
    await p.click('button[data-select="theme:mc"]');
    const before = await height();
    assert.ok(await p.locator('[data-map-panel] .mp-papers').isHidden());
    // paper labels stay inside the map (they must not run into the panel)
    assert.ok(
      await p.evaluate(() => {
        const svg = document.querySelector('[data-map-svg]').getBoundingClientRect();
        return [...document.querySelectorAll('[data-map-svg] .x-name')].every((t) => {
          const r = t.getBoundingClientRect();
          return r.left >= svg.left - 1 && r.right <= svg.right + 1;
        });
      }),
    );
    const link = p.locator('[data-map-svg] a[data-paper]:not(.leaving)').first();
    const title = (await link.getAttribute('aria-label')).replace(/ \([^)]*\)$/, '');
    await link.hover();
    assert.equal((await p.textContent('[data-paper-box] .pb-title')).trim(), title);
    assert.equal(await height(), before);
    // by keyboard: tab from the last chip into the map's paper links
    await p.click('button[data-select="theme:cl"]');
    assert.match(await p.textContent('[data-paper-box]'), /Point at a paper/);
    await p.focus('[data-map-svg] a[data-paper]:not(.leaving)');
    assert.match(await p.textContent('[data-paper-box]'), /Open in publications/);
    assert.match(await link.getAttribute('href'), /^\/publications\/#/);
    assert.deepEqual(p.errors, []);
  },
);

await check('publications: filters by keyboard, URL state, words not counts', async () => {
  const p = await page();
  await p.goto(`${base}/publications/?theme=cl&member=kamath`);
  const status = await p.textContent('#pub-status');
  assert.match(status, /Filtered to Continual Machine Learning · with Roshni Kamath/);
  assert.doesNotMatch(status, /\d+ of \d+/);
  await p.focus('#pub-q');
  await p.keyboard.type('bowl');
  assert.equal(await p.locator('.pub:visible').count(), 1);
  assert.match(p.url(), /q=bowl/);
  // the BibTeX button downloads the entry shown, and is unavailable when nothing is shown
  const bib = p.locator('[data-bib-export]');
  assert.match(await bib.textContent(), /Download these as BibTeX/);
  const [download] = await Promise.all([p.waitForEvent('download'), bib.click()]);
  const text = await (await download.createReadStream()).toArray();
  const body = Buffer.concat(text).toString('utf8');
  assert.equal(body.match(/^@/gm)?.length, 1);
  assert.match(body, /% Filtered to Continual Machine Learning · with Roshni Kamath/);
  await p.selectOption('#pub-year', '2022');
  assert.equal(await p.locator('.pub:visible').count(), 0);
  assert.equal(await bib.getAttribute('aria-disabled'), 'true');
  assert.equal(await bib.getAttribute('href'), null);
  await p.goto(`${base}/publications/?year=2025`);
  assert.match(await p.textContent('#pub-status'), /Filtered from 2025\./);
  assert.ok((await p.locator('.pub:visible').count()) > 0);
  assert.equal(await p.locator('.pub[data-year]:visible:not([data-year="2025"])').count(), 0);
});

await check('profile: tabs with arrow keys, theme filter', async () => {
  const p = await page();
  await p.goto(`${base}/people/mundt/`);
  await p.focus('[data-tab="publications"]');
  await p.keyboard.press('ArrowRight');
  // the second tab is Talks, or News for people without talks
  const second = await p.locator('[data-profile-tabs] [data-tab]').nth(1).getAttribute('data-tab');
  assert.ok(await p.locator(`#${second}`).isVisible());
  assert.ok(await p.locator('#publications').isHidden());
  await p.click('[data-profile-theme="gd"]');
  assert.ok(await p.locator('#publications').isVisible());
  assert.match(
    await p.textContent('[data-status-text]'),
    /Filtered to Generative & Dynamic Models/,
  );
});

await check(
  'profile: theme chips only filter when there are publications; staff profiles',
  async () => {
    const p = await page();
    await p.goto(`${base}/people/mundt/`);
    assert.ok(await p.locator('[data-clear-theme]').first().isHidden());
    await p.click('[data-profile-theme="mc"]');
    await p.locator('.chips [data-clear-theme]').click();
    assert.equal(await p.locator('#publications .pub[hidden]').count(), 0);
    // themes filter only where there are publications; otherwise they are labels
    for (const id of ['das', 'kamath', 'paul', 'schwerin', 'storch']) {
      await p.goto(`${base}/people/${id}/`);
      if (!(await p.locator('#themes-label').count())) continue;
      const hasPubs = (await p.locator('#publications .pub').count()) > 0;
      assert.equal((await p.locator('[data-profile-theme]').count()) > 0, hasPubs, id);
      assert.equal(/select one/.test(await p.textContent('#themes-label')), hasPubs, id);
    }
    // staff: what to contact them about, no publication, talk or news lists
    await p.goto(`${base}/people/hederich/`);
    assert.ok(await p.locator('#contact-for-h').isVisible());
    assert.equal(await p.locator('[data-profile-tabs], #publications').count(), 0);
    assert.doesNotMatch(await p.textContent('main'), /src\/content\/people/);
  },
);

await check('publications: teaser figures open large in place, Escape closes', async () => {
  const p = await page();
  await p.goto(`${base}/publications/`);
  const fig = p.locator('#das2026timetofakeit .figure, .pub .figure').first();
  assert.ok(await fig.isVisible());
  await fig.click();
  const dialog = p.locator('[data-figure-viewer]');
  assert.ok(await dialog.isVisible());
  // the large image starts loading on click: wait for it instead of expecting it at once
  await p.waitForFunction(
    () => {
      const i = document.querySelector('[data-figure-viewer] img');
      return i && i.complete && i.naturalWidth > 600;
    },
    null,
    { timeout: 5000 },
  );
  assert.match(p.url(), /\/publications\/$/);
  await p.keyboard.press('Escape');
  assert.ok(await dialog.isHidden());
});

await check('teaching: course path, suggested next, semester filter', async () => {
  const p = await page();
  await p.goto(`${base}/teaching/`);
  assert.equal(await p.locator('.detail:visible').count(), 1);
  await p.focus('[data-course="dgm"]');
  await p.keyboard.press('Enter');
  assert.ok(await p.locator('#course-dgm').isVisible());
  assert.ok(await p.locator('[data-course="guided"].is-next').isVisible());
  await p.click('[data-sem="summer"]');
  assert.ok(await p.locator('[data-course="traki"].not-offered').count());
});

await check('teaching: a course link opens its panel with materials', async () => {
  const p = await page();
  await p.goto(`${base}/teaching/#course-llml`);
  const panel = p.locator('#course-llml');
  assert.ok(await panel.isVisible());
  assert.equal(await p.getAttribute('[data-course="llml"]', 'aria-pressed'), 'true');
  assert.ok(await panel.locator('a[href*="github.com/OWL-ML/LLML25"]').isVisible());
  assert.deepEqual(p.errors, []);
});

await check('news: type filter with URL state', async () => {
  const p = await page();
  await p.goto(`${base}/news/?type=people`);
  assert.ok(await p.locator('[data-news-filtered]').isVisible());
  const types = await p
    .locator('[data-news-filtered] [data-type]:visible')
    .evaluateAll((els) => els.map((e) => e.dataset.type));
  assert.ok(types.length > 0 && types.every((t) => t === 'people'));
  await p.click('[data-filter="all"]');
  assert.ok(await p.locator('.bento').isVisible());
});

await check('news: links to an item open its text in place', async () => {
  const p = await page();
  await p.goto(`${base}/news/#2025-03-04-malte-schwerin-joins`);
  const item = p.locator('[id="2025-03-04-malte-schwerin-joins"]');
  assert.ok(await item.isVisible(), 'item inside "Show earlier years" is shown');
  assert.ok(await item.locator('details.more').evaluate((d) => d.open));
  await p.goto(`${base}/news/archive/#2023-11-01-qi-li-caiman`);
  assert.ok(await p.locator('[id="2023-11-01-qi-li-caiman"] details.more').evaluate((d) => d.open));
  await p.locator('[id="2022-06-10-roshni-kamath-joins"] summary').click();
  assert.ok(await p.locator('[id="2022-06-10-roshni-kamath-joins"] .prose').isVisible());
});

await check(
  'YouTube: nothing loads before "Load video", then only youtube-nocookie.com',
  async () => {
    const p = await page();
    // the first page with a video embed; there is none until a talk has a recording
    const withVideo = (await pages()).find((path) =>
      readFileSync(`dist${path}index.html`, 'utf8').includes('data-load-video'),
    );
    if (!withVideo) return console.log('  (no page with a video yet: check skipped)');
    await p.route(/youtube/, (route) => route.abort()); // never actually contact YouTube in tests
    await p.goto(`${base}${withVideo}`);
    await p.waitForLoadState('networkidle');
    assert.deepEqual(p.external, []);
    await p.click('[data-load-video]');
    const frame = p.locator('iframe.player');
    assert.match(await frame.getAttribute('src'), /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  },
);

await check('news: "Read more" grows only its own tile', async () => {
  const p = await page();
  await p.goto(`${base}/news/`);
  const heights = () =>
    p.evaluate(() =>
      [...document.querySelectorAll('.bento > *')].map((t) =>
        Math.round(t.getBoundingClientRect().height),
      ),
    );
  const closed = await heights();
  // open the tile with the longest text, so its row has to grow
  const lengths = await p.evaluate(() =>
    [...document.querySelectorAll('.bento > *')].map(
      (t) => t.querySelector('details.more')?.textContent.length ?? 0,
    ),
  );
  const i = lengths.indexOf(Math.max(...lengths));
  await p.locator(`.bento > :nth-child(${i + 1}) details.more summary`).click();
  const open = await heights();
  assert.ok(open[i] > closed[i]);
  open.forEach(
    (h, j) =>
      j !== i && assert.ok(Math.abs(h - closed[j]) <= 1, `tile ${j + 1}: ${closed[j]} → ${h}`),
  );
  await p.locator(`.bento > :nth-child(${i + 1}) details.more summary`).click();
  assert.deepEqual(await heights(), closed);
  assert.deepEqual(p.errors, []);
});

await check(
  'news: tiles without a figure preview their text; opening shows it in full',
  async () => {
    const p = await page();
    await p.goto(`${base}/news/`);
    const tile = p.locator('.bento > :has(.preview)').first();
    const preview = tile.locator('.preview');
    assert.ok(await preview.isVisible());
    assert.equal(await preview.getAttribute('aria-hidden'), 'true'); // read once, in "Read more"
    assert.equal(await preview.locator('a').count(), 0); // plain text: nothing to focus
    assert.equal(await p.locator('.bento > :has(.figure) .preview').count(), 0);
    await tile.locator('details.more summary').click();
    assert.ok(await preview.isHidden());
    assert.ok(await tile.locator('details.more .prose').isVisible());
  },
);

await check('news: opening a text below an open one keeps the page in place (phone)', async () => {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const p = await page({ viewport: { width: 390, height: 844 }, reducedMotion });
    await p.goto(`${base}/news/archive/`);
    const summaries = p.locator('details.more > summary:visible');
    await summaries.nth(0).click();
    await p.waitForTimeout(500);
    const next = summaries.nth(1);
    await next.evaluate((s) => s.scrollIntoView({ block: 'center' }));
    const before = await next.evaluate((s) => s.getBoundingClientRect().top);
    await next.click();
    await p.waitForTimeout(500);
    const after = await next.evaluate((s) => s.getBoundingClientRect().top);
    assert.ok(Math.abs(after - before) <= 2, `${reducedMotion}: moved ${before} → ${after}`);
    assert.equal(await p.locator('details.more[open]').count(), 1);
    assert.deepEqual(p.errors, []);
  }
});

await check('phone: map chips wrap; join band text starts right below the heading', async () => {
  const p = await page({ viewport: { width: 390, height: 844 } });
  await p.goto(`${base}/`);
  const overflow = await p.evaluate(() =>
    [...document.querySelectorAll('[data-map] .scroller')].map(
      (s) => s.scrollWidth - s.clientWidth,
    ),
  );
  assert.ok(
    overflow.every((o) => o <= 1),
    `chip rows scroll sideways: ${overflow}`,
  );
  const gap = await p.evaluate(() => {
    const band = document.querySelector('.join');
    const text = band.querySelector('p').getBoundingClientRect();
    const cta = band.querySelector('.cta').getBoundingClientRect();
    return cta.top - text.bottom;
  });
  assert.ok(gap < 40, `gap between text and button: ${gap}px`);
});

await check('no JavaScript: full lists and fallbacks, nothing broken', async () => {
  const p = await page({ javaScriptEnabled: false });
  await p.goto(`${base}/`);
  assert.ok(await p.locator('[data-map]').isHidden());
  assert.ok(await p.locator('.overview').isVisible());
  await p.goto(`${base}/publications/?theme=mc`);
  assert.ok(await p.locator('[data-pub-filters]').isHidden());
  assert.equal(await p.locator('.pub:visible').count(), await p.locator('.pub').count());
  await p.goto(`${base}/people/mundt/`);
  for (const id of await p
    .locator('[data-profile-tabs] [data-tab]')
    .evaluateAll((tabs) => tabs.map((t) => t.getAttribute('data-tab'))))
    assert.ok(await p.locator(`#${id}`).isVisible());
  await p.goto(`${base}/teaching/`);
  assert.equal(await p.locator('.detail:visible').count(), await p.locator('.detail').count());
  await p.goto(`${base}/news/`);
  assert.ok(await p.locator('.bento').isVisible());
  assert.ok(await p.locator('[data-news-filter]').isHidden());
});

await check('demo next-word: works by keyboard, no errors, nothing external', async () => {
  // a run of plain words from the book, to plant as a copied passage
  const book = readFileSync('public/demos/next-word/alice-tokens.txt', 'utf8').trim().split(/\s+/);
  let at = 1000;
  while (!book.slice(at, at + 7).every((w) => /^[a-z]+$/.test(w))) at++;
  const quote = book.slice(at, at + 7);
  const p = await page();
  await p.goto(`${base}/teaching/demos/next-word/`);
  await p.waitForSelector('[data-demo-ready]');
  const text = p.locator('[data-text]');
  const before = (await text.textContent()).length;
  // "Copied from the book" only appears once five words in a row match the book
  assert.equal(await p.locator('[data-copy]').isHidden(), true);
  await p.locator('[data-add="10"]').focus();
  await p.keyboard.press('Enter');
  assert.ok((await text.textContent()).length > before, 'ten words added');
  await p.click('[data-n="2"]');
  assert.equal(await p.getAttribute('[data-n="2"]', 'aria-pressed'), 'true');
  await p.locator('.nw-cand').first().click();
  await p.fill('#nw-start-input', 'the zyxwv');
  await p.keyboard.press('Enter');
  assert.match(await p.textContent('[data-msg]'), /“zyxwv”/);
  await p.click('[data-starter="the queen"]');
  assert.match(await text.textContent(), /^The queen /);
  await p.fill('#nw-start-input', quote.join(' ')); // seven words in a row from the book
  await p.keyboard.press('Enter');
  assert.equal(await p.locator('[data-copy]').isVisible(), true);
  assert.match(await p.textContent('[data-copy-text]'), /^7 words in a row appear word for word/);
  await p.click('[data-starter="alice"]');
  assert.equal(await p.locator('[data-copy]').isHidden(), true);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.external, []);
});

await check(
  'demo watch-it-forget: learn A, forget with B, replay and EWC as specified',
  async () => {
    const p = await page(); // reduced motion: each training run jumps to its end
    await p.goto(`${base}/teaching/demos/watch-it-forget/`);
    await p.waitForSelector('[data-demo-ready]');
    const bar = (t) => p.textContent(`[data-bar-text="${t}"]`);
    await p.click('[data-primary]'); // 1 · Learn task A
    await p.waitForFunction(() =>
      document.querySelector('[data-primary]').textContent.includes('2'),
    );
    assert.equal(await bar('A'), '100%');
    await p.click('[data-primary]'); // 2 · Learn task B, with nothing
    await p.waitForFunction(() =>
      document.querySelector('[data-primary]').textContent.includes('Back'),
    );
    assert.equal(await bar('A'), '100% → 5%');
    assert.match(await p.textContent('[data-note]'), /overwrote task A/);
    await p.click('[data-strategy="replay"]'); // goes back to after task A
    await p.click('[data-primary]');
    await p.waitForFunction(() =>
      document.querySelector('[data-primary]').textContent.includes('Back'),
    );
    assert.equal(await bar('A'), '100% → 90%');
    await p.click('[data-strategy="ewc"]');
    await p.locator('#fg-lam').focus();
    await p.keyboard.press('ArrowRight'); // λ = 300
    await p.click('[data-primary]');
    await p.waitForFunction(() =>
      document.querySelector('[data-primary]').textContent.includes('Back'),
    );
    assert.equal(await bar('A'), '100% → 100%');
    assert.equal(await bar('B'), '90%');
    assert.deepEqual(p.errors, []);
    assert.deepEqual(p.external, []);
  },
);

await check('demo training-footprint: defaults, keyboard sliders, sources', async () => {
  const p = await page();
  await p.goto(`${base}/teaching/demos/training-footprint/`);
  await p.waitForSelector('[data-demo-ready]');
  assert.equal(await p.textContent('[data-energy]'), '94 kWh');
  assert.equal(await p.textContent('[data-co2]'), '34 kg CO₂e');
  await p.locator('#fp-runs').focus();
  await p.keyboard.press('ArrowRight'); // 2 runs
  assert.equal(await p.textContent('[data-energy]'), '189 kWh');
  assert.equal(await p.getAttribute('#fp-durIdx', 'aria-valuetext'), '3 days');
  await p.click('[data-grid="coal"]');
  assert.match(await p.textContent('[data-formula]'), /× 820 g\/kWh/);
  assert.equal(await p.locator('.fp-current .fp-bar-label').textContent(), 'Coal');
  assert.ok(await p.locator('.demo-notes a[href*="umweltbundesamt.de"]').count());
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.external, []);
});

await check('demo step-through-python: guess, verdict, step through by keyboard', async () => {
  const p = await page();
  await p.goto(`${base}/teaching/demos/step-through-python/`);
  await p.waitForSelector('[data-demo-ready]');
  await p.click('.py-option >> nth=0'); // a wrong guess: "[1, 2, 3]"
  assert.equal(await p.textContent('[data-verdict]'), 'Not quite, it prints [1, 2, 3, 4].');
  assert.equal(await p.evaluate(() => document.activeElement?.hasAttribute('data-next')), true);
  for (let i = 0; i < 10; i++) await p.keyboard.press('Enter'); // past the end: stays at the end
  assert.match(await p.textContent('[data-step]'), /^finished · step 5 of 5/);
  assert.equal(await p.textContent('[data-out]'), '[1, 2, 3, 4]\n');
  assert.equal(await p.locator('[data-frames] .py-shared').count(), 2); // a and b → the same list
  // "Guess again" returns to the question; the steps start from the beginning afterwards
  await p.click('[data-again]');
  assert.equal(await p.locator('[data-ask]').isVisible(), true);
  assert.equal(await p.locator('[data-nav]').isHidden(), true);
  assert.equal(
    await p.evaluate(() => document.activeElement?.classList.contains('py-option')),
    true,
  );
  await p.click('.py-option >> nth=1'); // the right answer
  assert.equal(await p.textContent('[data-verdict]'), 'Right, it prints [1, 2, 3, 4].');
  assert.match(await p.textContent('[data-step]'), /^step 1 of 5/);
  await p.click('[data-tab="3"]');
  await p.click('[data-skip]');
  assert.equal(await p.textContent('[data-verdict]'), 'It prints [2, 2, 2].');
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.external, []);
});

await check('demo data-to-noise: slider by keyboard, reversible', async () => {
  const p = await page();
  await p.goto(`${base}/teaching/demos/data-to-noise/`);
  await p.waitForSelector('[data-demo-ready]');
  const pixels = () => p.locator('[data-canvas]').evaluate((c) => c.toDataURL());
  const start = await pixels();
  await p.locator('#df-t').focus();
  await p.keyboard.press('End');
  assert.equal(await p.textContent('[data-t]'), '1.00');
  assert.notEqual(await pixels(), start);
  await p.keyboard.press('Home');
  assert.equal(await pixels(), start, 'back at t = 0 the picture is the data again');
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.external, []);
});

await check(
  'demo leaderboard-depends-on-you: presets, keyboard weights, each method first',
  async () => {
    const p = await page();
    await p.goto(`${base}/teaching/demos/leaderboard-depends-on-you/`);
    await p.waitForSelector('[data-demo-ready]');
    const first = () => p.locator('[data-rank] li').first().getAttribute('data-method');
    assert.equal(await first(), 'a', 'leaderboard view: accuracy only');
    for (const [preset, m] of [
      ['never-forget', 'd'],
      ['balanced', 'c'],
      ['equal', 'b'],
    ]) {
      await p.click(`[data-preset="${preset}"]`);
      assert.equal(await first(), m, preset);
    }
    assert.equal(await p.locator('.wb-done').count(), 4);
    assert.match(await p.textContent('[data-live]'), /Method B is now first/);
    // by keyboard: memory to "Matters most" moves B further ahead; all to 0 empties the ranking
    await p.locator('#wb-memory').focus();
    await p.keyboard.press('End');
    assert.equal(await p.getAttribute('#wb-memory', 'aria-valuetext'), 'Matters most');
    assert.equal(await p.getAttribute('[data-preset="equal"]', 'aria-pressed'), 'false');
    for (const id of ['acc', 'forget', 'memory', 'compute', 'data']) {
      await p.locator(`#wb-${id}`).focus();
      await p.keyboard.press('Home');
    }
    assert.ok(await p.locator('[data-empty]').isVisible());
    assert.deepEqual(p.errors, []);
    assert.deepEqual(p.external, []);
  },
);

await check(
  'demo does-efficiency-save-energy: guess first, then the slider by keyboard',
  async () => {
    const p = await page();
    await p.goto(`${base}/teaching/demos/does-efficiency-save-energy/`);
    await p.waitForSelector('[data-demo-ready]');
    assert.ok(await p.locator('#rb-e').isHidden(), 'nothing revealed before a guess');
    await p.click('[data-guess="none"]');
    assert.equal(await p.textContent('[data-bar="total"] .rb-bar-value'), '50');
    await p.click('[data-guess="backfire"]');
    assert.match(await p.textContent('[data-regime]'), /Higher consumption/);
    await p.locator('#rb-e').focus();
    await p.keyboard.press('End');
    assert.equal(await p.textContent('[data-bar="total"] .rb-bar-value'), '200');
    assert.equal(await p.textContent('[data-bar="queries"] .rb-bar-value'), '400');
    await p.keyboard.press('Home');
    assert.match(await p.getAttribute('#rb-e', 'aria-valuetext'), /full saving/);
    assert.deepEqual(p.errors, []);
    assert.deepEqual(p.external, []);
  },
);

await check('demo dial-in: brew, suggestions, budget, new bean, true window', async () => {
  const p = await page();
  await p.goto(`${base}/teaching/demos/dial-in/`);
  await p.waitForSelector('[data-demo-ready]');
  // keyboard: choose grind 11 at 18 g and brew
  await p.locator('#di-grind').focus();
  for (let i = 0; i < 4; i++) await p.keyboard.press('ArrowLeft');
  await p.locator('#di-dose').focus();
  for (let i = 0; i < 2; i++) await p.keyboard.press('ArrowRight');
  assert.equal(await p.getAttribute('#di-grind', 'aria-valuetext'), '11');
  assert.equal(await p.getAttribute('#di-dose', 'aria-valuetext'), '18 grams');
  await p.click('[data-brew]');
  assert.match(await p.textContent('[data-result]'), /Shot 1 with grind 11 and 18 g ran \d+\.\d s/);
  await p.click('[data-suggest="explore"]');
  assert.match(await p.textContent('[data-result]'), /where it knows least/);
  await p.click('[data-suggest="best"]');
  for (let i = 0; i < 7; i++) await p.click('[data-brew]');
  assert.match(await p.textContent('[data-left]'), /0 of 8 shots left/);
  assert.equal(await p.getAttribute('[data-brew]', 'aria-disabled'), 'true');
  assert.equal(await p.locator('[data-shots] li').count(), 8);
  await p.click('[data-truth]');
  assert.equal(await p.getAttribute('[data-truth]', 'aria-pressed'), 'true');
  await p.click('[data-bean]');
  assert.match(await p.textContent('[data-left]'), /Bean 2, 8 of 8/);
  assert.equal(await p.locator('[data-shots] li').count(), 0);
  // a tap on the map selects a setting (the map may have scrolled out of view by now)
  await p.locator('[data-map]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const box = await p.locator('[data-map]').boundingBox();
  assert.ok(box.y >= 0 && box.y + box.height <= 1000, 'the whole map is in view');
  await p.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.1);
  assert.notEqual(await p.getAttribute('#di-grind', 'aria-valuetext'), '11');
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.external, []);
});

await check('teaching "Try it": nothing loads until visible; follows the course path', async () => {
  const p = await page();
  const data = [];
  p.on('request', (r) => r.url().includes('/demos/') && data.push(r.url()));
  await p.goto(`${base}/teaching/`);
  await p.waitForTimeout(300);
  assert.deepEqual(data, [], 'no demo data before the demo is visible');
  await p.locator('#try').scrollIntoViewIfNeeded();
  await p.waitForSelector('[data-try-slot="traki"] [data-demo-ready]');
  assert.ok(data.some((u) => u.endsWith('alice-tokens.txt')));
  await p.click('[data-course="sem-lifelong"]');
  assert.ok(await p.locator('[data-try-slot="sem-lifelong"]').isVisible());
  assert.ok(await p.locator('[data-try-slot="traki"]').isHidden());
  await p.locator('[data-try-slot="sem-lifelong"]').scrollIntoViewIfNeeded();
  await p.waitForSelector('[data-try-slot="sem-lifelong"] [data-demo-ready]');
  const dims = p.locator('[data-try-slot="sem-lifelong"] .dims details');
  assert.equal(await dims.count(), 4);
  // open from the start, each can be collapsed
  assert.equal(await dims.first().locator('a').getAttribute('href'), '/publications/?theme=mc');
  assert.ok(await dims.first().locator('a').isVisible());
  await dims.first().locator('summary').click();
  assert.ok(await dims.first().locator('a').isHidden());
  // boxes in a row: same width and height
  const boxes = await dims.evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.width), Math.round(r.height), Math.round(r.top)];
    }),
  );
  const row = boxes.filter((b) => b[2] === boxes[1][2]);
  assert.ok(
    row.every((b) => b[0] === row[0][0] && b[1] === row[0][1]),
    JSON.stringify(boxes),
  );
  await p.click('[data-try-course="traki"]');
  assert.ok(await p.locator('[data-try-slot="traki"]').isVisible());
  assert.equal(await p.getAttribute('[data-course="traki"]', 'aria-pressed'), 'true');
  assert.deepEqual(p.errors, []);
});

await check(
  'motion: filtering animates the list and leaves no transition names behind',
  async () => {
    const p = await page({ reducedMotion: 'no-preference' });
    // the names must be gone once the transition has finished; how long that takes depends on
    // the machine (CI runners are slower), so wait for it instead of a fixed time
    const namesCleared = () =>
      p.waitForFunction(
        () => document.querySelectorAll('[style*="view-transition-name"]').length === 0,
        null,
        { timeout: 5000 },
      );
    await p.goto(`${base}/publications/`);
    await p.click('[data-pub-filters] [data-theme="pai"]');
    await namesCleared();
    assert.ok((await p.locator('.pub[data-title]:visible').count()) > 0);
    // typing filters at once (no transition, so the typed letters appear immediately)
    await p.fill('#pub-q', 'zzzz');
    assert.equal(await p.locator('.pub[data-title]:visible').count(), 0);
    await p.goto(`${base}/news/`);
    await p.click('[data-filter="people"]');
    await namesCleared();
    assert.ok(await p.locator('[data-news-filtered]').isVisible());
    assert.deepEqual(p.errors, []);
  },
);

await check('motion: the hero animates, and stops under reduced motion', async () => {
  const moving = await page({ reducedMotion: 'no-preference' });
  await moving.goto(`${base}/`);
  assert.notEqual(
    await moving.locator('[data-roll]').evaluate((el) => getComputedStyle(el).animationName),
    'none',
  );
  // the network figure: the canvas takes over from the static frame and keeps changing
  const live = moving.locator('[data-live]');
  await live.waitFor({ state: 'visible' });
  const before = await live.evaluate((c) => c.toDataURL());
  await moving.waitForTimeout(400);
  assert.notEqual(await live.evaluate((c) => c.toDataURL()), before);
  assert.deepEqual(moving.errors, []);
  const still = await page();
  await still.goto(`${base}/`);
  assert.equal(
    await still.locator('[data-roll]').evaluate((el) => getComputedStyle(el).animationName),
    'none',
  );
  await still.waitForTimeout(300);
  assert.ok(await still.locator('[data-live]').isHidden());
  assert.ok(await still.locator('[data-still]').isVisible());
});

console.log(checks.join('\n'));
await browser.close();
await server.close();
