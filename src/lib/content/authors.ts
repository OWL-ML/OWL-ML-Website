// Author lists for display: full names as the authors write them ("Quentin Delfosse, ...,
// Martin Mundt"), with lab members marked
// so components can render them bold and linked. Members are matched to author positions by
// family name + first initial (never by guessing); validate.ts makes sure every match is unique.
import { matchMember, fullName, authorsUnknown, type Author } from './bib.ts';

export interface AuthorPart {
  text: string;
  /** person id when this author is a lab member listed in `members` */
  person?: string;
}

export function authorParts(
  pub: { authors: Author[]; members: string[] },
  names: Map<string, string>,
): AuthorPart[] {
  if (authorsUnknown(pub)) return [{ text: pub.authors[0]?.literal ?? '[Authors]' }];
  const byIndex = new Map<number, string>();
  for (const id of pub.members) {
    const name = names.get(id);
    if (!name) continue;
    const hits = matchMember(pub.authors, name);
    if (hits.length === 1) byIndex.set(hits[0]!, id);
  }
  return pub.authors.map((a, i) => ({ text: fullName(a), person: byIndex.get(i) }));
}
