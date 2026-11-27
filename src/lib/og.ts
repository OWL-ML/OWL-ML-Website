// Open Graph images (the picture shown when a page is shared): 1200 × 630 PNG, made at build time.
// The owl as supplied, on a light background (CLAUDE.md rule 5), the page title in Bricolage
// Grotesque, the lab and university below. satori turns the text into shapes (fonts from the
// @fontsource packages), sharp turns the SVG into a PNG. Nothing is fetched from elsewhere.
import { readFile } from 'node:fs/promises';
import satori from 'satori';
import sharp from 'sharp';

const font = (pkg: string, file: string) =>
  readFile(`node_modules/@fontsource/${pkg}/files/${file}.woff`);

let assets: Promise<{ fonts: Parameters<typeof satori>[1]['fonts']; owl: string }> | undefined;
const load = () =>
  (assets ??= (async () => ({
    fonts: [
      {
        name: 'Bricolage Grotesque',
        data: await font('bricolage-grotesque', 'bricolage-grotesque-latin-700-normal'),
        weight: 700,
        style: 'normal',
      },
      {
        name: 'IBM Plex Sans',
        data: await font('ibm-plex-sans', 'ibm-plex-sans-latin-500-normal'),
        weight: 500,
        style: 'normal',
      },
    ],
    owl: `data:image/svg+xml;base64,${(await readFile('public/brand/owl.svg')).toString('base64')}`,
  }))());

// colours from src/styles/tokens.css
const C = { bg: '#f2f8f6', ink: '#14201f', body: '#3b4a48', teal: '#1f4a47', orange: '#e38a43' };

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

/** PNG of the share image for a page: `kicker` above the title (e.g. "People"), `title` large. */
export async function ogImage(title: string, kicker: string, lab: string, university: string) {
  const { fonts, owl } = await load();
  const size = title.length > 60 ? 56 : title.length > 34 ? 68 : 84;
  // 1200 × 630 minus padding (72 / 64 px) and the orange band (16 px): 1056 × 486 for content
  const svg = await satori(
    h(
      'div',
      {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        background: C.bg,
        fontFamily: 'IBM Plex Sans',
      },
      [
        h('div', { display: 'flex', width: 1200, height: 614, padding: '64px 72px' }, [
          h(
            'div',
            {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: 778,
              height: 486,
            },
            [
              h('div', { display: 'flex', flexDirection: 'column' }, [
                h(
                  'div',
                  { fontSize: 30, color: C.teal, fontWeight: 500, marginBottom: 20 },
                  kicker,
                ),
                h(
                  'div',
                  {
                    fontFamily: 'Bricolage Grotesque',
                    fontWeight: 700,
                    fontSize: size,
                    lineHeight: 1.08,
                    color: C.ink,
                  },
                  title,
                ),
              ]),
              h('div', { display: 'flex', flexDirection: 'column', fontSize: 26, color: C.body }, [
                h('div', {}, lab),
                h('div', {}, university),
              ]),
            ],
          ),
          h(
            'div',
            {
              display: 'flex',
              width: 278,
              height: 486,
              alignItems: 'center',
              justifyContent: 'flex-end',
            },
            [{ type: 'img', props: { src: owl, width: 230, height: 320 } }],
          ),
        ]),
        h('div', { width: 1200, height: 16, background: C.orange }),
      ],
    ) as Parameters<typeof satori>[0],
    { width: 1200, height: 630, fonts },
  );
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
