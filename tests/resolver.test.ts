import { describe, expect, it } from 'vitest';
import { catalogSchema, techStackInputSchema } from '../src/schema.js';
import { closest, knownFrameworks, resolveStack, UnknownTechnologyError } from '../src/resolver.js';

const catalog = catalogSchema.parse({
  version: 1,
  // `requires` and `conflicts_with` carry no entries in the real catalog today,
  // so exercise them on a synthetic one: they are the resolver's whole job.
  technologies: {
    rails: { name: 'Rails', requires: ['rails-api'] },
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

  it('accepts an id however it was capitalized or padded', () => {
    expect(stack(['  RAILS  ']).technologies.map((t) => t.id)).toContain('rails');
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

// The framework is the one thing the operator has to type correctly, so a typo
// must not cost them a second command to find out what was on offer.
describe('an unknown framework', () => {
  const message = (name: string) => {
    try {
      stack([name]);
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error(`expected "${name}" to be rejected`);
  };

  it('names the near miss', () => {
    expect(message('railz')).toBe('Unknown framework "railz". Did you mean "rails"?');
  });

  it('says only that much when nothing is close', () => {
    expect(message('postgresql')).toBe('Unknown framework "postgresql".');
  });

  // The error carries the catalog; cli.ts is what renders it.
  it('carries every framework, and the suggestion, for the caller to render', () => {
    try {
      stack(['railz']);
    } catch (error) {
      const unknown = error as UnknownTechnologyError;
      expect(unknown.suggestion).toBe('rails');
      expect(unknown.known.map((entry) => entry.id)).toEqual([
        'rails',
        'rails-api',
        'rails-core',
        'laravel',
      ]);
      expect(unknown.known.find((entry) => entry.id === 'rails')?.name).toBe('Rails');
    }
  });
});

describe('closest', () => {
  const known = knownFrameworks(catalog);

  it('forgives a transposition, a missing letter and a wrong case', () => {
    expect(closest('railz', known)).toBe('rails');
    expect(closest('rials', known)).toBe('rails');
    expect(closest('RAILS', known)).toBe('rails');
    expect(closest('laravell', known)).toBe('laravel');
  });

  it('matches on a prefix', () => {
    expect(closest('lara', known)).toBe('laravel');
    expect(closest('rail', known)).toBe('rails');
  });

  it('stays quiet rather than guessing at something unrelated', () => {
    expect(closest('postgresql', known)).toBeUndefined();
    expect(closest('', known)).toBeUndefined();
  });
});
