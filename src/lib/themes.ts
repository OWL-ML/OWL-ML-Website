import { getCollection } from 'astro:content';

export type Theme = Awaited<ReturnType<typeof getThemes>>[number];

/** All themes in file order (= display order everywhere). */
export async function getThemes() {
  const entries = await getCollection('themes');
  return entries.map((e) => e.data).sort((a, b) => a.order - b.order);
}

export async function getTheme(id: string) {
  const theme = (await getThemes()).find((t) => t.id === id);
  if (!theme)
    throw new Error(`Unknown theme id "${id}". Known ids are listed in src/data/themes.yml.`);
  return theme;
}
