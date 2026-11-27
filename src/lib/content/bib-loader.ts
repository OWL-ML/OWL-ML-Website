import { readFile } from 'node:fs/promises';
import type { Loader } from 'astro/loaders';
import { parseBib } from './bib.ts';

/** Loads publications.bib into a collection; `order` keeps the file order. */
export function bibLoader(path: string): Loader {
  return {
    name: 'bibtex',
    load: async ({ store, parseData, watcher, logger }) => {
      const sync = async () => {
        const { publications, problems } = parseBib(await readFile(path, 'utf8'));
        for (const p of problems) logger.warn(`${path}: ${p.key ? p.key + ': ' : ''}${p.message}`);
        store.clear();
        for (const [order, p] of publications.entries()) {
          store.set({ id: p.key, data: await parseData({ id: p.key, data: { ...p, order } }) });
        }
      };
      await sync();
      watcher?.add(path);
      watcher?.on('change', async (changed) => {
        if (changed.endsWith(path)) await sync();
      });
    },
  };
}
