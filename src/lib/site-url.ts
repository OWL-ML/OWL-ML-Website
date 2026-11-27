// The site's public address: canonical links, the sitemap, share images and the check that tells
// this site's own links from external ones all use it. Change it here when the site moves
// (docs/DEPLOYMENT.md). A build can override it with the environment variable SITE_URL, e.g. to
// try the site at a test address.
export const DEFAULT_SITE_URL = 'https://owl-ml.com';

export const siteUrl = (): string => process.env.SITE_URL || DEFAULT_SITE_URL;
