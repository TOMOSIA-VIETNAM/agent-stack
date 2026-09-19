import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadKnowledgeBase } from '../src/catalog.js';
import { compose, mergeClaudeMd, BEGIN_MARKER, END_MARKER } from '../src/composer.js';
import { emit } from '../src/emit.js';
import { resolveStack } from '../src/resolver.js';
import { techStackInputSchema, type TechStackInput } from '../src/schema.js';
import { selectArtifacts } from '../src/selector.js';
import { validate } from '../src/validator.js';
import { upstreamSourceSchema } from '../src/upstream.js';

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
  it('always applies the global layer, which is imported', async () => {
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

  // Picking a framework must bring everything the knowledge base knows about
  // it. An artifact gated on a sub-technology the operator was never told to
  // ask for drops out of the run silently, which is how the Active Record
  // rules used to disappear from a plain Rails stack.
  it('emits every Rails artifact from the framework alone', async () => {
    const { kb, selection } = await run({ framework: [{ tech: 'rails', version: '7.1' }] });

    const railsArtifacts = [...kb.rules, ...kb.skills, ...kb.commands, ...kb.claudeMd]
      .filter((artifact) => artifact.meta.applies_to.some((applies) => applies.tech === 'rails'))
      .map((artifact) => artifact.meta.id);
    expect(railsArtifacts.length).toBeGreaterThan(1);

    const selectedIds = new Set(
      [...selection.rules, ...selection.skills, ...selection.commands, ...selection.claudeMd].map(
        (entry) => entry.artifact.meta.id,
      ),
    );
    for (const id of railsArtifacts) {
      expect(selectedIds).toContain(id);
    }
  });

  it('leaves an optional technology out until it is selected', async () => {
    const { selection } = await run({ framework: [{ tech: 'rails', version: '7.1' }] });
    expect(selection.rules.map((entry) => entry.artifact.meta.id)).not.toContain(
      'rspec-conventions',
    );
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
  };

  it('writes rules, skills, a manifest, and a CLAUDE.md block', async () => {
    const { stack, selection } = await run(stackInput);
    const composed = compose(stack, selection, 'test');
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));

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

    const manifest = JSON.parse(await readFile(join(out, '.claude/agent-stack-manifest.json'), 'utf8'));
    expect(manifest.rules.length).toBe(selection.rules.length);
  });

  it('dry run writes nothing', async () => {
    const { stack, selection } = await run(stackInput);
    const composed = compose(stack, selection, 'test');
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));

    const result = await emit(out, composed, { dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.write.length).toBeGreaterThan(0);
    await expect(readFile(join(out, 'CLAUDE.md'), 'utf8')).rejects.toThrow();
  });

  it('removes stale output from a previous run and keeps hand-written CLAUDE.md content', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
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

describe('imported content', () => {
  it('emits an upstream skill and command with provenance and a licence notice', async () => {
    const { kb, stack, selection } = await run({
      language: [{ tech: 'ruby', version: '3.3' }],
    });
    const composed = compose(stack, selection, 'test', kb.imported);
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await emit(out, composed, { dryRun: false });

    const skill = await readFile(
      join(out, '.claude/skills/test-driven-development/SKILL.md'),
      'utf8',
    );
    expect(skill).toContain('name: test-driven-development');
    expect(skill).not.toContain('Copyright');

    const command = await readFile(join(out, '.claude/commands/test.md'), 'utf8');
    expect(command).toContain('description:');
    expect(command).not.toContain('Copyright');

    const manifest = JSON.parse(await readFile(join(out, '.claude/agent-stack-manifest.json'), 'utf8'));
    expect(manifest.commands.map((c: { id: string }) => c.id)).toContain('test');
    expect(manifest.imported[0].ref).toMatch(/^[0-9a-f]{40}$/);
    // Attribution lives once, in the manifest, rather than on every file.
    expect(manifest.imported[0].licenseUrl).toMatch(/^https:/);
    expect(manifest.imported[0].copyright).toContain('Copyright');
    expect(manifest.imported[0].license).toBe('MIT');
  });

  it('copies the files a skill references', async () => {
    const { kb, stack, selection } = await run({
      language: [{ tech: 'ruby', version: '3.3' }],
    });
    const composed = compose(stack, selection, 'test', kb.imported);
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await emit(out, composed, { dryRun: false });

    const referenced = await readFile(
      join(out, '.claude/skills/idea-refine/frameworks.md'),
      'utf8',
    );
    expect(referenced.length).toBeGreaterThan(0);
  });

  it('derives metadata from the directory, leaving upstream files untouched', async () => {
    const kb = await loadKnowledgeBase(KNOWLEDGE);
    const imported = kb.skills.find((s) => s.meta.id === 'test-driven-development');
    expect(imported?.meta.layer).toBe('global');
    expect(imported?.meta.priority).toBe(20);
    expect(imported?.meta.applies_to).toEqual([]);
    expect(imported?.provenance?.license).toBe('MIT');

    const onDisk = await readFile(
      join(KNOWLEDGE, 'skills/global/test-driven-development/SKILL.md'),
      'utf8',
    );
    expect(onDisk).not.toContain('priority:');
    expect(onDisk).not.toContain('layer:');
  });

  it('inlines the imported guidelines into CLAUDE.md instead of a rule file', async () => {
    const { kb, stack, selection } = await run({ language: [{ tech: 'ruby', version: '3.3' }] });
    const fragment = selection.claudeMd.find(
      (entry) => entry.artifact.meta.id === 'karpathy-guidelines',
    );
    expect(fragment?.artifact.meta.layer).toBe('global');
    expect(fragment?.artifact.meta.description).toContain('assumptions');
    expect(fragment?.artifact.provenance?.license).toBe('MIT');

    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await writeFile(join(out, 'CLAUDE.md'), '# My project\n\nHand written.\n', 'utf8');
    const composed = compose(stack, selection, 'test', kb.imported);
    await emit(out, composed, { dryRun: false });

    const claudeMd = await readFile(join(out, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('Hand written.');
    expect(claudeMd).toContain('## 1. Think Before Coding');
    expect(claudeMd).not.toContain('Copyright');
    // The fragment's own title is dropped, so the project keeps a single h1.
    expect(claudeMd.match(/^# /gm)?.length).toBe(1);
    expect(claudeMd).not.toContain('@.claude/rules/20-karpathy-guidelines.md');

    // Nothing is emitted for it, and the manifest records where it came from.
    expect(composed.manifest.rules.map((rule) => rule.id)).not.toContain('karpathy-guidelines');
    expect(composed.manifest.imported.map((entry) => entry.source)).toContain(
      'karpathy-guidelines',
    );
  });

  it('rejects a source pinned to anything but a full SHA', () => {
    const base = {
      repo: 'https://github.com/addyosmani/agent-skills.git',
      license: 'MIT',
      license_url: 'https://github.com/addyosmani/agent-skills/blob/main/LICENSE',
      copyright: 'Copyright (c) Addy Osmani',
      copy: { skills: 'skills/global' },
    };
    expect(() => upstreamSourceSchema.parse({ ...base, ref: 'main' })).toThrow();
    expect(() => upstreamSourceSchema.parse({ ...base, ref: 'a120596' })).toThrow();
    expect(() =>
      upstreamSourceSchema.parse({ ...base, ref: 'a120596f6d7ff9b967a3f5e0331ea911376ee5ef' }),
    ).not.toThrow();
  });
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
