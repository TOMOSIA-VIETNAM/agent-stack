import { describe, expect, it } from 'vitest';
import { catalogSchema, techStackInputSchema } from '../src/schema.js';
import { resolveStack, UnknownTechnologyError } from '../src/resolver.js';

const catalog = catalogSchema.parse({
  version: 1,
  // `requires` and `conflicts_with` carry no entries in the real catalog today,
  // so exercise them on a synthetic one: they are the resolver's whole job.
  technologies: {
    rails: { name: 'Rails', aliases: ['ror'], requires: ['rails-api'] },
    'rails-api': { name: 'Rails API', requires: ['rails-core'] },
    'rails-core': { name: 'Rails Core' },
    laravel: { name: 'Laravel', conflicts_with: ['rails'] },
  },
});

const stack = (framework: string[]) =>
  resolveStack(catalog, techStackInputSchema.parse({ framework }));

describe('resolveStack', () => {
  it('pulls in transitive requirements', () => {
    const result = stack(['rails']);
    expect(result.technologies.map((t) => t.id)).toEqual(['rails', 'rails-api', 'rails-core']);
    expect(result.technologies.find((t) => t.id === 'rails-core')?.origin).toBe('dependency');
    expect(result.technologies.find((t) => t.id === 'rails')?.origin).toBe('input');
  });

  it('records the chain that required a dependency', () => {
    const result = stack(['rails']);
    expect(result.technologies.find((t) => t.id === 'rails-core')?.requiredBy).toEqual([
      'rails-api',
      'rails',
    ]);
  });

  it('resolves aliases', () => {
    const result = stack(['ROR']);
    expect(result.technologies.map((t) => t.id)).toContain('rails');
  });

  it('reports declared conflicts without resolving them', () => {
    const result = stack(['rails', 'laravel']);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.id).toBe('laravel+rails');
    expect(result.technologies.map((t) => t.id)).toContain('rails');
    expect(result.technologies.map((t) => t.id)).toContain('laravel');
  });

  it('keeps an explicit selection over the same technology arriving as a dependency', () => {
    const result = stack(['rails-api', 'rails']);
    expect(result.technologies.find((t) => t.id === 'rails-api')?.origin).toBe('input');
  });

  it('rejects an unknown technology instead of guessing', () => {
    expect(() => stack(['railz'])).toThrow(UnknownTechnologyError);
  });
});
