// Read helpers for pages and components: sorting rules from docs/CONTENT_MODEL.md live here,
// so every page lists things the same way.
import { getCollection, type CollectionEntry } from 'astro:content';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'astro/zod';
import { groups, internshipsSchema } from './content/schemas';
import { site } from './site';

export type PersonEntry = CollectionEntry<'people'>;
export type PublicationData = CollectionEntry<'publications'>['data'];

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

/**
 * People in listing order: by group (lead, postdoc, phd, staff, student-assistant, visiting);
 * within a group the lab's own members, then `external` ones, then people without `since`;
 * within each of these by the year they joined (`since`), then alphabetically by family name.
 * The id is the family name by convention ("vale-sousa"), so it doubles as that sort key.
 */
export async function getPeople(status?: 'current' | 'alumni'): Promise<PersonEntry[]> {
  const all = await getCollection('people', (p) => !status || p.data.status === status);
  const joined = (p: PersonEntry) => p.data.since?.slice(0, 4) ?? '9999';
  // within a group: the lab's own members, then external ones, then people without `since`
  const tier = (p: PersonEntry) => (!p.data.since ? 2 : p.data.external ? 1 : 0);
  return all.sort(
    (a, b) =>
      groups.indexOf(a.data.group) - groups.indexOf(b.data.group) ||
      tier(a) - tier(b) ||
      joined(a).localeCompare(joined(b)) ||
      a.id.localeCompare(b.id, 'en'),
  );
}

/** Alphabetical by family name (collaborator lists; no ranking of any kind). */
export function alphabetical(people: PersonEntry[]): PersonEntry[] {
  return [...people].sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

let namesCache: Map<string, string> | undefined;
/** person id → display name (without honorific) */
export async function personNames(): Promise<Map<string, string>> {
  namesCache ??= new Map((await getCollection('people')).map((p) => [p.id, p.data.name]));
  return namesCache;
}

/** Newest year first; within a year, file order (add new entries at the top of their year). */
export async function getPublications(): Promise<PublicationData[]> {
  const all = (await getCollection('publications')).sort(byOrder);
  return all.map((e) => e.data).sort((a, b) => b.year - a.year);
}

export async function getCourses() {
  return (await getCollection('courses')).sort(byOrder).map((e) => e.data);
}

export async function getTheses() {
  return (await getCollection('theses')).sort(byOrder).map((e) => ({ id: e.id, ...e.data }));
}

/** Projects in file order (src/data/projects.yml). */
export async function getProjects() {
  return (await getCollection('projects')).sort(byOrder).map((e) => e.data);
}

/** News dated before `news_archive_before` (site.yml) is listed only on /news/archive/. */
export const isArchivedNews = (n: CollectionEntry<'news'>) =>
  Boolean(site.news_archive_before && n.data.date < site.news_archive_before);

async function allNews() {
  return (await getCollection('news')).sort((a, b) => b.data.date.localeCompare(a.data.date));
}

/** Current news, newest first (without the archive). */
export async function getNews() {
  return (await allNews()).filter((n) => !isArchivedNews(n));
}

/** Archived news (before the move to Bremen), newest first. */
export async function getArchivedNews() {
  return (await allNews()).filter(isArchivedNews);
}

/** Newest first. (No talk files yet is normal; skip Astro's "empty collection" warning.) */
export async function getTalks() {
  if (!hasMarkdown('src/content/talks')) return [];
  return (await getCollection('talks')).sort((a, b) => b.data.date.localeCompare(a.data.date));
}

const hasMarkdown = (dir: string) =>
  existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.md'));

export type Internships = z.infer<typeof internshipsSchema>;
export const internships: Internships = internshipsSchema.parse(
  parse(readFileSync('src/data/internships.yml', 'utf8')),
);

/** Group items into [label, items][] keeping first-seen order of labels. */
export function groupBy<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const it of items) map.set(key(it), [...(map.get(key(it)) ?? []), it]);
  return [...map.entries()];
}
