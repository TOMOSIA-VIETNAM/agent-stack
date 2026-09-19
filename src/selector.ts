import type { Artifact, KnowledgeBase } from './catalog.js';
import type { ResolvedStack, ResolvedTech } from './resolver.js';

export interface SelectedArtifact {
  artifact: Artifact;
  /** Frameworks whose presence selected this artifact; empty for global rules. */
  matchedBy: string[];
}

export interface SkippedArtifact {
  artifact: Artifact;
  /** Why it did not match — always a technology this stack does not have. */
  reason: string;
}

export interface Selection {
  rules: SelectedArtifact[];
  skills: SelectedArtifact[];
  commands: SelectedArtifact[];
  /** Fragments inlined into CLAUDE.md. */
  claudeMd: SelectedArtifact[];
  skipped: SkippedArtifact[];
  /** Selected technologies with no artifact covering them at all. */
  uncovered: ResolvedTech[];
}

type MatchResult = { ok: true; matchedBy: string[] } | { ok: false; reason: string };

/**
 * An artifact applies when *every* `applies_to` entry is in the resolved stack.
 * Entries are conjunctive so an artifact can require a combination (e.g. rails
 * *and* postgresql) without ambiguity.
 */
function matches(artifact: Artifact, stack: ResolvedStack): MatchResult {
  const { applies_to: appliesTo } = artifact.meta;
  if (appliesTo.length === 0) {
    return { ok: true, matchedBy: [] };
  }

  const matchedBy: string[] = [];
  for (const id of appliesTo) {
    if (!stack.technologies.some((tech) => tech.id === id)) {
      return { ok: false, reason: `${id} is not in the stack` };
    }
    matchedBy.push(id);
  }
  return { ok: true, matchedBy };
}

/** Choose the rules and skills that cover the resolved stack (idea.md §5). */
export function selectArtifacts(kb: KnowledgeBase, stack: ResolvedStack): Selection {
  const all = [...kb.rules, ...kb.skills, ...kb.commands, ...kb.claudeMd];

  const selected = new Map<string, SelectedArtifact>();
  const skipped: SkippedArtifact[] = [];

  for (const artifact of all) {
    const result = matches(artifact, stack);
    if (result.ok) {
      selected.set(artifact.meta.id, { artifact, matchedBy: result.matchedBy });
    } else {
      skipped.push({ artifact, reason: result.reason });
    }
  }

  const covered = new Set(
    [...selected.values()].flatMap((entry) => entry.artifact.meta.applies_to),
  );
  const uncovered = stack.technologies.filter((tech) => !covered.has(tech.id));

  // By id, which is the filename: the order on disk and the order of the
  // `@`-imports are the same thing, and neither needs a field to control it.
  const order = (a: SelectedArtifact, b: SelectedArtifact): number =>
    a.artifact.meta.id.localeCompare(b.artifact.meta.id);

  return {
    rules: [...selected.values()].filter((e) => e.artifact.meta.type === 'rule').sort(order),
    skills: [...selected.values()].filter((e) => e.artifact.meta.type === 'skill').sort(order),
    commands: [...selected.values()].filter((e) => e.artifact.meta.type === 'command').sort(order),
    claudeMd: [...selected.values()].filter((e) => e.artifact.meta.type === 'claude-md').sort(order),
    skipped: skipped.sort((a, b) => a.artifact.meta.id.localeCompare(b.artifact.meta.id)),
    uncovered,
  };
}
