import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type { Loader } from 'astro/loaders';

/**
 * Loads a YAML list into a collection and keeps the file order in an `order` field
 * (Astro's own file() loader does not guarantee order, and order = display order here).
 * `idOf` derives the entry id for lists without an `id` field.
 */
export function orderedYaml(
  path: string,
  idOf: (item: Record<string, unknown>, index: number) => string = (item) => String(item.id),
): Loader {
  return {
    name: 'ordered-yaml',
    load: async ({ store, parseData, watcher, logger }) => {
      const sync = async () => {
        const raw = parse(await readFile(path, 'utf8'));
        if (!Array.isArray(raw)) throw new Error(`${path} must contain a YAML list.`);
        store.clear();
        const seen = new Set<string>();
        for (const [index, item] of raw.entries()) {
          const id = idOf(item, index);
          if (seen.has(id)) throw new Error(`${path}: duplicate id "${id}".`);
          seen.add(id);
          const data = await parseData({ id, data: { ...item, order: index } });
          store.set({ id, data });
        }
        logger.info(`${path}: ${raw.length} entries`);
      };
      await sync();
      watcher?.add(path);
      watcher?.on('change', async (changed) => {
        if (changed.endsWith(path)) await sync();
      });
    },
  };
}
