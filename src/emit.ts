import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import {
  AGENTS_MD_PATH,
  MANIFEST_PATH,
  withoutManagedBlock,
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
  /**
   * Paths this run would seed, but that the project already has — AGENTS.md
   * once it exists. Not a warning: a seed is written once and then belongs to
   * the project, so finding it there is the normal case.
   */
  leftAlone: string[];
  /**
   * Files Claude Code reads *instead of* AGENTS.md: while a CLAUDE.md or
   * CLAUDE.local.md is there, AGENTS.md is not loaded. They are the project's,
   * so they are reported, never touched.
   */
  shadowing: string[];
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
  const write = [...composed.files.map((file) => file.path), MANIFEST_PATH];
  const leftAlone: string[] = [];
  const agentsMdThere =
    composed.agentsMd !== undefined && (await exists(join(outDir, composed.agentsMd.path)));
  if (composed.agentsMd) {
    (agentsMdThere ? leftAlone : write).push(composed.agentsMd.path);
  }

  const previous = await readPreviousManifest(outDir);
  const remove: string[] = [];
  const retained: string[] = [];
  if (previous) {
    const next = new Set(ownedPaths(composed.manifest));
    for (const path of ownedPaths(previous).filter((path) => !next.has(path))) {
      (await isModified(outDir, previous, path) ? retained : remove).push(path);
    }
  }

  const cleanup = await claudeMdCleanup(outDir, previous);
  if (cleanup?.next === '') remove.push(CLAUDE_MD);
  else if (cleanup) write.push(CLAUDE_MD);

  const shadowing: string[] = [];
  if (composed.agentsMd || (await exists(join(outDir, AGENTS_MD_PATH)))) {
    for (const path of [CLAUDE_MD, CLAUDE_LOCAL_MD]) {
      if (path === CLAUDE_MD && cleanup?.next === '') continue;
      if (await exists(join(outDir, path))) shadowing.push(path);
    }
  }

  return {
    write: write.sort(),
    remove: remove.sort(),
    retained: retained.sort(),
    leftAlone,
    shadowing,
  };
}

const CLAUDE_MD = 'CLAUDE.md';
const CLAUDE_LOCAL_MD = 'CLAUDE.local.md';

/**
 * What becomes of a CLAUDE.md an earlier version of agent-stack wrote its block
 * into: the block comes out, and a file left with nothing else in it goes —
 * a CLAUDE.md that exists at all stops Claude Code reading AGENTS.md.
 *
 * This is the one removal the previous manifest does not list. It is bounded
 * the same way: only in a project agent-stack has generated into, only the
 * text between its own markers, and the file only when nothing of the
 * project's is left in it.
 */
async function claudeMdCleanup(
  outDir: string,
  previous: Manifest | undefined,
): Promise<{ next: string } | undefined> {
  if (previous === undefined) return undefined;
  const existing = await readFile(join(outDir, CLAUDE_MD), 'utf8').catch(() => undefined);
  if (existing === undefined) return undefined;
  const next = withoutManagedBlock(existing);
  return next === undefined ? undefined : { next };
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}

export type PendingChange = 'add' | 'update' | 'remove';

/**
 * What a run with this output would change in the project, left unwritten.
 *
 * It answers "is this project behind the knowledge base?" by the only measure
 * that cannot drift from the generator itself: what writing it would do. The
 * manifest counts as changed only for what it records — when a run happened,
 * and which build ran it, are not the project falling behind.
 */
export async function pendingChanges(
  outDir: string,
  composed: ComposedOutput,
): Promise<{ path: string; change: PendingChange }[]> {
  const changes: { path: string; change: PendingChange }[] = [];

  for (const file of composed.files) {
    const actual = await checksum(join(outDir, file.path));
    if (actual === undefined) changes.push({ path: file.path, change: 'add' });
    else if (actual !== (await checksum(file.copyFrom))) {
      changes.push({ path: file.path, change: 'update' });
    }
  }

  // Only ever an addition: once AGENTS.md exists it is the project's, so how far
  // it has moved from the template is not the project falling behind.
  if (composed.agentsMd && !(await exists(join(outDir, composed.agentsMd.path)))) {
    changes.push({ path: composed.agentsMd.path, change: 'add' });
  }

  const previous = await readPreviousManifest(outDir);
  const recorded = ({ generator, generatedAt, ...rest }: Manifest) => JSON.stringify(rest);
  if (previous === undefined) changes.push({ path: MANIFEST_PATH, change: 'add' });
  else if (recorded(previous) !== recorded(await finalManifest(composed))) {
    changes.push({ path: MANIFEST_PATH, change: 'update' });
  }

  const plan = await planEmit(outDir, composed);
  if (plan.write.includes(CLAUDE_MD)) changes.push({ path: CLAUDE_MD, change: 'update' });
  for (const path of plan.remove) {
    changes.push({ path, change: 'remove' });
  }

  return changes.sort((a, b) => a.path.localeCompare(b.path));
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
  // Worked out before this run's manifest replaces the previous one, which is
  // what decides whether there is a block of agent-stack's to take out.
  const cleanup = await claudeMdCleanup(outDir, await readPreviousManifest(outDir));

  for (const file of composed.files) {
    const target = join(outDir, file.path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(file.copyFrom, target);
  }

  const manifestPath = join(outDir, MANIFEST_PATH);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(await finalManifest(composed), null, 2)}\n`, 'utf8');

  // COPYFILE_EXCL, not a check-then-copy: the copy itself refuses to replace a
  // file, so an AGENTS.md that appeared since planning still survives.
  if (composed.agentsMd) {
    await copyFile(
      composed.agentsMd.copyFrom,
      join(outDir, composed.agentsMd.path),
      constants.COPYFILE_EXCL,
    ).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
    });
  }

  if (cleanup && cleanup.next !== '') {
    await writeFile(join(outDir, CLAUDE_MD), cleanup.next, 'utf8');
  }

  for (const path of plan.remove) {
    await rm(join(outDir, path), { recursive: true, force: true });
  }

  return { ...plan, outDir, dryRun: false };
}
