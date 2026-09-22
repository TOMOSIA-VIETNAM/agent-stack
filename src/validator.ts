import type { Conflict, ResolvedStack } from './resolver.js';
import type { Selection } from './selector.js';

export interface Finding {
  severity: 'error' | 'warning';
  code:
    | 'stack-conflict'
    | 'missing-framework'
    | 'uncovered-technology'
    | 'empty-output'
    | 'existing-file'
    | 'stack-warning';
  message: string;
  /** Conflict id, when the finding can be waived with --accept-conflict. */
  conflict?: string;
}

export interface ValidationReport {
  findings: Finding[];
  counts: {
    rules: number;
    skills: number;
    commands: number;
    claudeMd: number;
    technologies: number;
  };
  ok: boolean;
}

/** A path the run declined to take over, because the project already has it. */
export interface KeptPath {
  id: string;
  path: string;
}

/**
 * Completeness and consistency of a resolved stack plus its selection.
 * Conflicts explicitly accepted by the caller are downgraded to warnings;
 * nothing is ever resolved silently.
 */
export function validate(
  stack: ResolvedStack,
  selection: Selection,
  acceptedConflicts: string[] = [],
  kept: KeptPath[] = [],
): ValidationReport {
  const findings: Finding[] = [];
  const accepted = new Set(acceptedConflicts);

  for (const conflict of stack.conflicts) {
    findings.push(conflictFinding(conflict, accepted.has(conflict.id)));
  }

  if (stack.technologies.length === 0) {
    findings.push({
      severity: 'error',
      code: 'missing-framework',
      message: 'No framework selected — the stack needs at least one (e.g. --framework rails).',
    });
  }

  for (const tech of selection.uncovered) {
    findings.push({
      severity: 'warning',
      code: 'uncovered-technology',
      message: `${tech.id} is in the stack but the knowledge base has no rules or skills for it yet.`,
    });
  }

  // A warning, not an error: the run is complete and correct, it simply left
  // the project's own file where it was. Saying which file, and how to take it
  // over, is the part that must not be silent.
  for (const entry of kept) {
    findings.push({
      severity: 'warning',
      code: 'existing-file',
      message: `${entry.path} already exists and agent-stack did not write it — ${entry.id} was left out [--overwrite to replace it]`,
    });
  }

  for (const warning of stack.warnings) {
    findings.push({ severity: 'warning', code: 'stack-warning', message: warning });
  }

  if (
    selection.rules.length === 0 &&
    selection.skills.length === 0 &&
    selection.commands.length === 0 &&
    selection.claudeMd.length === 0
  ) {
    findings.push({
      severity: 'error',
      code: 'empty-output',
      message: 'Nothing to generate: no rule or skill matched this stack.',
    });
  }

  return {
    findings,
    counts: {
      rules: selection.rules.length,
      skills: selection.skills.length,
      commands: selection.commands.length,
      claudeMd: selection.claudeMd.length,
      technologies: stack.technologies.length,
    },
    ok: !findings.some((finding) => finding.severity === 'error'),
  };
}

function conflictFinding(conflict: Conflict, isAccepted: boolean): Finding {
  return {
    severity: isAccepted ? 'warning' : 'error',
    code: 'stack-conflict',
    conflict: conflict.id,
    message: `${conflict.message}${isAccepted ? ' (accepted)' : ''}`,
  };
}
