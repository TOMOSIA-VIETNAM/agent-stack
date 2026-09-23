import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import {
  MANIFEST_PATH,
  mergeClaudeMd,
  type ArtifactTarget,
  type ComposedOutput,
  type Manifest,
} from './composer.js';

export interface EmitPlan {
  /** Repo-relative paths this run creates or overwrites. */
  write: string[];
  /** Paths a previous run generated that this run no longer needs. */
  remove: string[];
  /**
   * Paths a previous run generated that this run no longer needs, but that the
   * project has edited since. They are left where they are and stop being
   * agent-stack's: deleting them would delete the project's work.
   */
  retained: string[];
}

export interface EmitResult extends EmitPlan {
  outDir: string;
  dryRun: boolean;
}

export async function readPreviousManifest(outDir: string): Promise<Manifest | undefined> {
  const raw = await readFile(join(outDir, MANIFEST_PATH), 'utf8').catch(() => undefined);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Manifest;
  } catch {
    return undefined;
  }
}

/** sha256 of a file's bytes, or undefined when there is no file. */
async function checksum(path: string): Promise<string | undefined> {
  const bytes = await readFile(path).catch(() => undefined);
  return bytes === undefined ? undefined : createHash('sha256').update(bytes).digest('hex');
}

/** Every file below a directory, relative to `root` in posix form. */
async function filesUnder(root: string, path: string): Promise<string[]> {
  const entries = await readdir(join(root, path), { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const child = posix.join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(root, child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

/**
 * Whether the project has changed a path since agent-stack wrote it: a file
 * whose bytes differ from the checksum the last run recorded, or — inside a
 * skill directory — a file the last run never wrote.
 *
 * A deleted file is not an edit. Nothing of the project's is lost by writing
 * it again.
 *
 * A manifest from before checksums were recorded cannot tell, so everything it
 * lists reads as unchanged, which is how such a run behaved when it was made.
 */
async function isModified(outDir: string, previous: Manifest, path: string): Promise<boolean> {
  const { checksums } = previous;
  if (checksums === undefined) return false;

  const recorded = Object.keys(checksums).filter(
    (file) => file === path || file.startsWith(`${path}/`),
  );
  for (const file of recorded) {
    const actual = await checksum(join(outDir, file));
    if (actual !== undefined && actual !== checksums[file]) return true;
  }

  const isDir = await stat(join(outDir, path)).then(
    (entry) => entry.isDirectory(),
    () => false,
  );
  if (!isDir) return false;
  return (await filesUnder(outDir, path)).some((file) => checksums[file] === undefined);
}

/**
 * What already sits at an artifact's target path.
 *
 * - `new`      nothing is there.
 * - `owned`    a previous run wrote it, it is unchanged, and this run replaces it.
 * - `modified` a previous run wrote it, and the project has edited it since.
 *              The edit is the project's, so it is not replaced unasked.
 * - `exists`   the project put it there. agent-stack did not write it, so it is
 *              not agent-stack's to replace without being told.
 */
export type TargetState = 'new' | 'owned' | 'modified' | 'exists';

/** The two states in which what is on disk is the project's work, not agent-stack's. */
export function belongsToProject(state: TargetState): state is 'modified' | 'exists' {
  return state === 'modified' || state === 'exists';
}

export interface InspectedTarget extends ArtifactTarget {
  state: TargetState;
}

function ownedPaths(manifest: Manifest): string[] {
  return [
    ...manifest.rules.map((rule) => rule.path),
    ...manifest.skills.map((skill) => skill.path),
    ...(manifest.commands ?? []).map((command) => command.path),
    ...(manifest.extras ?? []),
  ];
}

/**
 * Classify every target against the project as it stands.
 *
 * This is what stops a generate run from walking over a `.claude` directory
 * someone wrote by hand: ownership comes from the previous manifest, so a file
 * agent-stack has never written is always `exists`, whatever its name — and one
 * it did write stops being its own the moment the project edits it.
 */
export async function inspectTargets(
  outDir: string,
  targets: ArtifactTarget[],
): Promise<InspectedTarget[]> {
  const previous = await readPreviousManifest(outDir);
  const owned = new Set(previous ? ownedPaths(previous) : []);

  return Promise.all(
    targets.map(async (target) => {
      if (target.path === undefined) return { ...target, state: 'new' as const };
      if (previous && owned.has(target.path)) {
        const edited = await isModified(outDir, previous, target.path);
        return { ...target, state: edited ? ('modified' as const) : ('owned' as const) };
      }
      const there = await stat(join(outDir, target.path)).then(
        () => true,
        () => false,
      );
      return { ...target, state: there ? ('exists' as const) : ('new' as const) };
    }),
  );
}

/**
 * The manifest this run writes: the composed one, plus the checksum of every
 * file it copies, which is how the next run tells its own output from an edit.
 */
export async function finalManifest(composed: ComposedOutput): Promise<Manifest> {
  const checksums: Record<string, string> = {};
  for (const file of [...composed.files].sort((a, b) => a.path.localeCompare(b.path))) {
    const sum = await checksum(file.copyFrom);
    if (sum !== undefined) checksums[file.path] = sum;
  }
  return { ...composed.manifest, checksums };
}

/**
 * Stale paths are taken from the previous manifest only: agent-stack removes
 * what it generated before and never touches files it did not write — nor one
 * it did write that the project has edited since.
 */
export async function planEmit(outDir: string, composed: ComposedOutput): Promise<EmitPlan> {
  const write = [...composed.files.map((file) => file.path), MANIFEST_PATH, 'CLAUDE.md'].sort();
  const previous = await readPreviousManifest(outDir);
  if (!previous) return { write, remove: [], retained: [] };

  const next = new Set(ownedPaths(composed.manifest));
  const remove: string[] = [];
  const retained: string[] = [];
  for (const path of ownedPaths(previous).filter((path) => !next.has(path)).sort()) {
    (await isModified(outDir, previous, path) ? retained : remove).push(path);
  }

  return { write, remove, retained };
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
    await copyFile(file.copyFrom, target);
  }

  const manifestPath = join(outDir, MANIFEST_PATH);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(await finalManifest(composed), null, 2)}\n`, 'utf8');

  const claudeMdPath = join(outDir, 'CLAUDE.md');
  const existing = await readFile(claudeMdPath, 'utf8').catch(() => undefined);
  await writeFile(claudeMdPath, mergeClaudeMd(existing, composed.claudeMdBlock), 'utf8');

  for (const path of plan.remove) {
    await rm(join(outDir, path), { recursive: true, force: true });
  }

  return { ...plan, outDir, dryRun: false };
}
