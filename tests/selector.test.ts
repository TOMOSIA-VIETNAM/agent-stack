import { describe, expect, it } from 'vitest';
import type { Artifact } from '../src/catalog.js';
import { resolveStack } from '../src/resolver.js';
import { artifactMetaSchema, catalogSchema, techStackInputSchema } from '../src/schema.js';
import { selectArtifacts } from '../src/selector.js';
import { validate } from '../src/validator.js';

const catalog = catalogSchema.parse({
  version: 1,
  technologies: {
    ruby: { name: 'Ruby', kind: 'language' },
    rails: { name: 'Rails', kind: 'framework', requires: ['ruby'] },
    redis: { name: 'Redis', kind: 'cache' },
  },
});

/** A rule with only the metadata these tests care about. */
function rule(meta: Record<string, unknown>): Artifact {
  return {
    meta: artifactMetaSchema.parse({
      name: 'Test',
      description: 'Test',
      type: 'rule',
      layer: 'framework',
      priority: 40,
      ...meta,
    }),
    body: '## Test\n',
    dir: '/knowledge',
    source: 'rules/framework/test.md',
  };
}

function kb(rules: Artifact[]) {
  return { root: '/knowledge', catalog, rules, skills: [], commands: [], claudeMd: [], imported: [] };
}

const select = (rules: Artifact[], input: Record<string, { tech: string; version?: string }[]>) => {
  const stack = resolveStack(catalog, techStackInputSchema.parse(input));
  return { stack, selection: selectArtifacts(kb(rules), stack) };
};

describe('dependencies', () => {
  const dependent = rule({ id: 'dependent', applies_to: [{ tech: 'rails' }] });

  it('pulls in a dependency whose technology is absent from the stack', () => {
    const dependency = rule({ id: 'dependency', applies_to: [{ tech: 'redis' }] });
    const { selection } = select([{ ...dependent, meta: { ...dependent.meta, dependencies: ['dependency'] } }, dependency], {
      framework: [{ tech: 'rails' }],
    });

    const ids = selection.rules.map((entry) => entry.artifact.meta.id);
    expect(ids).toContain('dependency');
    expect(selection.rules.find((e) => e.artifact.meta.id === 'dependency')?.origin).toBe(
      'dependency',
    );
    expect(selection.unmetDependencies).toHaveLength(0);
  });

  // A dependency used to override every skip reason, so a rule that declared
  // `versions` could be dragged into a stack it explicitly does not target.
  it('does not let a dependency override a version range', () => {
    const dependency = rule({
      id: 'dependency',
      applies_to: [{ tech: 'rails', versions: '>=7 <9' }],
    });
    const { stack, selection } = select(
      [{ ...dependent, meta: { ...dependent.meta, dependencies: ['dependency'] } }, dependency],
      { framework: [{ tech: 'rails', version: '6.1' }] },
    );

    expect(selection.rules.map((entry) => entry.artifact.meta.id)).not.toContain('dependency');
    expect(selection.skipped.map((entry) => entry.artifact.meta.id)).toContain('dependency');
    expect(selection.unmetDependencies).toEqual([
      { artifact: 'dependent', dependency: 'dependency', reason: 'rails 6.1 is outside ">=7 <9"' },
    ]);

    const report = validate(stack, selection);
    expect(report.findings.map((f) => f.code)).toContain('unmet-dependency');
    expect(report.ok).toBe(true);
  });

  it('does not let a dependency override an unpinned version either', () => {
    const dependency = rule({
      id: 'dependency',
      applies_to: [{ tech: 'rails', versions: '>=7 <9' }],
    });
    const { selection } = select(
      [{ ...dependent, meta: { ...dependent.meta, dependencies: ['dependency'] } }, dependency],
      { framework: [{ tech: 'rails' }] },
    );

    expect(selection.rules.map((entry) => entry.artifact.meta.id)).not.toContain('dependency');
    expect(selection.unmetDependencies[0]?.dependency).toBe('dependency');
  });

  it('records the skip reason as a code rather than a message to parse', () => {
    const { selection } = select(
      [
        rule({ id: 'absent', applies_to: [{ tech: 'redis' }] }),
        rule({ id: 'unpinned', applies_to: [{ tech: 'rails', versions: '>=7 <9' }] }),
        rule({ id: 'out-of-range', applies_to: [{ tech: 'ruby', versions: '>=3.3' }] }),
      ],
      { framework: [{ tech: 'rails' }], language: [{ tech: 'ruby', version: '3.1' }] },
    );

    const codes = Object.fromEntries(
      selection.skipped.map((entry) => [entry.artifact.meta.id, entry.code]),
    );
    expect(codes).toEqual({ absent: 'absent', unpinned: 'unpinned', 'out-of-range': 'out-of-range' });
  });
});
