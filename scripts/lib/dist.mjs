// Shared by the checks that run against the built site (a11y, interactions, screenshots, links):
// a tiny static server for dist/ and the list of its pages.
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';

export const DIST = 'dist';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Serves dist/ on a free port (unknown paths get 404.html with status 404). With `compress`, text
 * files are gzipped as any real web host does, so performance measurements are realistic.
 */
export async function serveDist({ compress = false } = {}) {
  const server = createServer(async (req, res) => {
    let file = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      await stat(file);
    } catch {
      file = join(DIST, '404.html');
      res.statusCode = 404;
    }
    try {
      const type = TYPES[extname(file)] || 'application/octet-stream';
      res.setHeader('content-type', type);
      let body = await readFile(file);
      if (compress && /text|javascript|json|svg|xml/.test(type)) {
        body = gzipSync(body);
        res.setHeader('content-encoding', 'gzip');
      }
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, close: () => new Promise((r) => server.close(r)) };
}

/** True for the small pages that only redirect an old address (src/data/redirects.yml). */
export const isRedirect = (html) => html.includes('http-equiv="refresh"');

/** Every page of the built site as a path like /people/mundt/, without the redirect pages. */
export async function pages(dir = DIST) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await pages(p)));
    else if (e.name === 'index.html' && !isRedirect(await readFile(p, 'utf8'))) {
      const rel = relative(DIST, dir).replace(/\\/g, '/');
      out.push(rel ? `/${rel}/` : '/');
    }
  }
  return out.sort();
}
