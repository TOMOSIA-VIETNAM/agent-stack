import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');

async function json(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(ROOT, path), 'utf8')) as Record<string, unknown>;
}

// Three places say the version: the package npm serves, the plugin manifest
// Claude Code reads, and the string `agent-stack --version` prints. A published
// CLI that reports a version nobody can install is worse than no version at all.
describe('the released version', () => {
  it('is the same in package.json, the plugin manifest and the CLI', async () => {
    const pkg = await json('package.json');
    const plugin = await json('.claude-plugin/plugin.json');
    const cli = await readFile(join(ROOT, 'src', 'cli.ts'), 'utf8');

    expect(plugin['version']).toBe(pkg['version']);
    expect(cli).toContain(`const VERSION = '${String(pkg['version'])}';`);
  });

  it('ships what the CLI needs at runtime, and nothing that only builds it', async () => {
    const pkg = await json('package.json');
    const files = pkg['files'] as string[];

    // The CLI resolves its knowledge base at ../knowledge relative to dist/, so
    // both have to be in the tarball or a global install generates nothing.
    expect(files).toContain('dist/');
    expect(files).toContain('knowledge/');
    expect(files).not.toContain('src/');
    expect(files).not.toContain('tests/');
    expect(pkg['private']).toBeUndefined();
    expect(pkg['bin']).toEqual({ 'agent-stack': 'dist/agent-stack.mjs' });
  });

  it('carries the upstream notice, which the licence requires', async () => {
    const files = (await json('package.json'))['files'] as string[];
    expect(files).toContain('NOTICE');
  });
});
