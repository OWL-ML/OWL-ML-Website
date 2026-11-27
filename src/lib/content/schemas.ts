// Zod schemas for every content file (docs/CONTENT_MODEL.md). Shared by the Astro collections
// (src/content.config.ts) and the standalone validator (validate.ts), so both apply the same rules.
// Cross-references between files (unknown ids, members in author lists, ...) are checked in
// validate.ts, which sees all files at once.
import { z } from 'astro/zod';

/** Lowercase ASCII with hyphens: mundt, storch, vale-sousa */
export const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Values in square brackets are visible placeholders for unknown facts, e.g. "[Room]" */
export const PLACEHOLDER = /^\[[^\]]*\]$/;

export const id = z.string().regex(ID, 'must be lowercase ASCII with hyphens, e.g. "vale-sousa"');
export const placeholder = z.string().regex(PLACEHOLDER);

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'is not a real date');
/** YYYY-MM-DD. YAML parsers may hand over a Date; it is normalised to the ISO string. */
export const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  isoDateString,
);
/** YYYY-MM */
export const yearMonth = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 7) : v),
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM'),
);
/** YYYY, for dates known only to the year. YAML hands over a number. */
export const year = z.preprocess(
  (v) => (typeof v === 'number' ? String(v) : v),
  z.string().regex(/^\d{4}$/, 'must be YYYY'),
);
const url = z.url({ protocol: /^https?$/, error: 'must be a full http(s) URL' });
/** A URL, or a visible placeholder like "[Stud.IP link]" */
const urlOrPlaceholder = z.union([url, placeholder]);
const optional = <T extends z.ZodType>(s: T) =>
  z.preprocess((v) => (v === null || v === '' ? undefined : v), s.optional());

/** `review: themes` or `review: [themes, authors]` → ['themes', ...] */
export const reviewKinds = ['themes', 'authors', 'facts'] as const;
export const review = optional(
  z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()) : v),
    z.array(z.enum(reviewKinds)),
  ),
);

export const themeSchema = z.object({
  id,
  name: z.string().min(1),
  short: z.string().min(1),
  oneliner: z.string().min(1),
  description: z.string().min(1),
  map: z.object({ x: z.number().min(0).max(1000) }),
});

export const groups = ['lead', 'postdoc', 'phd', 'staff', 'student-assistant', 'visiting'] as const;

export const personSchema = z
  .object({
    name: z.string().min(1),
    honorific: optional(z.string()),
    /** as the person wants them shown, e.g. "she/her" */
    pronouns: optional(z.string().max(30)),
    role: z.string().min(1),
    group: z.enum(groups),
    status: z.enum(['current', 'alumni']),
    since: optional(yearMonth),
    until: optional(yearMonth),
    /** based at another institution: listed after the lab's own members of the group */
    external: optional(z.boolean()),
    photo: optional(
      z
        .string()
        .regex(/^[a-z0-9-]+\.(jpe?g|png|webp|avif)$/, 'must be a file name like "mundt.jpg"'),
    ),
    email: optional(z.union([z.email(), placeholder])),
    office: optional(z.string()),
    office_hours: optional(z.string()),
    /** staff: what to contact them about (their profile shows this instead of publications) */
    contact_for: optional(z.array(z.string().min(1))).transform((v) => v ?? []),
    links: optional(
      z.object({
        scholar: optional(urlOrPlaceholder),
        orcid: optional(urlOrPlaceholder),
        github: optional(urlOrPlaceholder),
        linkedin: optional(urlOrPlaceholder),
        website: optional(urlOrPlaceholder),
      }),
    ),
    ids: optional(
      z.object({ semantic_scholar: optional(z.string()), orcid: optional(z.string()) }),
    ),
    themes: optional(z.array(id)).transform((v) => v ?? []),
    teaching: optional(z.array(id)).transform((v) => v ?? []),
    review,
    migrated_from: optional(url),
  })
  .refine((p) => !(p.status === 'alumni' && !p.until), {
    message: 'alumni need `until` (YYYY-MM)',
    path: ['until'],
  });

export const semesters = ['winter', 'summer', 'both', 'any'] as const;
export const degrees = ['BSc', 'MSc', 'BSc / MSc'] as const;
export const stages = ['foundations', 'methods', 'perspectives', 'research'] as const;
export const centrepieces = ['dimensions', 'showcase', 'theses'] as const;

export const courseSchema = z
  .object({
    id,
    name: z.string().min(1),
    /** English name, shown under a name in another language */
    name_en: optional(z.string().min(1)),
    kind: z.string().min(1),
    level: z.string().min(1),
    /** short label in the course path */
    degree: optional(z.enum(degrees)),
    /** teaching language */
    language: optional(z.enum(['en', 'de'])),
    semester: z.enum(semesters),
    stage: z.enum(stages),
    description: z.string().min(1),
    next: optional(z.array(id)).transform((v) => v ?? []),
    /** courses taken alongside or in alternation with this one; listing one side is enough */
    pairs: optional(z.array(id)).transform((v) => v ?? []),
    themes: optional(z.array(id)).transform((v) => v ?? []),
    /** demo slug(s) from src/demos/registry.ts; the first is shown in "Try it" */
    demo: optional(z.union([id, z.array(id).min(1)])).transform((v) =>
      v === undefined ? [] : Array.isArray(v) ? v : [v],
    ),
    centrepiece: optional(z.enum(centrepieces)),
    /** seminars: the guiding questions the readings are chosen around (no papers, no terms) */
    dimensions: optional(
      z.array(
        z.object({
          name: z.string().min(1),
          questions: z.string().min(1),
          /** theme id: the card links to the publications in this theme */
          theme: optional(id),
          /** words after "Our work on" in that link, where the theme's name is too long */
          link_label: optional(z.string().min(1)),
        }),
      ),
    ).transform((v) => v ?? []),
    studip: optional(urlOrPlaceholder),
    /** links shown under "Materials" in the course panel: slides, notebooks, ... */
    materials: optional(
      z.array(z.object({ title: z.string().min(1), url: urlOrPlaceholder })),
    ).transform((v) => v ?? []),
    offerings: optional(
      z.never({
        error:
          'times, rooms and dates are not published on the website (they belong on Stud.IP); `semester` says when the course is taught',
      }),
    ),
  })
  .refine((c) => !(c.demo.length > 0 && c.centrepiece), {
    message: 'a course has either `demo` or `centrepiece`, not both',
    path: ['centrepiece'],
  })
  .refine((c) => c.dimensions.length === 0 || c.demo.length > 0 || c.centrepiece === 'dimensions', {
    message: '`dimensions` are shown with a `demo` or with `centrepiece: dimensions`',
    path: ['dimensions'],
  });

export const thesisSchema = z.object({
  student: z.string().min(1),
  title: z.string().min(1),
  degree: z.enum(['BSc', 'MSc']),
  status: z.enum(['ongoing', 'completed']),
  date: optional(z.union([yearMonth, year, placeholder])),
  institution: z.string().min(1),
  note: optional(z.string()),
  themes: optional(z.array(id)).transform((v) => v ?? []),
  /** supervised before the lab moved to Bremen: listed on /theses/archive/ only */
  archive: optional(z.boolean()).transform((v) => v ?? false),
  review,
});

export const internshipsSchema = z.object({
  policy: z.object({ offer: z.array(z.string()), cannot_offer: z.array(z.string()) }),
  interns: z.array(
    z.object({
      name: z.string(),
      /** a year, or two for a stay across the turn of the year: "2026/27" */
      year: z.union([z.number().int(), z.string().regex(/^\d{4}\/\d{2}$/, 'like "2026/27"')]),
      from: z.string(),
      /** left out while not known */
      topic: optional(z.string()),
    }),
  ),
});

export const talkSchema = z.object({
  date: isoDate,
  title: z.string().min(1),
  event: z.string().min(1),
  location: optional(z.string()),
  speakers: z.array(id).min(1, 'list at least one speaker id'),
  themes: optional(z.array(id)).transform((v) => v ?? []),
  kind: z.enum(['talk', 'poster', 'keynote', 'lecture']),
  slides: optional(url),
  video: optional(
    z.object({
      youtube: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'must be the 11-character YouTube video id'),
      duration: optional(z.string().regex(/^(\d+:)?\d{1,2}:\d{2}$/, 'must look like 42:10')),
    }),
  ),
  thumbnail: optional(z.string()),
  review,
});

export const newsTypes = ['paper', 'award', 'people', 'funding', 'opportunity', 'event'] as const;

export const newsSchema = z
  .object({
    date: isoDate,
    type: z.enum(newsTypes),
    title: z.string().min(1),
    paper: optional(z.string()),
    people: optional(z.array(id)).transform((v) => v ?? []),
    /** external URL, or a path on this site such as /theses/#internships */
    link: optional(
      z.union([url, z.string().regex(/^\/[^\s]*$/, 'must be a URL or a path starting with /')]),
    ),
    deadline: optional(isoDate),
    review,
    /** address of the post on the old WordPress site */
    migrated_from: optional(url),
  })
  .refine((n) => n.type === 'opportunity' || !n.deadline, {
    message: '`deadline` is only used for opportunities',
    path: ['deadline'],
  });

export const showcaseSchema = z.object({
  course: id,
  term: z.string(),
  title: z.string().min(1),
  image: optional(z.string()),
  video: optional(z.object({ youtube: z.string() })),
  links: optional(z.array(z.object({ title: z.string(), url }))).transform((v) => v ?? []),
  credit: optional(z.string()),
  consent: z.literal(true, {
    error: 'showcase entries need `consent: true` (the students agreed to be shown)',
  }),
});

/** Larger research projects the lab is part of (homepage, "Projects"). No member lists. */
export const projectSchema = z
  .object({
    id,
    name: z.string().min(1),
    /** what kind of project, e.g. "DFG Research Training Group" */
    kind: z.string().min(1),
    /** first and last year of the lab's participation, shown as "2026–2030" */
    start: z.number().int().min(2000).max(2100),
    end: z.number().int().min(2000).max(2100),
    /** one or two sentences on the research focus */
    summary: z.string().min(1),
    url,
    /** file name in src/assets/projects/, used as supplied by the project */
    logo: z.string().min(1),
  })
  .refine((p) => p.end >= p.start, { error: '`end` must not be before `start`', path: ['end'] });

export const siteSchema = z.object({
  name: z.string(),
  short: z.string(),
  university: z.string(),
  faculty: z.string(),
  faculty_url: url,
  address: z.string(),
  contact_email: z.string(),
  news_archive_before: optional(isoDate),
  github_url: z.string(),
  /** the lab's Zenodo community (lecture slides); the Teaching page shows it once set */
  zenodo_url: optional(z.string()),
  eyebrow: z.string(),
  headline_prefix: z.string(),
  tagline_words: z.array(z.string()).min(1),
  mission: z.string(),
  hero_figure: z.string(),
  story: z.string(),
  /** sentence after `story` where the research map follows (homepage) */
  story_map: z.string(),
  pillars: z
    .array(z.object({ label: z.string(), heading: z.string(), text: z.string() }))
    .length(3),
});

export const noteTypes = ['position', 'workshop', 'preprint', 'journal'] as const;

/** A publication after BibTeX parsing (see bib.ts). */
export const publicationSchema = z.object({
  key: z.string(),
  type: z.string(),
  title: z.string().min(1),
  authors: z.array(
    z.object({
      first: z.string(),
      last: z.string(),
      prefix: optional(z.string()),
      suffix: optional(z.string()),
      literal: optional(z.string()),
    }),
  ),
  year: z.number().int().min(1950).max(2100),
  month: optional(z.number().int().min(1).max(12)),
  venue: z.string(),
  venue_short: z.string(),
  members: z.array(id),
  themes: z.array(id),
  award: optional(z.string()),
  note_type: optional(z.enum(noteTypes)),
  featured: z.boolean(),
  /** landing page of the paper (publisher, OpenReview, arXiv abstract) */
  url: optional(url),
  pdf: optional(url),
  code: optional(url),
  project: optional(url),
  slides: optional(url),
  video: optional(url),
  arxiv: optional(
    z
      .string()
      .regex(/^(\d{4}\.\d{4,5}|[a-z-]+\/\d{7})(v\d+)?$/, 'must be an arXiv id like 2610.01234'),
  ),
  doi: optional(z.string().regex(/^10\.\d{4,9}\/\S+$/, 'must be a DOI like 10.1000/xyz')),
  thumbnail: optional(z.string()),
  /** further links, from `links = {Label=URL; Label=URL}` */
  links: z.array(z.object({ label: z.string().min(1), url })),
  /** shown under the authors, e.g. equal contribution */
  note: optional(z.string()),
  review,
  /** Standard BibTeX of this entry without the site's custom fields (for "BibTeX" links) */
  bibtex: z.string(),
});

export type Theme = z.infer<typeof themeSchema>;
export type Person = z.infer<typeof personSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Thesis = z.infer<typeof thesisSchema>;
export type Talk = z.infer<typeof talkSchema>;
export type News = z.infer<typeof newsSchema>;
export type Publication = z.infer<typeof publicationSchema>;
export type Site = z.infer<typeof siteSchema>;
export type Internships = z.infer<typeof internshipsSchema>;
export type Project = z.infer<typeof projectSchema>;
