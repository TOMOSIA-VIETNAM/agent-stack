import type { Catalog, TechStackInput } from './schema.js';

export interface ResolvedTech {
  id: string;
  name: string;
  /** "input" when the user asked for it, "dependency" when `requires` pulled it in. */
  origin: 'input' | 'dependency';
  /** Chain of technologies that pulled this one in, nearest first. */
  requiredBy: string[];
}

export interface Conflict {
  /** Stable id so a resolution flag can name exactly one conflict. */
  id: string;
  left: string;
  right: string;
  message: string;
}

export interface ResolvedStack {
  technologies: ResolvedTech[];
  conflicts: Conflict[];
  /** Non-blocking notes raised while expanding the graph. */
  warnings: string[];
}

/** One catalog entry, as the error reports it. */
export interface KnownFramework {
  id: string;
  name: string;
}

/**
 * The operator mistyped the one thing they had to get right.
 *
 * The error carries what it knows — the near miss, and every framework the
 * catalog holds — and leaves the rendering to cli.ts, which owns human output.
 */
export class UnknownTechnologyError extends Error {
  /** The catalog id this was probably meant to be, when one is close. */
  readonly suggestion: string | undefined;

  constructor(
    readonly tech: string,
    readonly known: KnownFramework[],
  ) {
    const suggestion = closest(tech, known);
    super(
      `Unknown framework "${tech}".${suggestion ? ` Did you mean "${suggestion}"?` : ''}`,
    );
    this.name = 'UnknownTechnologyError';
    this.suggestion = suggestion;
  }
}

/** Levenshtein distance, for naming a near miss rather than only listing. */
function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + cost);
    }
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * The closest id, when one is close enough to be worth naming. A substring
 * either way counts — "lara" for laravel — and otherwise the typo has to be
 * within a third of the id's length.
 */
export function closest(input: string, known: KnownFramework[]): string | undefined {
  const needle = input.trim().toLowerCase();
  if (needle === '') return undefined;

  let best: { id: string; score: number } | undefined;
  for (const { id } of known) {
    const value = id.toLowerCase();
    const score = value.includes(needle) || needle.includes(value) ? 0 : distance(needle, value);
    const limit = Math.max(2, Math.floor(value.length / 3));
    if (score <= limit && (best === undefined || score < best.score)) {
      best = { id, score };
    }
  }
  return best?.id;
}

function conflictId(a: string, b: string): string {
  return [a, b].sort().join('+');
}

/** An id, however it was capitalized or padded, or undefined when unknown. */
export function canonicalize(catalog: Catalog, name: string): string | undefined {
  const needle = name.trim().toLowerCase();
  return catalog.technologies[needle] ? needle : undefined;
}

/** Everything the catalog would have accepted, for the error to print. */
export function knownFrameworks(catalog: Catalog): KnownFramework[] {
  return Object.entries(catalog.technologies).map(([id, tech]) => ({ id, name: tech.name }));
}

/**
 * Expand the selected frameworks over the `requires` graph, then report every
 * declared conflict between the resulting technologies.
 *
 * Conflicts are never resolved here: the caller decides, either by dropping a
 * framework or by accepting the conflict explicitly.
 */
export function resolveStack(catalog: Catalog, input: TechStackInput): ResolvedStack {
  const resolved = new Map<string, ResolvedTech>();
  const warnings: string[] = [];

  const add = (
    rawId: string,
    origin: ResolvedTech['origin'],
    requiredBy: string[],
  ): void => {
    const id = canonicalize(catalog, rawId);
    const tech = id ? catalog.technologies[id] : undefined;
    if (!id || !tech) {
      throw new UnknownTechnologyError(rawId, knownFrameworks(catalog));
    }

    const existing = resolved.get(id);
    if (existing) {
      // An explicit selection always wins over the same technology arriving as
      // a dependency.
      if (origin === 'input') existing.origin = 'input';
      return;
    }

    resolved.set(id, { id, name: tech.name, origin, requiredBy });

    for (const required of tech.requires) {
      add(required, 'dependency', [id, ...requiredBy]);
    }
  };

  for (const name of input.framework) {
    add(name, 'input', []);
  }

  const ids = [...resolved.keys()].sort();
  const seen = new Set<string>();
  const conflicts: Conflict[] = [];
  for (const id of ids) {
    const tech = catalog.technologies[id];
    if (!tech) continue;
    for (const other of tech.conflicts_with) {
      if (!resolved.has(other)) continue;
      const key = conflictId(id, other);
      if (seen.has(key)) continue;
      seen.add(key);
      const [left, right] = key.split('+') as [string, string];
      conflicts.push({
        id: key,
        left,
        right,
        message: `${catalog.technologies[left]?.name ?? left} and ${
          catalog.technologies[right]?.name ?? right
        } are declared incompatible`,
      });
    }
  }

  const technologies = ids.map((id) => resolved.get(id)!);
  return { technologies, conflicts, warnings };
}
