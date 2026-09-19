#!/usr/bin/env node
/**
 * Copy upstream content into knowledge/ at the commit pinned in
 * knowledge/upstream.yaml.
 *
 *   npm run sync                      re-copy at the pinned commit
 *   npm run sync -- --ref <sha>       move the pin, then copy
 *   npm run sync -- --source <name>   only one source
 *
 * Destination directories are replaced wholesale, so a file deleted upstream
 * disappears here too. Review the diff before committing.
 */
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parse as parseYaml } from 'yaml';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE = join(ROOT, 'knowledge');
const UPSTREAM = join(KNOWLEDGE, 'upstream.yaml');
const SHA = /^[0-9a-f]{40}$/;

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

const options = parseArgs(process.argv.slice(2));
if (options.ref && !SHA.test(options.ref)) {
  throw new Error(`--ref must be a full 40-character commit SHA, got "${options.ref}"`);
}

const raw = await readFile(UPSTREAM, 'utf8');
const config = parseYaml(raw);
const names = options.source ? [options.source] : Object.keys(config.sources);

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

    for (const [from, entry] of Object.entries(source.copy)) {
      const to = typeof entry === 'string' ? entry : entry.to;
      const target = join(KNOWLEDGE, to);
      await rm(target, { recursive: true, force: true });
      await mkdir(dirname(target), { recursive: true });
      await cp(join(work, from), target, { recursive: true });
      console.log(`  ${from} -> knowledge/${to}`);
    }

    if (ref !== source.ref) {
      await writeFile(UPSTREAM, raw.replace(source.ref, ref), 'utf8');
      console.log(`  pin moved ${source.ref.slice(0, 7)} -> ${ref.slice(0, 7)}`);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

console.log('\nDone. Review the diff, run `npm test`, then commit.');
