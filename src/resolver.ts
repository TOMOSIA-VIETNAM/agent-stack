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

export class UnknownTechnologyError extends Error {
  constructor(
    readonly tech: string,
    readonly suggestions: string[],
  ) {
    const hint = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';
    super(`Unknown technology "${tech}".${hint}`);
    this.name = 'UnknownTechnologyError';
  }
}

function conflictId(a: string, b: string): string {
  return [a, b].sort().join('+');
}

/** Resolve an alias or id to a catalog id, or undefined when unknown. */
export function canonicalize(catalog: Catalog, name: string): string | undefined {
  const needle = name.trim().toLowerCase();
  if (catalog.technologies[needle]) return needle;
  for (const [id, tech] of Object.entries(catalog.technologies)) {
    if (tech.aliases.some((alias) => alias.toLowerCase() === needle)) return id;
  }
  return undefined;
}

function suggestions(catalog: Catalog, name: string): string[] {
  const needle = name.trim().toLowerCase();
  return Object.keys(catalog.technologies)
    .filter((id) => id.includes(needle) || needle.includes(id))
    .slice(0, 5);
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
      throw new UnknownTechnologyError(rawId, suggestions(catalog, rawId));
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
