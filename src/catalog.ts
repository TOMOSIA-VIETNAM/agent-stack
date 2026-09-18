import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import {
  artifactMetaSchema,
  catalogSchema,
  type ArtifactMeta,
  type Catalog,
} from './schema.js';
import { ensureCheckout, readLicense, vendorFileSchema, type VendorSource } from './vendor.js';

/** Where an artifact came from, when it was not authored in this repository. */
export interface Provenance {
  source: string;
  repo: string;
  ref: string;
  license: string;
  copyright: string;
}

export interface Artifact {
  meta: ArtifactMeta;
  /** Markdown body with the metadata front matter stripped. */
  body: string;
  /** Directory the artifact was loaded from, for resolving `files`. */
  dir: string;
  /** Path relative to the knowledge root, used in diagnostics. */
  source: string;
  provenance?: Provenance;
}

export interface VendoredSource extends Provenance {
  /** Full licence text, copied into the generated output. */
  licenseText: string;
}

export interface KnowledgeBase {
  root: string;
  catalog: Catalog;
  rules: Artifact[];
  skills: Artifact[];
  vendored: VendoredSource[];
}

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

async function loadArtifact(
  path: string,
  root: string,
  expected: ArtifactMeta['type'],
): Promise<Artifact> {
  const raw = await readFile(path, 'utf8');
  const { data, body } = splitFrontMatter(raw);
  const source = relative(root, path);
  if (data === undefined) {
    throw new Error(`${source}: missing YAML front matter`);
  }

  const parsed = artifactMetaSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`${source}: invalid metadata (${issues})`);
  }
  if (parsed.data.type !== expected) {
    throw new Error(`${source}: expected type "${expected}", got "${parsed.data.type}"`);
  }

  return {
    meta: parsed.data,
    body: body.trim(),
    dir: dirname(path),
    source,
  };
}

/**
 * A vendored skill carries only Claude's own front matter (`name`,
 * `description`). open-aidd's selection metadata is derived from the source's
 * entry in vendor.yaml, so upstream files are used exactly as published.
 */
async function loadVendoredSkill(
  path: string,
  checkout: string,
  name: string,
  source: VendorSource,
  provenance: Provenance,
): Promise<Artifact> {
  const raw = await readFile(path, 'utf8');
  const { data, body } = splitFrontMatter(raw);
  const relativePath = relative(checkout, path);
  const parsed = z
    .object({ name: z.string().min(1), description: z.string().min(1) })
    .safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `${name}:${relativePath}: upstream skill needs "name" and "description" front matter`,
    );
  }

  const dir = dirname(path);
  const id = basename(dir);
  const extras = (await listFiles(dir))
    .filter((file) => file !== path)
    .map((file) => relative(dir, file));

  return {
    meta: artifactMetaSchema.parse({
      id,
      name: parsed.data.name,
      description: parsed.data.description,
      type: 'skill',
      layer: source.layer,
      priority: source.priority,
      tags: [name],
      files: extras,
    }),
    body: body.trim(),
    dir,
    source: `${name}:${relativePath}`,
    provenance,
  };
}

async function loadVendored(
  root: string,
): Promise<{ skills: Artifact[]; vendored: VendoredSource[] }> {
  const raw = await readFile(join(root, 'vendor.yaml'), 'utf8').catch(() => undefined);
  if (raw === undefined) {
    return { skills: [], vendored: [] };
  }

  const parsed = vendorFileSchema.safeParse(parseYaml(raw));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`vendor.yaml: invalid (${issues})`);
  }

  const skills: Artifact[] = [];
  const vendored: VendoredSource[] = [];

  for (const [name, source] of Object.entries(parsed.data.sources)) {
    const checkout = await ensureCheckout(name, source);
    const provenance: Provenance = {
      source: name,
      repo: source.repo,
      ref: source.ref,
      license: source.license,
      copyright: source.copyright,
    };
    vendored.push({ ...provenance, licenseText: await readLicense(name, source, checkout) });

    const skillRoot = join(checkout, source.path);
    const paths = (await listFiles(skillRoot)).filter((p) => basename(p) === 'SKILL.md');
    if (paths.length === 0) {
      throw new Error(`vendor.yaml: source "${name}" has no SKILL.md under "${source.path}"`);
    }
    for (const path of paths) {
      skills.push(await loadVendoredSkill(path, checkout, name, source, provenance));
    }
  }

  return { skills, vendored };
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

  const rulePaths = (await listFiles(join(root, 'rules'))).filter((p) => p.endsWith('.md'));
  const skillPaths = (await listFiles(join(root, 'skills'))).filter(
    (p) => basename(p) === 'SKILL.md',
  );

  const rules = await Promise.all(rulePaths.map((p) => loadArtifact(p, root, 'rule')));
  const local = await Promise.all(skillPaths.map((p) => loadArtifact(p, root, 'skill')));
  const { skills: imported, vendored } = await loadVendored(root);

  const kb: KnowledgeBase = {
    root,
    catalog: catalogParsed.data,
    rules,
    skills: [...local, ...imported],
    vendored,
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
  const artifacts = [...kb.rules, ...kb.skills];
  const byId = new Map<string, Artifact>();

  for (const artifact of artifacts) {
    const existing = byId.get(artifact.meta.id);
    if (existing) {
      problems.push(`duplicate artifact id "${artifact.meta.id}" (${existing.source}, ${artifact.source})`);
      continue;
    }
    byId.set(artifact.meta.id, artifact);
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
      if (!byId.has(dep)) {
        problems.push(`${source}: dependency "${dep}" is not a known artifact`);
      }
    }
    for (const other of meta.conflicts_with) {
      if (!byId.has(other)) {
        problems.push(`${source}: conflicts_with "${other}" is not a known artifact`);
      }
    }
  }

  return problems.sort();
}
