// Self-hosted fonts through Astro's font API (docs/DESIGN.md: Bricolage Grotesque, IBM Plex Sans,
// IBM Plex Mono). The files come from the @fontsource packages in node_modules, so nothing is
// fetched from elsewhere, not even at build time. Astro adds metric-matched fallback fonts, so text
// keeps its size while the web fonts load and the page does not jump (phase 6, layout shift).
import { fontProviders } from 'astro/config';

// unicode ranges of the Fontsource subsets (identical across these families)
const RANGES = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext':
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  greek: 'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF',
} as const;
type Subset = keyof typeof RANGES;

/**
 * Astro's local provider, plus the subset of each file, so that only the Latin files are preloaded
 * (the latin-ext and Greek files load when a page uses such characters).
 */
function fontsource() {
  const local = fontProviders.local();
  return {
    name: 'fontsource-files',
    init: local.init?.bind(local),
    async resolveFont(o: Parameters<typeof local.resolveFont>[0]) {
      const result = await local.resolveFont(o);
      const subsets = (o.options?.variants ?? []) as { subset?: Subset }[];
      result?.fonts.forEach((f, i) => (f.meta = { ...f.meta, subset: subsets[i]?.subset }));
      return result;
    },
  };
}

/** one @font-face per weight, style and subset, from node_modules/@fontsource/<pkg>/files */
function variants(pkg: string, faces: [number, 'normal' | 'italic'][], subsets: Subset[]) {
  const all = faces.flatMap(([weight, style]) =>
    subsets.map((subset) => ({
      weight,
      style,
      subset,
      unicodeRange: [RANGES[subset]] as [string],
      src: [
        `./node_modules/@fontsource/${pkg}/files/${pkg}-${subset}-${weight}-${style}.woff2`,
      ] as [string],
    })),
  );
  return all as [(typeof all)[number], ...typeof all];
}

export const fonts = [
  {
    provider: fontsource(),
    name: 'Bricolage Grotesque',
    cssVariable: '--font-bricolage',
    fallbacks: ['sans-serif'],
    options: {
      variants: variants(
        'bricolage-grotesque',
        [
          [500, 'normal'],
          [700, 'normal'],
        ],
        ['latin', 'latin-ext'],
      ),
    },
  },
  {
    provider: fontsource(),
    name: 'IBM Plex Sans',
    cssVariable: '--font-plex-sans',
    fallbacks: ['sans-serif'],
    options: {
      variants: variants(
        'ibm-plex-sans',
        [
          [400, 'normal'],
          [400, 'italic'],
          [500, 'normal'],
          [600, 'normal'],
        ],
        ['latin', 'latin-ext', 'greek'],
      ),
    },
  },
  {
    provider: fontsource(),
    name: 'IBM Plex Mono',
    cssVariable: '--font-plex-mono',
    fallbacks: ['monospace'],
    options: {
      variants: variants(
        'ibm-plex-mono',
        [
          [400, 'normal'],
          [500, 'normal'],
        ],
        ['latin', 'latin-ext'],
      ),
    },
  },
];
