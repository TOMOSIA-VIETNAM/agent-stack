import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error - a plain .mjs script, imported for its pure helpers only.
import { deliveredPaths, stalePaths, walk } from '../scripts/sync-upstream.mjs';

async function checkout(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'agent-stack-checkout-'));
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
  return root;
}

describe('walk', () => {
  it('lists every file beneath a directory, with / separators', async () => {
    const root = await checkout({
      'skills/a/SKILL.md': 'a',
      'skills/b/SKILL.md': 'b',
      'skills/b/references/notes.md': 'n',
    });
    // Entries sort with localeCompare at each level, as the catalog loader does.
    expect(await walk(join(root, 'skills'))).toEqual([
      'a/SKILL.md',
      'b/references/notes.md',
      'b/SKILL.md',
    ]);
  });
});

describe('deliveredPaths', () => {
  it('expands a directory copy and keeps a single-file copy as one target', async () => {
    const root = await checkout({
      'skills/tdd/SKILL.md': 'x',
      'skills/prd/SKILL.md': 'y',
      'CLAUDE.md': 'z',
    });

    expect(
      await deliveredPaths(
        { skills: 'skills/global', 'CLAUDE.md': 'claude-md/karpathy-guidelines.md' },
        root,
      ),
    ).toEqual([
      'claude-md/karpathy-guidelines.md',
      'skills/global/prd/SKILL.md',
      'skills/global/tdd/SKILL.md',
    ]);
  });

  it('fails by name when the pinned commit has no such path', async () => {
    const root = await checkout({ 'skills/tdd/SKILL.md': 'x' });
    await expect(deliveredPaths({ nope: 'skills/global' }, root)).rejects.toThrow(
      'upstream has no "nope"',
    );
  });
});

// The whole point: a sync owns the files it delivered last time and nothing
// else, so hand-written content living beside the imported files survives.
describe('stalePaths', () => {
  it('removes what upstream dropped and leaves hand-written files alone', () => {
    const previous = ['skills/global/tdd/SKILL.md', 'skills/global/retired/SKILL.md'];
    const next = ['skills/global/tdd/SKILL.md', 'skills/global/added/SKILL.md'];

    expect(stalePaths(previous, next)).toEqual(['skills/global/retired/SKILL.md']);
    // Never delivered by this source, so never a candidate for removal.
    expect(stalePaths(previous, next)).not.toContain('skills/global/pr-description/SKILL.md');
  });

  it('removes nothing on the first sync, when there is no record yet', () => {
    expect(stalePaths([], ['skills/global/tdd/SKILL.md'])).toEqual([]);
  });
});
