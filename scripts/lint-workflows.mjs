// Checks the GitHub Actions workflows (.github/workflows/*.yml) with actionlint, so a typo in a
// workflow fails `npm run lint` instead of surfacing only when the workflow runs.
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const { createLinter } = createRequire(import.meta.url)('actionlint');
const lint = await createLinter();
const dir = '.github/workflows';
// GitHub-hosted runner labels newer than the list built into the actionlint npm package
// (its last release predates them).
const newerHostedLabels = ['ubuntu-24.04'];
const isNewerHostedLabel = (r) =>
  r.kind === 'runner-label' && newerHostedLabels.some((l) => r.message.startsWith(`label "${l}"`));
let problems = 0;
for (const f of (await readdir(dir)).filter((f) => /\.ya?ml$/.test(f))) {
  for (const r of lint(await readFile(`${dir}/${f}`, 'utf8'), `${dir}/${f}`)) {
    if (isNewerHostedLabel(r)) continue;
    problems++;
    console.log(`✖ ${dir}/${f}:${r.line}:${r.column} ${r.message} [${r.kind}]`);
  }
}
if (problems) process.exitCode = 1;
else console.log('Workflows OK.');
