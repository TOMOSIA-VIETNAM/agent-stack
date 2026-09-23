import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadKnowledgeBase, metaFromPath } from '../src/catalog.js';
import {
  artifactTargets,
  compose,
  mergeClaudeMd,
  BEGIN_MARKER,
  END_MARKER,
} from '../src/composer.js';
import { createHash } from 'node:crypto';
import { belongsToProject, emit, inspectTargets } from '../src/emit.js';
import { resolveStack } from '../src/resolver.js';
import { techStackInputSchema, type TechStackInput } from '../src/schema.js';
import { artifactKey, excludeArtifacts, selectArtifacts } from '../src/selector.js';
import { validate } from '../src/validator.js';
import { upstreamSourceSchema } from '../src/upstream.js';

const KNOWLEDGE = resolve(import.meta.dirname, '..', 'knowledge');
const TEMPLATE = resolve(import.meta.dirname, '..', 'templates', 'framework');

const CATALOG = 'version: 1\ntechnologies:\n  rails:\n    name: Ruby on Rails\n  laravel:\n    name: Laravel\n';

/** A knowledge base of exactly these files, on the catalog above. */
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

/** The framework directories that exist under any `<type>/framework/`. */
async function frameworkDirs(root: string): Promise<string[]> {
  const dirs = new Set<string>();
  for (const type of ['rules', 'skills', 'commands', 'claude-md']) {
    const entries = await readdir(join(root, type, 'framework'), { withFileTypes: true }).catch(
      () => [],
    );
    for (const entry of entries) if (entry.isDirectory()) dirs.add(entry.name);
  }
  return [...dirs].sort();
}

/** Every Markdown and YAML file under a root, relative to it. */
async function contentFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true });
  return entries.filter((entry) => /\.(md|ya?ml)$/.test(entry)).sort();
}

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

// The template is a contributor's starting point, not content: the loader never
// sees it. Two things have to stay true anyway — the paths it teaches are ones
// the loader accepts, and its instruction comments never reach a real artifact,
// because an artifact is copied into a project byte for byte.
// The catalog names the frameworks; a directory under `<type>/framework/`
// claims one. A directory the catalog does not list means an artifact gated on
// something nobody can select — it would never be emitted, and would go missing
// without a word. The reverse is legal and stays a warning: a framework can be
// in the catalog before anyone has written content for it.
describe('the catalog and the framework directories', () => {
  it('lists every framework directory of the real knowledge base', async () => {
    const kb = await loadKnowledgeBase(KNOWLEDGE);
    const dirs = await frameworkDirs(KNOWLEDGE);

    expect(dirs.length).toBeGreaterThan(0);
    expect(dirs.filter((dir) => kb.catalog.technologies[dir] === undefined)).toEqual([]);
  });

  // An empty directory carries no artifact, so lint cannot see it. The test
  // reads the tree instead, which is the only thing that can.
  it('refuses a framework directory the catalog does not list', async () => {
    const kbRoot = await tempKnowledge({
      'rules/framework/rails/conventions.md': '# Rails\n',
      'rules/framework/django/conventions.md': '# Django\n',
    });

    await expect(loadKnowledgeBase(kbRoot)).rejects.toThrow(
      /the directory "django" is not a framework in catalog.yaml/,
    );
  });

  it('refuses it whatever type it sits under', async () => {
    for (const path of [
      'skills/framework/django/django-feature/SKILL.md',
      'commands/framework/django/review.md',
      'claude-md/framework/django/stack-notes.md',
    ]) {
      const kbRoot = await tempKnowledge({ [path]: '# Django\n' });
      await expect(loadKnowledgeBase(kbRoot)).rejects.toThrow(
        /the directory "django" is not a framework in catalog.yaml/,
      );
    }
  });

  // The legal direction: laravel is in the real catalog with no directory of
  // its own yet. The run completes, and says which framework is bare.
  it('lets a catalog framework have no directory yet, and names it as uncovered', async () => {
    const kb = await loadKnowledgeBase(KNOWLEDGE);
    const dirs = await frameworkDirs(KNOWLEDGE);
    const bare = Object.keys(kb.catalog.technologies).filter((id) => !dirs.includes(id));
    expect(bare.length).toBeGreaterThan(0);

    for (const id of bare) {
      const { report } = await run(id);
      expect(report.ok).toBe(true);
      expect(
        report.findings.filter(
          (finding) => finding.code === 'uncovered-technology' && finding.message.startsWith(id),
        ),
      ).toHaveLength(1);
    }
  });
});

describe('the framework template', () => {
  const TYPES = { rules: 'rule', skills: 'skill', commands: 'command' } as const;

  it('teaches paths the loader reads a framework off', async () => {
    const files = (await contentFiles(TEMPLATE)).filter((file) => file.includes('FRAMEWORK'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const type = TYPES[file.split('/')[0] as keyof typeof TYPES];
      expect(type, file).toBeDefined();
      // A skill is loaded by its SKILL.md; the files bundled beside it are
      // copied along, never read as artifacts of their own.
      if (type === 'skill' && !file.endsWith('SKILL.md')) continue;
      const meta = metaFromPath(file.replaceAll('FRAMEWORK', 'django'), type);
      expect(meta.layer, file).toBe('framework');
      expect(meta.applies_to, file).toEqual(['django']);
      expect(meta.id, file).toContain('django');
    }
  });

  it('never leaks its instruction markers into the knowledge base', async () => {
    const leaked: string[] = [];
    for (const file of await contentFiles(KNOWLEDGE)) {
      const contents = await readFile(join(KNOWLEDGE, file), 'utf8');
      if (contents.includes('TEMPLATE:')) leaked.push(file);
    }
    expect(leaked).toEqual([]);
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
    const kept: { id: string; path: string; state: 'exists' | 'modified' }[] = [];
    if (!overwrite) {
      for (const target of targets) {
        if (!belongsToProject(target.state) || target.path === undefined) continue;
        excluded.set(artifactKey(target), 'the file is the project\'s');
        kept.push({ id: target.id, path: target.path, state: target.state });
      }
    }
    const narrowed = excludeArtifacts(selection, excluded, stack);
    const composed = compose(stack, narrowed, 'test', kb.imported);
    const result = await emit(out, composed, { dryRun: false });
    return { targets, kept, selection: narrowed, composed, result };
  }

  const manifestOf = async (out: string) =>
    JSON.parse(await readFile(join(out, '.claude/agent-stack-manifest.json'), 'utf8'));

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

  // The guard is about the project's work. agent-stack's own output from the
  // last run, untouched since, is still its own, and regenerating has to keep
  // working.
  it('still replaces what its own previous run wrote, while nobody has edited it', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await generateInto(out, 'rails');

    const { targets, kept } = await generateInto(out, 'rails');

    expect(targets.find((target) => target.id === 'rails-ruby')?.state).toBe('owned');
    expect(kept).toEqual([]);
  });

  // Before checksums, an edit to generated output was replaced on the next run
  // without a word. It is the project's work, so it is treated like a file the
  // project wrote.
  it('leaves its own earlier output alone once the project has edited it', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await generateInto(out, 'rails');
    const written = join(out, '.claude/rules/rails-ruby.md');
    await writeFile(written, 'edited by the team\n', 'utf8');

    const { targets, kept, composed } = await generateInto(out, 'rails');

    expect(targets.find((target) => target.id === 'rails-ruby')?.state).toBe('modified');
    expect(kept).toEqual([
      { id: 'rails-ruby', path: '.claude/rules/rails-ruby.md', state: 'modified' },
    ]);
    expect(await readFile(written, 'utf8')).toBe('edited by the team\n');
    expect(composed.manifest.rules.map((rule) => rule.id)).not.toContain('rails-ruby');
    expect(await readFile(join(out, 'CLAUDE.md'), 'utf8')).not.toContain(
      '@.claude/rules/rails-ruby.md',
    );

    // Dropped from the manifest, the file now reads as the project's own.
    const again = await generateInto(out, 'rails');
    expect(again.targets.find((target) => target.id === 'rails-ruby')?.state).toBe('exists');
  });

  it('takes an edited file back only when overwrite is approved', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await generateInto(out, 'rails');
    const written = join(out, '.claude/rules/rails-ruby.md');
    await writeFile(written, 'edited by the team\n', 'utf8');

    const { kept } = await generateInto(out, 'rails', true);

    expect(kept).toEqual([]);
    expect(await readFile(written, 'utf8')).toBe(
      await readFile(join(KNOWLEDGE, 'rules/framework/rails/ruby.md'), 'utf8'),
    );
  });

  it('counts a file added inside a generated skill directory as an edit', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await generateInto(out, 'rails');
    await writeFile(join(out, '.claude/skills/rails-feature/notes.md'), 'ours\n', 'utf8');

    const { targets } = await generateInto(out, 'rails');

    expect(targets.find((target) => target.id === 'rails-feature')?.state).toBe('modified');
  });

  it('writes a deleted file again, since no work of the project is lost', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await generateInto(out, 'rails');
    await rm(join(out, '.claude/rules/rails-ruby.md'));

    const { targets } = await generateInto(out, 'rails');

    expect(targets.find((target) => target.id === 'rails-ruby')?.state).toBe('owned');
    await expect(readFile(join(out, '.claude/rules/rails-ruby.md'), 'utf8')).resolves.toBeTruthy();
  });

  // Removing stale output is the one place agent-stack deletes. An edit makes
  // the file the project's, and deleting it would delete that work.
  it('never removes stale output the project has edited', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await generateInto(out, 'rails');
    const written = join(out, '.claude/rules/rails-ruby.md');
    await writeFile(written, 'edited by the team\n', 'utf8');

    const { result } = await generateInto(out, 'laravel');

    expect(result.retained).toEqual(['.claude/rules/rails-ruby.md']);
    expect(result.remove).not.toContain('.claude/rules/rails-ruby.md');
    expect(result.remove).toContain('.claude/rules/rails-activerecord.md');
    expect(await readFile(written, 'utf8')).toBe('edited by the team\n');
  });

  it('records the checksum of every file it copies', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    const { composed } = await generateInto(out, 'rails');

    const { checksums } = await manifestOf(out);
    expect(Object.keys(checksums).sort()).toEqual(
      composed.files.map((file) => file.path).sort(),
    );
    const source = await readFile(join(KNOWLEDGE, 'rules/framework/rails/ruby.md'));
    expect(checksums['.claude/rules/rails-ruby.md']).toBe(
      createHash('sha256').update(source).digest('hex'),
    );
  });

  // A manifest written by 1.0.0 carries no checksums. It cannot tell an edit
  // from its own output, so it keeps behaving the way it did.
  it('treats output recorded without checksums as its own', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-stack-'));
    await generateInto(out, 'rails');
    const { checksums: _, ...old } = await manifestOf(out);
    await writeFile(join(out, '.claude/agent-stack-manifest.json'), JSON.stringify(old), 'utf8');
    await writeFile(join(out, '.claude/rules/rails-ruby.md'), 'edited\n', 'utf8');

    const { targets } = await generateInto(out, 'rails');

    expect(targets.find((target) => target.id === 'rails-ruby')?.state).toBe('owned');
  });

  it('reports an edited file and edited stale output as waivable warnings', async () => {
    const { stack, selection } = await run('rails');
    const report = validate(
      stack,
      selection,
      [],
      [{ id: 'rails-ruby', path: '.claude/rules/rails-ruby.md', state: 'modified' }],
      ['.claude/rules/rails-activerecord.md'],
    );

    const modified = report.findings.find((entry) => entry.code === 'modified-file');
    expect(modified?.severity).toBe('warning');
    expect(modified?.message).toContain('--overwrite');
    const retained = report.findings.find((entry) => entry.code === 'retained-file');
    expect(retained?.message).toContain('.claude/rules/rails-activerecord.md');
    expect(report.ok).toBe(true);
  });

  it('reports an edited file it left out once, not again as stale output', async () => {
    const { stack, selection } = await run('rails');
    const path = '.claude/rules/rails-ruby.md';
    const report = validate(stack, selection, [], [{ id: 'rails-ruby', path, state: 'modified' }], [
      path,
    ]);

    expect(report.findings.filter((entry) => entry.message.includes(path))).toHaveLength(1);
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
