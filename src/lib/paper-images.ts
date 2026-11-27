import type { ImageMetadata } from 'astro';

// Paper thumbnails (teaser figures) live in src/assets/papers/ and are named by the BibTeX
// `thumbnail` field.
const files = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/papers/*.{png,jpg,jpeg,webp,avif}',
);

export async function paperImage(name: string | undefined): Promise<ImageMetadata | undefined> {
  if (!name) return undefined;
  const loader = files[`../assets/papers/${name}`];
  return loader ? (await loader()).default : undefined;
}
