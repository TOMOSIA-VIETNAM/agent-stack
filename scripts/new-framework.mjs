#!/usr/bin/env node
/**
 * Copy templates/framework/ into knowledge/ for one new framework.
 *
 *   npm run new-framework -- django                 id only; name defaults to "Django"
 *   npm run new-framework -- ruby-on-rails "Rails"  id and the name a human reads
 *
 * It writes the catalog entry and the three skeleton files, and nothing else. It
 * is a development aid for this repository, like `npm run try`: the generator
 * under src/ never reads it, and it never touches a generated project.
 *
 * It refuses rather than overwrite. A file already in knowledge/ is the author's,
 * so a second run on the same id reports what is there and writes nothing.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'templates', 'framework');
const KNOWLEDGE = join(ROOT, 'knowledge');

/** The same shape the loader demands of every path segment it emits. */
export function isValidId(id) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id);
}

/** `ruby-on-rails` -> `Ruby On Rails`, used only when no name is given. */
export function defaultName(id) {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Where a template file lands: the path is the metadata, so only the id changes. */
export function targetPath(templateRelative, id) {
  return templateRelative.split(sep).join('/').replaceAll('FRAMEWORK', id);
}

/** The two placeholders a skeleton carries. Comments are the author's to delete. */
export function render(contents, id, name) {
  return contents.replaceAll('your-framework', id).replaceAll('<Framework>', name);
}

/**
 * Add one entry under `technologies:`.
 *
 * Appended rather than sorted: the catalog reads in the order someone chose, and
 * selection is alphabetical by artifact id regardless. `technologies` has to be
 * the last top-level key for an append to land inside it, so that is checked
 * instead of assumed.
 */
export function addCatalogEntry(catalogText, id, name) {
  if (new RegExp(`^  ${id}:$`, 'm').test(catalogText)) {
    return { text: catalogText, added: false };
  }
  const topLevelKeys = [...catalogText.matchAll(/^([A-Za-z_][\w-]*):/gm)].map((match) => match[1]);
  if (topLevelKeys[topLevelKeys.length - 1] !== 'technologies') {
    throw new Error(
      'knowledge/catalog.yaml: `technologies` is no longer the last top-level key, so this script cannot append to it — add the entry by hand',
    );
  }
  const body = catalogText.endsWith('\n') ? catalogText : `${catalogText}\n`;
  return { text: `${body}\n  ${id}:\n    name: ${name}\n`, added: true };
}

async function templateFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await templateFiles(path)));
    else files.push(path);
  }
  return files;
}

async function main() {
  const [id, name = defaultName(id ?? '')] = process.argv.slice(2);

  if (!id || id.startsWith('-')) {
    throw new Error('Usage: npm run new-framework -- <framework-id> ["Framework Name"]');
  }
  if (!isValidId(id)) {
    throw new Error(
      `"${id}" cannot be a framework id — use lowercase kebab-case, because the id is a directory name and a filename prefix`,
    );
  }

  const sources = await templateFiles(TEMPLATE);
  const planned = sources.map((source) => ({
    source,
    target: join(KNOWLEDGE, targetPath(relative(TEMPLATE, source), id)),
  }));

  const taken = [];
  for (const { target } of planned) {
    const exists = await readFile(target, 'utf8').then(
      () => true,
      () => false,
    );
    if (exists) taken.push(relative(ROOT, target));
  }
  if (taken.length > 0) {
    throw new Error(
      `Already there, so nothing was written:\n  ${taken.join('\n  ')}\nEdit those files, or pick another id.`,
    );
  }

  const catalogPath = join(KNOWLEDGE, 'catalog.yaml');
  const catalog = addCatalogEntry(await readFile(catalogPath, 'utf8'), id, name);

  for (const { source, target } of planned) {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, render(await readFile(source, 'utf8'), id, name), 'utf8');
  }
  if (catalog.added) await writeFile(catalogPath, catalog.text, 'utf8');

  console.log(`${name} (${id}):`);
  console.log(
    catalog.added
      ? '  knowledge/catalog.yaml            entry added'
      : '  knowledge/catalog.yaml            entry already there, left alone',
  );
  for (const { target } of planned) console.log(`  ${relative(ROOT, target)}`);
  console.log(
    [
      '',
      'Next: write the content, delete every `TEMPLATE:` comment and every `<…>` placeholder,',
      `then \`npm run check\` and \`npm run try -- --framework ${id}\`.`,
    ].join('\n'),
  );
  return 0;
}

// Importable for tests; only the direct run writes anything.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    },
  );
}
