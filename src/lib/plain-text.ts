// Markdown to plain paragraphs, for short previews (news tiles). Pure, no dependencies, so it can
// be unit-tested. Keeps the words, drops the markup: link text without its address, no images,
// no emphasis markers, headings and list items as ordinary paragraphs.

/** Paragraphs of plain text from a Markdown body (empty paragraphs are dropped). */
export function plainParagraphs(markdown: string): string[] {
  return markdown
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links: keep their text
        .replace(/<[^>]+>/g, '') // inline HTML
        .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // headings, quotes, list markers
        .replace(/(\*\*|__|\*|_|`)(?=\S)([^\n]*?\S)\1/g, '$2') // emphasis and code
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}
