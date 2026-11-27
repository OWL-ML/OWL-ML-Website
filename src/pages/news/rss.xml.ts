import type { APIRoute } from 'astro';
import { getNews } from '../../lib/data';
import { newsTarget } from '../../lib/news';
import { site } from '../../lib/site';

// RSS 2.0 feed of all news items, written by hand (no extra dependency).
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site: base }) => {
  const abs = (path: string) => new URL(path, base).href;
  const items = (await getNews()).map((n) => {
    const target = newsTarget(n);
    const link = abs(target?.href ?? `/news/#${n.id}`);
    const description = n.body?.trim() ? n.body.trim().split(/\n\s*\n/)[0]! : n.data.title;
    return `    <item>
      <title>${esc(n.data.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(abs(`/news/${n.id}`))}</guid>
      <pubDate>${new Date(`${n.data.date}T12:00:00Z`).toUTCString()}</pubDate>
      <category>${n.data.type}</category>
      <description>${esc(description)}</description>
    </item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`${site.short} news`)}</title>
    <link>${abs('/news/')}</link>
    <atom:link href="${abs('/news/rss.xml')}" rel="self" type="application/rss+xml" />
    <description>Papers, people, projects and opportunities from the ${esc(site.name)}.</description>
    <language>en</language>
${items.join('\n')}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
