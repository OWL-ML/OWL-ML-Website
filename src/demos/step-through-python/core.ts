// Step through Python (docs/DEMOS.md): four Python snippets with traces recorded by running
// them under sys.settrace (tools/demos/pytrace.py → traces.json; regenerate with
// `npm run demos:traces`). Pure logic, no DOM: unit-tested in tests/step-through-python.test.mjs.

export type Value = { prim: string } | { ref: string };

export interface Step {
  /** the line about to run, or null when the program has finished */
  line: number | null;
  frames: { name: string; vars: { name: string; v: Value }[] }[];
  heap: { label: string; type: string; text: string }[];
  /** output printed so far */
  out: string;
}

export interface Snippet {
  id: string;
  title: string;
  code: string;
  options: string[];
  /** index of the correct option */
  answer: number;
  lesson: string;
  steps: Step[];
  output: string;
}

export interface Traces {
  python: string;
  snippets: Snippet[];
}

const LABELS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫';

/** How many names and objects point to each object label in this step. */
export function refCounts(step: Step): Record<string, number> {
  const n: Record<string, number> = {};
  for (const f of step.frames)
    for (const v of f.vars) if ('ref' in v.v) n[v.v.ref] = (n[v.v.ref] ?? 0) + 1;
  for (const h of step.heap)
    for (const ch of h.text) if (LABELS.includes(ch)) n[ch] = (n[ch] ?? 0) + 1;
  return n;
}

/** Objects that more than one name or object points to (shown with an orange label). */
export function shared(step: Step): Set<string> {
  return new Set(
    Object.entries(refCounts(step))
      .filter(([, c]) => c > 1)
      .map(([l]) => l),
  );
}

export type Change = 'new' | 'changed' | null;

/** Whether each object is new or changed compared with the previous step. */
export function changes(step: Step, prev: Step | null): Record<string, Change> {
  const before = new Map(prev?.heap.map((h) => [h.label, h.text]) ?? []);
  const out: Record<string, Change> = {};
  for (const h of step.heap) {
    if (!prev) out[h.label] = null;
    else if (!before.has(h.label)) out[h.label] = 'new';
    else out[h.label] = before.get(h.label) !== h.text ? 'changed' : null;
  }
  return out;
}

export const frameName = (name: string) => (name === 'Global' ? 'Global names' : `Inside ${name}`);

/** The verdict after a guess: `choice` is the option index, or -1 for "Just show me". */
export function verdict(sn: Snippet, choice: number): string {
  const right = sn.options[sn.answer];
  if (choice === -1) return `It prints ${right}.`;
  return choice === sn.answer ? `Right, it prints ${right}.` : `Not quite, it prints ${right}.`;
}

export function stepLabel(sn: Snippet, k: number): string {
  const step = sn.steps[k]!;
  const of = `step ${k + 1} of ${sn.steps.length}`;
  return step.line === null ? `finished · ${of}` : `${of} · next line ${step.line}`;
}

/** The program's real output in the form the options use ("owl, then [1, 2]"). */
export const outputAsOption = (sn: Snippet) => sn.output.trim().split('\n').join(', then ');
