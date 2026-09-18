import type { Conflict, ResolvedStack } from './resolver.js';
import type { Selection } from './selector.js';

export interface Finding {
  severity: 'error' | 'warning';
  code:
    | 'stack-conflict'
    | 'artifact-conflict'
    | 'missing-language'
    | 'missing-version'
    | 'uncovered-technology'
    | 'empty-output'
    | 'stack-warning';
  message: string;
  /** Conflict id, when the finding can be waived with --accept-conflict. */
  conflict?: string;
}

export interface ValidationReport {
  findings: Finding[];
  counts: { rules: number; skills: number; technologies: number };
  ok: boolean;
}

/**
 * Completeness and consistency of a resolved stack plus its selection
 * (idea.md §6). Conflicts explicitly accepted by the caller are downgraded to
 * warnings; nothing is ever resolved silently.
 */
export function validate(
  stack: ResolvedStack,
  selection: Selection,
  acceptedConflicts: string[] = [],
): ValidationReport {
  const findings: Finding[] = [];
  const accepted = new Set(acceptedConflicts);

  for (const conflict of stack.conflicts) {
    findings.push(conflictFinding(conflict, accepted.has(conflict.id)));
  }

  for (const { left, right } of selection.conflicts) {
    const id = [left, right].sort().join('+');
    findings.push({
      severity: accepted.has(id) ? 'warning' : 'error',
      code: 'artifact-conflict',
      conflict: id,
      message: `Rules "${left}" and "${right}" are declared incompatible${
        accepted.has(id) ? ' (accepted)' : ''
      }`,
    });
  }

  if (!stack.technologies.some((tech) => tech.slot === 'language')) {
    findings.push({
      severity: 'error',
      code: 'missing-language',
      message: 'No language selected — the stack needs at least one (e.g. --language ruby@3.3).',
    });
  }

  for (const tech of stack.technologies) {
    if (tech.version) continue;
    const blocked = selection.skipped.filter((entry) =>
      entry.reason.startsWith(`${tech.id} has no version pinned`),
    );
    if (blocked.length > 0) {
      findings.push({
        severity: 'error',
        code: 'missing-version',
        message: `${tech.id} has no version pinned, so ${blocked.length} version-specific artifact(s) were skipped: ${blocked
          .map((entry) => entry.artifact.meta.id)
          .join(', ')}. Pass ${tech.id}@<version>.`,
      });
    }
  }

  for (const tech of selection.uncovered) {
    findings.push({
      severity: 'warning',
      code: 'uncovered-technology',
      message: `${tech.id} is in the stack but the knowledge base has no rules or skills for it yet.`,
    });
  }

  for (const warning of stack.warnings) {
    findings.push({ severity: 'warning', code: 'stack-warning', message: warning });
  }

  if (selection.rules.length === 0 && selection.skills.length === 0) {
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
