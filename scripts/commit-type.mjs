#!/usr/bin/env node
/**
 * Propose the Conventional Commit type for a change, by asking TypeSafe.
 *
 *   npm run commit-type                          the staged diff
 *   npm run commit-type -- --range HEAD~1        any revision range
 *   npm run commit-type -- --subject "feat: ..."  also check a subject line
 *   npm run commit-type -- --json
 *
 * A development aid, not part of the generator. Nothing under `src/` calls it,
 * so selection stays deterministic and a generate run stays offline; this and
 * `npm run sync` are the only two things here that touch the network.
 *
 * Needs TYPESAFE_API_KEY. The model answers three narrow questions — which
 * type, whether the change breaks an existing invocation, and whether this is
 * really one commit — and returns a probability with each. Everything else is
 * this file: what to send, what the thresholds mean, and what to print. It
 * never writes the commit message, because a System One model returns typed
 * judgments rather than prose, and the summary is the part a person owes the
 * reader anyway.
 */
import { execFileSync } from 'node:child_process';

/** Overridable so the script can be pointed at a stub, or through a proxy. */
const ENDPOINT = process.env.TYPESAFE_API_URL ?? 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const TIMEOUT_MS = 30_000;

/** CLAUDE.md: imperative subject under 72 characters. */
export const SUBJECT_LIMIT = 72;

/**
 * Below this, the Choice is spread across several types and the answer is not
 * worth acting on alone — the script prints the runners-up instead of a verdict.
 */
export const CONFIDENT = 0.6;

/** A Noul is the answer and the certainty in one, so it needs two cut-offs. */
export const YES = 0.7;
export const NO = 0.4;

/** The diff itself is capped: past this the tail adds tokens, not meaning. */
export const MAX_DIFF_CHARS = 40_000;

/**
 * Committed build output and lockfiles are listed but never sent. They are the
 * largest diffs in this repository and say nothing about what changed — the
 * bundle is `src/` compiled, and the lockfile follows `package.json`.
 */
export function isGenerated(path) {
  return path.startsWith('dist/') || path.endsWith('-lock.json') || path.endsWith('.lock');
}

/**
 * The types this repository can plausibly produce, each described in its own
 * terms. A criterion that names this codebase beats a textbook definition: the
 * knowledge base under `knowledge/` is content, not code, and a change to it is
 * not the same kind of event as a change to the resolver.
 */
export const TYPES = {
  feat: 'New behaviour someone can use: a CLI flag, a command, a rule or skill added to the knowledge base, a new catalog entry.',
  fix: 'Corrects behaviour that was wrong: a bug in resolution, selection or emission, or content that stated something untrue.',
  docs: 'Only prose or images change — README, CONTRIBUTING, CLAUDE.md, comments, diagrams. No behaviour moves.',
  refactor: 'Code is restructured, moved or renamed with the same behaviour on the other side.',
  test: 'Only tests change: added, rewritten or removed.',
  perf: 'Makes existing behaviour faster or lighter, without changing what it does.',
  build: 'The bundle, the build script, dependencies or packaging metadata.',
  ci: 'Continuous integration configuration and nothing else.',
  chore: 'Housekeeping that fits none of the above: ignore files, licence headers, repository chores.',
};

/** Three independent judgments over the same diff, so they run in one call. */
export function buildQuestions() {
  return {
    type: {
      type: 'choice',
      instructions:
        'Which Conventional Commit type describes this change? Judge the change as a whole by its purpose, not by which directory has the most lines. Tests or documentation written alongside new behaviour belong to that behaviour.',
      criteria: TYPES,
    },
    breaking: {
      type: 'noul',
      instructions:
        'This change breaks an existing use of the tool: a command, flag or output shape that someone already relies on is removed, renamed, or made to behave differently, so an invocation that worked before now fails or produces something else.',
      criteria: {
        true: 'An existing invocation, script or generated project would have to be changed to keep working.',
        false: 'Everything that worked before still works the same way; anything new is additive or opt-in.',
      },
    },
    one_commit: {
      type: 'noul',
      instructions:
        'These changes belong in a single commit: they serve one purpose, and a reviewer would not ask for them to be split apart.',
      criteria: {
        true: 'One coherent change, plus the tests, documentation and build output that change with it.',
        false: 'Two or more unrelated changes that happen to be staged together and would each deserve their own commit.',
      },
    },
  };
}

/** What the model is shown: the change, described the way a reviewer sees it. */
export function buildState({ project, files, diff, stat }) {
  const trimmed = diff.length > MAX_DIFF_CHARS;
  return {
    project,
    files_changed: files,
    change_summary: stat,
    diff: trimmed ? `${diff.slice(0, MAX_DIFF_CHARS)}\n… diff truncated` : diff,
    diff_truncated: trimmed,
  };
}

/**
 * Turn the three answers into the one decision the caller needs.
 *
 * The thresholds live here rather than in the questions because they are policy:
 * the model reports how sure it is, and this file decides what to do about it.
 */
export function interpret(answers) {
  const choice = answers.type ?? {};
  const probabilities = choice.probabilities ?? {};
  const ranked = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  const confidence = choice.confidence ?? 0;

  const noul = (key) => answers[key]?.noul ?? null;
  const verdict = (value) => (value === null ? 'unknown' : value >= YES ? 'yes' : value <= NO ? 'no' : 'unsure');

  const breaking = noul('breaking');
  const oneCommit = noul('one_commit');

  return {
    type: choice.choice ?? null,
    confidence,
    confident: confidence >= CONFIDENT,
    /** The runners-up, for when the answer is not worth acting on alone. */
    alternatives: ranked.slice(0, 3).map(([id, p]) => ({ type: id, probability: p })),
    breaking: { probability: breaking, verdict: verdict(breaking) },
    oneCommit: { probability: oneCommit, verdict: verdict(oneCommit) },
  };
}

/** The prefix a subject line should carry, given the decision. */
export function prefix(decision) {
  if (!decision.type) return null;
  return `${decision.type}${decision.breaking.verdict === 'yes' ? '!' : ''}`;
}

/** What is wrong with a subject line the caller wrote, if anything. */
export function checkSubject(subject, decision) {
  const findings = [];
  if (subject.length > SUBJECT_LIMIT) {
    findings.push(`${subject.length} characters — the limit is ${SUBJECT_LIMIT}`);
  }
  if (subject.endsWith('.')) {
    findings.push('ends with a full stop');
  }

  const match = /^([a-z]+)(\([^)]*\))?(!)?: /.exec(subject);
  if (!match) {
    findings.push('does not start with `type: ` (or `type(scope): `)');
    return findings;
  }

  const [, written, , bang] = match;
  if (decision.type && written !== decision.type && decision.confident) {
    findings.push(`says \`${written}\`, and the change reads as \`${decision.type}\``);
  }
  if (decision.breaking.verdict === 'yes' && !bang) {
    findings.push('is missing the `!` — this change looks like it breaks an existing use');
  }
  if (decision.breaking.verdict === 'no' && bang) {
    findings.push('carries a `!`, but nothing in the change looks breaking');
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Everything below talks to git, the network or the terminal.
// ---------------------------------------------------------------------------

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function parseArgs(argv) {
  const options = { range: null, subject: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      i += 1;
      return value;
    };
    if (arg === '--range') options.range = next();
    else if (arg === '--subject') options.subject = next();
    else if (arg === '--json') options.json = true;
    else throw new Error(`Unknown flag: ${arg}`);
  }
  return options;
}

function collectChange(range) {
  const scope = range ? [range] : ['--cached'];
  const numstat = git('diff', ...scope, '--numstat').trim();
  if (numstat === '') return null;

  const files = numstat.split('\n').map((line) => {
    const [added, removed, path] = line.split('\t');
    return {
      path,
      added: added === '-' ? null : Number(added),
      removed: removed === '-' ? null : Number(removed),
      generated: isGenerated(path),
    };
  });

  const readable = files.filter((file) => !file.generated).map((file) => file.path);
  const diff = readable.length > 0 ? git('diff', ...scope, '--', ...readable) : '';
  const totals = files.reduce(
    (sum, file) => ({ added: sum.added + (file.added ?? 0), removed: sum.removed + (file.removed ?? 0) }),
    { added: 0, removed: 0 },
  );

  return {
    files,
    diff,
    stat: `${files.length} file(s), +${totals.added} −${totals.removed}`,
    where: range ?? 'the staged changes',
  };
}

async function ask(state, questions, key) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: MODEL, questions }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = (await response.text().catch(() => '')).slice(0, 300);
    const hint =
      response.status === 401 || response.status === 403
        ? ' — TYPESAFE_API_KEY was rejected. Check it at https://console.typesafe.ai/keys'
        : response.status === 429
          ? ' — rate limited, try again shortly'
          : '';
    throw new Error(`TypeSafe API returned ${response.status}${hint}\n${body}`);
  }
  return response.json();
}

function percent(value) {
  return value === null || value === undefined ? '   —' : `${Math.round(value * 100)}%`.padStart(4);
}

function report(change, decision, subject) {
  const out = [];
  out.push(`${change.stat} in ${change.where}\n`);
  out.push(`  type        ${(decision.type ?? '—').padEnd(12)} confidence ${percent(decision.confidence)}`);
  out.push(`  breaking    ${decision.breaking.verdict.padEnd(12)} ${percent(decision.breaking.probability)}`);
  out.push(`  one commit  ${decision.oneCommit.verdict.padEnd(12)} ${percent(decision.oneCommit.probability)}`);

  if (!decision.confident) {
    out.push('\nNot confident enough to call it. The change reads as several types at once:');
    for (const entry of decision.alternatives) {
      out.push(`  ${entry.type.padEnd(10)} ${percent(entry.probability)}`);
    }
    out.push('Pick the one that matches the purpose of the change, or split the commit.');
  }
  if (decision.oneCommit.verdict !== 'yes') {
    out.push(
      `\nThis may be more than one commit (${percent(decision.oneCommit.probability)} that it is one).` +
        ' Read the file list before committing it as a single change.',
    );
  }

  if (subject === null) {
    out.push(`\nSubject to write:\n\n  ${prefix(decision) ?? '<type>'}: <imperative summary, under ${SUBJECT_LIMIT} characters>`);
  } else {
    const findings = checkSubject(subject, decision);
    if (findings.length === 0) {
      out.push(`\nThe subject line looks right:\n\n  ${subject}`);
    } else {
      out.push('\nThe subject line:');
      for (const finding of findings) out.push(`  - ${finding}`);
    }
  }
  return out.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) {
    throw new Error(
      'TYPESAFE_API_KEY is not set. Create a key at https://console.typesafe.ai/keys, then\n' +
        '  export TYPESAFE_API_KEY=...',
    );
  }

  const change = collectChange(options.range);
  if (!change) {
    process.stdout.write(
      options.range
        ? `Nothing changed in ${options.range}.\n`
        : 'Nothing is staged. Stage the change first, or pass --range.\n',
    );
    return 0;
  }

  const state = buildState({
    project:
      'agent-stack: a Claude Code plugin that generates a project\'s .claude rules, skills and commands by selecting from a curated knowledge base. Selection is deterministic TypeScript under src/; knowledge/ holds the rule and skill content; scripts/ holds development aids.',
    ...change,
  });

  const result = await ask(state, buildQuestions(), key);
  const decision = interpret(result.answers ?? {});

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ change: change.stat, decision, usage: result.usage }, null, 2)}\n`);
    return 0;
  }

  process.stdout.write(`${report(change, decision, options.subject)}\n`);
  return 0;
}

// Importable for tests; only the direct run talks to anything.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    },
  );
}
