// The site's public address: canonical links, the sitemap, share images and the check that tells
// this site's own links from external ones all use it. Change it here when the site moves
// (docs/DEPLOYMENT.md). A build can override it with the environment variable SITE_URL; the deploy
// workflow sets it to the custom domain in the GitHub Pages settings.
export const DEFAULT_SITE_URL = 'https://owl-ml.com';

export const siteUrl = (): string => process.env.SITE_URL || DEFAULT_SITE_URL;
