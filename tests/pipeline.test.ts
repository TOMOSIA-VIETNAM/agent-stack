import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { loadKnowledgeBase } from '../src/catalog.js';
import { compose, mergeClaudeMd, BEGIN_MARKER, END_MARKER } from '../src/composer.js';
import { emit } from '../src/emit.js';
import { resolveStack } from '../src/resolver.js';
import { techStackInputSchema, type TechStackInput } from '../src/schema.js';
import { selectArtifacts } from '../src/selector.js';
import { validate } from '../src/validator.js';
import { ensureCheckout, VendorError, vendorSourceSchema } from '../src/vendor.js';

const KNOWLEDGE = resolve(import.meta.dirname, '..', 'knowledge');

async function run(input: Record<string, { tech: string; version?: string }[]>) {
  const kb = await loadKnowledgeBase(KNOWLEDGE);
  const stack = resolveStack(kb.catalog, techStackInputSchema.parse(input) as TechStackInput);
  const selection = selectArtifacts(kb, stack);
  return { kb, stack, selection, report: validate(stack, selection) };
}

describe('knowledge base', () => {
  it('loads and passes its own lint', async () => {
    const kb = await loadKnowledgeBase(KNOWLEDGE);
    expect(kb.rules.length).toBeGreaterThan(0);
    expect(kb.skills.length).toBeGreaterThan(0);
  });
});

describe('selection', () => {
  it('always applies the global layer, which is vendored', async () => {
    const { selection } = await run({ language: [{ tech: 'ruby', version: '3.3' }] });
    const global = selection.skills.filter((entry) => entry.artifact.meta.layer === 'global');
    expect(global.length).toBeGreaterThan(20);
    expect(global.map((entry) => entry.artifact.meta.id)).toContain('test-driven-development');
    expect(global.every((entry) => entry.artifact.provenance?.license === 'MIT')).toBe(true);
  });

  it('selects language and framework layers for a Rails stack', async () => {
    const { selection, report } = await run({
      language: [{ tech: 'ruby', version: '3.3' }],
      framework: [{ tech: 'rails', version: '7.1' }],
      library: [{ tech: 'activerecord' }],
      testing: [{ tech: 'rspec' }],
    });
    const ruleIds = selection.rules.map((entry) => entry.artifact.meta.id);
    expect(ruleIds).toContain('ruby-conventions');
    expect(ruleIds).toContain('rails-conventions');
    expect(ruleIds).toContain('activerecord-conventions');
    expect(ruleIds).toContain('rspec-conventions');
    expect(selection.skills.map((entry) => entry.artifact.meta.id)).toContain('rails-feature');
    expect(report.ok).toBe(true);
  });

  it('skips a framework rule whose version range does not match', async () => {
    const { selection } = await run({
      language: [{ tech: 'ruby', version: '3.3' }],
      framework: [{ tech: 'rails', version: '6.1' }],
    });
    expect(selection.rules.map((entry) => entry.artifact.meta.id)).not.toContain(
      'rails-conventions',
    );
    expect(selection.skipped.map((entry) => entry.reason).join(' ')).toContain('outside');
  });

  it('reports an unpinned version as an error instead of guessing', async () => {
    const { report } = await run({
      language: [{ tech: 'ruby' }],
      framework: [{ tech: 'rails' }],
    });
    expect(report.ok).toBe(false);
    expect(report.findings.map((f) => f.code)).toContain('missing-version');
  });
});

describe('validation', () => {
  it('blocks on a declared conflict and names the waiver', async () => {
    const { report } = await run({
      language: [{ tech: 'ruby', version: '3.3' }],
      framework: [{ tech: 'rails', version: '7.1' }],
      frontend: [{ tech: 'stimulus' }, { tech: 'react' }],
    });
    expect(report.ok).toBe(false);
    const conflict = report.findings.find((f) => f.code === 'stack-conflict');
    expect(conflict?.conflict).toBe('react+stimulus');
  });

  it('downgrades an accepted conflict to a warning', async () => {
    const kb = await loadKnowledgeBase(KNOWLEDGE);
    const stack = resolveStack(
      kb.catalog,
      techStackInputSchema.parse({
        language: [{ tech: 'ruby', version: '3.3' }],
        framework: [{ tech: 'rails', version: '7.1' }],
        frontend: [{ tech: 'stimulus' }, { tech: 'react' }],
      }),
    );
    const selection = selectArtifacts(kb, stack);
    const report = validate(stack, selection, ['react+stimulus']);
    expect(report.ok).toBe(true);
    expect(report.findings.some((f) => f.severity === 'warning' && f.code === 'stack-conflict')).toBe(
      true,
    );
  });

  it('flags a technology the knowledge base does not cover yet', async () => {
    const { report } = await run({
      language: [{ tech: 'php', version: '8.2' }],
      framework: [{ tech: 'laravel', version: '11' }],
    });
    expect(report.findings.filter((f) => f.code === 'uncovered-technology').length).toBeGreaterThan(
      0,
    );
  });
});

describe('emit', () => {
  const stackInput = {
    language: [{ tech: 'ruby', version: '3.3' }],
    framework: [{ tech: 'rails', version: '7.1' }],
    library: [{ tech: 'activerecord' }],
  };

  it('writes rules, skills, a manifest, and a CLAUDE.md block', async () => {
    const { stack, selection } = await run(stackInput);
    const composed = compose(stack, selection, 'test');
    const out = await mkdtemp(join(tmpdir(), 'aidd-'));

    const result = await emit(out, composed, { dryRun: false });
    expect(result.dryRun).toBe(false);

    const claudeMd = await readFile(join(out, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('@.claude/rules/30-ruby-conventions.md');
    expect(claudeMd).toContain('@.claude/rules/40-rails-conventions.md');

    const rule = await readFile(join(out, '.claude/rules/40-rails-conventions.md'), 'utf8');
    expect(rule).not.toContain('applies_to:');
    expect(rule).toContain('# Rails Conventions');

    const skill = await readFile(join(out, '.claude/skills/rails-feature/SKILL.md'), 'utf8');
    expect(skill).toContain('name: rails-feature');
    expect(skill).not.toContain('priority:');

    const manifest = JSON.parse(await readFile(join(out, '.claude/aidd-manifest.json'), 'utf8'));
    expect(manifest.rules.length).toBe(selection.rules.length);
  });

  it('dry run writes nothing', async () => {
    const { stack, selection } = await run(stackInput);
    const composed = compose(stack, selection, 'test');
    const out = await mkdtemp(join(tmpdir(), 'aidd-'));

    const result = await emit(out, composed, { dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.write.length).toBeGreaterThan(0);
    await expect(readFile(join(out, 'CLAUDE.md'), 'utf8')).rejects.toThrow();
  });

  it('removes stale output from a previous run and keeps hand-written CLAUDE.md content', async () => {
    const out = await mkdtemp(join(tmpdir(), 'aidd-'));
    await writeFile(join(out, 'CLAUDE.md'), '# My project\n\nHand written notes.\n', 'utf8');

    const wide = await run(stackInput);
    await emit(out, compose(wide.stack, wide.selection, 'test'), { dryRun: false });
    expect(
      await readFile(join(out, '.claude/rules/42-activerecord-conventions.md'), 'utf8'),
    ).toContain('Active Record');

    const narrow = await run({ language: [{ tech: 'ruby', version: '3.3' }] });
    const result = await emit(out, compose(narrow.stack, narrow.selection, 'test'), {
      dryRun: false,
    });

    expect(result.remove).toContain('.claude/rules/42-activerecord-conventions.md');
    await expect(
      readFile(join(out, '.claude/rules/42-activerecord-conventions.md'), 'utf8'),
    ).rejects.toThrow();

    const claudeMd = await readFile(join(out, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('Hand written notes.');
    expect(claudeMd).not.toContain('40-rails-conventions');
  });
});

describe('vendored skills', () => {
  it('emits an upstream skill with its provenance and licence notice', async () => {
    const { kb, stack, selection } = await run({
      language: [{ tech: 'ruby', version: '3.3' }],
    });
    const composed = compose(stack, selection, 'test', kb.vendored);
    const out = await mkdtemp(join(tmpdir(), 'aidd-'));
    await emit(out, composed, { dryRun: false });

    const skill = await readFile(
      join(out, '.claude/skills/test-driven-development/SKILL.md'),
      'utf8',
    );
    expect(skill).toContain('name: test-driven-development');
    expect(skill).toContain('addyosmani/agent-skills');
    expect(skill).toContain('MIT');

    const notices = await readFile(join(out, '.claude/skills/THIRD-PARTY-NOTICES.md'), 'utf8');
    expect(notices).toContain('Permission is hereby granted');
    expect(notices).toContain(kb.vendored[0]!.ref);

    const manifest = JSON.parse(await readFile(join(out, '.claude/aidd-manifest.json'), 'utf8'));
    expect(manifest.extras).toContain('.claude/skills/THIRD-PARTY-NOTICES.md');
    expect(manifest.vendored[0].ref).toMatch(/^[0-9a-f]{40}$/);
  });

  it('checks out the pinned commit, not a branch', async () => {
    const source = vendorSourceSchema.parse({
      repo: 'https://github.com/addyosmani/agent-skills.git',
      ref: 'a120596f6d7ff9b967a3f5e0331ea911376ee5ef',
      license: 'MIT',
      copyright: 'Copyright (c) Addy Osmani',
      path: 'skills',
      priority: 20,
    });
    const checkout = await ensureCheckout('agent-skills', source);
    const { stdout } = await promisify(execFile)('git', ['-C', checkout, 'rev-parse', 'HEAD']);
    expect(stdout.trim()).toBe(source.ref);
  });

  it('rejects a source pinned to anything but a full SHA', () => {
    const base = {
      repo: 'https://github.com/addyosmani/agent-skills.git',
      license: 'MIT',
      copyright: 'Copyright (c) Addy Osmani',
      path: 'skills',
      priority: 20,
    };
    expect(() => vendorSourceSchema.parse({ ...base, ref: 'main' })).toThrow();
    expect(() => vendorSourceSchema.parse({ ...base, ref: 'a120596' })).toThrow();
  });

  it('fails the whole run when the pinned commit cannot be fetched', async () => {
    const source = vendorSourceSchema.parse({
      repo: 'https://github.com/addyosmani/agent-skills.git',
      ref: '0'.repeat(40),
      license: 'MIT',
      copyright: 'Copyright (c) Addy Osmani',
      path: 'skills',
      priority: 20,
    });
    await expect(ensureCheckout('agent-skills-missing', source)).rejects.toThrow(VendorError);
  }, 60_000);
});

describe('mergeClaudeMd', () => {
  it('replaces only the managed block', () => {
    const existing = `# Title\n\nkeep me\n\n${BEGIN_MARKER}\nold\n${END_MARKER}\n\ntrailing\n`;
    const merged = mergeClaudeMd(existing, `${BEGIN_MARKER}\nnew\n${END_MARKER}`);
    expect(merged).toContain('keep me');
    expect(merged).toContain('trailing');
    expect(merged).toContain('new');
    expect(merged).not.toContain('old');
  });
});
