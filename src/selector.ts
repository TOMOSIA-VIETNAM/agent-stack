import type { Artifact, KnowledgeBase } from './catalog.js';
import type { ResolvedStack, ResolvedTech } from './resolver.js';
import { satisfies } from './version.js';

export interface SelectedArtifact {
  artifact: Artifact;
  origin: 'matched' | 'dependency';
  /** Technologies whose presence selected this artifact; empty for global rules. */
  matchedBy: string[];
}

export interface SkippedArtifact {
  artifact: Artifact;
  reason: string;
}

export interface Selection {
  rules: SelectedArtifact[];
  skills: SelectedArtifact[];
  commands: SelectedArtifact[];
  skipped: SkippedArtifact[];
  /** Artifact-level conflicts, e.g. two rule sets that contradict each other. */
  conflicts: { left: string; right: string }[];
  /** Selected technologies with no artifact covering them at all. */
  uncovered: ResolvedTech[];
}

type MatchResult = { ok: true; matchedBy: string[] } | { ok: false; reason: string };

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
      return { ok: false, reason: `${entry.tech} is not in the stack` };
    }
    if (entry.versions) {
      if (!tech.version) {
        return {
          ok: false,
          reason: `${entry.tech} has no version pinned, but this artifact targets "${entry.versions}"`,
        };
      }
      if (!satisfies(tech.version, entry.versions)) {
        return {
          ok: false,
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
  const all = [...kb.rules, ...kb.skills, ...kb.commands];
  const byId = new Map(all.map((artifact) => [artifact.meta.id, artifact]));

  const selected = new Map<string, SelectedArtifact>();
  const skipped: SkippedArtifact[] = [];

  for (const artifact of all) {
    const result = matches(artifact, stack);
    if (result.ok) {
      selected.set(artifact.meta.id, { artifact, origin: 'matched', matchedBy: result.matchedBy });
    } else {
      skipped.push({ artifact, reason: result.reason });
    }
  }

  // Pull in artifact-level dependencies transitively.
  const queue = [...selected.values()].flatMap((entry) => entry.artifact.meta.dependencies);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (selected.has(id)) continue;
    const artifact = byId.get(id);
    if (!artifact) continue; // lintKnowledgeBase already rejects dangling ids.
    selected.set(id, { artifact, origin: 'dependency', matchedBy: [] });
    const index = skipped.findIndex((entry) => entry.artifact.meta.id === id);
    if (index >= 0) skipped.splice(index, 1);
    queue.push(...artifact.meta.dependencies);
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
    skipped: skipped.sort((a, b) => a.artifact.meta.id.localeCompare(b.artifact.meta.id)),
    conflicts,
    uncovered,
  };
}
