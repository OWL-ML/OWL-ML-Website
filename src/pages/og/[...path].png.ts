import type { APIRoute, GetStaticPaths } from 'astro';
import { ogImage } from '../../lib/og';
import { nav } from '../../lib/nav';
import { site } from '../../lib/site';
import { getPeople } from '../../lib/data';
import { titledName } from '../../lib/format';
import { demos } from '../../demos/registry';

// One share image per section, per member and per demo (src/lib/og.ts). BaseLayout points each
// page's og:image here: pages pass `ogImage`, others get their section's image.
export const getStaticPaths = (async () => {
  const people = await getPeople();
  return [
    {
      params: { path: 'home' },
      // the homepage headline with its first word, as on the page without JavaScript
      props: { kicker: site.short, title: `${site.headline_prefix} ${site.tagline_words[0]}` },
    },
    ...nav
      .filter((n) => n.id !== 'research')
      .map((n) => ({ params: { path: n.id }, props: { kicker: site.short, title: n.label } })),
    ...people.map((p) => ({
      params: { path: `people/${p.id}` },
      props: { kicker: 'People', title: titledName(p.data) },
    })),
    ...demos.map((d) => ({
      params: { path: `teaching/demos/${d.slug}` },
      props: { kicker: 'Try it', title: d.title },
    })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  new Response(
    new Uint8Array(await ogImage(props.title, props.kicker, site.name, site.university)),
    {
      headers: { 'content-type': 'image/png' },
    },
  );
