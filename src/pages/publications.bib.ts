import type { APIRoute } from 'astro';
import { getPublications } from '../lib/data';

// "Download all as BibTeX": standard BibTeX of every entry, newest first, without site fields.
export const GET: APIRoute = async () => {
  const pubs = await getPublications();
  const body = `% Publications of the Open World Lifelong Machine Learning Lab (OWL-ML), Universität Bremen\n\n${pubs
    .map((p) => p.bibtex)
    .join('\n\n')}\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' } });
};
