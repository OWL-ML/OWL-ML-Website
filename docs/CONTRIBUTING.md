# Contributing to the OWL-ML website

Everything on the website comes from small text files in this repository. You never edit pages
directly: you change a file (or ask for a change), a pull request is opened, the build checks it,
and once a maintainer merges it the site updates.

## Three ways

**1. Claude Code on your computer (the usual way).** Clone the repository, make the change with
Claude Code in VS Code, check it in the live preview and open a pull request. Claude runs on your
computer under your own Claude login; nothing about Claude is set up on GitHub. Details in the
next section.

**2. Edit in the browser.** Open your file on GitHub (e.g. `src/content/people/storch.md`), click the
pencil icon, edit, and choose "Create a new branch and start a pull request". Quickest for a typo
in a bio or a news item.

**3. Fill in a form.** On GitHub: **Issues → New issue**, then pick one:

| Form | For |
| - | - |
| Update my profile | bio, role, photo, links, themes, courses; leaving the lab |
| Add a paper | a publication with lab authors |
| Add news | paper, award, new member, funding, opportunity, event |
| Add a talk | talk, keynote, lecture or poster, with slides or a recording |
| New course demo | a proposal for an interactive demo (Martin decides) |
| Report a problem | something wrong, broken or hard to use |

A maintainer, or a lab member with Claude Code, turns the issue into a pull request.

## Working with Claude Code on your computer

With Claude Code (part of the team plan) you edit a copy of the site on your computer and see every
change in a live preview. Claude reads `CLAUDE.md` and `docs/` by itself, so it follows the same
rules as everyone else.

Once:

1. Set up the site as in the README, "Running the site on your computer" (Node.js via nvm,
   `git clone`, `npm install`), including `npx playwright install chromium` for the browser checks.
2. Make sure you can push to the repository (ask Martin for write access).

Each time:

1. Start from the latest version and make a branch for your change:
   ```bash
   git checkout main && git pull
   git checkout -b <short-name>        # e.g. profile-storch or news-iclr-paper
   ```
2. Run `npm run dev`, open http://localhost:4321 and start Claude Code in the repository folder.
   Say what you want changed; check the result in the preview.
3. Before pushing, let Claude (or yourself) run `npm run check`, `npm test`, `npm run build` and
   `npm run verify`, and fix what they report.
4. Push the branch and open a pull request (Claude can do both). Never push to `main` directly: the
   pull request is where the checks run and where Martin reviews and merges.
5. After the merge the branch is deleted on GitHub; locally, `git checkout main && git pull` and
   start again from step 1 next time.

Keep each pull request to one change, and to your own files unless you were asked otherwise.

## Where things live

| I want to... | File |
| - | - |
| update my profile, bio, links, photo | `src/content/people/<your-id>.md` (photo in `src/assets/people/`) |
| add a paper | `src/data/publications.bib` (include `members` and `themes`) |
| add a talk, slides, video | `src/content/talks/<date>-<slug>.md` |
| add news | `src/content/news/<date>-<slug>.md` |
| change a course | `src/data/courses.yml` (Martin) |

Field-by-field details: `docs/CONTENT_MODEL.md`.

## What happens to your change

- The build checks it. A typo in an id (a member, theme or course that does not exist), a missing
  photo or a date in the wrong format fails the check, and the pull request says what is wrong. Fix
  it in the pull request (Claude Code in your session can do it for you).
- CI also checks links, accessibility and the interactive parts. To see the changed pages, run the
  site on your computer (`README.md`, "Running the site on your computer") on the pull request's
  branch.
- Theme tags you did not choose yourself are marked `review: themes` until Martin confirms them.

## Good to know

- **Your own data only.** Your profile shows what you put in your own file. Photos: of yourself,
  square or close to it, at least 800 × 800 px (they are cropped to a square).
- **Themes:** the four ids `gd`, `mc`, `cl`, `pai` (names in `src/data/themes.yml`). If unsure, leave
  them out and say so.
- **Facts, not guesses.** Unknown details stay as visible `[placeholders]` until someone knows them.
- **Slides and posters:** link them permanently; a DOI is best.
- **No metrics:** the site never shows counts or rankings of anyone's output. Please don't add them.

## For maintainers

- **Owners and access.** Keep at least two owners of the GitHub organisation, so the site survives
  staff changes. Lab members get the **Write** role (needed to push branches).
  Members open pull requests; only a maintainer merges.
- **No Claude integration on GitHub** (decided November 2026): no API key or Claude app is set up
  there. Members use Claude Code locally with their own login.
- **Labels.** The issue forms set the labels `content`, `demo` and `bug`; create them (Issues →
  Labels) in a new repository.
- **Review markers.** `npm run review` lists every theme assignment and fact still waiting for
  confirmation, and every `[placeholder]` left in the content.
- **Hosting, domain and redirects:** `docs/DEPLOYMENT.md`. Planned work: `docs/ROADMAP.md`.
