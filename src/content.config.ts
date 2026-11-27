// Content collections. Field rules come from src/lib/content/schemas.ts (shared with the
// standalone validator); references between files are checked by src/lib/content/validate.ts,
// which runs before every build (see astro.config.mjs).
import { defineCollection } from 'astro:content';
import { existsSync, readdirSync } from 'node:fs';
import { glob, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { orderedYaml } from './lib/loaders';
import { bibLoader } from './lib/content/bib-loader';
import {
  themeSchema,
  courseSchema,
  thesisSchema,
  personSchema,
  talkSchema,
  newsSchema,
  showcaseSchema,
  publicationSchema,
  projectSchema,
} from './lib/content/schemas';
import { thesisId } from './lib/content/load';

const ordered = z.object({ order: z.number() });
/** Markdown folder; empty folders (no talks yet, no showcase entries yet) are fine. */
const md = (dir: string): Loader => {
  const base = `./src/content/${dir}`;
  const hasFiles = existsSync(base) && readdirSync(base).some((f) => f.endsWith('.md'));
  return hasFiles
    ? glob({ pattern: '*.md', base })
    : { name: 'empty-folder', load: async ({ store }) => store.clear() };
};

export const collections = {
  themes: defineCollection({
    loader: orderedYaml('src/data/themes.yml'),
    schema: themeSchema.extend({ order: z.number() }),
  }),
  courses: defineCollection({
    loader: orderedYaml('src/data/courses.yml'),
    schema: courseSchema.and(ordered),
  }),
  theses: defineCollection({
    loader: orderedYaml('src/data/theses.yml', thesisId),
    schema: thesisSchema.and(ordered),
  }),
  projects: defineCollection({
    loader: orderedYaml('src/data/projects.yml'),
    schema: projectSchema.and(ordered),
  }),
  people: defineCollection({ loader: md('people'), schema: personSchema }),
  talks: defineCollection({ loader: md('talks'), schema: talkSchema }),
  news: defineCollection({ loader: md('news'), schema: newsSchema }),
  showcase: defineCollection({ loader: md('teaching/showcase'), schema: showcaseSchema }),
  publications: defineCollection({
    loader: bibLoader('src/data/publications.bib'),
    schema: publicationSchema.and(ordered),
  }),
};
