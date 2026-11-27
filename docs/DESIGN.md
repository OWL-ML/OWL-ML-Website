# Design

The agreed design (October 2026) was captured in screenshots, static mockups and prototype
sources, which were removed from the repository in November 2026. The built site and this document are now the
reference. The mockups covered these pages:

| File name | Page |
| - | - |
| `Main` | Homepage (desktop) |
| `Phone` | Homepage (phone, 390 px) |
| `Member` | Member profile (desktop) |
| `PhoneMember` | Member profile (phone) |
| `Publications` | Publications |
| `Talks` | Talks & media |
| `Teaching` | Teaching |
| `Theses` | Theses & internships |
| `News` | News |
| `Demo*` | The course demos (see `docs/DEMOS.md`) |

Not mocked, design them in the same system: People index, Legal notice & privacy,
Accessibility statement, 404.

## Design principles

1. Soft surfaces, strong signals: large areas use soft tints; full-strength orange is reserved for
   small things people should notice or click (primary buttons, rings, active states, awards).
2. Motion only where it means something (the open-world field, the rolling verb), always calm, and
   off under `prefers-reduced-motion`.
3. Content over decoration; no stock imagery, no gradients, no drop-shadow stacks.
4. Every list works without JavaScript; JS only enhances (filters, map selection).

## Tokens (`src/styles/tokens.css`)

```css
:root {
  /* teal */
  --teal-50:  #F2F8F6;  /* subtle panels */
  --teal-100: #E7F1EE;  /* page background */
  --teal-200: #D3EAE4;  /* chips, tints, avatar placeholders */
  --teal-300: #BFDDD5;  /* outlines, idle map edges */
  --teal-500: #008878;  /* Uni Bremen "Dunkelgrün": accents, theme node strokes */
  --teal-600: #00756A;  /* links (passes contrast on white) */
  --teal-700: #1F4A47;  /* header/hero band, footer, dark buttons */
  --teal-750: #18403D;  /* hero figure panel */
  --teal-800: #123B39;  /* text on teal tints */
  --teal-line-dark: #2E5D59;   /* borders on dark teal */
  --on-dark: #E9F3F0; --on-dark-muted: #CFE3DE; --on-dark-subtle: #BFD9D3;
  --outline-on-dark: #6E9993;
  /* orange (logo) */
  --orange: #E38A43;           /* exact logo orange (sRGB) */
  --peach-light: #F3B585;      /* small orange-ish text on dark teal */
  --peach-100: #FDEEE1;        /* boxes */
  --peach-200: #FCE7D4;        /* "join us" bands */
  --on-orange: #1A1208;        /* text on orange buttons */
  --on-peach: #3A2410; --on-peach-muted: #5A3A1C; --orange-ink: #9A4A0C;
  /* neutrals */
  --ink: #14201F; --body: #3B4A48; --muted: #566664; --year: #6E8783;
  --hairline: #E3EAE7; --white: #FFFFFF;
  /* type */
  --font-display: "Bricolage Grotesque", system-ui, sans-serif;
  --font-body: "IBM Plex Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  /* shape */
  --radius-card: 22px; --radius-card-sm: 16px; --radius-pill: 999px;
  --container: 1200px; --gutter: 32px; --gutter-phone: 20px;
}
```

Type scale: body 17 px desktop / 16 px phone, line-height 1.55. Headings in the display face:
h1 56-62 px (34-42 px phone), h2 40-42 px (30 px phone), h3 23-28 px. Dates, venues and labels in
mono 12-13 px. Theme one-liners in italic body face.

## Global layout

- **Header, two white tiers** (all pages): (1) university strip with the Uni Bremen logo (40 px
  high, 30 px on phones) and "Faculty 3 / Mathematics and Computer Science", language switch EN/DE
  on the right only on pages that have a German version (for now the site is English only, decided
  by Martin, November 2026); (2) navigation bar with the OWL-ML wordmark (46 px high, 34 px on phones) and links
  Research, People, Publications, Teaching, Theses, News; the current page is underlined in orange.
  On phones the links collapse behind a menu button that opens a teal panel.
- **Teal band** directly below the header: the hero on the homepage, a title band on other pages.
- **Content area** on `--teal-100` with white cards.
- **Footer** in `--teal-700`: the owl (52 px) with "Open World Lifelong / Machine Learning Lab",
  address, links "Legal notice & privacy", "Accessibility", GitHub.
- **Links to other sites open in a new tab** (decided by Martin, November 2026), everywhere and
  without per-link markup: `src/middleware.ts` adds `target="_blank" rel="noopener"` and a hidden
  "(opens in a new tab)" ("(öffnet in neuem Tab)" on German pages) to every external link in the
  finished HTML. No visible icon. Links within the site and `mailto:` stay in the same tab.
  `npm run links` fails if an external link lacks either.

## Logo placement

| Where | Asset |
| - | - |
| University strip | `src/assets/brand/uni-bremen-logo.png` (white background only, unchanged; served at the size shown) |
| Navigation bar | `owl-ml-logo.svg` (black strokes, on white) |
| Hero figure card, bottom right | `owl.svg`, 108 px desktop / 56 px phone, "watching" the figure |
| "Join us" bands (homepage thesis call, teaching, thesis contact box) | `owl.svg`, 72-130 px; on phones 64 px beside the heading, text and button below at full width |
| Footer | `owl.svg` (the orange body carries it on dark teal) |
| Favicon / touch icon | `owl.svg` |

## Components

- **Card**: white, `--radius-card`, padding 22-32 px, no border, no shadow.
- **Chip/pill**: `--teal-200` background, `--teal-800` text; active = filled `--teal-700` with white
  text; theme chips on profiles turn `--orange` when selected.
- **Buttons**: primary = `--orange` fill, `--on-orange` text, pill shape; secondary = outline.
- **Venue label**: mono 12-13 px, `--teal-700` background, white text, radius 6 px.
- **Award badge**: `--orange` pill. Spotlight-type labels: `--teal-200` pill.
- **Year rail**: years in display face, `--year` colour, left column on lists.
- **Numbered steps** (thesis "how to reach out"): dark circular numerals; final step in orange.

## Pages

### Homepage (`Main`, `Phone`)
1. Hero (teal): eyebrow "Open World Lifelong Machine Learning Lab" in `--peach-light`; heading
   "Machine learning that keeps" + rolling word from `site.yml: tagline_words` in orange (screen
   readers get one static sentence; the rolling copy is `aria-hidden`); mission text; buttons
   "Explore our research" (to the map) and "Theses & internships". Between heading and text, the
   network figure in a dark card (`--teal-750`) with the owl in its bottom-right corner: an
   open-world dot field feeds a network that grows and shrinks, with predictions that widen while
   it is uncertain (`HeroNetwork.astro`, `network-loop.ts`, source script in
   `design/hero-network/`). Mission text and the two stacked buttons sit below the card, as wide as
   it; on phones everything stacks.
2. "What our name stands for": the three pillars (Open World, Lifelong, Machine Learning) as cards.
3. "Lifelong ML needs many perspectives": `site.yml: story`, then the research map (see below).
4. Highlights (featured papers) and the latest six news items.
5. Team grid (current members, photo or initials, role).
6. Peach "join us" band with the owl and a button to the thesis page.

### Research map (desktop) / theme explorer (phone)
- SVG, computed at build time: four theme nodes on one row (positions from `themes.yml`), with
  short tag + italic one-liner (two lines) under each; current members above, spread evenly from
  the first to the last theme column in two alternating rows (ordered by where their themes are);
  papers below.
- Default view shows the six most recent papers (two rows of three stay legible). Selecting
  a theme highlights its members and shows up to five of its most recent papers, with a link to the
  filtered publication list; selecting a person highlights their themes and related papers.
- Selection is via real buttons (theme chips, people chips) above the map; the SVG is not the only
  way to interact.
- Right column, two separate boxes (Martin, November 2026): the light teal panel describes the
  selection (theme: name, description, people as pills, "All publications in this theme"; person:
  name, role in teal below it, their themes as pills, "Profile"; no label above the title), and
  below it the paper box. Papers in the map are links to their entry in the publication list;
  pointing at or focusing one shows its full title, venue and link in the paper box (dark teal),
  otherwise the box shows a hint (white, dashed). The column is as tall as its content (compact;
  a little movement between selections is fine), the paper box keeps its size for two-line titles,
  and paper labels stay inside the map (papers keep half a label's width from both edges).
- Phones have no graph, so the panel lists the recent papers there and the paper box is hidden.
- Uniform edge weights (no-metrics rule). Layout must be deterministic (stable between builds).
- A new selection is animated (Martin, November 2026): the drawing is updated in place by stable
  keys, so papers glide to their new position and their edges follow, highlights fade, new papers
  and edges fade in and leaving ones fade out; the panel fades to its new text. The first drawing
  appears as it is; reduced motion switches at once.
- Labels need a white backing so edges don't run through them; theme labels may wrap to two
  lines (name, then one-liner in italics). Check the map with real data at 1440 px and 1024 px.
- Phone: no graph; theme and people chips wrap below their row label, all visible without
  sideways scrolling (Martin, November 2026), and a card with name, description, people and the
  recent papers as a list.

### Member profile (`Member`, `PhoneMember`)
Teal hero with photo, name, role (in `--peach-light`), link pills. About card with bio and theme
chips that filter the publication list. Tabs: Publications / Talks / News (all from tags; Talks only for people with talks). Sidebar:
mini research map (person, their themes, lab co-authors), "Works with" (lab co-authors,
alphabetical, says so), Teaching (from `teaching`), Contact. No "Edit this profile" link: visitors
should not see tooling for lab members (decided by Martin, November 2026). Phone: no mini map.

### Publications (`Publications`)
Title band with "Download all as BibTeX"; tabs Papers / Talks & media (only once there are talks; until then `/publications/talks/` redirects to the papers). Filter card: title search,
member select, theme chips. Year rail list; each item: award badge, title, authors (members bold and
linked), venue label, theme tags, links (PDF, Code, BibTeX). Papers with a teaser figure
(`thumbnail`) show it small beside the text (220 × 140 px box, whole figure on white; 180 × 116 on
profiles; full width above the text on phones); clicking it opens the full figure in a dialog
(`FigureViewer`), or the image itself without JavaScript.

### Talks & media (`Talks`)
Recordings: static thumbnail + duration + consent bar ("Playing this video loads it from YouTube,
which transfers data to Google. Privacy statement") with "Load video"; after the click, embed from
`youtube-nocookie.com`. "Watch on YouTube" link always available. Slides & posters: cards with
first-page thumbnail, kind badge, date/venue, speaker, links, Zenodo DOI chip if present.

### Teaching (`Teaching`)
The course path (four stages, select a course to see
description, suggested next courses and connected themes; filter by winter/summer), "Try it"
(the selected course's demo or centrepiece, with chips to jump to any demo; spec in
`docs/DEMOS.md`), open material links, "Ready for research?" band.

### Theses & internships (`Theses`)
Hero with eligibility note (Uni Bremen students only). Theme cards (name and description, no
one-liner above, as it said the same twice; selecting shows ongoing/completed theses in that
theme, helpful courses, links). "How to reach out" in three
steps + peach box with what to include. "Theses with us": In progress, then by year; filter BSc/MSc;
TU Darmstadt and co-supervision noted. Internships: what we offer / what we can't offer, past
interns. No list of open topics (topics are developed with each student).

### News (`News`)
Type filters (Everything, Papers & awards, People, Funding & projects, Opportunities). Latest five
in a bento grid where each tile takes the shape of its type (award with teaser figure, welcome with
photos, paper with figure, funding on teal). Earlier items as a month timeline with type icon,
chip and a direct link ("Paper →", "Profile →"). News items have no pages of their own: an item's
text opens in place under "Read more" (`<details>`), and `/news/#<id>` opens it. Opportunities
show "Closed" after their deadline. Bento tiles without a figure preview the beginning of their
text in the room their row leaves (plain text fading out, hidden from screen readers, which read
the full text in "Read more"; five lines on phones); an opened text grows only its own tile, the
others keep their closed height (Martin, November 2026). One text is open at a time; when opening
one closes an open text further up, that one closes at once and the page keeps the pressed
"Read more" in place, so the page does not jump (Martin, November 2026).
"Show earlier years" instead of pagination. RSS feed at `/news/rss.xml`.

## Motion

| Element | Behaviour | Reduced motion |
| - | - | - |
| Hero figure | 8 s loop on a canvas: observations travel from the dot field into the network, a novel one makes it grow, later it sheds a node; bands widen while uncertain | static frame (`/hero-network.svg`, the same code at the moment of growth) |
| Rolling word | cycles every ~2.5 s with a short slide | first word only |
| Cards/links | subtle colour transitions only | none |
| Page changes | old page fades out, new one fades in rising 12 px; header stays; a member's photo moves from the team grid to the profile (cross-document view transitions, `base.css`) | plain page change |
| Paper figures | the thumbnail grows into the large figure and back (same-document view transition, `FigureViewer`) | appears at once |
| "Read more" | the text slides open and closed; in news tiles the preview folds away at the same time | opens at once |
| Research map | papers glide, edges follow, highlights fade; new papers fade in, leaving ones fade out | switches at once |
| Filters (Publications, News, profile themes, thesis degrees) | entries that stay slide to their new place, leaving ones fade out quickly, new ones fade in just after (`src/lib/motion.ts`); typing in the search field filters at once | switches at once |
| Panels (Teaching course path and "Try it", thesis themes, profile tabs) | a panel that replaces another fades in rising 8 px; the old one goes at once (`revealPanel`); not on page load | switches at once |
| Phone menu | slides down when opened, back up when closed | opens and closes at once |
| "Show earlier years" (News) | slides open; opened by a link to an older item, at once | opens at once |

Pure CSS where possible. Pause the hero figure when it is off-screen (IntersectionObserver).
