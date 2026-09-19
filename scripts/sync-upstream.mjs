#!/usr/bin/env node
/**
 * Copy upstream content into knowledge/ at the commit pinned in
 * knowledge/upstream.yaml.
 *
 *   npm run sync                      re-copy at the pinned commit
 *   npm run sync -- --ref <sha>       move the pin, then copy
 *   npm run sync -- --source <name>   only one source
 *
 * A sync removes only the files the *previous* sync delivered, recorded in
 * knowledge/upstream.lock.json. An upstream deletion still propagates, because
 * the file was in that record and is not in the new snapshot — but a file you
 * wrote by hand alongside the imported ones was never in the record, so it is
 * left alone. This is the same rule emit.ts follows in a generated project:
 * remove what you put there last time, and nothing else.
 *
 * Review the diff before committing.
 */
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { parse as parseYaml } from 'yaml';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE = join(ROOT, 'knowledge');
const UPSTREAM = join(KNOWLEDGE, 'upstream.yaml');
const LOCK = join(KNOWLEDGE, 'upstream.lock.json');
const SHA = /^[0-9a-f]{40}$/;

/** Every file under `dir`, as paths relative to it, with `/` separators. */
export async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });

  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path, base)));
    else if (entry.isFile()) files.push(relative(base, path).split(sep).join('/'));
  }
  return files;
}

/**
 * Paths under knowledge/ that a source's `copy` map delivers from a checkout.
 * A `from` that is a directory contributes every file beneath it; a `from` that
 * is a single file contributes its one target.
 */
export async function deliveredPaths(copy, checkout) {
  const delivered = [];
  for (const [from, to] of Object.entries(copy)) {
    const source = join(checkout, from);
    const info = await stat(source).catch(() => undefined);
    if (info === undefined) {
      throw new Error(`upstream has no "${from}" at this commit`);
    }
    if (info.isDirectory()) {
      for (const rel of await walk(source)) delivered.push(`${to}/${rel}`);
    } else {
      delivered.push(to);
    }
  }
  return delivered.sort();
}

/**
 * What the last sync delivered and this one does not. Everything else under the
 * destination — anything hand-written — is not ours to remove.
 */
export function stalePaths(previous, next) {
  const keep = new Set(next);
  return previous.filter((path) => !keep.has(path)).sort();
}

/** Remove now-empty directories left behind by a deletion, up to `stopAt`. */
async function pruneEmpty(dir, stopAt) {
  let current = dir;
  while (current.startsWith(stopAt) && current !== stopAt) {
    const entries = await readdir(current).catch(() => undefined);
    if (entries === undefined || entries.length > 0) return;
    await rmdir(current).catch(() => undefined);
    current = dirname(current);
  }
}

async function readLock() {
  const raw = await readFile(LOCK, 'utf8').catch(() => undefined);
  if (raw === undefined) return { version: 1, sources: {} };
  try {
    const parsed = JSON.parse(raw);
    return parsed?.sources ? parsed : { version: 1, sources: {} };
  } catch {
    return { version: 1, sources: {} };
  }
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--ref' || arg === '--source') {
      const value = argv[i + 1];
      if (!value) throw new Error(`${arg} needs a value`);
      options[arg.slice(2)] = value;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function checkout(repo, ref, into) {
  const git = (...args) => run('git', ['-C', into, ...args], { timeout: 180_000 });
  await git('init', '--quiet');
  await git('remote', 'add', 'origin', repo);
  await git('fetch', '--quiet', '--depth', '1', 'origin', ref);
  await git('checkout', '--quiet', 'FETCH_HEAD');
  const { stdout } = await git('rev-parse', 'HEAD');
  if (stdout.trim() !== ref) {
    throw new Error(`${repo} checked out ${stdout.trim()}, expected ${ref}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.ref && !SHA.test(options.ref)) {
    throw new Error(`--ref must be a full 40-character commit SHA, got "${options.ref}"`);
  }

  let raw = await readFile(UPSTREAM, 'utf8');
  const config = parseYaml(raw);
  const names = options.source ? [options.source] : Object.keys(config.sources);
  const lock = await readLock();

  for (const name of names) {
    const source = config.sources[name];
    if (!source) throw new Error(`No source named "${name}" in knowledge/upstream.yaml`);

    const ref = options.ref ?? source.ref;
    if (!SHA.test(ref)) {
      throw new Error(`Source "${name}" must pin a full 40-character commit SHA, got "${ref}"`);
    }

    const work = await mkdtemp(join(tmpdir(), 'agent-stack-sync-'));
    try {
      console.log(`${name}: fetching ${source.repo} at ${ref}`);
      await checkout(source.repo, ref, work);

      const delivered = await deliveredPaths(source.copy, work);
      const previous = lock.sources[name]?.files;
      if (previous === undefined) {
        console.log(
          '  no record of a previous sync; copying without removing anything.\n' +
            '  A file this source dropped before today survives — check the diff.',
        );
      }
      const stale = stalePaths(previous ?? [], delivered);

      for (const path of stale) {
        const target = join(KNOWLEDGE, path);
        await rm(target, { force: true });
        await pruneEmpty(dirname(target), KNOWLEDGE);
        console.log(`  - knowledge/${path}`);
      }

      for (const [from, to] of Object.entries(source.copy)) {
        const target = join(KNOWLEDGE, to);
        await mkdir(dirname(target), { recursive: true });
        await cp(join(work, from), target, { recursive: true });
        console.log(`  ${from} -> knowledge/${to}`);
      }

      lock.sources[name] = { ref, files: delivered };
      console.log(`  ${delivered.length} file(s) recorded, ${stale.length} removed`);

      if (ref !== source.ref) {
        raw = raw.replace(source.ref, ref);
        await writeFile(UPSTREAM, raw, 'utf8');
        console.log(`  pin moved ${source.ref.slice(0, 7)} -> ${ref.slice(0, 7)}`);
      }
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }

  await writeFile(LOCK, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  console.log('\nDone. Review the diff, run `npm test`, then commit.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
