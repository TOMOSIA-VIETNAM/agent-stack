import { z } from 'zod';
import { isValidRange } from './version.js';

/** Slots of the tech-stack input model (idea.md §2). */
export const SLOTS = [
  'language',
  'framework',
  'frontend',
  'database',
  'cache',
  'testing',
  'infrastructure',
  'architecture',
  'library',
] as const;

export type Slot = (typeof SLOTS)[number];

/** Knowledge base layers, in the order they are applied (idea.md §1). */
export const LAYERS = ['global', 'language', 'framework'] as const;

export type Layer = (typeof LAYERS)[number];

const idSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'ids are lowercase kebab-case');

const rangeSchema = z
  .string()
  .refine(isValidRange, (value) => ({ message: `invalid version range: "${value}"` }));

export const technologySchema = z.object({
  name: z.string().min(1),
  kind: z.enum(SLOTS),
  aliases: z.array(z.string().min(1)).default([]),
  /** Transitively pulled in when this technology is selected (idea.md §3). */
  requires: z.array(idSchema).default([]),
  compatible_with: z.array(idSchema).default([]),
  conflicts_with: z.array(idSchema).default([]),
  /** Versions the knowledge base is curated for; outside it the validator warns. */
  supported_versions: rangeSchema.optional(),
});

export type Technology = z.infer<typeof technologySchema>;

export const catalogSchema = z.object({
  version: z.literal(1),
  technologies: z.record(idSchema, technologySchema),
});

export type Catalog = z.infer<typeof catalogSchema>;

/** A technology the artifact applies to, optionally narrowed to a version range. */
export const appliesToSchema = z.object({
  tech: idSchema,
  versions: rangeSchema.optional(),
});

export const artifactMetaSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['rule', 'skill', 'command']),
  layer: z.enum(LAYERS),
  /**
   * Generalization of idea.md's `language` / `framework` fields: any catalog
   * technology can gate an artifact, with an optional version range.
   * Empty means the artifact always applies (the global layer).
   */
  applies_to: z.array(appliesToSchema).default([]),
  /** Other artifact ids that must be emitted alongside this one. */
  dependencies: z.array(idSchema).default([]),
  conflicts_with: z.array(idSchema).default([]),
  compatible_with: z.array(idSchema).default([]),
  tags: z.array(z.string().min(1)).default([]),
  /** Lower sorts first, and becomes the numeric prefix of emitted rule files. */
  priority: z.number().int().min(0).max(999),
  /** Extra files copied next to SKILL.md, relative to the artifact directory. */
  files: z.array(z.string().min(1)).default([]),
});

export type ArtifactMeta = z.infer<typeof artifactMetaSchema>;

export const stackSelectionSchema = z.object({
  tech: idSchema,
  version: z.string().min(1).optional(),
});

export const techStackInputSchema = z.object({
  language: z.array(stackSelectionSchema).default([]),
  framework: z.array(stackSelectionSchema).default([]),
  frontend: z.array(stackSelectionSchema).default([]),
  database: z.array(stackSelectionSchema).default([]),
  cache: z.array(stackSelectionSchema).default([]),
  testing: z.array(stackSelectionSchema).default([]),
  infrastructure: z.array(stackSelectionSchema).default([]),
  architecture: z.array(stackSelectionSchema).default([]),
  library: z.array(stackSelectionSchema).default([]),
});

export type TechStackInput = z.infer<typeof techStackInputSchema>;
