// End to end: a broken reference must stop `astro build` with a readable message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { copyProject, editEntry } from './helpers.mjs';

function build(dir) {
  return spawnSync(process.execPath, [join(dir, 'node_modules/astro/bin/astro.mjs'), 'build'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  });
}

test(
  'astro build fails on an unknown theme and an unknown member',
  { timeout: 120_000 },
  async () => {
    const p = await copyProject({ withNodeModules: true });
    try {
      await p.edit('src/content/people/storch.md', (t) =>
        t.replace('themes: [cl, gd]', 'themes: [memory]'),
      );
      await p.edit('src/data/publications.bib', (t) =>
        editEntry(t, 'mundt2023wholistic', (e) =>
          e.replace('members     = {mundt}', 'members     = {mundt, ghost}'),
        ),
      );
      const r = build(p.dir);
      const out = r.stdout + r.stderr;
      assert.notEqual(r.status, 0, 'build should fail');
      assert.match(out, /Content check failed/);
      assert.match(out, /people\/storch\.md[\s\S]*themes: unknown theme id "memory"/);
      assert.match(out, /mundt2023wholistic: members: unknown person id "ghost"/);
    } finally {
      await p.remove();
    }
  },
);
