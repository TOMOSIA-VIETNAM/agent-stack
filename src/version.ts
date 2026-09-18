/**
 * Minimal version-range matching.
 *
 * Supports the subset the knowledge base needs (see knowledge/README.md):
 *   "*"            any version
 *   "3.3"          prefix match: >=3.3.0 <3.4.0
 *   "8.x"          prefix match: >=8.0.0 <9.0.0
 *   ">=7 <9"       whitespace separated comparators, all must hold
 *   "^7.1"         >=7.1.0 <8.0.0
 *   "~7.1"         >=7.1.0 <7.2.0
 *   "7 - 8.x"      inclusive range, right side widened to its prefix
 *
 * Pre-release identifiers ("3.4.0-rc1") are compared by their numeric core only;
 * the knowledge base pins stack versions, not release candidates.
 */

export type Version = number[];

const WILDCARD = /^[*x]$/i;

export function parseVersion(input: string): Version {
  const core = input.trim().replace(/^v/i, '').split(/[-+]/, 1)[0] ?? '';
  const parts = core.split('.');
  const out: Version = [];
  for (const part of parts) {
    if (WILDCARD.test(part)) break;
    const n = Number.parseInt(part, 10);
    if (Number.isNaN(n)) {
      throw new Error(`Invalid version: "${input}"`);
    }
    out.push(n);
  }
  if (out.length === 0) {
    throw new Error(`Invalid version: "${input}"`);
  }
  return out;
}

/** Number of leading numeric segments before a wildcard, e.g. "8.x" -> 1. */
function significantLength(input: string): number {
  const core = input.trim().replace(/^v/i, '').split(/[-+]/, 1)[0] ?? '';
  const parts = core.split('.');
  let n = 0;
  for (const part of parts) {
    if (WILDCARD.test(part)) break;
    n += 1;
  }
  return n;
}

export function compareVersions(a: Version, b: Version): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

/** Exclusive upper bound of a partial version: "3.3" -> 3.4.0, "8" -> 9.0.0. */
function nextPrefix(version: Version): Version {
  const out = version.slice();
  const last = out.length - 1;
  out[last] = (out[last] ?? 0) + 1;
  return out;
}

function caretUpper(version: Version): Version {
  if ((version[0] ?? 0) > 0 || version.length === 1) {
    return [(version[0] ?? 0) + 1];
  }
  if ((version[1] ?? 0) > 0 || version.length === 2) {
    return [version[0] ?? 0, (version[1] ?? 0) + 1];
  }
  return [version[0] ?? 0, version[1] ?? 0, (version[2] ?? 0) + 1];
}

type Comparator = (v: Version) => boolean;

function comparator(token: string): Comparator {
  if (WILDCARD.test(token)) return () => true;

  const operatorMatch = /^(>=|<=|>|<|=)\s*(.+)$/.exec(token);
  if (operatorMatch) {
    const [, op, raw] = operatorMatch as unknown as [string, string, string];
    const bound = parseVersion(raw);
    switch (op) {
      case '>=':
        return (v) => compareVersions(v, bound) >= 0;
      case '>':
        return (v) => compareVersions(v, bound) > 0;
      case '<=':
        return (v) => compareVersions(v, bound) <= 0;
      case '<':
        return (v) => compareVersions(v, bound) < 0;
      default:
        return (v) => compareVersions(v, bound) === 0;
    }
  }

  if (token.startsWith('^') || token.startsWith('~')) {
    const bound = parseVersion(token.slice(1));
    const upper = token.startsWith('^') ? caretUpper(bound) : nextPrefix(bound.slice(0, 2));
    return (v) => compareVersions(v, bound) >= 0 && compareVersions(v, upper) < 0;
  }

  // Bare version or wildcard prefix: match everything under that prefix.
  const bound = parseVersion(token);
  const explicit = significantLength(token);
  const isFull = explicit >= 3 && !/[*x]/i.test(token);
  if (isFull) {
    return (v) => compareVersions(v, bound) === 0;
  }
  const upper = nextPrefix(bound);
  return (v) => compareVersions(v, bound) >= 0 && compareVersions(v, upper) < 0;
}

/**
 * Does `version` satisfy `range`? An empty or missing range means "any version",
 * which is how artifacts that are version-agnostic are declared.
 */
export function satisfies(version: string | undefined, range: string | undefined): boolean {
  if (!range || WILDCARD.test(range.trim())) return true;
  if (!version) {
    // The stack did not pin a version: a version-specific artifact cannot be
    // proven to apply, so the validator reports it instead of guessing.
    return false;
  }

  const v = parseVersion(version);
  const hyphen = range.split(/\s+-\s+/);
  if (hyphen.length === 2) {
    const [rawLower, rawUpper] = hyphen as [string, string];
    const lower = parseVersion(rawLower);
    const upperBound = parseVersion(rawUpper);
    const upperIsFull = significantLength(rawUpper) >= 3 && !/[*x]/i.test(rawUpper);
    const upper = upperIsFull ? upperBound : nextPrefix(upperBound);
    return (
      compareVersions(v, lower) >= 0 &&
      (upperIsFull ? compareVersions(v, upper) <= 0 : compareVersions(v, upper) < 0)
    );
  }

  return range
    .trim()
    .split(/\s+/)
    .every((token) => comparator(token)(v));
}

export function isValidRange(range: string): boolean {
  try {
    satisfies('1.0.0', range);
    return true;
  } catch {
    return false;
  }
}
