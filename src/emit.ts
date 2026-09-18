import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  MANIFEST_PATH,
  mergeClaudeMd,
  type ComposedOutput,
  type Manifest,
} from './composer.js';

export interface EmitPlan {
  /** Repo-relative paths this run creates or overwrites. */
  write: string[];
  /** Paths a previous run generated that this run no longer needs. */
  remove: string[];
}

export interface EmitResult extends EmitPlan {
  outDir: string;
  dryRun: boolean;
}

async function readPreviousManifest(outDir: string): Promise<Manifest | undefined> {
  const raw = await readFile(join(outDir, MANIFEST_PATH), 'utf8').catch(() => undefined);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Manifest;
  } catch {
    return undefined;
  }
}

/**
 * Stale paths are taken from the previous manifest only: open-aidd removes
 * what it generated before and never touches files it did not write.
 */
export async function planEmit(outDir: string, composed: ComposedOutput): Promise<EmitPlan> {
  const write = [...composed.files.map((file) => file.path), 'CLAUDE.md'].sort();
  const previous = await readPreviousManifest(outDir);
  if (!previous) return { write, remove: [] };

  const owned = (manifest: Manifest): string[] => [
    ...manifest.rules.map((rule) => rule.path),
    ...manifest.skills.map((skill) => skill.path),
    ...(manifest.commands ?? []).map((command) => command.path),
    ...(manifest.extras ?? []),
  ];

  const next = new Set(owned(composed.manifest));
  const remove = owned(previous)
    .filter((path) => !next.has(path))
    .sort();

  return { write, remove };
}

export async function emit(
  outDir: string,
  composed: ComposedOutput,
  options: { dryRun: boolean },
): Promise<EmitResult> {
  const plan = await planEmit(outDir, composed);
  if (options.dryRun) {
    return { ...plan, outDir, dryRun: true };
  }

  for (const file of composed.files) {
    const target = join(outDir, file.path);
    await mkdir(dirname(target), { recursive: true });
    if (file.copyFrom) {
      await copyFile(file.copyFrom, target);
    } else {
      await writeFile(target, file.contents ?? '', 'utf8');
    }
  }

  const claudeMdPath = join(outDir, 'CLAUDE.md');
  const existing = await readFile(claudeMdPath, 'utf8').catch(() => undefined);
  await writeFile(claudeMdPath, mergeClaudeMd(existing, composed.claudeMdBlock), 'utf8');

  for (const path of plan.remove) {
    await rm(join(outDir, path), { recursive: true, force: true });
  }

  return { ...plan, outDir, dryRun: false };
}
