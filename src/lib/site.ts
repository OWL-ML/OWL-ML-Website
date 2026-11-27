import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'astro/zod';
import { siteSchema } from './content/schemas';

// site.yml is a single object (not a list of entries), so it is read and validated here
// instead of through a content collection.
export type Site = z.infer<typeof siteSchema>;

function load(): Site {
  const raw = parse(readFileSync('src/data/site.yml', 'utf8'));
  const result = siteSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`src/data/site.yml is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const site = load();

/** e.g. "[lab email]" while unknown */
export const contactEmail = /^[^\s@[]+@[^\s@]+$/.test(site.contact_email)
  ? site.contact_email
  : null;

/** the lab's GitHub organisation (footer), or null while site.yml still holds a placeholder */
export const githubUrl = /^https:\/\//.test(site.github_url) ? site.github_url : null;
