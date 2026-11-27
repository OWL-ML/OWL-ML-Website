import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { AstroIntegration } from 'astro';

// Redirects from the old WordPress site (src/data/redirects.yml). They work on any host:
// Astro writes a small redirect page for every old path (meta refresh + canonical link), and an
// .htaccess file gives real 301 redirects on Apache (university hosting).

export interface Redirect {
  from: string;
  to: string;
}

export function loadRedirects(path = 'src/data/redirects.yml'): Redirect[] {
  const list = (parse(readFileSync(path, 'utf8')) ?? []) as Redirect[];
  for (const r of list) {
    if (!r.from?.startsWith('/') || !r.to?.startsWith('/'))
      throw new Error(`${path}: redirects need paths starting with "/" (got ${JSON.stringify(r)})`);
  }
  return list.map((r) => ({ ...r, to: newsItem(r.to) }));
}

/**
 * News items have no pages of their own: "/news/<date>-<slug>/" in redirects.yml means the item
 * in the list, /news/#<id>, or /news/archive/#<id> for news before `news_archive_before`.
 */
function newsItem(to: string): string {
  const m = to.match(/^\/news\/((\d{4}-\d{2}-\d{2})-[^/]+)\/$/);
  if (!m) return to;
  const site = parse(readFileSync('src/data/site.yml', 'utf8')) as { news_archive_before?: string };
  const archived = !!site.news_archive_before && m[2]! < String(site.news_archive_before);
  return `${archived ? '/news/archive/' : '/news/'}#${m[1]}`;
}

/** Rules that are patterns rather than single pages. */
const PATTERNS = [
  ['^/wp-content/uploads/.+\\.pdf$', '/teaching/'],
  ['^/wp-content/.*$', '/'],
  ['^/wp-admin/?.*$', '/'],
  ['^/author/.*$', '/people/'],
  ['^/category/.*$', '/news/'],
  ['^/(\\d{4})/(\\d{2})/?$', '/news/'],
] as const;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function htaccess(redirects: Redirect[]): string {
  const lines = [
    '# Generated from src/data/redirects.yml at build time. Do not edit by hand.',
    'ErrorDocument 404 /404.html',
    'RewriteEngine On',
  ];
  for (const r of redirects) {
    if (r.from === r.to) continue;
    const q = r.from.match(/^\/\?(.+)$/);
    if (q) {
      lines.push(`RewriteCond %{QUERY_STRING} ^${escape(q[1]!)}$`);
      lines.push(`RewriteRule ^$ ${r.to} [R=301,L,NE,QSD]`);
    } else {
      const path = r.from.replace(/\/$/, '');
      lines.push(`RedirectMatch 301 ^${escape(path)}/?$ ${r.to}`);
    }
  }
  for (const [pattern, to] of PATTERNS) lines.push(`RedirectMatch 301 ${pattern} ${to}`);
  return lines.join('\n') + '\n';
}

export function oldSiteRedirects(): AstroIntegration {
  const list = loadRedirects();
  return {
    name: 'owl-redirects',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        // Only plain paths become redirect pages; identical paths are real pages on the new site,
        // and query strings (/?p=123) can only be handled by the server (.htaccess).
        const redirects = Object.fromEntries(
          list.filter((r) => r.from !== r.to && !r.from.includes('?')).map((r) => [r.from, r.to]),
        );
        updateConfig({ redirects });
      },
      'astro:build:done': ({ dir, logger }) => {
        writeFileSync(join(fileURLToPath(dir), '.htaccess'), htaccess(list));
        logger.info(`.htaccess with ${list.length} redirects written`);
      },
    },
  };
}
