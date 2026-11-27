import { cp, mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');

/** Copies the project (without node_modules, dist, design) to a temp dir for mutation. */
export async function copyProject({ withNodeModules = false } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'owl-site-'));
  for (const p of ['src', 'public', 'astro.config.mjs', 'package.json', 'tsconfig.json']) {
    await cp(join(repo, p), join(dir, p), { recursive: true });
  }
  if (withNodeModules) await symlink(join(repo, 'node_modules'), join(dir, 'node_modules'), 'dir');
  return {
    dir,
    async edit(file, fn) {
      const path = join(dir, file);
      await writeFile(path, fn(await readFile(path, 'utf8')));
    },
    async write(file, text) {
      await writeFile(join(dir, file), text);
    },
    remove: () => rm(dir, { recursive: true, force: true }),
  };
}

/** Applies `fn` to the text of one BibTeX entry (from "@type{key," to the next entry). */
export function editEntry(bib, key, fn) {
  const start = bib.indexOf(`{${key},`);
  if (start < 0) throw new Error(`no entry ${key}`);
  const at = bib.lastIndexOf('@', start);
  const next = bib.indexOf('\n@', start);
  const end = next < 0 ? bib.length : next;
  return bib.slice(0, at) + fn(bib.slice(at, end)) + bib.slice(end);
}
