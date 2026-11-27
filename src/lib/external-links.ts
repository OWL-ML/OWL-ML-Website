// Links to other sites open in a new tab, so visitors keep their place on this site.
// Applied to the finished HTML of every page by src/middleware.ts (at build time and in
// `npm run dev`), so components and Markdown content need no attributes of their own.
//
// Each external link gets target="_blank" and rel="noopener", and a note for screen readers
// (WCAG technique G201): a hidden "(opens in a new tab)" after the link text, or appended to
// aria-label where the link has one (aria-label replaces the text for screen readers).
// Links that already set a target are left as they are.

const NOTE = {
  en: 'opens in a new tab',
  de: 'öffnet in neuem Tab',
} as const;

/** True for http(s) and protocol-relative links to a host other than `siteHost`. */
export function isExternal(href: string, siteHost: string): boolean {
  const m = /^(?:https?:)?\/\/([^/?#:]+)/i.exec(href.trim());
  return !!m && m[1].toLowerCase() !== siteHost.toLowerCase();
}

const attr = (attrs: string, name: string) =>
  new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(attrs);

/** Rewrites every external `<a>` in `html`. `siteHost` is this site's host name. */
export function markExternalLinks(html: string, siteHost: string): string {
  const lang = /<html[^>]*\slang="de/i.test(html) ? 'de' : 'en';
  const note = NOTE[lang];
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (whole, attrs: string, body: string) => {
    const href = attr(attrs, 'href');
    if (!href || !isExternal(href[2] ?? href[3], siteHost) || attr(attrs, 'target')) return whole;

    let a = attrs;
    const rel = attr(a, 'rel');
    if (!rel) a += ' rel="noopener"';
    else if (!/\bnoopener\b/i.test(rel[2] ?? rel[3]))
      a = a.replace(rel[0], ` rel="${(rel[2] ?? rel[3]).trim()} noopener"`);
    a += ' target="_blank"';

    const label = attr(a, 'aria-label');
    if (label) {
      a = a.replace(label[0], ` aria-label="${label[2] ?? label[3]} (${note})"`);
      return `<a${a}>${body}</a>`;
    }
    return `<a${a}>${body}<span class="sr-only"> (${note})</span></a>`;
  });
}
