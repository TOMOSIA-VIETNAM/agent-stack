import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

/**
 * Content copied into knowledge/ from another repository.
 *
 * The files are committed here, so nothing is fetched at generate time. This
 * record exists to say where they came from, to carry the licence obligations
 * into the generated output, and to tell `npm run sync` what to copy.
 */
/**
 * One upstream path copied under knowledge/.
 *
 * `description` supplies the one field Claude needs that an upstream file may not
 * carry — a repository's own CLAUDE.md has no front matter at all. It is written
 * here rather than added to the copied file, so syncing stays a plain overwrite.
 */
const copyEntrySchema = z.union([
  z.string().min(1),
  z.object({ to: z.string().min(1), description: z.string().min(1).optional() }),
]);

export const upstreamSourceSchema = z.object({
  repo: z.string().url().startsWith('https://'),
  /** Full 40-character commit SHA. A branch or tag is rejected: the copy must be traceable. */
  ref: z.string().regex(/^[0-9a-f]{40}$/, 'ref must be a full 40-character commit SHA'),
  license: z.string().min(1),
  /** Licence text, relative to knowledge/. */
  license_file: z.string().min(1),
  /**
   * Path to the licence in the upstream checkout, for `npm run sync` to copy.
   * Omitted when upstream ships no licence file and `license_file` is written here
   * instead — the notice then has to record where the licence was declared.
   */
  license_upstream_path: z.string().min(1).optional(),
  copyright: z.string().min(1),
  /** Upstream path -> path under knowledge/. The targets mark which artifacts are imported. */
  copy: z.record(z.string().min(1), copyEntrySchema),
});

export type UpstreamSource = z.infer<typeof upstreamSourceSchema>;

export const upstreamFileSchema = z.object({
  version: z.literal(1),
  sources: z.record(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), upstreamSourceSchema),
});

export interface ImportedSource {
  name: string;
  repo: string;
  ref: string;
  license: string;
  copyright: string;
  licenseText: string;
  /** Paths under knowledge/ that hold this source's files. */
  paths: string[];
  /** Description for a copied file that carries no front matter, keyed by that path. */
  descriptions: Record<string, string>;
}

export function copyTarget(entry: z.infer<typeof copyEntrySchema>): string {
  return typeof entry === 'string' ? entry : entry.to;
}

export async function loadUpstream(root: string): Promise<ImportedSource[]> {
  const raw = await readFile(join(root, 'upstream.yaml'), 'utf8').catch(() => undefined);
  if (raw === undefined) return [];

  const parsed = upstreamFileSchema.safeParse(parseYaml(raw));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`upstream.yaml: invalid (${issues})`);
  }

  const sources: ImportedSource[] = [];
  for (const [name, source] of Object.entries(parsed.data.sources)) {
    const licenseText = await readFile(join(root, source.license_file), 'utf8').catch(() => {
      throw new Error(
        `upstream.yaml: source "${name}" declares ${source.license} but knowledge/${source.license_file} is missing. Run \`npm run sync\`.`,
      );
    });
    const descriptions: Record<string, string> = {};
    for (const entry of Object.values(source.copy)) {
      if (typeof entry !== 'string' && entry.description) {
        descriptions[entry.to] = entry.description;
      }
    }

    sources.push({
      name,
      repo: source.repo,
      ref: source.ref,
      license: source.license,
      copyright: source.copyright,
      licenseText: licenseText.trim(),
      paths: Object.values(source.copy).map(copyTarget),
      descriptions,
    });
  }
  return sources;
}
