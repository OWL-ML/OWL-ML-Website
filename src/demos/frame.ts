// The frame around every demo: label, title and intro above, notes below. Shared by the site
// (DemoFrame.astro) and the offline files (scripts/demos-offline.mjs), so both read the same.
import type { DemoInfo } from './registry.ts';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * `headingLevel`: 1 for a stand-alone offline file, 3 inside the Teaching page's "Try it" section,
 * null on a demo page, whose page title already is the demo's title.
 */
export function demoHead(d: DemoInfo, courseName: string, headingLevel: 1 | 2 | 3 | null): string {
  const h = headingLevel && `h${headingLevel}`;
  return `<div class="demo-head">
  <span class="demo-label">Try it · ${esc(courseName)}</span>
  ${h ? `<${h} class="demo-title">${esc(d.title)}</${h}>` : ''}
  <p class="demo-intro">${d.intro}</p>
</div>`;
}

export function demoNotes(d: DemoInfo): string {
  if (!d.notes.length) return '';
  return `<div class="demo-notes">${d.notes
    .map((n) => `<p><strong>${esc(n.title)}</strong> ${n.html}</p>`)
    .join('')}</div>`;
}

/** What a demo's interactive part receives from its host (site or offline file). */
export interface DemoHost {
  /** contents of a data file listed in the registry */
  file(name: string): Promise<string>;
  /** false when the visitor prefers reduced motion */
  motion: boolean;
}

/** Every demo module (src/demos/<slug>/ui.ts) exports this. */
export type Mount = (root: HTMLElement, host: DemoHost) => void | Promise<void>;
