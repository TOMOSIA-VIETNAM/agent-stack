import { describe, expect, it } from 'vitest';
import { catalogSchema, techStackInputSchema } from '../src/schema.js';
import { resolveStack, UnknownTechnologyError } from '../src/resolver.js';

const catalog = catalogSchema.parse({
  version: 1,
  technologies: {
    ruby: { name: 'Ruby', kind: 'language', supported_versions: '>=3.1 <4' },
    node: { name: 'Node.js', kind: 'language' },
    rails: { name: 'Rails', kind: 'framework', aliases: ['ror'], requires: ['ruby'] },
    stimulus: { name: 'Stimulus', kind: 'frontend', requires: ['rails'], conflicts_with: ['react'] },
    react: { name: 'React', kind: 'frontend', requires: ['node'], conflicts_with: ['stimulus'] },
    aws: { name: 'AWS', kind: 'infrastructure' },
    docker: { name: 'Docker', kind: 'infrastructure' },
    ecs: { name: 'ECS', kind: 'infrastructure', requires: ['aws', 'docker'] },
  },
});

const stack = (input: Record<string, { tech: string; version?: string }[]>) =>
  resolveStack(catalog, techStackInputSchema.parse(input));

describe('resolveStack', () => {
  it('pulls in transitive requirements', () => {
    const result = stack({ infrastructure: [{ tech: 'ecs' }] });
    expect(result.technologies.map((t) => t.id)).toEqual(['aws', 'docker', 'ecs']);
    expect(result.technologies.find((t) => t.id === 'docker')?.origin).toBe('dependency');
    expect(result.technologies.find((t) => t.id === 'ecs')?.origin).toBe('input');
  });

  it('records the chain that required a dependency', () => {
    const result = stack({ frontend: [{ tech: 'stimulus' }] });
    expect(result.technologies.find((t) => t.id === 'ruby')?.requiredBy).toEqual([
      'rails',
      'stimulus',
    ]);
  });

  it('resolves aliases', () => {
    const result = stack({ framework: [{ tech: 'ror', version: '7.1' }] });
    expect(result.technologies.find((t) => t.id === 'rails')?.version).toBe('7.1');
  });

  it('reports declared conflicts without resolving them', () => {
    const result = stack({ frontend: [{ tech: 'stimulus' }, { tech: 'react' }] });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.id).toBe('react+stimulus');
    expect(result.technologies.map((t) => t.id)).toContain('react');
    expect(result.technologies.map((t) => t.id)).toContain('stimulus');
  });

  it('warns when a version falls outside the curated range', () => {
    const result = stack({ language: [{ tech: 'ruby', version: '2.7' }] });
    expect(result.warnings.join(' ')).toContain('outside the curated range');
  });

  it('warns when a technology is given in the wrong slot', () => {
    const result = stack({ database: [{ tech: 'ruby' }] });
    expect(result.warnings.join(' ')).toContain('is a language');
  });

  it('keeps an explicit selection over the same technology arriving as a dependency', () => {
    const result = stack({
      language: [{ tech: 'ruby', version: '3.3' }],
      framework: [{ tech: 'rails' }],
    });
    const ruby = result.technologies.find((t) => t.id === 'ruby');
    expect(ruby?.origin).toBe('input');
    expect(ruby?.version).toBe('3.3');
  });

  it('rejects an unknown technology instead of guessing', () => {
    expect(() => stack({ framework: [{ tech: 'railz' }] })).toThrow(UnknownTechnologyError);
  });
});
