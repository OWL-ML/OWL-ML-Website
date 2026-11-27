// BibTeX → publications. Parsing is done by @retorquere/bibtex-parser (the parser behind
// Better BibTeX for Zotero); this file only maps its output onto the site's fields
// (docs/CONTENT_MODEL.md) and renders author names.
import { parse, parseVerbatim } from '@retorquere/bibtex-parser';
import { publicationSchema, type Publication } from './schemas.ts';

export interface BibProblem {
  key?: string;
  message: string;
}

/** Fields that belong to the site, not to BibTeX; they are dropped from exported BibTeX. */
const CUSTOM_FIELDS = new Set([
  'members',
  'themes',
  'venue_short',
  'award',
  'note_type',
  'featured',
  'pdf',
  'code',
  'project',
  'slides',
  'video',
  'arxiv',
  'thumbnail',
  'review',
  'links',
]);
const EXPORT_ORDER = [
  'title',
  'author',
  'editor',
  'booktitle',
  'journal',
  'series',
  'volume',
  'number',
  'pages',
  'year',
  'month',
  'publisher',
  'organization',
  'school',
  'institution',
  'address',
  'howpublished',
  'note',
  'doi',
  'url',
  'eprint',
  'archiveprefix',
  'primaryclass',
];

const list = (v: unknown): string[] =>
  typeof v === 'string'
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

/** "International Conference on Learning Representations (ICLR)" + 2022 → "ICLR 2022" */
export function deriveVenueShort(venue: string, year: number, type: string): string {
  const abbr = venue.match(/\(([A-Za-z][A-Za-z0-9&-]{1,15})\)\s*$/)?.[1];
  if (abbr) return `${abbr} ${year}`;
  if (type === 'article') return venue; // journals: the name itself (e.g. "Neural Networks")
  return venue.length <= 24 ? `${venue} ${year}` : venue;
}

function exportBibtex(type: string, key: string, fields: Record<string, string>): string {
  const keys = Object.keys(fields).filter((k) => !CUSTOM_FIELDS.has(k) && fields[k] !== '');
  keys.sort((a, b) => {
    const ia = EXPORT_ORDER.indexOf(a);
    const ib = EXPORT_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const width = Math.max(...keys.map((k) => k.length), 0);
  const body = keys.map((k) => `  ${k.padEnd(width)} = {${fields[k]}},`).join('\n');
  return `@${type}{${key},\n${body}\n}`;
}

/** `links = {Dataset=https://...; Simulator=https://...}` → [{ label, url }] */
function parseLinks(v: string | undefined) {
  if (!v) return [];
  return v
    .split(/;\s*/)
    .filter(Boolean)
    .map((part) => {
      const i = part.indexOf('=');
      return { label: part.slice(0, i).trim(), url: part.slice(i + 1).trim() };
    });
}

export interface ParsedBib {
  publications: Publication[];
  problems: BibProblem[];
}

export function parseBib(source: string): ParsedBib {
  const problems: BibProblem[] = [];
  const parsed = parse(source, { sentenceCase: false, unsupported: 'keep' });
  const verbatim = parseVerbatim(source);
  for (const e of parsed.errors) problems.push({ message: `BibTeX syntax: ${e.error}` });

  const seen = new Set<string>();
  const publications: Publication[] = [];
  parsed.entries.forEach((entry, i) => {
    const key = entry.key;
    if (seen.has(key)) {
      problems.push({ key, message: `duplicate BibTeX key "${key}"` });
      return;
    }
    seen.add(key);
    const f = entry.fields as Record<string, unknown>;
    const raw = (verbatim.entries[i]?.fields ?? {}) as Record<string, string>;
    const year = Number(f.year);
    const venue = String(
      f.booktitle ?? f.journal ?? f.howpublished ?? f.school ?? f.institution ?? f.publisher ?? '',
    );
    const authors = ((f.author as Array<Record<string, string>>) ?? []).map((a) =>
      a.name !== undefined
        ? { first: '', last: a.name, literal: a.name }
        : {
            first: a.firstName ?? '',
            last: a.lastName ?? '',
            prefix: a.prefix,
            suffix: a.suffix,
          },
    );
    const candidate = {
      key,
      type: entry.type,
      title: String(f.title ?? ''),
      authors,
      year,
      month: f.month ? Number(f.month) : undefined,
      venue,
      venue_short:
        typeof f.venue_short === 'string'
          ? f.venue_short
          : deriveVenueShort(venue, year, entry.type),
      members: list(raw.members),
      themes: list(raw.themes),
      award: f.award,
      note_type: f.note_type,
      featured: String(raw.featured ?? '').trim() === 'true',
      url: raw.url,
      pdf: raw.pdf,
      code: raw.code,
      project: raw.project,
      slides: raw.slides,
      video: raw.video,
      arxiv: raw.arxiv,
      doi: raw.doi,
      thumbnail: f.thumbnail,
      links: parseLinks(raw.links),
      note: f.note,
      review: raw.review,
      bibtex: exportBibtex(entry.type, key, raw),
    };
    if (raw.members === undefined) {
      problems.push({
        key,
        message: 'missing required field `members` (lab authors, e.g. {mundt, storch})',
      });
    }
    const result = publicationSchema.safeParse(candidate);
    if (!result.success) {
      for (const issue of result.error.issues) {
        problems.push({ key, message: `${issue.path.join('.') || 'entry'}: ${issue.message}` });
      }
      return;
    }
    if (!venue)
      problems.push({ key, message: 'needs a venue (booktitle, journal or howpublished)' });
    publications.push(result.data);
  });
  return { publications, problems };
}

// ---------------------------------------------------------------------------------------------
// Names

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim();

/** "Jean-Pierre" → "J.-P.", "Martin" → "M.", "J." → "J." */
export function initialsOf(first: string): string {
  return first
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part
        .split('-')
        .map((p) => (p.endsWith('.') && p.length <= 3 ? p : `${p[0]}.`))
        .join('-'),
    )
    .join(' ');
}

export type Author = Publication['authors'][number];

/** "M. Mundt", "J. de la Vale Sousa", or a literal name / placeholder as written */
export function shortName(a: Author): string {
  if (a.literal) return a.literal;
  const family = [a.prefix, a.last].filter(Boolean).join(' ');
  const first = initialsOf(a.first);
  return [first, family, a.suffix].filter(Boolean).join(' ').replace(/ ,/g, ',');
}

/** "Martin Mundt", "Gido M. van de Ven": the name as people write it */
export function fullName(a: Author): string {
  if (a.literal) return a.literal;
  return [a.first, a.prefix, a.last, a.suffix].filter(Boolean).join(' ');
}

/** True if the author list is a single placeholder such as "[Authors]". */
export const authorsUnknown = (p: Pick<Publication, 'authors'>) =>
  p.authors.length === 0 || p.authors.every((a) => a.literal && /^\[.*\]$/.test(a.literal));

/**
 * Finds the author position of a lab member: the author's family name must be the end of the
 * person's name and the first initials must agree ("Mundt, M." matches "Martin Mundt").
 * Returns all matching positions so the caller can reject none or several.
 */
export function matchMember(authors: Author[], personName: string): number[] {
  const tokens = fold(personName).split(/\s+/);
  const firstInitial = tokens[0]?.[0];
  const hits: number[] = [];
  authors.forEach((a, i) => {
    if (a.literal) return;
    const family = fold([a.prefix, a.last].filter(Boolean).join(' ')).split(/\s+/);
    const familyCore = fold(a.last).split(/\s+/);
    const endsWith = (fam: string[]) =>
      fam.length > 0 &&
      fam.length < tokens.length + 1 &&
      fam.join(' ') === tokens.slice(-fam.length).join(' ');
    if (!(endsWith(family) || endsWith(familyCore))) return;
    const aInitial = fold(a.first)[0];
    if (aInitial && firstInitial && aInitial !== firstInitial) return;
    hits.push(i);
  });
  return hits;
}
