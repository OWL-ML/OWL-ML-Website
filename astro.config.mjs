// @ts-check
import { defineConfig } from 'astro/config';
import { contentValidation } from './src/lib/content/integration.ts';
import { oldSiteRedirects } from './src/lib/redirects.ts';
import { fonts } from './src/lib/fonts.ts';
import { sitemapAndRobots } from './src/lib/sitemap.ts';
import { siteUrl } from './src/lib/site-url.ts';

// The public address is set in src/lib/site-url.ts (a build may override it with SITE_URL).
const site = siteUrl();

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  // No telemetry or third-party requests from the dev toolbar.
  devToolbar: { enabled: false },
  integrations: [contentValidation(), oldSiteRedirects(), sitemapAndRobots()],
  fonts,
  // Images in Markdown (news posts) get several sizes; components set their own sizes and formats
  // (AVIF with WebP fallback). Our CSS styles the images, so Astro adds no global styles.
  image: { layout: 'constrained', responsiveStyles: false },
});
