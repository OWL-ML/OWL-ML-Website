import type { ImageMetadata } from 'astro';

// Member photos live in src/assets/people/ and go through Astro's image pipeline.
const files = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/people/*.{jpg,jpeg,png,webp,avif}',
);

export async function photoFor(name: string | undefined): Promise<ImageMetadata | undefined> {
  if (!name) return undefined;
  const loader = files[`../assets/people/${name}`];
  return loader ? (await loader()).default : undefined;
}
