# Content model

Everything on the site is generated from the files below. Members edit these files (usually with Claude
Code on their own computer); pages are never edited by hand to change content. All files are validated at build time:
an unknown member id, theme id or course id fails the build, so mistakes cannot reach the live site.

```
src/
  data/
    site.yml            site name, story text, contact, address, social links
    themes.yml          the four research themes (single source of truth)
    publications.bib    all publications (BibTeX with custom fields)
    courses.yml         courses (when taught, where they lead, demos)
    theses.yml          ongoing and completed theses
    internships.yml     internship programmes and past interns
    projects.yml        larger research projects the lab is part of (homepage)
    redirects.yml       old WordPress URLs -> new URLs (generated during migration)
  content/
    people/<id>.md      one file per person (current members and alumni)
    talks/<date>-<slug>.md
    news/<date>-<slug>.md
    teaching/showcase/<term>-<slug>.md      project results shown with consent (docs/DEMOS.md)
  assets/
    people/<id>.jpg     member photos (square, >= 800 px, with consent)
    papers/<bibkey>.webp  paper thumbnails (teaser figures)
    talks/<slug>.webp     first-slide thumbnails
    projects/<id>.png     project logos, exactly as supplied by the project
public/
  brand/                logos as supplied (see CLAUDE.md rule 5)
```

Ids are lowercase ASCII with hyphens: `mundt`, `storch`, `vale-sousa`. Person ids never change once
used, even if a name changes (the display name changes, the id stays).

## themes.yml

```yaml
- id: gd
  name: Generative & Dynamic Models
  short: Generative & dynamic
  oneliner: Models that reshape themselves as they learn
  description: >-
    Models that generate and express uncertainty, and networks that grow, branch and merge
    their structure.
  map: { x: 140 }          # horizontal anchor in the research map (0-1000)
- id: mc
  ...
```

Order in the file = display order everywhere. The issue forms in `.github/ISSUE_TEMPLATE/` list
the themes as checkboxes; a test fails until they match this file. Names and one-liners are
Martin's decision; descriptions may still be refined.

## site.yml (excerpt)

```yaml
name: Open World Lifelong Machine Learning Lab
short: OWL-ML
tagline_words: [learning., adapting., growing., remembering.]   # rolling hero word
mission: >-
  We develop adaptive AI systems that continue learning throughout their lifecycles, ...
story: >-
  In order to equip machine learners with the ability for lifelong learning, several
  perspectives are required. In our lab, our work spans the models themselves, ...
story_map: The map below shows how our projects link these.   # homepage only, after `story`
pillars: [...]   # the three "Why open world lifelong machine learning?" cards
github_url: https://github.com/OWL-ML                    # footer "GitHub": the lab organisation
```

## people/<id>.md

```markdown
---
name: Martin Mundt
honorific: Prof. Dr.            # optional academic title, shown before the name wherever the person is presented (profile, team cards, map panel, "Works with", news links, member filter); not in author lists of papers
pronouns: he/him                # optional, shown next to the role
role: Professor, head of the lab
group: lead                     # lead | postdoc | phd | staff | student-assistant | visiting
status: current                 # current | alumni
since: 2023-04                  # optional, YYYY-MM
external: true                  # optional: based at another institution (listed after the lab's own members)
until:                          # set when someone leaves; status becomes alumni
photo: mundt.jpg                # file in src/assets/people/, optional (initials shown otherwise)
email: [address]
office: [Building, room]
office_hours: [Office hours]
contact_for:                    # staff only: what to contact them about, one line each
  - "[Responsibility]"
links:
  scholar: https://scholar.google.com/citations?user=...
  orcid: https://orcid.org/...
  github: https://github.com/...
  linkedin: https://www.linkedin.com/in/...
  website:
ids:                            # used by automated paper suggestions (later phase)
  semantic_scholar: "..."
  orcid: "0000-..."
themes: [gd, mc, cl, pai]       # declared themes (shown as chips, used in the map)
teaching: [traki, dgm, llml, nai]   # course ids from courses.yml
---
Bio in plain Markdown, written by the person (2-5 sentences).
```

Listing order on the People page and the homepage team: by `group` (lead, postdoc, phd, staff,
student-assistant, visiting); within a group the lab's own members first, then `external`
members, then people without `since`; within each of these by the year in `since`, then
alphabetically by family name. Alumni in a separate, collapsed section.
The id is the family name by convention, so it is used as the sort key (`vale-sousa` sorts
under V).

## publications.bib

Standard BibTeX plus these custom fields (all optional except `members`):

| Field | Meaning |
| - | - |
| `members` | Comma-separated person ids of lab authors, e.g. `{mundt, storch}`. Required. Links authors to profiles; never derive this from name matching. |
| `themes` | Comma-separated theme ids, e.g. `{mc, cl}` |
| `venue_short` | Short venue label for chips, e.g. `{ICML 2026}`; otherwise derived |
| `award` | e.g. `{Best Paper Honorable Mention}` |
| `note_type` | `{position}`, `{workshop}`, `{preprint}`, `{journal}` (shown as a small label) |
| `featured` | `{true}` to show on the homepage and in the default research map |
| `url` | Landing page of the paper (publisher, OpenReview, arXiv abstract), shown as "Paper" |
| `pdf` | PDF file. Not linked directly: without `url`, "Paper" links to its landing page (arXiv, OpenReview and PMLR addresses are converted; `src/lib/paper-page.ts`), else to `arxiv` or `doi` |
| `code`, `project`, `slides`, `video` | URLs |
| `links` | Further links as `{Label=URL; Label=URL}`, e.g. `{ConCon Dataset=https://zenodo.org/records/10630482}` |
| `note` | Short note shown under the authors, e.g. equal contribution (standard BibTeX field, kept in exports) |
| `arxiv`, `doi` | identifiers (used for links and thumbnail extraction) |
| `thumbnail` | file name in `src/assets/papers/`, overrides the automatic one |
| `review` | `{themes}` while theme tags await Martin's confirmation (see below) |

Example:

```bibtex
@inproceedings{mundt2022clevacompass,
  title     = {{CLEVA-Compass}: A Continual Learning Evaluation Assessment Compass to Promote Research Transparency and Comparability},
  author    = {Mundt, Martin and Lang, Steven and Delfosse, Quentin and Kersting, Kristian},
  booktitle = {International Conference on Learning Representations (ICLR)},
  year      = {2022},
  members   = {mundt},
  themes    = {cl, pai},
  review    = {themes},
}
```

Author names are rendered from `author`; names whose position corresponds to a `members` id are
bold and linked. Match by order is not possible in general, so the parser matches each `members`
id against `people/<id>.md` names (family name + initial), and the build **fails** if a listed
member cannot be found in the author list, instead of guessing.

## talks/<date>-<slug>.md

```markdown
---
date: 2026-05-12
title: "[Talk title]"
event: "[Event]"
location: "[City]"
speakers: [mundt]
themes: [cl]
kind: talk                 # talk | poster | keynote | lecture
slides: https://doi.org/10.5281/zenodo.XXXX   # or a Nextcloud share link to the file
video: { youtube: "VIDEO_ID", duration: "42:10" }   # optional
thumbnail: 2026-05-12-slug.webp                     # first page, generated once
---
Optional abstract.
```

## news/<date>-<slug>.md

```markdown
---
date: 2026-06-29
type: award               # paper | award | people | funding | opportunity | event
title: Making a Name for Myself receives a Best Paper Honorable Mention at FAccT 2026
paper: bibkey             # for paper/award: pulls title, venue, teaser figure
people: [storch]          # for people: pulls names and photos
link:                     # optional link: external URL, or a path on this site (/theses/#internships)
deadline: 2025-11-16      # for opportunity: shown as "Closed" after this date
---
Optional body, a few short paragraphs. News items have no pages of their own: the body opens in
place under "Read more" in the news list, and `/news/#<id>` (the file name without `.md`) leads
to the item. Items without a body link straight to what they are about (the paper, the profile,
the project).
```

People who are in the lab only for a while (visitors, interns, students) and former members are
named without a link to a personal page; their institution or group can be linked.

News dated before `news_archive_before` in `site.yml` (2024-11-18, the move to Bremen) is listed
only on `/news/archive/` (linked as `/news/archive/#<id>`): not on the news page, the homepage,
profiles or the RSS feed.

## courses.yml

```yaml
- id: traki
  name: "AI: Transforming Computer Science"   # English, also for courses taught in German
  # name_en: optional English name for a name in another language (unused: the site is English only)
  kind: Lecture + Tutorial
  level: BSc, 1st semester   # shown in the course panel
  degree: BSc                # optional: BSc | MSc | BSc / MSc, short label in the course path
  language: de               # optional: en | de (teaching language)
  semester: winter           # winter | summer | both | any
  stage: foundations         # foundations | methods | perspectives | research
  description: >-
    How AI is transforming computer science ...
  next: [dgm, llml, nai]     # suggested follow-ups (not prerequisites)
  pairs: [python]            # optional: taken alongside or in alternation (one side is enough)
  themes: []
  demo: next-word            # slug from src/demos/registry.ts (lecture courses)
  # centrepiece: dimensions  # instead of demo: dimensions | showcase | theses
  # dimensions:              # seminars: guiding questions, see docs/DEMOS.md
  #   - { name: Memory, questions: "What constitutes ...?", theme: mc }
  #     # link_label: Dynamic Architectures   (optional: shorter words for "Our work on …")
  studip: https://...        # course page on Stud.IP
  materials:                 # optional: shown in the course panel
    - { title: Lecture slides, url: https://zenodo.org/... }
    - { title: Tutorial notebooks, url: https://github.com/... }
```

`semester` (winter, summer, both, any) says when a course is taught; nothing on the Teaching page
changes from term to term. Times, rooms, dates and enrolment are not published on the website:
they are on Stud.IP. The build rejects an `offerings` field with such details.

Courses have no pages of their own: each has a panel on the Teaching page (selected through
the course path, or linked as `/teaching/#course-<id>`) with its short description, `materials`
and where it can lead. Longer syllabi stay on Stud.IP. The course id `demos` is reserved
(`/teaching/demos/<slug>/` are the demo pages).

## theses.yml

```yaml
- student: Etienne Steuer
  title: Model Merging of Differently Sized Neural Networks
  degree: BSc                # BSc | MSc
  status: ongoing            # ongoing | completed
  date:                      # YYYY-MM for completed theses (YYYY if only the year is known)
  institution: Universität Bremen   # or TU Darmstadt
  note:                      # e.g. "co-supervised with ..."
  themes: [gd, mc]
  review: themes
  archive: true              # optional: supervised at TU Darmstadt before the move to Bremen
```

Theses with `archive: true` appear only on `/theses/archive/` (without theme tags), not on the
theses page.

## projects.yml

```yaml
- id: rai
  name: Reasonable AI (RAI)
  kind: Cluster of Excellence      # shown above the name
  start: 2026                      # first and last year, shown as "2026–2032"
  end: 2032
  summary: "A new generation of AI systems that learn in reasonable ways: ..."
  url: https://www.hessian.ai/projects/reasonable-ai-rai/
  logo: rai.png                    # in src/assets/projects/
```

Shown on the homepage under "Projects", in file order, with the years next to the kind of project. The summary is one or two sentences on the
research focus; partner institutions and who takes part are left to the project's own website, and
there are no member lists (Martin, November 2026). The name and the logo link to `url`. Logos are
used exactly as supplied by the project (CLAUDE.md rule 5): no recolouring or redrawing; cropping
away an empty border is fine. The logo is scaled to fit 130 × 64 px (96 × 48 px on phones), so
any shape works. Remove a project from the list when it ends.

## redirects.yml

Old addresses and where they lead now, one per line:
`- { from: "/teaching/llml25/", to: "/teaching/#course-llml" }`. The build turns every entry into
a small redirect page and an `.htaccess` rule (Apache); `from` may also be a query such as
`/?p=123`, which only `.htaccess` can handle. A target `/news/<id>/` means that news item in the
list; the build turns it into `/news/#<id>` or, for archived news, `/news/archive/#<id>`. Never
remove an entry: old links live on in slides, emails and other sites.

`migrated_from` (optional, people, news and course texts) records the address of an item on the
old site.

## Review markers

During migration and whenever Claude assigns themes that a member did not specify, set
`review: themes` (YAML) or `review = {themes}` (BibTeX). The build shows these normally, and
`npm run review` prints every item still awaiting review. Martin removes the marker when he agrees.

`review = {authors}` marks a paper whose author list is not known yet (`author = {{[Authors]}}`,
`members = {}`). Only then may `members` be empty; the paper is shown with "[Authors]" and is not
linked to any profile until the real authors and `members` are filled in. Several markers combine:
`review = {authors, themes}`. `review: facts` marks an entry with a fact still to be confirmed
(listed in the pull request). `npm run review` also lists every `[placeholder]` left in the content.

## Validation (build fails on any of these)

- unknown person id in `members`, `speakers`, `people`, `teaching` references
- unknown theme id anywhere; unknown course id in `next`, `pairs`, `teaching` or a teaching content file
- unknown demo slug in `courses.yml`; a course with both `demo` and `centrepiece`
- a showcase entry without `consent: true`; seminar `dimensions` without a `demo` or `centrepiece: dimensions`
- a `members` id not found in the BibTeX author list
- duplicate ids or duplicate BibTeX keys
- missing required fields; dates not in ISO format
- a photo, paper thumbnail or project logo referenced but missing
