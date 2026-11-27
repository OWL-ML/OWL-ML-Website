// The issue forms in .github/ISSUE_TEMPLATE/ (docs/CONTRIBUTING.md): valid structure, and theme
// checkboxes that match src/data/themes.yml, so renaming a theme cannot leave the forms behind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const dir = '.github/ISSUE_TEMPLATE';
const files = (await readdir(dir)).filter((f) => f.endsWith('.yml') && f !== 'config.yml');
const forms = await Promise.all(
  files.map(async (f) => ({ file: f, form: parse(await readFile(`${dir}/${f}`, 'utf8')) })),
);
const themes = parse(await readFile('src/data/themes.yml', 'utf8'));
const TYPES = new Set(['markdown', 'input', 'textarea', 'dropdown', 'checkboxes']);

test('the six forms exist', () => {
  assert.deepEqual(
    forms.map(({ form }) => form.name),
    [
      'Update my profile',
      'Add a paper',
      'Add news',
      'Add a talk',
      'New course demo',
      'Report a problem',
    ],
  );
});

test('each form is a valid GitHub issue form', () => {
  for (const { file, form } of forms) {
    assert.ok(form.name && form.description && Array.isArray(form.body), file);
    const ids = form.body.filter((b) => b.type !== 'markdown').map((b) => b.id);
    assert.equal(new Set(ids).size, ids.length, `${file}: duplicate field ids`);
    for (const b of form.body) {
      assert.ok(TYPES.has(b.type), `${file}: unknown field type ${b.type}`);
      if (b.type !== 'markdown') {
        assert.match(b.id, /^[a-z][a-z0-9_-]*$/, `${file}: field id ${b.id}`);
        assert.ok(b.attributes?.label, `${file}: ${b.id} has no label`);
      }
      if (b.type === 'dropdown' || b.type === 'checkboxes')
        assert.ok(b.attributes.options?.length, `${file}: ${b.id} has no options`);
    }
  }
});

test('theme checkboxes list exactly the themes in themes.yml, in order', () => {
  const expected = themes.map((t) => `${t.name} (${t.id})`);
  const withThemes = forms.filter(({ form }) => form.body.some((b) => b.id === 'themes'));
  assert.ok(withThemes.length >= 3);
  for (const { file, form } of withThemes) {
    const field = form.body.find((b) => b.id === 'themes');
    assert.deepEqual(
      field.attributes.options.map((o) => o.label),
      expected,
      `${file}: update the theme checkboxes to match src/data/themes.yml`,
    );
  }
});

test('news types and talk kinds match the content schema', async () => {
  const { newsTypes, talkSchema } = await import('../src/lib/content/schemas.ts');
  const news = forms.find(({ form }) => form.name === 'Add news').form;
  assert.deepEqual(news.body.find((b) => b.id === 'type').attributes.options, [...newsTypes]);
  const talk = forms.find(({ form }) => form.name === 'Add a talk').form;
  assert.deepEqual(
    [...talk.body.find((b) => b.id === 'kind').attributes.options].sort(),
    [...talkSchema.shape.kind.options].sort(),
  );
});

test('no form relies on a Claude integration on GitHub (there is none)', () => {
  for (const { file, form } of forms) {
    assert.ok(!(form.labels ?? []).includes('claude'), `${file}: no claude label`);
    assert.doesNotMatch(JSON.stringify(form.body), /@claude/, file);
  }
});
