// Lists everything still awaiting Martin's review: entries with a `review` marker
// (docs/CONTENT_MODEL.md, "Review markers") and visible [placeholders] in the content files.
// Usage: npm run review
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { loadContent, splitFrontmatter } from '../src/lib/content/load.ts';

const c = await loadContent();
const themeName = new Map(c.themes.map((t) => [t.id, t.data.short]));
const tags = (ids: string[]) =>
  ids.length ? ids.map((i) => themeName.get(i) ?? i).join(', ') : '(none yet)';

const rows: string[] = [];
const mark = (file: string, what: string, kinds: string[] | undefined, detail: string) => {
  if (kinds?.length) rows.push(`  [${kinds.join(', ')}] ${what}\n      ${detail}   (${file})`);
};
for (const p of c.publications) mark(p.file, p.id, p.data.review, `themes: ${tags(p.data.themes)}`);
for (const t of c.theses)
  mark(
    t.file,
    `${t.data.student}: ${t.data.title}`,
    t.data.review,
    `themes: ${tags(t.data.themes)}`,
  );
for (const x of [...c.people, ...c.talks, ...c.news])
  mark(
    x.file,
    x.id,
    (x.data as { review?: string[] }).review,
    `themes: ${tags((x.data as { themes?: string[] }).themes ?? [])}`,
  );

console.log(
  rows.length ? `Awaiting review (${rows.length}):\n${rows.join('\n')}` : 'No review markers left.',
);
console.log('Remove the `review` marker from an entry once you agree with it.\n');

// Placeholders: [bracketed text] in any string value (YAML, front matter), Markdown body or BibTeX.
const PH = /\[([^\]\n]{1,80})\](?!\()/g;
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}
async function files(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else if (/\.(ya?ml|md|bib)$/.test(e.name)) out.push(p);
  }
  return out;
}
const found: string[] = [];
for (const f of [...(await files('src/data')), ...(await files('src/content'))]) {
  const text = await readFile(f, 'utf8');
  let texts: string[];
  if (f.endsWith('.bib')) texts = [text.replace(/^%.*$/gm, '')];
  else if (f.endsWith('.md')) {
    const { data, body } = splitFrontmatter(text);
    texts = [...strings(data), body];
  } else texts = strings(parseYaml(text));
  const hits = new Set(texts.flatMap((t) => [...t.matchAll(PH)].map((m) => m[0])));
  if (hits.size) found.push(`  ${f}: ${[...hits].join(' ')}`);
}
console.log(
  found.length ? `Placeholders still to fill in:\n${found.join('\n')}` : 'No placeholders left.',
);
