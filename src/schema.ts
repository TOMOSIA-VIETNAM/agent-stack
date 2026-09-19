import { z } from 'zod';

/**
 * Knowledge base layers, in the order they are applied.
 *
 * Two, not three: every catalog entry is a framework, so there is no language
 * to gate a layer of its own on. Ruby style rules are Rails rules here.
 */
export const LAYERS = ['global', 'framework'] as const;

export type Layer = (typeof LAYERS)[number];

/**
 * `claude-md` is the one type that is not copied as a file: its content is
 * spliced into the project's own CLAUDE.md, which is agent-stack's document to
 * compose. Files are copied; that block is built.
 */
export const ARTIFACT_TYPES = ['rule', 'skill', 'command', 'claude-md'] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

const idSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'ids are lowercase kebab-case');

/**
 * A framework. The catalog holds nothing else: it is the only thing an operator
 * selects, so a `kind` field would be the same word on every row.
 */
export const technologySchema = z.object({
  name: z.string().min(1),
  /**
   * Transitively pulled in when this framework is selected. No entry uses it
   * today; it stays because the graph, not the current catalog, is what the
   * resolver is for.
   */
  requires: z.array(idSchema).default([]),
  compatible_with: z.array(idSchema).default([]),
  conflicts_with: z.array(idSchema).default([]),
});

export type Technology = z.infer<typeof technologySchema>;

export const catalogSchema = z.object({
  version: z.literal(1),
  technologies: z.record(idSchema, technologySchema),
});

export type Catalog = z.infer<typeof catalogSchema>;

/**
 * Everything agent-stack knows about an artifact — four fields, all read off
 * its path under `knowledge/`.
 *
 * There is no schema, because nothing is parsed. A knowledge file belongs to
 * the operator and is copied into the project byte for byte; whatever front
 * matter it carries is for Claude to read, not for this generator to rewrite.
 */
export interface ArtifactMeta {
  /** The emitted filename, derived from the path — see `metaFromPath`. */
  id: string;
  type: ArtifactType;
  layer: Layer;
  /** Frameworks that must all be in the stack; empty for the global layer. */
  applies_to: string[];
}

/**
 * The whole tech-stack input: the frameworks the project is built on. A
 * framework is the one thing an operator always knows.
 *
 * Entries are names as typed, not catalog ids: the resolver canonicalizes an
 * alias and rejects an unknown one with a suggestion.
 */
export const techStackInputSchema = z.object({
  framework: z.array(z.string().min(1)).default([]),
});

export type TechStackInput = z.infer<typeof techStackInputSchema>;

/** An id has to survive becoming a filename under `.claude/`. */
export function isValidId(value: string): boolean {
  return idSchema.safeParse(value).success;
}
