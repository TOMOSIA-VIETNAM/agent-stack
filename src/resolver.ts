import type { Catalog, Slot, TechStackInput } from './schema.js';
import { satisfies } from './version.js';

export interface ResolvedTech {
  id: string;
  name: string;
  slot: Slot;
  version?: string;
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
  /** Non-blocking notes: unknown versions, versions outside the curated range. */
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
 * Expand the input stack over the `requires` graph, then report every
 * declared conflict between the resulting technologies (idea.md §3 and §4).
 *
 * Conflicts are never resolved here: the caller decides, either by dropping a
 * technology or by accepting the conflict explicitly.
 */
export function resolveStack(catalog: Catalog, input: TechStackInput): ResolvedStack {
  const resolved = new Map<string, ResolvedTech>();
  const warnings: string[] = [];

  const add = (
    rawId: string,
    version: string | undefined,
    origin: ResolvedTech['origin'],
    requiredBy: string[],
  ): void => {
    const id = canonicalize(catalog, rawId);
    if (!id) {
      throw new UnknownTechnologyError(rawId, suggestions(catalog, rawId));
    }
    const tech = catalog.technologies[id];
    if (!tech) {
      throw new UnknownTechnologyError(rawId, suggestions(catalog, rawId));
    }

    const existing = resolved.get(id);
    if (existing) {
      // An explicit selection always wins over the same technology arriving as
      // a dependency, and a pinned version wins over an unpinned one.
      if (origin === 'input') existing.origin = 'input';
      if (version && !existing.version) existing.version = version;
      if (version && existing.version && existing.version !== version) {
        warnings.push(
          `${id}: version "${existing.version}" already selected, ignoring "${version}"`,
        );
      }
      return;
    }

    if (version && tech.supported_versions && !satisfies(version, tech.supported_versions)) {
      warnings.push(
        `${id} ${version} is outside the curated range "${tech.supported_versions}" — rules may not match this version`,
      );
    }

    resolved.set(id, {
      id,
      name: tech.name,
      slot: tech.kind,
      version,
      origin,
      requiredBy,
    });

    for (const required of tech.requires) {
      add(required, undefined, 'dependency', [id, ...requiredBy]);
    }
  };

  for (const [slot, selections] of Object.entries(input) as [Slot, TechStackInput[Slot]][]) {
    for (const selection of selections) {
      add(selection.tech, selection.version, 'input', []);
      const id = canonicalize(catalog, selection.tech);
      const tech = id ? catalog.technologies[id] : undefined;
      if (tech && tech.kind !== slot) {
        warnings.push(`${id} is a ${tech.kind}, but was given as --${slot}`);
      }
    }
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
