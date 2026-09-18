import { describe, expect, it } from 'vitest';
import { satisfies } from '../src/version.js';

describe('satisfies', () => {
  it('treats a missing or wildcard range as any version', () => {
    expect(satisfies('3.3.1', undefined)).toBe(true);
    expect(satisfies('3.3.1', '*')).toBe(true);
  });

  it('cannot prove a version-specific range when the stack pinned nothing', () => {
    expect(satisfies(undefined, '>=7')).toBe(false);
    expect(satisfies(undefined, '*')).toBe(true);
  });

  it('matches a bare version as a prefix', () => {
    expect(satisfies('3.3.4', '3.3')).toBe(true);
    expect(satisfies('3.4.0', '3.3')).toBe(false);
    expect(satisfies('3.3.4', '3.3.4')).toBe(true);
    expect(satisfies('3.3.5', '3.3.4')).toBe(false);
  });

  it('matches wildcard prefixes', () => {
    expect(satisfies('8.2.1', '8.x')).toBe(true);
    expect(satisfies('9.0.0', '8.x')).toBe(false);
  });

  it('ands comparators separated by whitespace', () => {
    expect(satisfies('7.1.3', '>=7 <9')).toBe(true);
    expect(satisfies('8.9.9', '>=7 <9')).toBe(true);
    expect(satisfies('9.0.0', '>=7 <9')).toBe(false);
    expect(satisfies('6.1.0', '>=7 <9')).toBe(false);
  });

  it('supports hyphen ranges with a widened upper bound', () => {
    expect(satisfies('7.0.0', '7 - 8.x')).toBe(true);
    expect(satisfies('8.9.0', '7 - 8.x')).toBe(true);
    expect(satisfies('9.0.0', '7 - 8.x')).toBe(false);
    expect(satisfies('3.4.2', '3.3 - 3.4')).toBe(true);
    expect(satisfies('3.5.0', '3.3 - 3.4')).toBe(false);
  });

  it('supports caret and tilde', () => {
    expect(satisfies('7.9.0', '^7.1')).toBe(true);
    expect(satisfies('8.0.0', '^7.1')).toBe(false);
    expect(satisfies('7.1.9', '~7.1')).toBe(true);
    expect(satisfies('7.2.0', '~7.1')).toBe(false);
  });

  it('ignores pre-release identifiers', () => {
    expect(satisfies('3.4.0-rc1', '3.4')).toBe(true);
  });
});
