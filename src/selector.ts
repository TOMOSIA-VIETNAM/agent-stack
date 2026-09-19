import type { Artifact, KnowledgeBase } from './catalog.js';
import type { ResolvedStack, ResolvedTech } from './resolver.js';
import { satisfies } from './version.js';

export interface SelectedArtifact {
  artifact: Artifact;
  origin: 'matched' | 'dependency';
  /** Technologies whose presence selected this artifact; empty for global rules. */
  matchedBy: string[];
}

/**
 * Why an artifact did not match. Only `absent` — the technology is simply not
 * in this stack — may be overridden by a dependency; the two version codes
 * describe content that is wrong for this stack, not merely unasked for.
 */
export type SkipCode = 'absent' | 'unpinned' | 'out-of-range';

export interface SkippedArtifact {
  artifact: Artifact;
  code: SkipCode;
  reason: string;
}

/** A dependency that could not be emitted alongside the artifact declaring it. */
export interface UnmetDependency {
  /** Id of the selected artifact that declares the dependency. */
  artifact: string;
  /** Id of the dependency left out. */
  dependency: string;
  reason: string;
}

export interface Selection {
  rules: SelectedArtifact[];
  skills: SelectedArtifact[];
  commands: SelectedArtifact[];
  /** Fragments inlined into CLAUDE.md. */
  claudeMd: SelectedArtifact[];
  skipped: SkippedArtifact[];
  /** Dependencies dropped because they do not apply to this stack. */
  unmetDependencies: UnmetDependency[];
  /** Artifact-level conflicts, e.g. two rule sets that contradict each other. */
  conflicts: { left: string; right: string }[];
  /** Selected technologies with no artifact covering them at all. */
  uncovered: ResolvedTech[];
}

type MatchResult =
  | { ok: true; matchedBy: string[] }
  | { ok: false; code: SkipCode; reason: string };

/**
 * An artifact applies when *every* `applies_to` entry is satisfied by the
 * resolved stack. Entries are conjunctive so an artifact can require a
 * combination (e.g. rails *and* postgresql) without ambiguity.
 */
function matches(artifact: Artifact, stack: ResolvedStack): MatchResult {
  const { applies_to: appliesTo } = artifact.meta;
  if (appliesTo.length === 0) {
    return { ok: true, matchedBy: [] };
  }

  const matchedBy: string[] = [];
  for (const entry of appliesTo) {
    const tech = stack.technologies.find((t) => t.id === entry.tech);
    if (!tech) {
      return { ok: false, code: 'absent', reason: `${entry.tech} is not in the stack` };
    }
    if (entry.versions) {
      if (!tech.version) {
        return {
          ok: false,
          code: 'unpinned',
          reason: `${entry.tech} has no version pinned, but this artifact targets "${entry.versions}"`,
        };
      }
      if (!satisfies(tech.version, entry.versions)) {
        return {
          ok: false,
          code: 'out-of-range',
          reason: `${entry.tech} ${tech.version} is outside "${entry.versions}"`,
        };
      }
    }
    matchedBy.push(tech.id);
  }
  return { ok: true, matchedBy };
}

/** Choose the rules and skills that cover the resolved stack (idea.md §5). */
export function selectArtifacts(kb: KnowledgeBase, stack: ResolvedStack): Selection {
  const all = [...kb.rules, ...kb.skills, ...kb.commands, ...kb.claudeMd];
  const byId = new Map(all.map((artifact) => [artifact.meta.id, artifact]));

  const selected = new Map<string, SelectedArtifact>();
  const skipped: SkippedArtifact[] = [];

  for (const artifact of all) {
    const result = matches(artifact, stack);
    if (result.ok) {
      selected.set(artifact.meta.id, { artifact, origin: 'matched', matchedBy: result.matchedBy });
    } else {
      skipped.push({ artifact, code: result.code, reason: result.reason });
    }
  }

  // Pull in artifact-level dependencies transitively. A dependency may supply a
  // technology the stack never selected, but it may not override a version
  // gate: content declaring `versions` exists precisely because it is wrong
  // elsewhere, and emitting it because something else depends on it would put
  // Rails 8 guidance in a Rails 6 project. Dropping it is reported, not silent.
  const unmetDependencies: UnmetDependency[] = [];
  const queue = [...selected.values()].flatMap((entry) =>
    entry.artifact.meta.dependencies.map((id) => ({ id, from: entry.artifact.meta.id })),
  );
  while (queue.length > 0) {
    const { id, from } = queue.shift()!;
    if (selected.has(id)) continue;
    const artifact = byId.get(id);
    if (!artifact) continue; // lintKnowledgeBase already rejects dangling ids.
    const index = skipped.findIndex((entry) => entry.artifact.meta.id === id);
    const blocked = index >= 0 ? skipped[index] : undefined;
    if (blocked && blocked.code !== 'absent') {
      unmetDependencies.push({ artifact: from, dependency: id, reason: blocked.reason });
      continue;
    }
    selected.set(id, { artifact, origin: 'dependency', matchedBy: [] });
    if (index >= 0) skipped.splice(index, 1);
    queue.push(...artifact.meta.dependencies.map((next) => ({ id: next, from: id })));
  }

  const conflicts: { left: string; right: string }[] = [];
  const seen = new Set<string>();
  for (const { artifact } of selected.values()) {
    for (const other of artifact.meta.conflicts_with) {
      if (!selected.has(other)) continue;
      const key = [artifact.meta.id, other].sort().join('+');
      if (seen.has(key)) continue;
      seen.add(key);
      const [left, right] = key.split('+') as [string, string];
      conflicts.push({ left, right });
    }
  }

  const covered = new Set(
    [...selected.values()].flatMap((entry) =>
      entry.artifact.meta.applies_to.map((applies) => applies.tech),
    ),
  );
  const uncovered = stack.technologies.filter((tech) => !covered.has(tech.id));

  const order = (a: SelectedArtifact, b: SelectedArtifact): number =>
    a.artifact.meta.priority - b.artifact.meta.priority ||
    a.artifact.meta.id.localeCompare(b.artifact.meta.id);

  return {
    rules: [...selected.values()].filter((e) => e.artifact.meta.type === 'rule').sort(order),
    skills: [...selected.values()].filter((e) => e.artifact.meta.type === 'skill').sort(order),
    commands: [...selected.values()].filter((e) => e.artifact.meta.type === 'command').sort(order),
    claudeMd: [...selected.values()].filter((e) => e.artifact.meta.type === 'claude-md').sort(order),
    skipped: skipped.sort((a, b) => a.artifact.meta.id.localeCompare(b.artifact.meta.id)),
    unmetDependencies,
    conflicts,
    uncovered,
  };
}
