import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error - a plain .mjs script, imported for its pure helpers only.
import { addCatalogEntry, defaultName, isValidId, render, targetPath } from '../scripts/new-framework.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const TEMPLATE = join(ROOT, 'templates', 'framework');

async function templateFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(TEMPLATE, join(entry.parentPath, entry.name)))
    .sort();
}

describe('the framework id', () => {
  it('is accepted only in the shape the loader can emit', () => {
    expect(isValidId('django')).toBe(true);
    expect(isValidId('ruby-on-rails')).toBe(true);
    for (const bad of ['Django', 'ruby_on_rails', '-django', 'django-', '', 'django/x']) {
      expect(isValidId(bad), bad).toBe(false);
    }
  });

  it('gives a readable name when none is typed', () => {
    expect(defaultName('django')).toBe('Django');
    expect(defaultName('ruby-on-rails')).toBe('Ruby On Rails');
  });
});

describe('cloning the template', () => {
  it('puts every file where the knowledge base expects it', async () => {
    expect(
      (await templateFiles(TEMPLATE)).map((file) => targetPath(file, 'django')),
    ).toEqual([
      'commands/framework/django/review.md',
      'rules/framework/django/conventions.md',
      'skills/framework/django/django-feature/SKILL.md',
      'skills/framework/django/django-feature/references/checklist.md',
    ]);
  });

  // The two placeholders are the whole substitution. Anything left behind would
  // be copied into a generated project, so the clone has to leave none.
  it('leaves no placeholder in any file it writes', async () => {
    for (const file of await templateFiles(TEMPLATE)) {
      const rendered = render(await readFile(join(TEMPLATE, file), 'utf8'), 'django', 'Django');
      expect(rendered, file).not.toContain('your-framework');
      expect(rendered, file).not.toContain('<Framework>');
      expect(targetPath(file, 'django'), file).not.toContain('FRAMEWORK');
    }
  });

  it("renames the skill to the framework's own namespace", async () => {
    const skill = render(
      await readFile(join(TEMPLATE, 'skills/framework/FRAMEWORK/FRAMEWORK-feature/SKILL.md'), 'utf8'),
      'django',
      'Django',
    );
    expect(skill).toContain('name: django-feature');
  });
});

describe('the catalog entry', () => {
  const CATALOG = 'version: 1\n\ntechnologies:\n  rails:\n    name: Ruby on Rails\n';

  it('is appended under technologies', () => {
    const { text, added } = addCatalogEntry(CATALOG, 'django', 'Django');
    expect(added).toBe(true);
    expect(text).toBe(`${CATALOG}\n  django:\n    name: Django\n`);
  });

  it('is left alone when the framework is already listed', () => {
    const once = addCatalogEntry(CATALOG, 'django', 'Django').text;
    const twice = addCatalogEntry(once, 'django', 'Django');
    expect(twice.added).toBe(false);
    expect(twice.text).toBe(once);
  });

  // Appending only lands inside `technologies:` while it is the last key. If the
  // file grows another one, the script says so instead of writing nonsense.
  it('refuses to append when technologies is no longer the last top-level key', () => {
    expect(() => addCatalogEntry(`${CATALOG}\nsomething_else: 1\n`, 'django', 'Django')).toThrow(
      /`technologies` is no longer the last top-level key/,
    );
  });

  it('matches the real catalog, which the script appends to', async () => {
    const real = await readFile(join(ROOT, 'knowledge', 'catalog.yaml'), 'utf8');
    const { text, added } = addCatalogEntry(real, 'django', 'Django');
    expect(added).toBe(true);
    expect(text.endsWith('\n  django:\n    name: Django\n')).toBe(true);
  });
});
