// Checks every content file and all references between them (docs/CONTENT_MODEL.md).
// Runs in `npm run check` and at the start of every `astro build` (see astro.config.mjs).
// Usage: node scripts/validate-content.ts [root]
import { loadAndValidate, formatProblems } from '../src/lib/content/validate.ts';

const { content, problems } = await loadAndValidate(process.argv[2]);
if (problems.length) {
  console.error(
    `Content check failed (${problems.length} problem(s)):\n\n${formatProblems(problems)}\n`,
  );
  process.exit(1);
}
console.log(
  `Content OK: ${content.people.length} people, ${content.publications.length} publications, ` +
    `${content.news.length} news items, ${content.talks.length} talks, ${content.courses.length} courses, ` +
    `${content.theses.length} theses.`,
);
