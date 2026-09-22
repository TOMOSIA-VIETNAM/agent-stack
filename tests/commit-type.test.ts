import { describe, expect, it } from 'vitest';
// @ts-expect-error - a plain .mjs script, imported for its pure helpers only.
import { buildQuestions, buildState, checkSubject, interpret, isGenerated, prefix, MAX_DIFF_CHARS, SUBJECT_LIMIT, TYPES } from '../scripts/commit-type.mjs';

/** An answer set shaped the way the API documents it. */
function answers({
  type = 'feat',
  probabilities = { feat: 0.9, fix: 0.1 },
  confidence = 0.88,
  breaking = 0.02,
  oneCommit = 0.95,
}: Partial<{
  type: string;
  probabilities: Record<string, number>;
  confidence: number;
  breaking: number;
  oneCommit: number;
}> = {}) {
  return {
    type: { type: 'choice', choice: type, confidence, probabilities },
    breaking: { type: 'noul', noul: breaking },
    one_commit: { type: 'noul', noul: oneCommit },
  };
}

describe('the questions asked', () => {
  it('asks three independent judgments in one call', () => {
    const questions = buildQuestions();
    expect(Object.keys(questions).sort()).toEqual(['breaking', 'one_commit', 'type']);
    expect(questions.type.type).toBe('choice');
    expect(questions.breaking.type).toBe('noul');
    expect(questions.one_commit.type).toBe('noul');
  });

  // A Choice cannot return an option it was never given.
  it('offers every type this repository actually commits', () => {
    for (const type of ['feat', 'fix', 'docs', 'refactor', 'test', 'chore']) {
      expect(Object.keys(TYPES)).toContain(type);
    }
    expect(buildQuestions().type.criteria).toEqual(TYPES);
  });

  it('gives each Noul both sides, so a no means something', () => {
    const questions = buildQuestions();
    expect(Object.keys(questions.breaking.criteria).sort()).toEqual(['false', 'true']);
    expect(Object.keys(questions.one_commit.criteria).sort()).toEqual(['false', 'true']);
  });
});

describe('what is sent', () => {
  it('never sends build output or a lockfile, and says so by name', () => {
    expect(isGenerated('dist/agent-stack.mjs')).toBe(true);
    expect(isGenerated('package-lock.json')).toBe(true);
    expect(isGenerated('src/cli.ts')).toBe(false);
    expect(isGenerated('knowledge/rules/global/style.md')).toBe(false);
  });

  it('caps the diff and admits when it did', () => {
    const short = buildState({ project: 'p', files: [], diff: 'a', stat: '1 file' });
    expect(short.diff_truncated).toBe(false);
    expect(short.diff).toBe('a');

    const long = buildState({ project: 'p', files: [], diff: 'x'.repeat(MAX_DIFF_CHARS + 50), stat: '1 file' });
    expect(long.diff_truncated).toBe(true);
    expect(long.diff.length).toBeLessThan(MAX_DIFF_CHARS + 30);
    expect(long.diff).toContain('diff truncated');
  });

  it('names each part of the state rather than running it together', () => {
    const state = buildState({ project: 'p', files: [{ path: 'a' }], diff: 'd', stat: 's' });
    expect(Object.keys(state).sort()).toEqual([
      'change_summary',
      'diff',
      'diff_truncated',
      'files_changed',
      'project',
    ]);
  });
});

describe('reading the answers', () => {
  it('takes a confident choice as the verdict', () => {
    const decision = interpret(answers());
    expect(decision.type).toBe('feat');
    expect(decision.confident).toBe(true);
    expect(decision.breaking.verdict).toBe('no');
    expect(decision.oneCommit.verdict).toBe('yes');
    expect(prefix(decision)).toBe('feat');
  });

  // Confidence is the second axis: the answer says what, confidence says whether
  // to act on it. A spread choice is handed back to the person as a shortlist.
  it('refuses to call a choice the model spread across types', () => {
    const decision = interpret(
      answers({ confidence: 0.31, probabilities: { refactor: 0.4, feat: 0.35, fix: 0.25 } }),
    );
    expect(decision.confident).toBe(false);
    expect(decision.alternatives.map((entry: { type: string }) => entry.type)).toEqual([
      'refactor',
      'feat',
      'fix',
    ]);
  });

  it('reads a Noul near the middle as unsure rather than as a no', () => {
    expect(interpret(answers({ breaking: 0.55 })).breaking.verdict).toBe('unsure');
    expect(interpret(answers({ breaking: 0.92 })).breaking.verdict).toBe('yes');
    expect(interpret(answers({ oneCommit: 0.2 })).oneCommit.verdict).toBe('no');
  });

  it('marks a breaking change in the prefix itself', () => {
    expect(prefix(interpret(answers({ breaking: 0.95 })))).toBe('feat!');
  });

  it('survives an answer set that is missing a question', () => {
    const decision = interpret({});
    expect(decision.type).toBeNull();
    expect(decision.confident).toBe(false);
    expect(decision.breaking.verdict).toBe('unknown');
    expect(prefix(decision)).toBeNull();
  });
});

describe('checking a subject line', () => {
  it('passes a subject that matches the change', () => {
    expect(checkSubject('feat: let the operator approve what a run writes', interpret(answers()))).toEqual(
      [],
    );
  });

  it('catches the house rules: length, full stop, missing type', () => {
    const decision = interpret(answers());
    expect(checkSubject(`feat: ${'x'.repeat(SUBJECT_LIMIT)}`, decision)[0]).toContain(
      `limit is ${SUBJECT_LIMIT}`,
    );
    expect(checkSubject('feat: add the thing.', decision)).toContain('ends with a full stop');
    expect(checkSubject('added the thing', decision)[0]).toContain('does not start with');
  });

  it('flags a type the change does not read as, but only when sure', () => {
    expect(checkSubject('docs: add the flag', interpret(answers()))[0]).toContain(
      'the change reads as `feat`',
    );
    const unsure = interpret(answers({ confidence: 0.2 }));
    expect(checkSubject('docs: add the flag', unsure)).toEqual([]);
  });

  it('flags a missing or a spurious breaking marker', () => {
    expect(checkSubject('feat: drop the alias', interpret(answers({ breaking: 0.95 })))[0]).toContain(
      'missing the `!`',
    );
    expect(checkSubject('feat!: add a flag', interpret(answers()))[0]).toContain('carries a `!`');
  });

  it('accepts a scope', () => {
    expect(checkSubject('feat(brand): redraw the mark', interpret(answers()))).toEqual([]);
  });
});
