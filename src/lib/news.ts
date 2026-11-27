import type { CollectionEntry } from 'astro:content';
import { today } from './format';
import { isArchivedNews } from './data';

export type NewsEntry = CollectionEntry<'news'>;

export const typeLabel: Record<NewsEntry['data']['type'], string> = {
  paper: 'Paper',
  award: 'Award',
  people: 'Welcome',
  funding: 'Funding',
  opportunity: 'Opportunity',
  event: 'Event',
};

/** Filter groups on the news page (docs/DESIGN.md); events appear under "Everything" only. */
export const newsFilters = [
  { id: 'all', label: 'Everything', types: [] as string[] },
  { id: 'papers', label: 'Papers & awards', types: ['paper', 'award'] },
  { id: 'people', label: 'People', types: ['people'] },
  { id: 'funding', label: 'Funding & projects', types: ['funding'] },
  { id: 'opportunities', label: 'Opportunities', types: ['opportunity'] },
];

export const hasBody = (n: NewsEntry) => Boolean(n.body?.trim());

/**
 * Where an item sits in the lists: news items have no pages of their own; the text of an item
 * with a body opens in place ("Read more") on the news page or, for archived items, the archive.
 */
export const newsAnchor = (n: NewsEntry) =>
  `${isArchivedNews(n) ? '/news/archive/' : '/news/'}#${n.id}`;

/** What an item is about (the paper, the profile, the link), or null. */
export function subjectLink(n: NewsEntry): { href: string; label: string } | null {
  const d = n.data;
  if (d.paper) return { href: `/publications/#${d.paper}`, label: 'Paper' };
  if (d.people.length === 1) return { href: `/people/${d.people[0]}/`, label: 'Profile' };
  if (d.link) {
    if (d.link.startsWith('/theses/#internships')) return { href: d.link, label: 'Internships' };
    if (d.type === 'funding') return { href: d.link, label: 'About the project' };
    if (d.type === 'opportunity') return { href: d.link, label: 'Details' };
    return { href: d.link, label: 'More' };
  }
  return null;
}

/**
 * Where a news item leads from elsewhere (homepage, profiles, RSS): to its text in the news list
 * if it has a body, otherwise straight to what it is about. Null when there is nowhere to go.
 */
export function newsTarget(n: NewsEntry): { href: string; label: string } | null {
  return hasBody(n) ? { href: newsAnchor(n), label: 'Read more' } : subjectLink(n);
}

/** Opportunities are "Closed" once their deadline has passed (checked when the site is built). */
export const isClosed = (n: NewsEntry) =>
  n.data.type === 'opportunity' && !!n.data.deadline && n.data.deadline < today();
