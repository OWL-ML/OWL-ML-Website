// Reads every content file from disk without Astro, so the same checks run in `astro build`,
// in `npm run check`, in `npm run review` and in unit tests (which point `root` at fixtures).
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'astro/zod';
import {
  themeSchema,
  personSchema,
  courseSchema,
  thesisSchema,
  internshipsSchema,
  talkSchema,
  newsSchema,
  showcaseSchema,
  siteSchema,
  projectSchema,
  ID,
  type Publication,
} from './schemas.ts';
import { parseBib } from './bib.ts';

export interface Problem {
  file: string;
  message: string;
}

export interface Entry<T> {
  id: string;
  file: string;
  data: T;
  body?: string;
  /** raw (unvalidated) data, for reporting review markers even on invalid entries */
  raw: Record<string, unknown>;
}

export interface Loaded {
  root: string;
  themes: Entry<z.infer<typeof themeSchema>>[];
  people: Entry<z.infer<typeof personSchema>>[];
  courses: Entry<z.infer<typeof courseSchema>>[];
  theses: Entry<z.infer<typeof thesisSchema>>[];
  internships?: z.infer<typeof internshipsSchema>;
  site?: z.infer<typeof siteSchema>;
  talks: Entry<z.infer<typeof talkSchema>>[];
  news: Entry<z.infer<typeof newsSchema>>[];
  showcase: Entry<z.infer<typeof showcaseSchema>>[];
  projects: Entry<z.infer<typeof projectSchema>>[];
  publications: Entry<Publication>[];
  photos: Set<string>;
  paperImages: Set<string>;
  projectLogos: Set<string>;
  problems: Problem[];
}

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Stable id of a thesis entry (theses.yml has no id field). */
export const thesisId = (t: { student?: unknown; degree?: unknown }) =>
  slug(`${String(t.student ?? '')}-${String(t.degree ?? '')}`);

export function splitFrontmatter(text: string): { data: unknown; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  return { data: parseYaml(m[1] ?? '') ?? {}, body: (m[2] ?? '').trim() };
}

function issues(file: string, error: z.ZodError, prefix = ''): Problem[] {
  return error.issues.map((i) => ({
    file,
    message: `${prefix}${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`,
  }));
}

async function readOptional(path: string): Promise<string | undefined> {
  return existsSync(path) ? readFile(path, 'utf8') : undefined;
}

async function listMarkdown(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  return (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
}

export async function loadContent(root = process.cwd()): Promise<Loaded> {
  const problems: Problem[] = [];
  const rel = (p: string) => relative(root, p);
  const data = join(root, 'src/data');
  const content = join(root, 'src/content');

  async function yamlList<S extends z.ZodType>(
    name: string,
    schema: S,
    idOf: (item: Record<string, unknown>) => string,
  ): Promise<Entry<z.infer<S>>[]> {
    const path = join(data, name);
    const text = await readOptional(path);
    if (text === undefined) {
      problems.push({ file: rel(path), message: 'file is missing' });
      return [];
    }
    let raw: unknown;
    try {
      raw = parseYaml(text);
    } catch (e) {
      problems.push({ file: rel(path), message: `YAML syntax: ${(e as Error).message}` });
      return [];
    }
    if (!Array.isArray(raw)) {
      problems.push({ file: rel(path), message: 'must be a YAML list' });
      return [];
    }
    const out: Entry<z.infer<S>>[] = [];
    raw.forEach((item: Record<string, unknown>, index: number) => {
      const id = idOf(item);
      const where = `entry ${index + 1}${id ? ` ("${id}")` : ''}: `;
      const result = schema.safeParse(item);
      if (!result.success) problems.push(...issues(rel(path), result.error, where));
      else out.push({ id, file: rel(path), data: result.data, raw: item });
    });
    return out;
  }

  async function yamlObject<S extends z.ZodType>(name: string, schema: S) {
    const path = join(data, name);
    const text = await readOptional(path);
    if (text === undefined) {
      problems.push({ file: rel(path), message: 'file is missing' });
      return undefined;
    }
    const result = schema.safeParse(parseYaml(text));
    if (!result.success) {
      problems.push(...issues(rel(path), result.error));
      return undefined;
    }
    return result.data as z.infer<S>;
  }

  async function markdown<S extends z.ZodType>(
    dir: string,
    schema: S,
  ): Promise<Entry<z.infer<S>>[]> {
    const full = join(content, dir);
    const out: Entry<z.infer<S>>[] = [];
    for (const name of await listMarkdown(full)) {
      const path = join(full, name);
      const id = name.replace(/\.md$/, '');
      if (!ID.test(id)) {
        problems.push({
          file: rel(path),
          message: 'file name must be lowercase ASCII with hyphens',
        });
      }
      let fm: { data: unknown; body: string };
      try {
        fm = splitFrontmatter(await readFile(path, 'utf8'));
      } catch (e) {
        problems.push({ file: rel(path), message: `YAML syntax: ${(e as Error).message}` });
        continue;
      }
      const result = schema.safeParse(fm.data);
      if (!result.success) problems.push(...issues(rel(path), result.error));
      else
        out.push({
          id,
          file: rel(path),
          data: result.data,
          body: fm.body,
          raw: fm.data as Record<string, unknown>,
        });
    }
    return out;
  }

  const themes = await yamlList('themes.yml', themeSchema, (t) => String(t.id ?? ''));
  const courses = await yamlList('courses.yml', courseSchema, (c) => String(c.id ?? ''));
  const theses = await yamlList('theses.yml', thesisSchema, thesisId);
  const projects = await yamlList('projects.yml', projectSchema, (p) => String(p.id ?? ''));
  const internships = await yamlObject('internships.yml', internshipsSchema);
  const site = await yamlObject('site.yml', siteSchema);
  const people = await markdown('people', personSchema);
  const talks = await markdown('talks', talkSchema);
  const news = await markdown('news', newsSchema);
  const showcase = await markdown('teaching/showcase', showcaseSchema);

  const bibPath = join(data, 'publications.bib');
  const bibText = (await readOptional(bibPath)) ?? '';
  const bib = parseBib(bibText);
  for (const p of bib.problems) {
    problems.push({ file: rel(bibPath), message: p.key ? `${p.key}: ${p.message}` : p.message });
  }
  const publications = bib.publications.map((p) => ({
    id: p.key,
    file: rel(bibPath),
    data: p,
    raw: p as unknown as Record<string, unknown>,
  }));

  const photoDir = join(root, 'src/assets/people');
  const photos = new Set(existsSync(photoDir) ? await readdir(photoDir) : []);
  const paperDir = join(root, 'src/assets/papers');
  const paperImages = new Set(existsSync(paperDir) ? await readdir(paperDir) : []);
  const logoDir = join(root, 'src/assets/projects');
  const projectLogos = new Set(existsSync(logoDir) ? await readdir(logoDir) : []);

  return {
    root,
    themes,
    people,
    courses,
    theses,
    internships,
    site,
    talks,
    news,
    showcase,
    projects,
    publications,
    photos,
    paperImages,
    projectLogos,
    problems,
  };
}
