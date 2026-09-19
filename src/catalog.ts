import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  catalogSchema,
  isValidId,
  LAYERS,
  type ArtifactMeta,
  type ArtifactType,
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
  licenseUrl: string;
  copyright: string;
}

export interface Artifact {
  meta: ArtifactMeta;
  /** The file itself, absolute. Copied into the project unchanged. */
  path: string;
  /** Loaded only for `claude-md`, which is inlined rather than copied. */
  contents?: string;
  /** Directory the file sits in; for a skill, the root of the whole skill. */
  dir: string;
  /** Path relative to the knowledge root, used in diagnostics. */
  source: string;
  /** Other files in a skill's directory, relative to `dir`. Copied alongside. */
  files: string[];
  provenance?: Provenance;
}

export interface KnowledgeBase {
  root: string;
  catalog: Catalog;
  rules: Artifact[];
  skills: Artifact[];
  commands: Artifact[];
  /** Inlined into the project's CLAUDE.md; nothing is emitted for these. */
  claudeMd: Artifact[];
  imported: ImportedSource[];
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

export class ArtifactPathError extends Error {}

/**
 * Read an artifact's metadata off its path.
 *
 * This is the only place metadata comes from. Nothing inside the file is
 * parsed, so there is no second declaration that can drift out of step with
 * where the file sits — and the file itself stays the operator's to write.
 *
 *   rules/framework/rails/security.md              framework, [rails], id rails-security
 *   rules/framework/rails/db/indexes.md            framework, [rails], id rails-db-indexes
 *   rules/global/karpathy-guidelines.md            global,    [],      id karpathy-guidelines
 *   commands/test.md                               global,    [],      id test
 *   skills/framework/rails/rails-feature/SKILL.md  framework, [rails], id rails-feature
 *
 * A skill's id is its own directory name rather than the joined path: skill
 * names are a flat namespace Claude matches a task against, so `rails-feature`
 * inside `rails/` must not become `rails-rails-feature`.
 */
export function metaFromPath(relativePath: string, type: ArtifactType): ArtifactMeta {
  const segments = relativePath.split(sep);
  // Drop the leading `rules/` | `skills/` | `commands/`, and a skill's SKILL.md.
  const rest = type === 'skill' ? segments.slice(1, -1) : segments.slice(1);

  let layer: Layer = 'global';
  let appliesTo: string[] = [];
  let tail = rest;

  if (isLayer(rest[0])) {
    layer = rest[0];
    tail = rest.slice(1);
    if (layer === 'framework') {
      const framework = tail[0];
      if (framework === undefined || tail.length < 2) {
        throw new ArtifactPathError(
          `${relativePath}: a framework artifact lives under <type>/framework/<framework>/, so that the directory says which framework it applies to`,
        );
      }
      // The framework directory stays in `tail`: it gates the artifact *and*
      // prefixes its name, so `rails/security.md` is `rails-security.md`.
      appliesTo = [framework];
    }
  }

  const id =
    type === 'skill' ? (tail[tail.length - 1] ?? '') : tail.join('-').replace(/\.md$/, '');

  if (!isValidId(id)) {
    throw new ArtifactPathError(
      `${relativePath}: "${id}" cannot be a filename under .claude/ — name every path segment in lowercase kebab-case, because the path is what is emitted`,
    );
  }

  return { id, type, layer, applies_to: appliesTo };
}

async function loadArtifact(path: string, root: string, type: ArtifactType): Promise<Artifact> {
  const source = relative(root, path);
  const dir = dirname(path);
  const files =
    type === 'skill'
      ? (await listFiles(dir)).filter((file) => file !== path).map((file) => relative(dir, file))
      : [];
  // Only a fragment's text is read. Every other type is copied without ever
  // being opened.
  const contents = type === 'claude-md' ? await readFile(path, 'utf8') : undefined;

  return { meta: metaFromPath(source, type), path, dir, source, files, contents };
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
        licenseUrl: owner.licenseUrl,
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

  const imported = await loadUpstream(root);

  const collect = (dirName: string, type: ArtifactType, keep: (path: string) => boolean) =>
    listFiles(join(root, dirName)).then((paths) =>
      Promise.all(paths.filter(keep).map((path) => loadArtifact(path, root, type))),
    );

  const rules = await collect('rules', 'rule', (path) => path.endsWith('.md'));
  const skills = await collect('skills', 'skill', (path) => basename(path) === 'SKILL.md');
  const commands = await collect('commands', 'command', (path) => path.endsWith('.md'));
  const claudeMd = await collect('claude-md', 'claude-md', (path) => path.endsWith('.md'));

  attachProvenance([...rules, ...skills, ...commands, ...claudeMd], imported);

  const kb: KnowledgeBase = {
    root,
    catalog: catalogParsed.data,
    rules,
    skills,
    commands,
    claudeMd,
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
  const artifacts = [...kb.rules, ...kb.skills, ...kb.commands, ...kb.claudeMd];
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

  // Layer and gate are structural now, so the one thing left to check is that a
  // directory claiming to name a framework actually names one.
  for (const { meta, source } of artifacts) {
    for (const applies of meta.applies_to) {
      if (!techIds.has(applies)) {
        problems.push(`${source}: the directory "${applies}" is not a framework in catalog.yaml`);
      }
    }
  }

  return problems.sort();
}
