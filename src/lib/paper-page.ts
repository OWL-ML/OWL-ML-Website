// The one link a paper gets: its landing page (abstract, authors, PDF and versions), never the PDF
// file itself. A PDF link in publications.bib is turned into its landing page where the address
// pattern is known (arXiv, OpenReview, PMLR); otherwise arXiv id, DOI, and only then the PDF.
interface PaperLinks {
  url?: string;
  pdf?: string;
  arxiv?: string;
  doi?: string;
}

const pdfToPage: [RegExp, (m: RegExpMatchArray) => string][] = [
  // https://arxiv.org/pdf/2402.04814v2.pdf → https://arxiv.org/abs/2402.04814v2
  [
    /^https?:\/\/(?:www\.)?arxiv\.org\/pdf\/([^?#]+?)(?:\.pdf)?$/,
    (m) => `https://arxiv.org/abs/${m[1]}`,
  ],
  // https://openreview.net/pdf?id=X → https://openreview.net/forum?id=X
  [
    /^https?:\/\/openreview\.net\/pdf\?id=([^&#]+)/,
    (m) => `https://openreview.net/forum?id=${m[1]}`,
  ],
  // https://proceedings.mlr.press/v208/mundt23a/mundt23a.pdf → .../v208/mundt23a.html
  [
    /^https?:\/\/proceedings\.mlr\.press\/(v\d+)\/([^/]+)\/\2\.pdf$/,
    (m) => `https://proceedings.mlr.press/${m[1]}/${m[2]}.html`,
  ],
];

export function landingPage(p: PaperLinks): string | undefined {
  for (const link of [p.url, p.pdf]) {
    if (!link) continue;
    for (const [re, page] of pdfToPage) {
      const m = link.match(re);
      if (m) return page(m);
    }
    if (link === p.url) return link;
  }
  if (p.arxiv) return `https://arxiv.org/abs/${p.arxiv}`;
  if (p.doi) return `https://doi.org/${p.doi}`;
  return p.pdf;
}
