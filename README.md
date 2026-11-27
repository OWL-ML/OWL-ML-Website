# OWL-ML website

Source of the website of the Open World Lifelong Machine Learning Lab, Universität Bremen.

- **Lab members:** see "Contributing in short" below; details in `docs/CONTRIBUTING.md`.
- **Maintaining the repository:** `docs/CONTRIBUTING.md` ("For maintainers"), `docs/DEPLOYMENT.md`.
- **Claude:** read `CLAUDE.md` first.

| Folder | Contents |
| - | - |
| `design/assets/` | Logos as supplied (`source/` holds the original EPS files) |
| `design/hero-network/` | The original script of the homepage's network figure (also renders it for slides) |
| `docs/` | Build plan, content model, design spec, deployment, contributing |
| `tools/demos/` | Scripts that produce the demos' data: corpus, Python traces, forgetting maths |

## Contributing in short

1. Clone the repository, make a branch, and make the change on your computer, usually with Claude
   Code in VS Code (details in `docs/CONTRIBUTING.md`). Small edits also work in GitHub's browser
   editor.
2. Open a pull request. The build checks the change; a maintainer reviews and merges it, and the
   site updates.
3. No time to do it yourself? **Issues → New issue** and pick a form (profile, paper, news, talk,
   demo, problem); a maintainer picks it up.

Only your own profile, only facts you know, no counts or rankings of anyone's output.

## Running the site on your computer

1. Install Node.js 22 or newer (the version is in `.nvmrc`). The easiest way is
   [nvm](https://github.com/nvm-sh/nvm#installing-and-updating):
   - macOS: `brew install nvm` (then follow the lines `brew` prints to add nvm to your shell), or
     use the install script from the nvm page (also for Linux);
   - Windows: the Node.js LTS installer from [nodejs.org](https://nodejs.org/), or
     [nvm-windows](https://github.com/coreybutler/nvm-windows).

   With nvm, run `nvm install` in the repository folder: it installs the version from `.nvmrc`.
2. Clone the repository and install the dependencies:
   ```bash
   git clone https://github.com/OWL-ML/OWL-ML-Website.git
   cd OWL-ML-Website
   npm install
   ```
3. Start the live preview with `npm run dev` and open http://localhost:4321. Pages reload when you
   save a file. Stop it with Ctrl+C.
4. Optional, for the checks that use a browser (`npm run verify`, `npm run screenshots`): install
   Playwright's Chromium once with `npx playwright install chromium`.

To look at a pull request, `git checkout <its branch>` before step 3.

The site itself is the Astro project in `src/`.

| Command | What it does |
| - | - |
| `npm run dev` | Live preview at http://localhost:4321 |
| `npm run build` | Checks all content, then builds the site into `dist/` |
| `npm run check` | Types, content schemas and references, lint, formatting |
| `npm test` | Unit tests (content validation, BibTeX, contrast) |
| `npm run review` | Everything awaiting review: theme tags, unknown authors, `[placeholders]` |
| `npm run interactions` | Browser checks of the interactive parts (keyboard, URL state, lazy loading, no external requests) |
| `npm run demos:offline` | One self-contained HTML file per course demo in `dist-offline/`, for lecture halls without network |
| `npm run links` | Every internal link and `#anchor` in `dist/` resolves (`links:external` also requests outside links; CI does that weekly) |
| `npm run a11y` / `npm run screenshots` | axe checks of every page / screenshots of the built site (`--all` for every page; needs Playwright's Chromium) |
| `npm run verify` | `links`, `a11y` and `interactions` together: run before opening a pull request |
| `npm run lighthouse` | Lighthouse budget for the homepage (phone and desktop, every category at least 95) |

The build also writes `sitemap.xml`, `robots.txt` and a share image for each section, member and
demo (`/og/…png`, from `src/lib/og.ts`), so there is nothing to maintain by hand.
