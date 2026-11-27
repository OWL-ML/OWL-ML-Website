// Cross-reference checks across all content files (docs/CONTENT_MODEL.md, "Validation").
// Field-level rules live in schemas.ts; this file checks what needs several files at once.
import { loadContent, type Loaded, type Problem } from './load.ts';
import { matchMember, authorsUnknown } from './bib.ts';
import { demoSlugs } from '../../demos/registry.ts';

function closest(word: string, options: Iterable<string>): string {
  let best = '';
  let bestScore = Infinity;
  for (const o of options) {
    // Damerau-Levenshtein distance (so "pia" suggests "pai"); small lists, simple version.
    const d: number[][] = Array.from({ length: word.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= o.length; j++) d[0]![j] = j;
    for (let i = 1; i <= word.length; i++)
      for (let j = 1; j <= o.length; j++) {
        const cost = word[i - 1] === o[j - 1] ? 0 : 1;
        d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
        if (i > 1 && j > 1 && word[i - 1] === o[j - 2] && word[i - 2] === o[j - 1])
          d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    const score = d[word.length]![o.length]!;
    if (score < bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return bestScore <= Math.max(2, word.length / 2) ? ` Did you mean "${best}"?` : '';
}

export function validate(c: Loaded): Problem[] {
  const problems: Problem[] = [...c.problems];
  const add = (file: string, message: string) => problems.push({ file, message });

  const themeIds = new Set(c.themes.map((t) => t.id));
  const personIds = new Set(c.people.map((p) => p.id));
  const courseIds = new Set(c.courses.map((x) => x.id));
  const bibKeys = new Set(c.publications.map((p) => p.id));

  const known =
    (kind: string, set: Set<string>, listFile: string) =>
    (file: string, where: string, id: string) => {
      if (!set.has(id))
        add(
          file,
          `${where}: unknown ${kind} "${id}".${closest(id, set)} Known ${kind}s are in ${listFile}.`,
        );
    };
  const theme = known('theme id', themeIds, 'src/data/themes.yml');
  const person = known('person id', personIds, 'src/content/people/');
  const course = known('course id', courseIds, 'src/data/courses.yml');
  const paper = known('BibTeX key', bibKeys, 'src/data/publications.bib');

  const dupes = (kind: string, file: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) add(file, `duplicate ${kind} "${id}"`);
      seen.add(id);
    }
  };
  dupes(
    'theme id',
    'src/data/themes.yml',
    c.themes.map((t) => t.id),
  );
  dupes(
    'course id',
    'src/data/courses.yml',
    c.courses.map((x) => x.id),
  );
  dupes(
    'thesis (same student and degree twice)',
    'src/data/theses.yml',
    c.theses.map((t) => t.id),
  );

  dupes(
    'project id',
    'src/data/projects.yml',
    c.projects.map((x) => x.id),
  );
  for (const x of c.projects) {
    if (!c.projectLogos.has(x.data.logo))
      add(x.file, `${x.id}.logo: "${x.data.logo}" not found in src/assets/projects/`);
  }

  for (const p of c.people) {
    p.data.themes.forEach((t) => theme(p.file, 'themes', t));
    p.data.teaching.forEach((t) => course(p.file, 'teaching', t));
    if (p.data.photo && !c.photos.has(p.data.photo))
      add(p.file, `photo "${p.data.photo}" not found in src/assets/people/`);
  }

  for (const x of c.courses) {
    x.data.next.forEach((n) => course(x.file, `${x.id}.next`, n));
    x.data.pairs.forEach((n) => course(x.file, `${x.id}.pairs`, n));
    x.data.themes.forEach((t) => theme(x.file, `${x.id}.themes`, t));
    x.data.dimensions.forEach(
      (d, i) => d.theme && theme(x.file, `${x.id}.dimensions.${i}.theme`, d.theme),
    );
    x.data.demo.forEach((d) => {
      if (!demoSlugs.has(d))
        add(
          x.file,
          `${x.id}.demo: unknown demo slug "${d}".${closest(d, demoSlugs)} Known demos are in src/demos/registry.ts.`,
        );
    });
  }

  for (const t of c.theses)
    t.data.themes.forEach((th) => theme(t.file, `${t.data.student}: themes`, th));

  for (const t of c.talks) {
    t.data.speakers.forEach((s) => person(t.file, 'speakers', s));
    t.data.themes.forEach((th) => theme(t.file, 'themes', th));
  }

  for (const n of c.news) {
    n.data.people.forEach((s) => person(n.file, 'people', s));
    if (n.data.paper) paper(n.file, 'paper', n.data.paper);
  }

  for (const s of c.showcase) course(s.file, 'course', s.data.course);
  // /teaching/demos/<slug>/ are the demo pages
  for (const x of c.courses)
    if (x.id === 'demos')
      add('src/data/courses.yml', 'course id "demos" is reserved for the demo pages');

  const peopleById = new Map(c.people.map((p) => [p.id, p.data]));
  for (const pub of c.publications) {
    const where = (f: string) => `${pub.id}: ${f}`;
    pub.data.themes.forEach((t) => theme(pub.file, where('themes'), t));
    if (pub.data.thumbnail && !c.paperImages.has(pub.data.thumbnail))
      add(
        pub.file,
        `${where('thumbnail')}: "${pub.data.thumbnail}" not found in src/assets/papers/`,
      );
    const unknownAuthors = authorsUnknown(pub.data);
    if (pub.data.members.length === 0 && !pub.data.review?.includes('authors')) {
      add(pub.file, `${where('members')}: list at least one lab author (person id)`);
    }
    if (unknownAuthors && !pub.data.review?.includes('authors')) {
      add(
        pub.file,
        `${where('author')}: the author list is a placeholder; add review = {authors} or the real authors`,
      );
    }
    for (const m of pub.data.members) {
      const personData = peopleById.get(m);
      if (!personData) {
        person(pub.file, where('members'), m);
        continue;
      }
      if (unknownAuthors) {
        add(
          pub.file,
          `${where('members')}: "${m}" is listed but the author list is still a placeholder`,
        );
        continue;
      }
      const hits = matchMember(pub.data.authors, personData.name);
      if (hits.length === 0)
        add(
          pub.file,
          `${where('members')}: "${m}" (${personData.name}) is not in the author list. ` +
            'The family name and first initial must match an author; fix the author or the members field.',
        );
      else if (hits.length > 1)
        add(
          pub.file,
          `${where('members')}: "${m}" (${personData.name}) matches several authors; cannot decide.`,
        );
    }
  }

  return problems;
}

export async function loadAndValidate(root?: string) {
  const content = await loadContent(root);
  return { content, problems: validate(content) };
}

export function formatProblems(problems: Problem[]): string {
  const byFile = new Map<string, string[]>();
  for (const p of problems) byFile.set(p.file, [...(byFile.get(p.file) ?? []), p.message]);
  return [...byFile.entries()]
    .map(([f, ms]) => `${f}\n${ms.map((m) => `  ✖ ${m}`).join('\n')}`)
    .join('\n');
}
