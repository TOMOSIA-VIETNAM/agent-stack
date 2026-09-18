import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import {
  artifactMetaSchema,
  catalogSchema,
  LAYERS,
  type ArtifactMeta,
  type Catalog,
  type Layer,
} from './schema.js';
import { loadUpstream, type ImportedSource } from './upstream.js';

/** Where an artifact came from, when it was copied from another repository. */
export interface Provenance {
  source: string;
  repo: string;
  ref: string;
  license: string;
  copyright: string;
}

export interface Artifact {
  meta: ArtifactMeta;
  /** Markdown body with the front matter stripped. */
  body: string;
  /** Directory the artifact was loaded from, for resolving `files`. */
  dir: string;
  /** Path relative to the knowledge root, used in diagnostics. */
  source: string;
  provenance?: Provenance;
}

export interface KnowledgeBase {
  root: string;
  catalog: Catalog;
  rules: Artifact[];
  skills: Artifact[];
  commands: Artifact[];
  imported: ImportedSource[];
}

/**
 * Priority when an artifact does not declare one — which is the normal case for
 * imported files, since they are kept byte-for-byte as published upstream.
 */
const LAYER_PRIORITY: Record<Layer, number> = { global: 20, language: 30, framework: 40 };

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitFrontMatter(raw: string): { data: unknown; body: string } {
  const match = FRONT_MATTER.exec(raw);
  if (!match) {
    return { data: undefined, body: raw };
  }
  return { data: parseYaml(match[1] ?? ''), body: raw.slice(match[0].length) };
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    },
  );

  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

function isLayer(value: string | undefined): value is Layer {
  return value !== undefined && (LAYERS as readonly string[]).includes(value);
}

/**
 * The layer an artifact belongs to, taken from the directory it sits in:
 * `skills/global/<id>/`, `rules/framework/<id>.md`. Commands are global.
 */
function layerFromPath(relativePath: string, fallback: Layer): Layer {
  const segment = relativePath.split(sep)[1];
  return isLayer(segment) ? segment : fallback;
}

const claudeFrontMatterSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1),
});

interface LoadOptions {
  type: ArtifactMeta['type'];
  /** Directory of the artifact; `id` and attached `files` are derived from it. */
  dir: string;
  id: string;
  fallbackLayer: Layer;
}

/**
 * Load one artifact.
 *
 * A file authored here declares full open-aidd metadata. A file copied from
 * another repository carries only Claude's own front matter, so the rest is
 * derived from where it sits: id from the file or directory name, layer from
 * the directory above it, priority from that layer. Imported files are never
 * edited to add metadata, so `npm run sync` stays a plain overwrite.
 */
async function loadArtifact(
  path: string,
  root: string,
  options: LoadOptions,
): Promise<Artifact> {
  const raw = await readFile(path, 'utf8');
  const { data, body } = splitFrontMatter(raw);
  const source = relative(root, path);
  if (data === undefined) {
    throw new Error(`${source}: missing YAML front matter`);
  }

  const declaresOwnMetadata =
    typeof data === 'object' && data !== null && 'id' in data && 'type' in data;

  let meta: ArtifactMeta;
  if (declaresOwnMetadata) {
    const parsed = artifactMetaSchema.safeParse(data);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; ');
      throw new Error(`${source}: invalid metadata (${issues})`);
    }
    if (parsed.data.type !== options.type) {
      throw new Error(`${source}: expected type "${options.type}", got "${parsed.data.type}"`);
    }
    meta = parsed.data;
  } else {
    const parsed = claudeFrontMatterSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(
        `${source}: needs either open-aidd metadata (id, type, ...) or a "description" front matter field`,
      );
    }
    const layer = layerFromPath(source, options.fallbackLayer);
    meta = artifactMetaSchema.parse({
      id: options.id,
      name: parsed.data.name ?? options.id,
      description: parsed.data.description,
      type: options.type,
      layer,
      priority: LAYER_PRIORITY[layer],
    });
  }

  const attached =
    options.type === 'command'
      ? []
      : (await listFiles(options.dir))
          .filter((file) => file !== path)
          .map((file) => relative(options.dir, file));

  return {
    meta: { ...meta, files: meta.files.length > 0 ? meta.files : attached },
    body: body.trim(),
    dir: options.dir,
    source,
  };
}

function attachProvenance(artifacts: Artifact[], imported: ImportedSource[]): void {
  for (const artifact of artifacts) {
    const owner = imported.find((source) =>
      source.paths.some(
        (path) => artifact.source === path || artifact.source.startsWith(`${path}${sep}`),
      ),
    );
    if (owner) {
      artifact.provenance = {
        source: owner.name,
        repo: owner.repo,
        ref: owner.ref,
        license: owner.license,
        copyright: owner.copyright,
      };
    }
  }
}

export async function loadKnowledgeBase(root: string): Promise<KnowledgeBase> {
  const catalogPath = join(root, 'catalog.yaml');
  const catalogRaw = await readFile(catalogPath, 'utf8').catch(() => {
    throw new Error(`Knowledge base not found: ${catalogPath}`);
  });

  const catalogParsed = catalogSchema.safeParse(parseYaml(catalogRaw));
  if (!catalogParsed.success) {
    const issues = catalogParsed.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`catalog.yaml: invalid (${issues})`);
  }

  const rules = await Promise.all(
    (await listFiles(join(root, 'rules')))
      .filter((path) => path.endsWith('.md'))
      .map((path) =>
        loadArtifact(path, root, {
          type: 'rule',
          dir: dirname(path),
          id: basename(path, '.md'),
          fallbackLayer: 'global',
        }),
      ),
  );

  const skills = await Promise.all(
    (await listFiles(join(root, 'skills')))
      .filter((path) => basename(path) === 'SKILL.md')
      .map((path) =>
        loadArtifact(path, root, {
          type: 'skill',
          dir: dirname(path),
          id: basename(dirname(path)),
          fallbackLayer: 'global',
        }),
      ),
  );

  const commands = await Promise.all(
    (await listFiles(join(root, 'commands')))
      .filter((path) => path.endsWith('.md'))
      .map((path) =>
        loadArtifact(path, root, {
          type: 'command',
          dir: dirname(path),
          id: basename(path, '.md'),
          fallbackLayer: 'global',
        }),
      ),
  );

  const imported = await loadUpstream(root);
  attachProvenance([...rules, ...skills, ...commands], imported);

  const kb: KnowledgeBase = {
    root,
    catalog: catalogParsed.data,
    rules,
    skills,
    commands,
    imported,
  };
  const problems = lintKnowledgeBase(kb);
  if (problems.length > 0) {
    throw new Error(`Knowledge base is inconsistent:\n  - ${problems.join('\n  - ')}`);
  }
  return kb;
}

/** Referential integrity of the knowledge base itself, independent of any stack. */
export function lintKnowledgeBase(kb: KnowledgeBase): string[] {
  const problems: string[] = [];
  const techIds = new Set(Object.keys(kb.catalog.technologies));
  const artifacts = [...kb.rules, ...kb.skills, ...kb.commands];
  const byId = new Map<string, Artifact>();

  for (const artifact of artifacts) {
    const key = `${artifact.meta.type}:${artifact.meta.id}`;
    const existing = byId.get(key);
    if (existing) {
      problems.push(
        `duplicate ${artifact.meta.type} id "${artifact.meta.id}" (${existing.source}, ${artifact.source})`,
      );
      continue;
    }
    byId.set(key, artifact);
  }

  for (const [id, tech] of Object.entries(kb.catalog.technologies)) {
    for (const field of ['requires', 'compatible_with', 'conflicts_with'] as const) {
      for (const ref of tech[field]) {
        if (!techIds.has(ref)) {
          problems.push(`catalog.yaml: ${id}.${field} references unknown technology "${ref}"`);
        }
      }
    }
    if (tech.conflicts_with.includes(id)) {
      problems.push(`catalog.yaml: ${id} conflicts with itself`);
    }
  }

  const artifactIds = new Set([...byId.values()].map((artifact) => artifact.meta.id));
  for (const artifact of artifacts) {
    const { meta, source } = artifact;
    if (meta.layer === 'global' && meta.applies_to.length > 0) {
      problems.push(`${source}: global artifacts must not declare applies_to`);
    }
    if (meta.layer !== 'global' && meta.applies_to.length === 0) {
      problems.push(`${source}: ${meta.layer} artifacts must declare applies_to`);
    }
    for (const applies of meta.applies_to) {
      if (!techIds.has(applies.tech)) {
        problems.push(`${source}: applies_to references unknown technology "${applies.tech}"`);
      }
    }
    for (const dep of meta.dependencies) {
      if (!artifactIds.has(dep)) {
        problems.push(`${source}: dependency "${dep}" is not a known artifact`);
      }
    }
    for (const other of meta.conflicts_with) {
      if (!artifactIds.has(other)) {
        problems.push(`${source}: conflicts_with "${other}" is not a known artifact`);
      }
    }
  }

  return problems.sort();
}
