#!/usr/bin/env node
/**
 * Run the plugin against a scratch project inside this repository, to see what a
 * generated `.claude` tree actually looks like.
 *
 *   npm run try                                   Rails, the default
 *   npm run try -- --framework laravel            any framework the catalog has
 *   npm run try -- --clean                        delete the scratch directory
 *
 * Output goes to .agent-stack-try/, which is gitignored. This is a development aid, not
 * part of the generator: it only shells out to dist/agent-stack.mjs with --out set.
 */
import { spawn } from 'node:child_process';
import { readdir, rm, stat, writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, '.agent-stack-try');
const CLI = join(ROOT, 'dist', 'agent-stack.mjs');

/** Rails exercises every layer: global, language (via `requires`) and framework. */
const DEFAULT_STACK = ['--framework', 'rails'];

const argv = process.argv.slice(2);

if (argv.includes('--clean')) {
  await rm(TARGET, { recursive: true, force: true });
  console.log('Removed .agent-stack-try/');
  process.exit(0);
}

const stackArgs = argv.length > 0 ? argv : DEFAULT_STACK;

await rm(TARGET, { recursive: true, force: true });
await mkdir(TARGET, { recursive: true });

// Hand-written text the generator must leave alone when it merges its block.
await writeFile(
  join(TARGET, 'CLAUDE.md'),
  [
    '# Scratch project',
    '',
    'This file is here so `npm run try` shows that hand-written text survives a',
    'generate run. Everything below the agent-stack markers is generated.',
    '',
  ].join('\n'),
  'utf8',
);

const cli = spawn('node', [CLI, 'generate', ...stackArgs, '--out', TARGET, '--write'], {
  stdio: 'inherit',
});

const code = await new Promise((resolveExit) => cli.on('close', resolveExit));
if (code !== 0) {
  console.error(`\nGenerate exited ${code}. Nothing further to show.`);
  process.exit(code ?? 1);
}

async function count(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  let files = 0;
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files += await count(path);
    else if ((await stat(path)).isFile()) files += 1;
  }
  return files;
}

console.log(`\nScratch project at ${relative(process.cwd(), TARGET) || '.agent-stack-try'}:`);
for (const dir of ['rules', 'skills', 'commands']) {
  console.log(`  .claude/${dir}: ${await count(join(TARGET, '.claude', dir))} file(s)`);
}
console.log('\nOpen it with Claude Code, or `npm run try -- --clean` to remove it.');
