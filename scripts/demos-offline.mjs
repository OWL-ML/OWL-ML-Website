// Writes one self-contained HTML file per demo to dist-offline/ (docs/DEMOS.md, "Offline export"):
// the demo's script bundled with esbuild, styles and fonts (as data URLs) and data files inlined.
// The files open from disk in any current browser and make no network requests: for lecture halls
// without Wi-Fi. Usage: npm run demos:offline
import { build } from 'esbuild';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { demos } from '../src/demos/registry.ts';
import { demoHead, demoNotes } from '../src/demos/frame.ts';
import { siteUrl as siteUrlOf } from '../src/lib/site-url.ts';

const root = process.cwd();
const out = join(root, 'dist-offline');
const siteUrl = siteUrlOf();

// The interactive demos: those with an entry in src/demos/loaders.ts.
const loaders = await readFile('src/demos/loaders.ts', 'utf8');
const ready = demos.filter((d) => loaders.includes(`/${d.slug}/ui.ts')`));

const courses = parse(await readFile('src/data/courses.yml', 'utf8'));
const site = parse(await readFile('src/data/site.yml', 'utf8'));

// Latin subsets of the weights the demos use, inlined as data URLs.
const FONTS = [
  ['Bricolage Grotesque', 'bricolage-grotesque', 700, 'normal'],
  ['IBM Plex Sans', 'ibm-plex-sans', 400, 'normal'],
  ['IBM Plex Sans', 'ibm-plex-sans', 400, 'italic'],
  ['IBM Plex Sans', 'ibm-plex-sans', 600, 'normal'],
  ['IBM Plex Mono', 'ibm-plex-mono', 400, 'normal'],
];
let fontCss = '';
for (const [family, pkg, weight, style] of FONTS) {
  const file = `node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-${style}.woff2`;
  const b64 = (await readFile(file)).toString('base64');
  fontCss += `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2')}\n`;
}
// on the site these variables come from Astro's font API (src/lib/fonts.ts)
fontCss += `:root{--font-bricolage:'Bricolage Grotesque',sans-serif;--font-plex-sans:'IBM Plex Sans',sans-serif;--font-plex-mono:'IBM Plex Mono',monospace}\n`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const safeJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const d of ready) {
  const result = await build({
    stdin: {
      contents: `
        import '../src/styles/base.css';
        import '../src/demos/demo.css';
        import { mount } from '../src/demos/${d.slug}/ui.ts';
        const files = JSON.parse(document.getElementById('demo-files').textContent);
        mount(document.querySelector('[data-demo-live]'), {
          motion: !matchMedia('(prefers-reduced-motion: reduce)').matches,
          file: async (name) => files[name],
        });`,
      resolveDir: join(root, 'scripts'),
      loader: 'ts',
      sourcefile: `${d.slug}-offline.ts`,
    },
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2020',
    write: false,
    outdir: 'out',
    logLevel: 'warning',
  });
  const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text;
  const css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';

  const files = {};
  for (const name of d.files)
    files[name] = await readFile(join('public/demos', d.slug, name), 'utf8');
  const course = courses.find((c) => c.id === d.course);
  const address = `${siteUrl}/teaching/demos/${d.slug}/`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.title)} · ${esc(site.short)}</title>
<style>${fontCss}${css}
.offline{max-width:1200px;margin:0 auto;padding:32px 16px;display:flex;flex-direction:column;gap:12px}
.offline-foot{font-size:13px;color:var(--body);margin:0}</style>
</head>
<body>
<main class="offline">
<div class="demo">
${demoHead(d, course.name, 1)}
<div data-demo-live><p class="demo-loading">This demo needs JavaScript.</p></div>
${demoNotes(d)}
</div>
<p class="offline-foot">${esc(course.name)} · ${esc(site.name)}, ${esc(site.university)} · Online: ${esc(address)}</p>
</main>
<script type="application/json" id="demo-files">${safeJson(files)}</script>
<script>${js.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
  await writeFile(join(out, `${d.slug}.html`), html);
  console.log(`wrote dist-offline/${d.slug}.html (${Math.round(html.length / 1024)} KB)`);
}

const index = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Course demos · ${esc(site.short)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;line-height:1.5}</style></head>
<body><h1>Course demos (offline)</h1><p>Each file works without network.</p><ul>
${ready.map((d) => `<li><a href="${d.slug}.html">${esc(d.title)}</a></li>`).join('\n')}
</ul></body></html>
`;
await writeFile(join(out, 'index.html'), index);
