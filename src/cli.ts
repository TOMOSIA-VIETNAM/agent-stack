#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, resolve } from 'node:path';
import { loadKnowledgeBase } from './catalog.js';
import { artifactTargets, compose } from './composer.js';
import {
  belongsToProject,
  emit,
  inspectTargets,
  pendingChanges,
  planEmit,
  readPreviousManifest,
} from './emit.js';
import { isInteractive, rejected, runPicker, type PickerItem } from './prompt.js';
import { resolveStack, UnknownTechnologyError, type ResolvedStack } from './resolver.js';
import { renderTable } from './table.js';
import { techStackInputSchema, type TechStackInput } from './schema.js';
import { artifactKey, excludeArtifacts, selectArtifacts } from './selector.js';
import { validate, type KeptPath } from './validator.js';

// Kept as a literal so the bundle carries no part of package.json. A test
// holds it equal to the published version, and to the plugin manifest's.
const VERSION = '1.1.1';
const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_KNOWLEDGE = resolve(HERE, '..', 'knowledge');

const USAGE = `agent-stack ${VERSION} - generate .claude rules and skills from a curated knowledge base

Usage:
  agent-stack catalog [--json]                       list technologies and artifacts
  agent-stack resolve <stack flags> [--json]         resolve dependencies, report conflicts
  agent-stack generate <stack flags> [options]       compose and write the output
  agent-stack check [<stack flags>] [--out <dir>]    report what generate would change;
                                                     without flags, the stack the last
                                                     run recorded in its manifest

Stack flags:
  --framework <id>            the framework the project is built on (repeatable).
                              It is the only input: nothing else is selectable.

Options:
  --out <dir>                 target project directory (default: cwd)
  --write                     write files; without it, generate only previews
  --yes                       skip the approval checklist and take the defaults
  --overwrite                 replace files the project already has or has
                              edited since the last run, which are
                              otherwise left where they are
  --accept-conflict <id>      proceed despite one conflict, by its reported id
  --knowledge <dir>           knowledge base directory (default: bundled)
  --json                      machine-readable output
  -h, --help                  this help

On a terminal, \`generate --write\` first shows a checklist of everything it
would write, ticked except for files the project already has. Nothing moves
into .claude/ until it is approved. Without a terminal — under --json, or from
a script — the same defaults apply unattended, and every file left alone is
reported.

Exit codes: 0 success, 2 a check failed, 3 \`check\` found the project behind
the knowledge base, 64 usage, 65 unknown framework, 130 cancelled.
`;

class UsageError extends Error {}

interface Options {
  command: string;
  stack: TechStackInput;
  out: string;
  write: boolean;
  json: boolean;
  knowledge: string;
  acceptConflicts: string[];
  /** Approve the defaults without showing the checklist. */
  yes: boolean;
  /** Take over paths the project already has, instead of leaving them. */
  overwrite: boolean;
}

function parseArgs(argv: string[]): Options {
  const framework: string[] = [];
  const acceptConflicts: string[] = [];
  let command = '';
  let out = process.cwd();
  let knowledge = DEFAULT_KNOWLEDGE;
  let write = false;
  let json = false;
  let yes = false;
  let overwrite = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    const next = (): string => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new UsageError(`${arg} needs a value`);
      }
      i += 1;
      return value;
    };

    if (arg === '-h' || arg === '--help') {
      command = 'help';
    } else if (arg === '--version') {
      command = 'version';
    } else if (arg === '--write') {
      write = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--yes') {
      yes = true;
    } else if (arg === '--overwrite') {
      overwrite = true;
    } else if (arg === '--out') {
      out = resolve(next());
    } else if (arg === '--knowledge') {
      const value = next();
      knowledge = isAbsolute(value) ? value : resolve(value);
    } else if (arg === '--accept-conflict') {
      acceptConflicts.push(next());
    } else if (arg === '--framework') {
      framework.push(next());
    } else if (arg.startsWith('--')) {
      throw new UsageError(`Unknown flag: ${arg}`);
    } else if (!command) {
      command = arg;
    } else {
      throw new UsageError(`Unexpected argument: ${arg}`);
    }
  }

  return {
    command: command || 'help',
    stack: techStackInputSchema.parse({ framework }),
    out,
    write,
    json,
    knowledge,
    acceptConflicts,
    yes,
    overwrite,
  };
}

function formatStack(stack: ResolvedStack): string[] {
  return stack.technologies.map((tech) => {
    const via =
      tech.origin === 'dependency' ? ` (required by ${tech.requiredBy[0] ?? 'unknown'})` : '';
    return `  ${tech.id}${via}`;
  });
}

async function run(options: Options): Promise<number> {
  if (options.command === 'help') {
    process.stdout.write(USAGE);
    return 0;
  }
  if (options.command === 'version') {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const kb = await loadKnowledgeBase(options.knowledge);

  if (options.command === 'catalog') {
    // What a run on this framework emits: its own artifacts plus the global
    // layer, which is selected whatever the framework is.
    const emitted = (entries: typeof kb.rules, id: string) =>
      entries.filter(
        (artifact) =>
          artifact.meta.applies_to.length === 0 || artifact.meta.applies_to.includes(id),
      );
    const own = (entries: typeof kb.rules, id: string) =>
      entries.filter((artifact) => artifact.meta.applies_to.includes(id));
    const global = (entries: typeof kb.rules) =>
      entries.filter((artifact) => artifact.meta.applies_to.length === 0);

    const technologies = Object.entries(kb.catalog.technologies).map(([id, tech]) => ({
      id,
      name: tech.name,
      requires: tech.requires,
      conflicts_with: tech.conflicts_with,
      counts: {
        rules: emitted(kb.rules, id).length,
        skills: emitted(kb.skills, id).length,
        commands: emitted(kb.commands, id).length,
        claudeMd: emitted(kb.claudeMd, id).length,
      },
      /** Of those, the ones written for this framework — where the gaps show. */
      own: {
        rules: own(kb.rules, id).length,
        skills: own(kb.skills, id).length,
        commands: own(kb.commands, id).length,
        claudeMd: own(kb.claudeMd, id).length,
      },
      artifacts: [...kb.rules, ...kb.skills, ...kb.commands, ...kb.claudeMd]
        .filter((artifact) => artifact.meta.applies_to.includes(id))
        .map((artifact) => artifact.meta.id),
    }));
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ technologies }, null, 2)}\n`);
      return 0;
    }
    process.stdout.write(`Frameworks (${technologies.length})\n\n`);
    process.stdout.write(
      `${renderTable(
        [
          { header: 'id' },
          { header: 'name' },
          { header: 'rules', align: 'right' },
          { header: 'skills', align: 'right' },
          { header: 'commands', align: 'right' },
        ],
        technologies.map((tech) => [
          tech.id,
          tech.name,
          // A zero renders as an em dash, so a framework with no content yet
          // reads as a row of blanks rather than a row of noughts.
          ...[tech.counts.rules, tech.counts.skills, tech.counts.commands].map((n) =>
            n > 0 ? String(n) : '',
          ),
        ]),
      )}\n`,
    );
    process.stdout.write(
      `\n  Every row counts the global layer too, which applies whatever the framework:\n` +
        `  ${global(kb.rules).length} rule(s), ${global(kb.skills).length} skill(s), ` +
        `${global(kb.commands).length} command(s), ` +
        `${global(kb.claudeMd).length} CLAUDE.md fragment(s).\n`,
    );
    const all = [...kb.rules, ...kb.skills, ...kb.commands, ...kb.claudeMd];
    for (const source of kb.imported) {
      const count = all.filter((a) => a.provenance?.source === source.name).length;
      process.stdout.write(
        `Imported: ${source.name} ${count} artifact(s) from ${source.repo} at ${source.ref.slice(0, 7)} (${source.license})\n`,
      );
    }
    return 0;
  }

  if (options.command === 'check') {
    return check(options, kb);
  }

  if (options.command !== 'resolve' && options.command !== 'generate') {
    throw new UsageError(`Unknown command: ${options.command}`);
  }

  const stack = resolveStack(kb.catalog, options.stack);
  const fullSelection = selectArtifacts(kb, stack);
  const fullReport = validate(stack, fullSelection, options.acceptConflicts);

  if (options.command === 'resolve') {
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify(
          { stack, selection: summarize(fullSelection), report: fullReport },
          null,
          2,
        )}\n`,
      );
    } else {
      process.stdout.write(`Resolved stack (${stack.technologies.length}):\n`);
      process.stdout.write(`${formatStack(stack).join('\n')}\n`);
      printReport(fullReport);
    }
    return fullReport.ok ? 0 : 2;
  }

  const approval = fullReport.ok
    ? await approve(options, stack, fullSelection)
    : { cancelled: false as const, selection: fullSelection, kept: [], declined: [] };
  if (approval.cancelled) {
    process.stdout.write('\nCancelled. Nothing was written.\n');
    return 130;
  }

  const { selection, kept, declined } = approval;
  const composed = compose(stack, selection, VERSION, kb.imported);
  const { retained } = await planEmit(options.out, composed);
  const report = fullReport.ok
    ? validate(stack, selection, options.acceptConflicts, kept, retained)
    : fullReport;

  const result = await emit(options.out, composed, { dryRun: !options.write || !report.ok });

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          stack,
          selection: summarize(selection),
          report,
          emit: result,
          kept,
          declined: declined.map(({ id, type, path }) => ({ id, type, path })),
        },
        null,
        2,
      )}\n`,
    );
    return report.ok ? 0 : 2;
  }

  process.stdout.write(`Resolved stack (${stack.technologies.length}):\n`);
  process.stdout.write(`${formatStack(stack).join('\n')}\n`);
  printReport(report);
  if (declined.length > 0) {
    process.stdout.write(`\nLeft out at your request:\n`);
    for (const item of declined) {
      process.stdout.write(`  ${item.id}${item.path ? ` (${item.path})` : ''}\n`);
    }
  }
  process.stdout.write(
    `\n${result.dryRun ? 'Would write' : 'Wrote'} ${result.write.length} file(s) in ${result.outDir}:\n`,
  );
  for (const path of result.write) process.stdout.write(`  ${path}\n`);
  if (result.remove.length > 0) {
    process.stdout.write(`${result.dryRun ? 'Would remove' : 'Removed'} stale output:\n`);
    for (const path of result.remove) process.stdout.write(`  ${path}\n`);
  }
  if (result.dryRun && report.ok) {
    process.stdout.write('\nNothing written. Re-run with --write to apply.\n');
  }
  return report.ok ? 0 : 2;
}

/**
 * Whether the project is what a generate run would make of it today.
 *
 * It runs the same pipeline as an unattended `generate`, writes nothing, and
 * compares the result with the project. That is the only honest answer to "has
 * this project picked up the knowledge base's last change?": any other measure
 * could drift from what the generator actually does.
 */
async function check(
  options: Options,
  kb: Awaited<ReturnType<typeof loadKnowledgeBase>>,
): Promise<number> {
  let input = options.stack;
  if (input.framework.length === 0) {
    // The frameworks the operator chose last time, not the ones the resolver
    // pulled in: those are the input, and a dependency follows from it again.
    const previous = await readPreviousManifest(options.out);
    if (!previous) {
      process.stderr.write(
        `No agent-stack manifest in ${options.out}: nothing has been generated there yet.\n` +
          `Run generate first, or name the framework with --framework to compare against it.\n`,
      );
      return 2;
    }
    input = {
      framework: previous.stack.filter((tech) => tech.origin === 'input').map((tech) => tech.id),
    };
  }

  const stack = resolveStack(kb.catalog, input);
  const fullSelection = selectArtifacts(kb, stack);
  const fullReport = validate(stack, fullSelection, options.acceptConflicts);
  if (!fullReport.ok) {
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ stack, report: fullReport }, null, 2)}\n`);
    } else {
      printReport(fullReport);
    }
    return 2;
  }

  // Never the checklist: a check decides nothing, so it takes the defaults an
  // unattended run would.
  const { selection, kept } = await approve({ ...options, write: false }, stack, fullSelection);
  const composed = compose(stack, selection, VERSION, kb.imported);
  const { retained } = await planEmit(options.out, composed);
  const report = validate(stack, selection, options.acceptConflicts, kept, retained);
  const changes = await pendingChanges(options.out, composed);

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify({ stack, report, changes, upToDate: changes.length === 0 }, null, 2)}\n`,
    );
    return changes.length === 0 ? 0 : 3;
  }

  process.stdout.write(`Resolved stack (${stack.technologies.length}):\n`);
  process.stdout.write(`${formatStack(stack).join('\n')}\n`);
  printReport(report);
  if (changes.length === 0) {
    process.stdout.write(`\n${options.out} is up to date with the knowledge base.\n`);
    return 0;
  }
  process.stdout.write(`\nA generate run would change ${changes.length} path(s) in ${options.out}:\n`);
  for (const { path, change } of changes) {
    process.stdout.write(`  ${change.padEnd(7)}${path}\n`);
  }
  const flags = [
    ...input.framework.map((id) => `--framework ${id}`),
    ...(options.out === process.cwd() ? [] : [`--out ${options.out}`]),
  ].join(' ');
  process.stdout.write(`\nTo apply: agent-stack generate ${flags} --write\n`);
  return 3;
}

interface Approval {
  cancelled: boolean;
  selection: ReturnType<typeof selectArtifacts>;
  kept: KeptPath[];
  declined: PickerItem[];
}

/**
 * Narrow the selection to what the operator approved.
 *
 * On a terminal the checklist decides; anywhere else — under --json, in a
 * script, behind a slash command — the same defaults run unattended: a file the
 * project already has is left alone unless --overwrite says otherwise. Both
 * paths end at one map of dropped artifacts, so an approved run and an
 * unattended one differ in what was dropped and in nothing else.
 */
async function approve(
  options: Options,
  stack: ResolvedStack,
  selection: ReturnType<typeof selectArtifacts>,
): Promise<Approval> {
  const targets = await inspectTargets(options.out, artifactTargets(selection));
  const io = { input: process.stdin, output: process.stdout };
  const excluded = new Map<string, string>();
  const kept: KeptPath[] = [];
  const declined: PickerItem[] = [];

  if (options.write && !options.json && !options.yes && isInteractive(io)) {
    const picked = await runPicker(targets, io, { overwrite: options.overwrite });
    if (picked.status === 'cancelled') {
      return { cancelled: true, selection, kept, declined };
    }
    for (const item of rejected(picked)) {
      if (belongsToProject(item.state) && item.path !== undefined) {
        excluded.set(item.key, 'the file is the project\'s');
        kept.push({ id: item.id, path: item.path, state: item.state });
      } else {
        excluded.set(item.key, 'not approved');
        declined.push(item);
      }
    }
  } else if (!options.overwrite) {
    for (const target of targets) {
      if (!belongsToProject(target.state) || target.path === undefined) continue;
      excluded.set(artifactKey(target), 'the file is the project\'s');
      kept.push({ id: target.id, path: target.path, state: target.state });
    }
  }

  return {
    cancelled: false,
    selection: excludeArtifacts(selection, excluded, stack),
    kept,
    declined,
  };
}

function summarize(selection: ReturnType<typeof selectArtifacts>) {
  const describe = (entries: typeof selection.rules) =>
    entries.map((entry) => ({
      id: entry.artifact.meta.id,
      source: entry.artifact.source,
      layer: entry.artifact.meta.layer,
      matchedBy: entry.matchedBy,
      importedFrom: entry.artifact.provenance?.source,
    }));

  return {
    rules: describe(selection.rules),
    skills: describe(selection.skills),
    commands: describe(selection.commands),
    claudeMd: describe(selection.claudeMd),
    skipped: selection.skipped.map((entry) => ({
      id: entry.artifact.meta.id,
      reason: entry.reason,
    })),
  };
}

function printReport(report: ReturnType<typeof validate>): void {
  const { counts } = report;
  process.stdout.write(
    `\nSelected ${counts.rules} rule(s), ${counts.skills} skill(s), ${counts.commands} command(s) and ${counts.claudeMd} CLAUDE.md fragment(s) for ${counts.technologies} framework(s).\n`,
  );
  const errors = report.findings.filter((f) => f.severity === 'error');
  const warnings = report.findings.filter((f) => f.severity === 'warning');
  for (const finding of errors) {
    const waiver = finding.conflict ? ` [--accept-conflict ${finding.conflict}]` : '';
    process.stdout.write(`ERROR   ${finding.message}${waiver}\n`);
  }
  for (const finding of warnings) {
    process.stdout.write(`warning ${finding.message}\n`);
  }
}

const argv = process.argv.slice(2);
try {
  process.exitCode = await run(parseArgs(argv));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof UsageError) {
    process.stderr.write(`${message}\n\n${USAGE}`);
    process.exitCode = 64;
  } else if (error instanceof UnknownTechnologyError) {
    // The one thing the operator had to type correctly. Show what was on offer
    // rather than making them run `catalog` to find out.
    const catalog =
      error.known.length > 0
        ? `\nThe catalog has ${error.known.length} framework${
            error.known.length === 1 ? '' : 's'
          }:\n\n${renderTable(
            [{ header: 'id' }, { header: 'name' }],
            error.known.map((entry) => [entry.id, entry.name]),
          )}\n`
        : '\nThe catalog has no frameworks.\n';
    process.stderr.write(`${message}\n${catalog}`);
    process.exitCode = 65;
  } else {
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
