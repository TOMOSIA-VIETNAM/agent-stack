import { describe, expect, it } from 'vitest';
import type { Artifact } from '../src/catalog.js';
import { metaFromPath } from '../src/catalog.js';
import { resolveStack } from '../src/resolver.js';
import { catalogSchema, techStackInputSchema } from '../src/schema.js';
import { artifactKey, excludeArtifacts, selectArtifacts } from '../src/selector.js';

const catalog = catalogSchema.parse({
  version: 1,
  technologies: {
    rails: { name: 'Rails', requires: ['rails-engine'] },
    'rails-engine': { name: 'Rails Engine' },
    laravel: { name: 'Laravel' },
  },
});

/** A rule identified the way the loader identifies one: by its path. */
function rule(source: string): Artifact {
  return {
    meta: metaFromPath(source, 'rule'),
    path: `/knowledge/${source}`,
    dir: '/knowledge',
    source,
    files: [],
  };
}

function kb(rules: Artifact[]) {
  return {
    root: '/knowledge',
    catalog,
    rules,
    skills: [],
    commands: [],
    claudeMd: [],
    imported: [],
  };
}

const select = (rules: Artifact[], framework: string[]) => {
  const stack = resolveStack(catalog, techStackInputSchema.parse({ framework }));
  return { stack, selection: selectArtifacts(kb(rules), stack) };
};

describe('metaFromPath', () => {
  it('reads the layer, the gate and the id off the path', () => {
    expect(metaFromPath('rules/framework/rails/security.md', 'rule')).toEqual({
      id: 'rails-security',
      type: 'rule',
      layer: 'framework',
      applies_to: ['rails'],
    });
    expect(metaFromPath('rules/framework/rails/db/indexes.md', 'rule')).toEqual({
      id: 'rails-db-indexes',
      type: 'rule',
      layer: 'framework',
      applies_to: ['rails'],
    });
    expect(metaFromPath('rules/global/karpathy-guidelines.md', 'rule')).toEqual({
      id: 'karpathy-guidelines',
      type: 'rule',
      layer: 'global',
      applies_to: [],
    });
    expect(metaFromPath('commands/test.md', 'command')).toEqual({
      id: 'test',
      type: 'command',
      layer: 'global',
      applies_to: [],
    });
  });

  // A skill's name is a flat namespace Claude matches against, so the enclosing
  // framework directory groups without becoming part of the name.
  it('takes a skill id from its own directory, not the joined path', () => {
    expect(metaFromPath('skills/framework/rails/rails-feature/SKILL.md', 'skill')).toEqual({
      id: 'rails-feature',
      type: 'skill',
      layer: 'framework',
      applies_to: ['rails'],
    });
    expect(metaFromPath('skills/global/test-driven-development/SKILL.md', 'skill')).toEqual({
      id: 'test-driven-development',
      type: 'skill',
      layer: 'global',
      applies_to: [],
    });
  });

  it('rejects a path that cannot become a filename under .claude/', () => {
    expect(() => metaFromPath('rules/framework/rails/Strong_Params.md', 'rule')).toThrow(
      /lowercase kebab-case/,
    );
  });

  it('rejects a framework artifact that names no framework directory', () => {
    expect(() => metaFromPath('rules/framework/security.md', 'rule')).toThrow(
      /says which framework it applies to/,
    );
  });
});

describe('matching', () => {
  it('requires every applies_to entry to be in the stack', () => {
    const { selection } = select(
      [
        rule('rules/framework/rails/security.md'),
        rule('rules/framework/rails-engine/wiring.md'),
        rule('rules/framework/laravel/conventions.md'),
        rule('rules/global/always.md'),
      ],
      ['rails'],
    );

    // Alphabetical by id, which is the emitted filename.
    expect(selection.rules.map((entry) => entry.artifact.meta.id)).toEqual([
      'always',
      'rails-engine-wiring',
      'rails-security',
    ]);
    expect(selection.skipped.map((entry) => entry.artifact.meta.id)).toEqual([
      'laravel-conventions',
    ]);
    expect(selection.skipped[0]?.reason).toBe('laravel is not in the stack');
  });

  it('records which frameworks selected an artifact', () => {
    const { selection } = select([rule('rules/framework/rails/security.md')], ['rails']);
    expect(selection.rules[0]?.matchedBy).toEqual(['rails']);
  });
});

describe('coverage', () => {
  it('reports a technology no artifact targets', () => {
    const { selection } = select([rule('rules/framework/rails/security.md')], ['rails']);
    expect(selection.uncovered.map((tech) => tech.id)).toEqual(['rails-engine']);
  });
});

describe('dropping what was not approved', () => {
  it('moves a dropped artifact into skipped, with the reason it was dropped', () => {
    const { stack, selection } = select(
      [rule('rules/framework/rails/security.md'), rule('rules/global/style.md')],
      ['rails'],
    );
    const narrowed = excludeArtifacts(
      selection,
      new Map([[artifactKey({ type: 'rule', id: 'style' }), 'the project already has this file']]),
      stack,
    );

    expect(narrowed.rules.map((entry) => entry.artifact.meta.id)).toEqual(['rails-security']);
    expect(narrowed.skipped.map((entry) => entry.reason)).toContain(
      'the project already has this file',
    );
  });

  // Coverage is derived again afterwards: dropping every Rails artifact leaves
  // Rails uncovered, rather than counted as handled by a file nobody wrote.
  it('reports a framework as uncovered once its last artifact is dropped', () => {
    const { stack, selection } = select([rule('rules/framework/rails/security.md')], ['rails']);
    expect(selection.uncovered.map((tech) => tech.id)).toEqual(['rails-engine']);

    const narrowed = excludeArtifacts(
      selection,
      new Map([[artifactKey({ type: 'rule', id: 'rails-security' }), 'not approved']]),
      stack,
    );
    expect(narrowed.uncovered.map((tech) => tech.id).sort()).toEqual(['rails', 'rails-engine']);
  });

  it('is a no-op when nothing was dropped', () => {
    const { stack, selection } = select([rule('rules/framework/rails/security.md')], ['rails']);
    expect(excludeArtifacts(selection, new Map(), stack)).toBe(selection);
  });
});
