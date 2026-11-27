// Link checker for the built site. Usage: npm run build && node scripts/links.mjs [--external]
// Internal (always): every href, src, srcset and redirect target in dist/ must point to a file
// that exists, every #fragment to an element with that id on the target page, and every srcset
// with width descriptors must come with `sizes`.
// External (--external): every outside URL is requested (HEAD, then GET). Only links that are
// clearly gone fail the check: 404 or 410, or a domain that no longer exists. Everything that may
// be temporary (timeouts, connection resets, server errors) and pages that refuse automated
// requests (401, 403, 429) are listed as warnings, so a site that happens to be down during the
// weekly run does not fail it. Visitors never trigger these requests: this runs in CI.
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, posix } from 'node:path';
import { DIST, isRedirect } from './lib/dist.mjs';
import { isExternal } from '../src/lib/external-links.ts';
import { siteUrl } from '../src/lib/site-url.ts';

const external = process.argv.includes('--external');
// the site's own address (src/lib/site-url.ts): absolute links to it are checked as internal
const SITE = new URL(siteUrl()).origin;
const SITE_HOST = new URL(SITE).hostname;
// pages that show example links on purpose (none at the moment)
const EXAMPLES = new Set();

async function htmlFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/** the page's own address, e.g. dist/people/mundt/index.html → /people/mundt/ */
const urlOf = (file) => {
  const rel = '/' + relative(DIST, file).replace(/\\/g, '/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
};

function linksIn(html) {
  const out = [];
  for (const m of html.matchAll(/\s(href|src|poster)="([^"]*)"/g)) out.push(decode(m[2]));
  for (const m of html.matchAll(/\ssrcset="([^"]*)"/g))
    for (const part of decode(m[1]).split(','))
      if (part.trim()) out.push(part.trim().split(/\s+/)[0]);
  // share images (og:image) must exist too
  for (const m of html.matchAll(/property="og:image"\s+content="([^"]+)"/g)) out.push(decode(m[1]));
  for (const m of html.matchAll(/http-equiv="refresh"\s+content="[^"]*?url=([^"]+)"/gi))
    out.push(decode(m[1]));
  return out;
}

const idCache = new Map();
async function idsOf(file) {
  if (!idCache.has(file)) {
    const html = await readFile(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\s(?:id|name)="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

/** the file in dist/ that serves a site path, or null */
async function fileFor(path) {
  const p = join(DIST, decodeURIComponent(path));
  for (const candidate of path.endsWith('/') ? [join(p, 'index.html')] : [p, join(p, 'index.html')])
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      /* try the next */
    }
  return null;
}

const files = await htmlFiles(DIST);
const broken = [];
const outside = new Map(); // url → pages linking to it
const ignored = /^(mailto:|tel:|javascript:|data:|blob:)/i;

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const here = urlOf(file);
  // responsive images: a srcset with width descriptors needs `sizes`, or browsers assume 100vw
  for (const tag of html.match(/<(?:img|source)\b[^>]*>/g) ?? [])
    if (/srcset="[^"]*\d+w/.test(tag) && !/\ssizes="/.test(tag))
      broken.push(`${here}  →  ${tag.slice(0, 80)}…  (srcset with widths but no sizes)`);
  // links to other sites open in a new tab and say so to screen readers (src/middleware.ts)
  for (const [, attrs, body] of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = decode(/\shref="([^"]*)"/.exec(attrs)?.[1] ?? '');
    if (!isExternal(href, SITE_HOST) || /\starget="(?!_blank")/.test(attrs)) continue;
    const noted = /class="sr-only"/.test(body) || /\saria-label="[^"]*\(/.test(attrs);
    if (!/\starget="_blank"/.test(attrs) || !/\srel="[^"]*noopener/.test(attrs) || !noted)
      broken.push(`${here}  →  ${href}  (external link without new tab or its note)`);
  }
  for (const raw of linksIn(html)) {
    if (!raw || ignored.test(raw)) continue;
    const link = raw.startsWith(SITE + '/') ? raw.slice(SITE.length) : raw;
    if (/^https?:\/\//i.test(link) || link.startsWith('//')) {
      if (EXAMPLES.has(here)) continue;
      const u = link.startsWith('//') ? `https:${link}` : link;
      if (!outside.has(u)) outside.set(u, new Set());
      outside.get(u).add(here);
      continue;
    }
    const [beforeHash, frag] = link.split('#');
    const pathPart = beforeHash.split('?')[0];
    const target = pathPart
      ? pathPart.startsWith('/')
        ? pathPart
        : posix.join(here.endsWith('/') ? here : posix.dirname(here) + '/', pathPart)
      : here;
    const targetFile = await fileFor(target);
    if (!targetFile) {
      broken.push(`${here}  →  ${link}  (no such page or file)`);
      continue;
    }
    if (frag && targetFile.endsWith('.html')) {
      const targetHtml = await readFile(targetFile, 'utf8');
      if (!isRedirect(targetHtml) && !(await idsOf(targetFile)).has(decodeURIComponent(frag)))
        broken.push(`${here}  →  ${link}  (no element with id "${frag}")`);
    }
  }
}

console.log(
  `Checked ${files.length} HTML files: ${broken.length ? `${broken.length} broken internal link(s)` : 'all internal links and anchors resolve'}.`,
);
for (const b of broken) console.log(`  ✖ ${b}`);
if (broken.length) process.exitCode = 1;

if (external) {
  const urls = [...outside.keys()].sort();
  const gone = [];
  const down = [];
  const refused = [];
  const request = async (url, method) =>
    fetch(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: { 'user-agent': 'OWL-ML website link check (CI)' },
    });
  const checkOne = async (url) => {
    try {
      let r = await request(url, 'HEAD');
      if (r.status >= 400) r = await request(url, 'GET');
      if (r.status === 404 || r.status === 410) gone.push(`${r.status}  ${url}`);
      else if (r.status >= 500) down.push(`${r.status}  ${url}`);
      else if (r.status >= 400) refused.push(`${r.status}  ${url}`);
    } catch (e) {
      const code = e.cause?.code ?? e.name;
      // ENOTFOUND: the domain no longer exists
      (code === 'ENOTFOUND' ? gone : down).push(`${code}  ${url}`);
    }
  };
  for (let i = 0; i < urls.length; i += 8) await Promise.all(urls.slice(i, i + 8).map(checkOne));
  const where = (line) => [...outside.get(line.split(/\s+/).at(-1))].slice(0, 3).join(', ');
  console.log(
    `Checked ${urls.length} external URLs: ${gone.length} gone, ${down.length} not reachable right now, ${refused.length} refused automated requests.`,
  );
  for (const g of gone) console.log(`  ✖ ${g}   (on ${where(g)})`);
  for (const d of down) console.log(`  ~ ${d}   (on ${where(d)})`);
  for (const w of refused) console.log(`  ! ${w}   (on ${where(w)})`);
  if (gone.length) process.exitCode = 1;
}
