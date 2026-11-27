// Runs for every page, when the static site is built and in `npm run dev`.
// Links to other sites open in a new tab: see src/lib/external-links.ts.
import { defineMiddleware } from 'astro:middleware';
import { markExternalLinks } from './lib/external-links';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const siteHost = context.site?.hostname ?? context.url.hostname;
  const html = markExternalLinks(await response.text(), siteHost);
  return new Response(html, { status: response.status, headers: response.headers });
});
