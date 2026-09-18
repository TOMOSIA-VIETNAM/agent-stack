import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  artifactMetaSchema,
  catalogSchema,
  type ArtifactMeta,
  type Catalog,
} from './schema.js';

export interface Artifact {
  meta: ArtifactMeta;
  /** Markdown body with the metadata front matter stripped. */
  body: string;
  /** Directory the artifact was loaded from, for resolving `files`. */
  dir: string;
  /** Path relative to the knowledge root, used in diagnostics. */
  source: string;
}

export interface KnowledgeBase {
  root: string;
  catalog: Catalog;
  rules: Artifact[];
  skills: Artifact[];
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
  const skills = await Promise.all(skillPaths.map((p) => loadArtifact(p, root, 'skill')));

  const kb: KnowledgeBase = { root, catalog: catalogParsed.data, rules, skills };
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
