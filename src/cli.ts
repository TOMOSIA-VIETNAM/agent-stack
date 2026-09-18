#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, resolve } from 'node:path';
import { loadKnowledgeBase } from './catalog.js';
import { compose } from './composer.js';
import { emit } from './emit.js';
import { resolveStack, UnknownTechnologyError, type ResolvedStack } from './resolver.js';
import { SLOTS, techStackInputSchema, type Slot, type TechStackInput } from './schema.js';
import { selectArtifacts } from './selector.js';
import { validate } from './validator.js';
import { VendorError } from './vendor.js';

const VERSION = '0.1.0';
const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_KNOWLEDGE = resolve(HERE, '..', 'knowledge');

const USAGE = `open-aidd ${VERSION} - generate .claude rules and skills from a curated knowledge base

Usage:
  aidd catalog [--json]                       list technologies and artifacts
  aidd resolve <stack flags> [--json]         resolve dependencies, report conflicts
  aidd generate <stack flags> [options]       compose and write the output

Stack flags (repeatable, "tech" or "tech@version"):
${SLOTS.map((slot) => `  --${slot} <tech[@version]>`).join('\n')}

Options:
  --out <dir>                 target project directory (default: cwd)
  --write                     write files; without it, generate only previews
  --accept-conflict <id>      proceed despite one conflict, by its reported id
  --knowledge <dir>           knowledge base directory (default: bundled)
  --json                      machine-readable output
  -h, --help                  this help
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
}

function parseSelection(value: string): { tech: string; version?: string } {
  const at = value.lastIndexOf('@');
  if (at <= 0) return { tech: value };
  return { tech: value.slice(0, at), version: value.slice(at + 1) };
}

function parseArgs(argv: string[]): Options {
  const stack: Record<string, { tech: string; version?: string }[]> = {};
  const acceptConflicts: string[] = [];
  let command = '';
  let out = process.cwd();
  let knowledge = DEFAULT_KNOWLEDGE;
  let write = false;
  let json = false;

  const slots = new Set<string>(SLOTS);
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
    } else if (arg === '--out') {
      out = resolve(next());
    } else if (arg === '--knowledge') {
      const value = next();
      knowledge = isAbsolute(value) ? value : resolve(value);
    } else if (arg === '--accept-conflict') {
      acceptConflicts.push(next());
    } else if (arg.startsWith('--')) {
      const slot = arg.slice(2);
      if (!slots.has(slot)) throw new UsageError(`Unknown flag: ${arg}`);
      (stack[slot] ??= []).push(parseSelection(next()));
    } else if (!command) {
      command = arg;
    } else {
      throw new UsageError(`Unexpected argument: ${arg}`);
    }
  }

  return {
    command: command || 'help',
    stack: techStackInputSchema.parse(stack),
    out,
    write,
    json,
    knowledge,
    acceptConflicts,
  };
}

function formatStack(stack: ResolvedStack): string[] {
  return stack.technologies.map((tech) => {
    const version = tech.version ? ` ${tech.version}` : '';
    const via =
      tech.origin === 'dependency' ? ` (required by ${tech.requiredBy[0] ?? 'unknown'})` : '';
    return `  ${tech.id}${version} [${tech.slot}]${via}`;
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
    const technologies = Object.entries(kb.catalog.technologies).map(([id, tech]) => ({
      id,
      name: tech.name,
      kind: tech.kind,
      requires: tech.requires,
      conflicts_with: tech.conflicts_with,
      supported_versions: tech.supported_versions,
      artifacts: [...kb.rules, ...kb.skills]
        .filter((artifact) => artifact.meta.applies_to.some((a) => a.tech === id))
        .map((artifact) => artifact.meta.id),
    }));
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ technologies }, null, 2)}\n`);
      return 0;
    }
    process.stdout.write(`Technologies (${technologies.length}):\n`);
    for (const tech of technologies) {
      const coverage = tech.artifacts.length > 0 ? `${tech.artifacts.length} artifact(s)` : 'no content yet';
      process.stdout.write(`  ${tech.id} [${tech.kind}] - ${coverage}\n`);
    }
    process.stdout.write(`\nRules: ${kb.rules.length}  Skills: ${kb.skills.length}\n`);
    for (const source of kb.vendored) {
      const count = kb.skills.filter((s) => s.provenance?.source === source.source).length;
      process.stdout.write(
        `Vendored: ${source.source} ${count} skill(s) from ${source.repo} at ${source.ref.slice(0, 7)} (${source.license})\n`,
      );
    }
    return 0;
  }

  if (options.command !== 'resolve' && options.command !== 'generate') {
    throw new UsageError(`Unknown command: ${options.command}`);
  }

  const stack = resolveStack(kb.catalog, options.stack);
  const selection = selectArtifacts(kb, stack);
  const report = validate(stack, selection, options.acceptConflicts);

  if (options.command === 'resolve') {
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify({ stack, selection: summarize(selection), report }, null, 2)}\n`,
      );
    } else {
      process.stdout.write(`Resolved stack (${stack.technologies.length}):\n`);
      process.stdout.write(`${formatStack(stack).join('\n')}\n`);
      printReport(report);
    }
    return report.ok ? 0 : 2;
  }

  const composed = compose(stack, selection, VERSION, kb.vendored);
  const result = await emit(options.out, composed, { dryRun: !options.write || !report.ok });

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        { stack, selection: summarize(selection), report, emit: result },
        null,
        2,
      )}\n`,
    );
    return report.ok ? 0 : 2;
  }

  process.stdout.write(`Resolved stack (${stack.technologies.length}):\n`);
  process.stdout.write(`${formatStack(stack).join('\n')}\n`);
  printReport(report);
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

function summarize(selection: ReturnType<typeof selectArtifacts>) {
  return {
    rules: selection.rules.map((entry) => ({
      id: entry.artifact.meta.id,
      name: entry.artifact.meta.name,
      layer: entry.artifact.meta.layer,
      matchedBy: entry.matchedBy,
    })),
    skills: selection.skills.map((entry) => ({
      id: entry.artifact.meta.id,
      name: entry.artifact.meta.name,
      layer: entry.artifact.meta.layer,
      matchedBy: entry.matchedBy,
    })),
    skipped: selection.skipped.map((entry) => ({
      id: entry.artifact.meta.id,
      reason: entry.reason,
    })),
  };
}

function printReport(report: ReturnType<typeof validate>): void {
  const { counts } = report;
  process.stdout.write(
    `\nSelected ${counts.rules} rule(s) and ${counts.skills} skill(s) for ${counts.technologies} technolog(ies).\n`,
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
    process.stderr.write(`${message}\n`);
    process.exitCode = 65;
  } else if (error instanceof VendorError) {
    process.stderr.write(`${message}\n`);
    process.exitCode = 66;
  } else {
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
