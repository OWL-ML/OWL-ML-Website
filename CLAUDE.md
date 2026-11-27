# OWL-ML website — instructions for Claude

This repository is the website of the Open World Lifelong Machine Learning Lab (OWL-ML),
Universität Bremen, Faculty 3 (Mathematics and Computer Science). Lab head: Prof. Dr. Martin Mundt.
Lab members edit their own content here, and Claude edits on their behalf through pull requests.

Read this file fully before every task. For anything larger than a small content edit, also read
the relevant file in `docs/`:

| Topic | File |
| - | - |
| Planned work after launch | `docs/ROADMAP.md` |
| Content files, fields and validation rules | `docs/CONTENT_MODEL.md` |
| Visual design, components, pages, motion | `docs/DESIGN.md` |
| Course demos and teaching centrepieces | `docs/DEMOS.md` |
| Hosting and deployment | `docs/DEPLOYMENT.md` |
| How members contribute | `docs/CONTRIBUTING.md` |

## Stack

- Astro (current stable), TypeScript, static output only (`output: 'static'`). No server code.
- Plain CSS with custom properties (design tokens in `src/styles/tokens.css`). No CSS framework.
- Interactive parts are small Astro islands in vanilla TypeScript. Keep dependencies few and boring:
  a successor (a PhD student, years from now) must be able to maintain this.
- Fonts are self-hosted via `@fontsource` packages: Bricolage Grotesque, IBM Plex Sans, IBM Plex Mono.
- Content lives in `src/content/` and `src/data/` and is validated with Astro content collections + zod.

Commands: `npm run dev` (preview at http://localhost:4321), `npm run build`, `npm run check`
(type and schema checks, lint), `npm run test` (unit tests), `npm run verify` (on the built site:
internal links, accessibility, interactions), `npm run screenshots` (1440 and 390 px).

## Non-negotiable rules

1. **Never invent facts.** No made-up author lists, dates, venues, roles, bios, quotes, numbers or
   course details. If something is unknown, use a visible placeholder in square brackets, e.g.
   `[Room]`, and list it under "Open questions" in the pull request description.
2. **No metrics about people or output.** Never show counts of papers, talks, theses, citations or
   students; no rankings, "top" lists, h-indices or "most active" sorting. Collaborators are listed
   alphabetically. All edges in the research map have the same weight. Filters describe what is
   shown in words ("Filtered to Memory & Consolidation"), never "Showing 3 of 17".
3. **No third-party requests from visitors' browsers by default.** No analytics, no tracking, no
   CDN fonts or scripts, no hotlinked images. YouTube loads only after an explicit click
   (two-click embed via `youtube-nocookie.com`). External data (Semantic Scholar, ORCID, arXiv,
   Zenodo) is fetched at build time or by scheduled jobs that open pull requests — never live.
4. **Accessibility is part of "done":** WCAG 2.1 AA (the university must meet BITV). Real
   `<button>`/`<a>` elements, visible focus, alt text, `prefers-reduced-motion` respected, text
   contrast at least 4.5:1 (3:1 for text 24px and larger). Small orange text on dark teal uses the
   light peach `--peach-light` (#F3B585), never full orange.
5. **Logos are used as supplied** (`public/brand/`; the Universität Bremen logo in `src/assets/brand/`, so it
   is served at the size shown): the OWL-ML wordmark and the owl with their
   original black strokes, only on light backgrounds or where the orange owl body carries them;
   the Universität Bremen logo unchanged, on white only. Project logos (`src/assets/projects/`)
   likewise exactly as supplied by the project. Do not recolour, invert or redraw them.
6. **Theme tags are editorial decisions.** When you assign themes during migration or for new
   content you weren't told how to tag, mark them for review (see `docs/CONTENT_MODEL.md`) and
   list them in the pull request. Martin decides.
7. **Personal data:** only publish what members put in their own files. Students on the theses
   list appear by name only (as on the old site); no grades, emails or photos of students who are
   not lab members. Visitors, interns and former members are named without links to personal
   pages (those pages move or disappear when people leave); a link to their institution or group
   is fine. Never commit the raw WordPress export, emails, passwords or tokens.

## The four research themes (display in this order)

| id | Name | Short tag | One-liner |
| - | - | - | - |
| `gd` | Generative & Dynamic Models | Generative & dynamic | Models that reshape themselves as they learn |
| `mc` | Memory & Consolidation | Memory & consolidation | How knowledge is stored and made to last |
| `cl` | Continual Machine Learning | Continual learning | Learning that builds on what came before |
| `pai` | Participatory AI | Participatory AI | Learning systems shaped with those they affect |

The single source of truth is `src/data/themes.yml`. Never hard-code theme names in components.

## Working conventions

- One branch and one pull request per task or build phase; small, reviewable diffs.
- Pull request description: what changed, how to check it, and "Open questions" / "Needs review"
  sections.
- Screenshots: none until launch; everyone checks changes locally with `npm run dev`. After
  launch, only pull requests that change layout or components include screenshots of the changed
  pages (desktop 1440px and phone 390px, `npm run screenshots`); content edits need none. Put them
  on the branch `screenshots/pr-<number>` and link them from the description; that branch is
  deleted automatically when the pull request is merged or closed.
- Run `npm run check`, `npm test`, `npm run build` and `npm run verify` before opening a pull
  request; fix every failure. CI runs the same checks. Performance budget: Lighthouse performance,
  accessibility, best practices and SEO at least 95 on the homepage (`scripts/lighthouse.mjs`).
- Content edits by members: change only the files the request concerns. If a request is ambiguous
  or would touch someone else's profile, ask in the issue instead of guessing.
- Demo slugs (`/teaching/demos/<slug>/`) are printed in lecture slides: never rename one without
  a redirect.
- Language: site text in English, plain and precise, no marketing tone. The site is English only
  for now (no language switch). Legal notice and privacy statement are one English page
  (`/legal/`) that links the university's German statements as the binding versions; the
  accessibility statement is an English page too (`/accessibility/`). The structure must allow
  adding German versions of all pages later.
