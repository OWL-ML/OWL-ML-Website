import type { AstroIntegration } from 'astro';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * After the build, writes sitemap.xml (every page search engines should list) and robots.txt.
 * Left out: pages marked noindex (the 404 page) and the small pages that only redirect an old
 * address. Small enough not to need a package.
 */
export function sitemapAndRobots(): AstroIntegration {
  let site = '';
  return {
    name: 'owl-sitemap',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = (config.site ?? '').replace(/\/$/, '');
      },
      'astro:build:done': ({ dir, pages, logger }) => {
        const root = fileURLToPath(dir);
        const urls: string[] = [];
        for (const { pathname } of pages) {
          const file = join(root, pathname, 'index.html');
          if (!existsSync(file)) continue; // endpoints such as /og/*.png or /news/rss.xml
          const html = readFileSync(file, 'utf8');
          if (
            html.includes('http-equiv="refresh"') ||
            html.includes('name="robots" content="noindex"')
          )
            continue;
          urls.push(`${site}/${pathname}`.replace(/\/?$/, '/'));
        }
        urls.sort();
        writeFileSync(
          join(root, 'sitemap.xml'),
          '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            urls.map((u) => `  <url><loc>${u}</loc></url>\n`).join('') +
            '</urlset>\n',
        );
        writeFileSync(
          join(root, 'robots.txt'),
          `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`,
        );
        logger.info(`sitemap.xml with ${urls.length} pages and robots.txt written`);
      },
    },
  };
}
