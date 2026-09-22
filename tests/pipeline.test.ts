import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadKnowledgeBase } from '../src/catalog.js';
import {
  artifactTargets,
  compose,
  mergeClaudeMd,
  BEGIN_MARKER,
  END_MARKER,
} from '../src/composer.js';
import { emit, inspectTargets } from '../src/emit.js';
import { resolveStack } from '../src/resolver.js';
import { techStackInputSchema, type TechStackInput } from '../src/schema.js';
import { artifactKey, excludeArtifacts, selectArtifacts } from '../src/selector.js';
import { validate } from '../src/validator.js';
import { upstreamSourceSchema } from '../src/upstream.js';

const KNOWLEDGE = resolve(import.meta.dirname, '..', 'knowledge');

async function run(...framework: string[]) {
  const kb = await loadKnowledgeBase(KNOWLEDGE);
  const stack = resolveStack(
    kb.catalog,
    techStackInputSchema.parse({ framework }) as TechStackInput,
  );
  const selection = selectArtifacts(kb, stack);
  return { kb, stack, selection, report: validate(stack, selection) };
}

/** Generate into a fresh directory and hand back where it landed. */
async function generate(...framework: string[]) {
  const { kb, stack, selection, report } = await run(...framework);
  const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
  await emit(out, compose(stack, selection, 'test', kb.imported), { dryRun: false });
  return { kb, stack, selection, report, out };
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
    const { selection } = await run('rails');
    const global = selection.skills.filter((entry) => entry.artifact.meta.layer === 'global');
    expect(global.length).toBeGreaterThan(20);
    expect(global.map((entry) => entry.artifact.meta.id)).toContain('test-driven-development');
    expect(global.every((entry) => entry.artifact.provenance?.license === 'MIT')).toBe(true);
  });

  // The framework is the whole input, and the whole catalog: `--framework rails`
  // is the only thing an operator types to get every Rails artifact.
  it('selects the framework layer from the framework alone', async () => {
    const { stack, selection, report } = await run('rails');
    expect(stack.technologies.map((tech) => tech.id)).toEqual(['rails']);

    const ruleIds = selection.rules.map((entry) => entry.artifact.meta.id);
    expect(ruleIds).toContain('rails-ruby');
    expect(ruleIds).toContain('rails-conventions');
    expect(ruleIds).toContain('rails-activerecord');
    expect(selection.skills.map((entry) => entry.artifact.meta.id)).toContain('rails-feature');
    expect(report.ok).toBe(true);
  });

  it('emits every Rails artifact from the framework alone', async () => {
    const { kb, selection } = await run('rails');

    const railsArtifacts = [...kb.rules, ...kb.skills, ...kb.commands]
      .filter((artifact) => artifact.meta.applies_to.includes('rails'))
      .map((artifact) => artifact.meta.id);
    expect(railsArtifacts.length).toBeGreaterThan(1);

    const selectedIds = new Set(
      [...selection.rules, ...selection.skills, ...selection.commands].map(
        (entry) => entry.artifact.meta.id,
      ),
    );
    for (const id of railsArtifacts) {
      expect(selectedIds).toContain(id);
    }
  });

  it("leaves another framework's content out", async () => {
    const { selection } = await run('laravel');
    const ids = selection.rules.map((entry) => entry.artifact.meta.id);
    expect(ids).not.toContain('rails-conventions');
    expect(selection.skipped.map((entry) => entry.artifact.meta.id)).toContain(
      'rails-conventions',
    );
  });
});

describe('validation', () => {
  it('blocks when no framework was given', async () => {
    const { report } = await run();
    expect(report.ok).toBe(false);
    expect(report.findings.map((f) => f.code)).toContain('missing-framework');
  });

  it('blocks on a declared conflict and names the waiver', async () => {
    const kb = await loadKnowledgeBase(KNOWLEDGE);
    // No catalog entry declares a conflict today, so declare one here: what is
    // under test is that the run stops and names the waiver, not the pairing.
    const catalog = {
      ...kb.catalog,
      technologies: {
        ...kb.catalog.technologies,
        rails: { ...kb.catalog.technologies.rails!, conflicts_with: ['laravel'] },
      },
    };
    const stack = resolveStack(
      catalog,
      techStackInputSchema.parse({ framework: ['rails', 'laravel'] }),
    );
    const selection = selectArtifacts(kb, stack);

    const blocked = validate(stack, selection);
    expect(blocked.ok).toBe(false);
    expect(blocked.findings.find((f) => f.code === 'stack-conflict')?.conflict).toBe(
      'laravel+rails',
    );

    const accepted = validate(stack, selection, ['laravel+rails']);
    expect(accepted.ok).toBe(true);
    expect(
      accepted.findings.some((f) => f.severity === 'warning' && f.code === 'stack-conflict'),
    ).toBe(true);
  });

  it('flags a framework the knowledge base does not cover yet', async () => {
    const { report } = await run('laravel');
    expect(report.findings.filter((f) => f.code === 'uncovered-technology').length).toBeGreaterThan(
      0,
    );
  });
});

// The whole point of the generator: a knowledge file is the operator's, and the
// project gets a copy of it, not a rewrite of it.
describe('emitted files are byte-for-byte copies', () => {
  it('copies a rule, a skill, a skill attachment and a command unchanged', async () => {
    const { out } = await generate('rails');

    const pairs: [string, string][] = [
      ['rules/framework/rails/conventions.md', '.claude/rules/rails-conventions.md'],
      ['skills/framework/rails/rails-feature/SKILL.md', '.claude/skills/rails-feature/SKILL.md'],
      ['skills/global/idea-refine/SKILL.md', '.claude/skills/idea-refine/SKILL.md'],
      ['skills/global/idea-refine/frameworks.md', '.claude/skills/idea-refine/frameworks.md'],
      ['commands/test.md', '.claude/commands/test.md'],
    ];

    for (const [source, emitted] of pairs) {
      expect(await readFile(join(out, emitted), 'utf8')).toBe(
        await readFile(join(KNOWLEDGE, source), 'utf8'),
      );
    }
  });

  it('adds no generator comment, heading or front matter of its own', async () => {
    const { out } = await generate('rails');
    const rule = await readFile(join(out, '.claude/rules/rails-conventions.md'), 'utf8');
    expect(rule).not.toContain('generated by agent-stack');
  });
});

describe('emit', () => {
  it('writes rules, skills, a manifest, and a CLAUDE.md block', async () => {
    const { out, selection } = await generate('rails');

    const claudeMd = await readFile(join(out, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('@.claude/rules/rails-conventions.md');
    expect(claudeMd).toContain('@.claude/rules/rails-ruby.md');

    const manifest = JSON.parse(await readFile(join(out, '.claude/agent-stack-manifest.json'), 'utf8'));
    expect(manifest.rules.length).toBe(selection.rules.length);
  });

  it('dry run writes nothing', async () => {
    const { kb, stack, selection } = await run('rails');
    const composed = compose(stack, selection, 'test', kb.imported);
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));

    const result = await emit(out, composed, { dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.write.length).toBeGreaterThan(0);
    await expect(readFile(join(out, 'CLAUDE.md'), 'utf8')).rejects.toThrow();
  });

  it('removes stale output from a previous run and keeps hand-written CLAUDE.md content', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await writeFile(join(out, 'CLAUDE.md'), '# My project\n\nHand written notes.\n', 'utf8');

    const wide = await run('rails');
    await emit(out, compose(wide.stack, wide.selection, 'test'), { dryRun: false });
    expect(await readFile(join(out, '.claude/rules/rails-activerecord.md'), 'utf8')).toContain(
      'Active Record',
    );

    const narrow = await run('laravel');
    const result = await emit(out, compose(narrow.stack, narrow.selection, 'test'), {
      dryRun: false,
    });

    expect(result.remove).toContain('.claude/rules/rails-activerecord.md');
    await expect(
      readFile(join(out, '.claude/rules/rails-activerecord.md'), 'utf8'),
    ).rejects.toThrow();

    const claudeMd = await readFile(join(out, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('Hand written notes.');
    expect(claudeMd).not.toContain('rails-conventions');
  });
});

describe('imported content', () => {
  it('records provenance in the manifest rather than on every file', async () => {
    const { out } = await generate('rails');

    const skill = await readFile(join(out, '.claude/skills/test-driven-development/SKILL.md'), 'utf8');
    expect(skill).not.toContain('Copyright');

    const manifest = JSON.parse(await readFile(join(out, '.claude/agent-stack-manifest.json'), 'utf8'));
    expect(manifest.commands.map((c: { id: string }) => c.id)).toContain('test');
    expect(manifest.imported[0].ref).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.imported[0].licenseUrl).toMatch(/^https:/);
    expect(manifest.imported[0].copyright).toContain('Copyright');
    expect(manifest.imported[0].license).toBe('MIT');
  });

  it('derives metadata from the directory, leaving upstream files untouched', async () => {
    const kb = await loadKnowledgeBase(KNOWLEDGE);
    const imported = kb.skills.find((s) => s.meta.id === 'test-driven-development');
    expect(imported?.meta.layer).toBe('global');
    expect(imported?.meta.applies_to).toEqual([]);
    expect(imported?.provenance?.license).toBe('MIT');
  });

  // The one type that is inlined rather than copied: it becomes part of the
  // project's own CLAUDE.md, which is agent-stack's document to compose.
  it('inlines the imported guidelines into CLAUDE.md instead of a rule file', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await writeFile(join(out, 'CLAUDE.md'), '# My project\n\nHand written.\n', 'utf8');

    const { kb, stack, selection } = await run('rails');
    const fragment = selection.claudeMd.find(
      (entry) => entry.artifact.meta.id === 'karpathy-guidelines',
    );
    expect(fragment?.artifact.meta.layer).toBe('global');
    expect(fragment?.artifact.provenance?.license).toBe('MIT');

    const composed = compose(stack, selection, 'test', kb.imported);
    await emit(out, composed, { dryRun: false });

    const claudeMd = await readFile(join(out, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('Hand written.');
    expect(claudeMd).toContain('## 1. Think Before Coding');
    expect(claudeMd).not.toContain('Copyright');
    // The fragment's own title is dropped, so the project keeps a single h1.
    expect(claudeMd.match(/^# /gm)?.length).toBe(1);
    expect(claudeMd).not.toContain('@.claude/rules/karpathy-guidelines.md');

    // Nothing is emitted for it, and the manifest still records where it came from.
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

// A project can be built on more than one framework, and two frameworks will
// naturally want a rule called the same thing. The directory disambiguates it.
describe('two frameworks at once', () => {
  const CATALOG = 'version: 1\ntechnologies:\n  rails:\n    name: Ruby on Rails\n  laravel:\n    name: Laravel\n';

  async function tempKnowledge(files: Record<string, string>) {
    const root = await mkdtemp(join(tmpdir(), 'agent-stack-kb-'));
    await writeFile(join(root, 'catalog.yaml'), CATALOG, 'utf8');
    for (const [path, contents] of Object.entries(files)) {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents, 'utf8');
    }
    return root;
  }

  it('gives two rules of the same name distinct files, each a copy of its own source', async () => {
    const kbRoot = await tempKnowledge({
      'rules/framework/rails/conventions.md': '# Rails conventions\n\nController rules.\n',
      'rules/framework/laravel/conventions.md': '# Laravel conventions\n\nController rules.\n',
    });

    const kb = await loadKnowledgeBase(kbRoot);
    const stack = resolveStack(
      kb.catalog,
      techStackInputSchema.parse({ framework: ['rails', 'laravel'] }),
    );
    const selection = selectArtifacts(kb, stack);
    const report = validate(stack, selection);
    expect(report.ok).toBe(true);

    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await emit(out, compose(stack, selection, 'test'), { dryRun: false });

    // Same filename under knowledge/, two different files in the project.
    expect(selection.rules.map((entry) => entry.artifact.meta.id).sort()).toEqual([
      'laravel-conventions',
      'rails-conventions',
    ]);
    for (const framework of ['rails', 'laravel']) {
      expect(
        await readFile(join(out, `.claude/rules/${framework}-conventions.md`), 'utf8'),
      ).toBe(await readFile(join(kbRoot, `rules/framework/${framework}/conventions.md`), 'utf8'));
    }

    const claudeMd = await readFile(join(out, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('@.claude/rules/laravel-conventions.md');
    expect(claudeMd).toContain('@.claude/rules/rails-conventions.md');
  });

  it('keeps each framework out of the other, selecting only one at a time', async () => {
    const kbRoot = await tempKnowledge({
      'rules/framework/rails/conventions.md': '# Rails\n',
      'rules/framework/laravel/conventions.md': '# Laravel\n',
    });
    const kb = await loadKnowledgeBase(kbRoot);
    const stack = resolveStack(kb.catalog, techStackInputSchema.parse({ framework: ['rails'] }));

    expect(selectArtifacts(kb, stack).rules.map((e) => e.artifact.meta.id)).toEqual([
      'rails-conventions',
    ]);
  });

  // A skill is named by its own directory, because that name is what Claude
  // matches a task against. Two frameworks cannot both claim it, and renaming
  // one behind the author's back would change the name Claude sees.
  it('refuses a knowledge base where two skills would claim the same name', async () => {
    const kbRoot = await tempKnowledge({
      'skills/framework/rails/feature/SKILL.md': '---\nname: feature\ndescription: x\n---\n',
      'skills/framework/laravel/feature/SKILL.md': '---\nname: feature\ndescription: y\n---\n',
    });

    await expect(loadKnowledgeBase(kbRoot)).rejects.toThrow(
      /duplicate skill id "feature".*put the framework in that name/s,
    );
  });

  it('accepts the same two skills once their directories name the framework', async () => {
    const kbRoot = await tempKnowledge({
      'skills/framework/rails/rails-feature/SKILL.md': '---\nname: rails-feature\ndescription: x\n---\n',
      'skills/framework/laravel/laravel-feature/SKILL.md': '---\nname: laravel-feature\ndescription: y\n---\n',
    });

    const kb = await loadKnowledgeBase(kbRoot);
    expect(kb.skills.map((skill) => skill.meta.id).sort()).toEqual([
      'laravel-feature',
      'rails-feature',
    ]);
  });
});

describe('a project that is already there', () => {
  /** Generate once, so the output directory carries a manifest of its own. */
  async function generateInto(out: string, framework: string, overwrite = false) {
    const { kb, stack, selection } = await run(framework);
    const targets = await inspectTargets(out, artifactTargets(selection));
    const excluded = new Map<string, string>();
    const kept: { id: string; path: string }[] = [];
    if (!overwrite) {
      for (const target of targets) {
        if (target.state !== 'exists' || target.path === undefined) continue;
        excluded.set(artifactKey(target), 'the project already has this file');
        kept.push({ id: target.id, path: target.path });
      }
    }
    const narrowed = excludeArtifacts(selection, excluded, stack);
    const composed = compose(stack, narrowed, 'test', kb.imported);
    await emit(out, composed, { dryRun: false });
    return { targets, kept, selection: narrowed, composed };
  }

  it('leaves a file the project wrote exactly where it was', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    const mine = join(out, '.claude/rules/rails-ruby.md');
    await mkdir(dirname(mine), { recursive: true });
    await writeFile(mine, '# our own Ruby rules\n', 'utf8');

    const { kept, composed } = await generateInto(out, 'rails');

    expect(await readFile(mine, 'utf8')).toBe('# our own Ruby rules\n');
    expect(kept.map((entry) => entry.path)).toContain('.claude/rules/rails-ruby.md');
    // Not written, so not claimed: a later run must not remove it as stale.
    expect(composed.manifest.rules.map((rule) => rule.id)).not.toContain('rails-ruby');
    // And not imported either, because agent-stack did not put it there.
    expect(await readFile(join(out, 'CLAUDE.md'), 'utf8')).not.toContain(
      '@.claude/rules/rails-ruby.md',
    );
  });

  it('replaces that same file once overwrite is approved', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    const mine = join(out, '.claude/rules/rails-ruby.md');
    await mkdir(dirname(mine), { recursive: true });
    await writeFile(mine, '# our own Ruby rules\n', 'utf8');

    const { kept, composed } = await generateInto(out, 'rails', true);

    expect(kept).toEqual([]);
    expect(composed.manifest.rules.map((rule) => rule.id)).toContain('rails-ruby');
    expect(await readFile(mine, 'utf8')).not.toBe('# our own Ruby rules\n');
  });

  // A hand-written skill is a directory, not a file, and must be just as safe.
  it('leaves a skill directory the project wrote alone', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    const mine = join(out, '.claude/skills/rails-feature/SKILL.md');
    await mkdir(dirname(mine), { recursive: true });
    await writeFile(mine, '---\nname: rails-feature\n---\nours\n', 'utf8');

    const { kept, composed } = await generateInto(out, 'rails');

    expect(await readFile(mine, 'utf8')).toContain('ours');
    expect(kept.map((entry) => entry.path)).toContain('.claude/skills/rails-feature');
    expect(composed.manifest.skills.map((skill) => skill.id)).not.toContain('rails-feature');
  });

  // The guard is about files agent-stack did not write. Its own output from the
  // last run is still its own, and regenerating has to keep working.
  it('still replaces what its own previous run wrote', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await generateInto(out, 'rails');
    const written = join(out, '.claude/rules/rails-ruby.md');
    await writeFile(written, 'drifted\n', 'utf8');

    const { targets, kept } = await generateInto(out, 'rails');

    expect(targets.find((target) => target.id === 'rails-ruby')?.state).toBe('owned');
    expect(kept).toEqual([]);
    expect(await readFile(written, 'utf8')).not.toBe('drifted\n');
  });

  it('reports every kept path as a waivable warning, and stays a success', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    const mine = join(out, '.claude/rules/rails-ruby.md');
    await mkdir(dirname(mine), { recursive: true });
    await writeFile(mine, 'ours\n', 'utf8');

    const { stack, selection } = await run('rails');
    const { kept } = await generateInto(out, 'rails');
    const report = validate(stack, selection, [], kept);

    const finding = report.findings.find((entry) => entry.code === 'existing-file');
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('.claude/rules/rails-ruby.md');
    expect(finding?.message).toContain('--overwrite');
    expect(report.ok).toBe(true);
  });
});
