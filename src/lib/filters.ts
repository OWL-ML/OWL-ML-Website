// Filter logic for list pages (publications, news). Pure functions, shared by the browser scripts
// and the unit tests. Status texts describe what is shown in words, never as counts
// ("Filtered to Memory & Consolidation", not "Showing 3 of 17": CLAUDE.md rule 2).

export interface PubFilter {
  q: string;
  theme: string;
  member: string;
  /** publication year, e.g. "2025"; empty for all years */
  year: string;
}

export interface PubItem {
  title: string;
  themes: string[];
  members: string[];
  year: number;
}

export const emptyPubFilter: PubFilter = { q: '', theme: '', member: '', year: '' };

export function readPubFilter(search: string): PubFilter {
  const p = new URLSearchParams(search);
  return {
    q: p.get('q') ?? '',
    theme: p.get('theme') ?? '',
    member: p.get('member') ?? '',
    year: p.get('year') ?? '',
  };
}

export function writePubFilter(url: URL, f: PubFilter): URL {
  const out = new URL(url);
  for (const k of ['q', 'theme', 'member', 'year'] as const) {
    if (f[k].trim()) out.searchParams.set(k, f[k].trim());
    else out.searchParams.delete(k);
  }
  return out;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function pubMatches(item: PubItem, f: PubFilter): boolean {
  if (f.theme && !item.themes.includes(f.theme)) return false;
  if (f.member && !item.members.includes(f.member)) return false;
  if (f.year && String(item.year) !== f.year) return false;
  const words = norm(f.q).split(/\s+/).filter(Boolean);
  const title = norm(item.title);
  return words.every((w) => title.includes(w));
}

export function pubFilterLabel(
  f: PubFilter,
  themeName: (id: string) => string | undefined,
  personName: (id: string) => string | undefined,
): string {
  const parts: string[] = [];
  if (f.theme) parts.push(`to ${themeName(f.theme) ?? f.theme}`);
  if (f.member) parts.push(`with ${personName(f.member) ?? f.member}`);
  if (f.year) parts.push(`from ${f.year}`);
  if (f.q.trim()) parts.push(`matching “${f.q.trim()}”`);
  return parts.length ? `Filtered ${parts.join(' · ')}.` : '';
}

/** The BibTeX file for the papers shown: comment lines saying which, then the entries. */
export function bibExport(entries: string[], label: string): string {
  const head =
    '% Publications of the Open World Lifelong Machine Learning Lab (OWL-ML), Universität Bremen';
  const what = label.startsWith('Filtered') ? `\n% ${label}` : '';
  return `${head}${what}\n\n${entries.join('\n\n')}\n`;
}
