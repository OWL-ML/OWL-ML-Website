# Course demos and teaching centrepieces

Each lecture course has one small interactive demo. It appears in the "Try it" section of the
Teaching page, on a permanent page of its own (for lecture slides and QR codes), and as an offline
single file Martin can open in a lecture hall without network. Courses that are not lectures
(seminars, the MOCCA project, guided research, theses) get a non-demo centrepiece instead.

This file is the spec for both. The prototypes were agreed with Martin in October 2026.

## Scripts for the demos' data

The prototypes, their offline copies and screenshots (`design/demos/`, `design/mockups-source/`,
`design/screenshots/`) were removed from the repository in November 2026; the site's demos are the reference now.

| Path | What it is |
| - | - |
| `tools/demos/make_alice_corpus.py` | Rebuilds the next-word corpus from NLTK's Gutenberg zip (reproduces the prototype's tokens exactly) |
| `tools/demos/pytrace.py` | Runs the four Python snippets under `sys.settrace` and writes their step-by-step states to JSON |
| `tools/demos/forget_core.js`, `forget_test.js` | The forgetting demo's maths (MLP, Adam, replay, EWC) and a Node script that reproduces the numbers below |

## Rules for every demo

1. **One idea, discovered by doing.** Each demo has one learning point the visitor should find
   themselves: one knob that changes one thing, a prediction before the reveal, or a naive
   baseline that visibly fails before the remedy.
2. **Runs entirely in the browser, offline.** No network requests after the page has loaded, no
   third-party code, no external fonts. Data is either computed in the browser or shipped as a
   static file next to the demo. (CLAUDE.md rule 3.)
3. **No scores about people.** Demos may show model accuracy or energy, never a score of the
   visitor, a leaderboard, a counter of visitors or "x% of people guessed right". Nothing is
   stored or sent.
4. **Honest numbers.** Every constant that describes the real world has a source shown in the demo
   (footprint) or comes from running the real thing (Python traces). Simplifications are stated in
   the demo's own text.
5. **Light.** Each demo is a lazily loaded island (`client:visible`); nothing loads until it
   scrolls into view. Budget: under 60 KB of JavaScript per demo (gzipped), plus data. Training
   or animation pauses when the demo is off-screen.
6. **Accessible.** Real buttons and labelled sliders, keyboard operable, visible focus, a text
   alternative for every visual (an `aria-live` summary such as "Task A accuracy dropped from 100%
   to 5%"), and `prefers-reduced-motion` respected (animations jump to their end state).
7. **Permanent address.** Each demo has a slug (below) that never changes, because it is printed
   in lecture slides and QR codes.

## The demos

### `next-word` · Guess the next word · AI: Transforming Computer Science

Learning point: a language model predicts the next word from counts of what followed before;
more context makes it fluent and, quickly, a copier of its training text.

- **Data:** *Alice's Adventures in Wonderland* (Lewis Carroll, 1865, public domain), from
  `carroll-alice.txt` in NLTK's Gutenberg corpus. `tools/demos/make_alice_corpus.py` drops the
  title and chapter headings, lower-cases, and tokenises with
  `[a-z]+(?:[-'][a-z]+)*|[.,!?]` → 30,519 tokens, 2,653 distinct. Ship as
  `public/demos/next-word/alice-tokens.txt` (~140 KB, ~45 KB gzipped) and fetch it when the demo
  becomes visible; count bigrams and trigrams in the browser (takes milliseconds).
- **Model:** context of 1 word (bigram) or 2 words (trigram, falling back to bigram when the pair
  never occurs, and saying so). Sampling with temperature T: p(w) ∝ count(w)^(1/T), T from 0.1
  to 2.0.
- **Interaction:** start text (unknown words rejected with a message naming the word), five
  starter chips, "Add a word", "Add ten words", the five most likely next words as clickable bars
  with percentages, context switch 1 / 2 words, temperature slider with a one-line hint (low /
  around 1 / high).
- **"Copied from the book":** the longest run of generated tokens that occurs verbatim in the
  corpus (two-pointer scan with `indexOf` on the space-joined corpus). The box is hidden until
  such a run is five tokens long; then it shows the quote, and turns darker from eight.
- **Display:** punctuation attaches to the previous word; sentence starts, "I" and "Alice" are
  capitalised; generated words have a peach background, the user's start text does not.
- **Checks:** counts and probabilities for a fixed context match a direct count in the corpus;
  T → 0.1 picks the most frequent word; the copy detector finds a planted 8-word quote; an unknown
  start word shows the message and keeps the previous text. (By hand: with 2-word context, "Add
  ten words" a few times usually produces a copied run of five or more words.)

### `watch-it-forget` · Watch it forget · Lifelong Machine Learning

Learning point: catastrophic forgetting, and the stability–plasticity trade-off of two remedies.

- **Data:** two tasks of 60 points each (seeded PRNG, seed 3). Task A on the left (x ∈ [-1.6, -0.4]),
  task B on the right (x ∈ [0.4, 1.6]), y ∈ [-1, 1] with a margin |y| > 0.15. Label = "upper half";
  task B flips the labels (orange on top in A, teal on top in B).
- **Model:** 2-16-16-1 tanh MLP with sigmoid output, cross-entropy, full batch, Adam (lr 0.02),
  300 steps per task, trained live in the browser (5 steps per 16 ms frame).
- **Strategies while learning B:** Nothing; Replay (8 fixed points of A, ringed in the plot,
  mixed into B's batch); EWC with the empirical Fisher of A, normalised by its maximum, strength
  λ ∈ {10, 30, 100, 300, 1000, 3000} on a slider (default 100).
- **Interaction:** "1 · Learn task A" → "2 · Learn task B" → "Back to after task A" (retry with
  another strategy from the same A solution) and "Start over". The background heatmap (36 × 24
  cells) shows the network's answer everywhere; accuracy bars show "before → after" for A.
  A short note explains each outcome.
- **Expected numbers** (data seed 3, network seed 103, replay points from seed 10; reproduced by
  `node tools/demos/forget_test.js`, row for seed 3; the other seeds show the same pattern): after A, A = 100%. After B with nothing: A 5%, B 100%.
  Replay: A 90%, B 100%. EWC λ = 100: A 75%, B 100%; λ = 300: A 100%, B 90%; λ ≥ 1000: A 100%,
  B ≤ 15% (too stable to learn B). Unit-test these with a tolerance of ±5 points.

### `training-footprint` · Training footprint · Sustainable AI

Learning point: which choices dominate the footprint of training (where the electricity comes from,
how many runs you do), and that the estimate is a lower bound.

- **Formula:** kWh = GPUs × rated power × average load × hours × PUE × runs;
  kg CO₂e = kWh × grid intensity / 1000. The formula is printed with the current numbers.
- **Inputs:** GPU (RTX 4090 450 W, RTX 5090 575 W, RTX 6000 Ada 300 W, A100 SXM 400 W,
  H100 SXM 700 W; manufacturers' rated board power), number of GPUs 1–64, training time per run
  (1 h, 6 h, 1 day, 3 days, 1 week, 2 weeks, 1 month, 3 months), runs 1–50 ("the final model is
  rarely the only one trained"), average load 30–100% in steps of 5, PUE 1.00–2.00 (default 1.56),
  electricity source.
- **Grid intensities (g CO₂e/kWh):** German mix 2024: 363 (Umweltbundesamt estimate, CO₂ only);
  EU 2024: 211 (Ember via Our World in Data); wind 11, solar PV 48, gas 490, coal 820 (lifecycle
  medians, IPCC AR5 WG3 Annex III, 2014). PUE 1.56: Uptime Institute Global Data Center Survey
  2024. All sources are listed in the demo.
- **Defaults:** 4 × RTX 6000 Ada, 3 days, 1 run, 70% load, PUE 1.56, German mix → 94 kWh, 34 kg.
  Use this as a unit test.
- **Display:** electricity and emissions tiles, then "The same runs, powered differently": one bar
  per source, current one in orange, bars scaled to coal.
- **Update yearly:** the German and EU values are for 2024. When newer official values exist,
  update them with their source and year (open a pull request; Martin confirms).

### `step-through-python` · Step through Python · Python Block Course

Learning point: names refer to objects; assignment never copies.

- **Snippets** (in `tools/demos/pytrace.py`): two names for one list; `+=` on a string and on a
  list; a mutable default argument; lambdas made in a loop. Each has 3–4 answer options, the
  correct one, and a two-sentence lesson.
- **Traces are recorded, not simulated:** `python3 tools/demos/pytrace.py traces.json` runs every
  snippet under `sys.settrace` and stores, for each executed line, the frames (names → object
  labels), the objects (lists, strings, functions with their defaults) and the output so far.
  The script records the Python version shown in the demo. Commit the generated JSON
  (`src/demos/step-through-python/traces.json`); CI does not need Python. Add an `npm run
  demos:traces` script that regenerates it, and a test that the recorded final output of each
  snippet equals its marked correct option.
- **Interaction:** snippet tabs; options (or "Just show me"); verdict and lesson; then Back / Next
  step through the trace with the current line marked; Names and Objects panels, where an object
  that more than one name or object points to has an orange label, and changed or new entries are
  highlighted; "Printed so far".

### `data-to-noise` · From data to noise · Deep Generative Models

Learning point: the forward diffusion process blends data into Gaussian noise; a model learns the
reverse.

- 160 two-moons points (fixed seed), x_t = sqrt(ᾱ_t)·x_0 + sqrt(1 − ᾱ_t)·ε with the cosine
  schedule ᾱ(t) = cos²(((t + 0.008)/1.008)·π/2) / cos²((0.008/1.008)·π/2), t ∈ [0, 1] on a slider.
  ε is fixed per point so the slider is reversible.

### `leaderboard-depends-on-you` · The leaderboard depends on you · Advances in Lifelong Learning Machines

Learning point: one leaderboard number hides trade-offs; which method comes out best depends on
what you ask of it, so read the evaluation before the claim. (Added October 2026; no prototype.)

- Four made-up methods (A–D) scored 1–10 on accuracy, little forgetting, small memory, low
  compute and keeping no raw data (higher is better on each). The demo says the numbers are made
  up; they describe no real method and must not be replaced by numbers that look like results.
- A method's score is the weighted average of its five properties; weights run from "Not at all"
  to "Matters most" (0–3). The default is the leaderboard view (accuracy only).
- Four presets, and each puts a different method first (tested): accuracy only → A; never forget
  (accuracy and forgetting) → D; accurate, stable and small → C; everything equally → B.
- "Can you put each method first?": badges tick when a method has been first in this visit.
  Nothing is stored or sent.
- Ties for first place are shown as tied; with no weight set there is no ranking.

### `does-efficiency-save-energy` · Does efficiency save energy? · Modern Perspectives on AI Sustainability

Learning point: an efficiency gain per query says little about the total footprint until you ask
how usage responds. (Added October 2026; no prototype.)

- The model is twice as efficient per query. Usage responds to cost with a constant elasticity
  e (0–2 on a slider), cost follows energy: energy per query 50, queries 100·2^e, total
  100·2^(e−1), today = 100. No real-world numbers.
- Guess first: "It halves" / "falls, but by less than half" / "stays the same" / "rises". Each is
  right for some e (0, 0.5, 1, 1.5: tested); the guess sets the slider there. "Just show me"
  skips the guess.
- Regimes: no rebound (e = 0), partial (e < 1), full (e = 1), backfire (e > 1, Jevons' paradox).
  Bars with a "today" mark and a curve of total energy against e.

### `dial-in` · Dial in the espresso · MOCCA project

Learning point: with few, noisy measurements, a model has to balance trusting its predictions
against collecting data where it is unsure. (Added October 2026; no prototype. Built from the
course's own set-up, not from student data or results: no names, data or figures from reports.)

- Simulated machine: pull time = 30 s · e^(−0.083·(grind − g0)) · (dose / 18 g)^1.5 with
  multiplicative noise (sd 0.06 in log), grind 1–30 (1 = finest), dose 14–20 g in 0.5 g steps.
  Three beans with g0 = 7, 17, 11. Only the directions are real; the demo says so.
- Good shot: 20–35 s (rule of thumb from the course slides). Budget: 8 shots per bean.
- Model: Gaussian process on log pull time, squared-exponential kernel, prior mean 30 s. Shots
  of earlier beans enter with larger noise ("rough hints"). Map views: chance of a good shot,
  predicted pull time, uncertainty. "Model's best guess" = highest chance; "Explore where it
  knows least" = largest uncertainty. "Show the true window" draws the machine's real 20 s and
  35 s lines.
- Tested: following the best guess finds a good shot within the budget for every bean and 25
  seeds; explore moves away from existing shots; the model is sure near shots, unsure far away.

## Building them on the site (phase 5b)

```
src/demos/
  registry.ts                 slug -> { title, course, texts, data files } (plain data)
  loaders.ts                  slug -> lazy import of its ui.ts (demos without one show the fallback)
  frame.ts                    title/intro/notes HTML, shared by the site and the offline files
  demo.css                    shared demo styles (global: the islands build their markup in JS)
  next-word/core.ts           pure logic, no DOM (unit-tested in tests/next-word.test.mjs)
  next-word/ui.ts             island: mount(root, host) renders, wires events, calls core
  next-word/next-word.css
  watch-it-forget/...         same pattern
public/demos/next-word/alice-tokens.txt
src/components/demos/DemoFrame.astro        frame + static fallback + lazy loader
src/pages/teaching/demos/index.astro        list of all demos
src/pages/teaching/demos/[slug].astro       one demo on a plain page, with QR code
scripts/demos-offline.mjs                   npm run demos:offline
```

- **Pure core, thin island.** Port each prototype's logic into `core.ts` (plain TypeScript,
  no DOM, no framework) and write the UI as a small vanilla-TS island. Do not reuse the prototype
  markup or its inline styles; use the design tokens. The prototypes' behaviour, texts and numbers
  are the spec.
- **Static fallback.** Without JavaScript each demo shows its title, the explanatory text and a
  screenshot (`src/assets/demos/`), so the page still says what the demo is.
- **Teaching page.** The "Try it" section shows the demo of the course selected in the course path
  (course → demo via `courses.yml: demo`), plus chips to jump straight to any demo. Only the
  selected demo is loaded. For courses with a `centrepiece` instead, show that (see below).
- **Demo pages.** `/teaching/demos/<slug>/`: the demo, a link back to the course, and a
  "Show QR code" button that reveals a QR code of the page's address (generated at build time as
  inline SVG). These are the addresses for slides.
- **Offline export.** `npm run demos:offline` writes one self-contained HTML file per demo to
  `dist-offline/` (island bundled with esbuild into one inline script, fonts inlined as data URLs,
  data inlined). CI checks that the export still
  builds on every pull request that touches `src/demos/`; run it locally to get the files.
- **Tests.** Unit tests for each `core.ts` (the checks above); a Playwright test per demo that
  clicks through the main path with no console errors and no network requests after load; axe
  checks on the demo pages.

**Done when** the demos behave as specified here, pass the tests above, load nothing until
visible, work by keyboard, and the offline files open from disk without network.

## Centrepieces for courses without a demo

Seminars, projects and research modules are not taught through a single idea, so they get
something that shows what happens in them instead. These replace the demo slot in "Try it" when
such a course is selected, and also appear on their own on the Teaching page. Everything below is
a proposal agreed in principle; the content comes from Martin and the students and must never be
invented. Until content exists, the slot shows the short placeholder text from the mockup.

### `dimensions` · The questions behind the readings (seminars)

Seminar readings change every run and are not published (they are on Stud.IP). What stays is
the handful of guiding questions the papers are chosen around. They are shown as one disclosure
per dimension with its questions and a link to the lab's publications in the theme it belongs to
(`/publications/?theme=<id>`), which keeps itself current from `publications.bib`. No papers,
terms, dates or student names. Written once, in the course's entry in `courses.yml`, and changed
only when the seminar's framing changes:

```yaml
demo: leaderboard-depends-on-you      # a seminar may have a demo; the dimensions are then shown below it
dimensions:
  - name: Memory
    questions: >-
      What constitutes memorable data points? ...
    theme: mc            # optional; the mapping to themes is Martin's decision
```

A seminar without a demo uses `centrepiece: dimensions`; without `dimensions` yet it shows a
placeholder. (An earlier idea, a per-semester "question we argued about", was dropped in October
2026 to avoid recurring handwork.)

### `showcase` · What students built (projects)

Not in use since October 2026: the MOCCA project has the `dial-in` demo instead. The collection
and its consent check stay, so consented project results can be added later. A gallery of earlier project results, only with the students' consent: title, one-paragraph
description, an image or short video (self-hosted, or two-click YouTube like the Talks page),
term, and links (code, report). Filter by term. Student names only if each student agreed.

- **Content file:** `src/content/teaching/showcase/<term>-<slug>.md` with `course`, `term`,
  `title`, `image`, `video`, `links`, `credit` (optional, names as the students want them),
  `consent: true` (required; the build fails without it).

### `theses` · Guided research and theses

No demo. The slot shows the four research themes as small cards (one-liner above the name, as on
the thesis page) and links to the thesis page's "How to reach out". No list of open topics:
topics are developed with each student.

## Using demos in lectures

- **In Keynote:** a slide with a button-like shape linked to `/teaching/demos/<slug>/`, plus the
  QR code from the demo page, so students can try it on their own laptops. Clicking opens the
  demo in the browser; Cmd-Tab returns to Keynote.
- **Offline:** keep the files from `dist-offline/` on the lecture
  laptop. They open from disk in any current browser and need no network.
- **Never rename a slug** once it has been used in a slide; add a redirect if a demo must move.

## Adding a new demo

Martin (or a member) opens an issue with the "New course demo" form (`.github/ISSUE_TEMPLATE/`) containing:

1. Course and lecture it belongs to.
2. The one thing a student should discover, in one sentence.
3. The interaction: the knob, the prediction, or the baseline that fails.
4. What must be real (data, constants, measured behaviour) and where it comes from.
5. What it must not suggest (simplifications to state in the text).

Claude then builds it in one pull request: `core.ts` with unit tests, the island, the demo page,
the offline file, a screenshot, and an entry in `registry.ts`; the course's `demo` field is changed
only if Martin says the new demo replaces the current one (a course may also list several demos:
`demo: [next-word, ...]`, the first is shown in "Try it"). The pull request description states the
learning point, every number and its source, and anything simplified.
