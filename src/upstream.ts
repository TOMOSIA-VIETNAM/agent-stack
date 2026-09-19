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
export const upstreamSourceSchema = z.object({
  repo: z.string().url().startsWith('https://'),
  /** Full 40-character commit SHA. A branch or tag is rejected: the copy must be traceable. */
  ref: z.string().regex(/^[0-9a-f]{40}$/, 'ref must be a full 40-character commit SHA'),
  license: z.string().min(1),
  /** Where the licence can be read. Travels into every generated file's origin comment. */
  license_url: z.string().url(),
  copyright: z.string().min(1),
  /** Upstream path -> path under knowledge/. The targets mark which artifacts are imported. */
  copy: z.record(z.string().min(1), z.string().min(1)),
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
  licenseUrl: string;
  copyright: string;
  /** Paths under knowledge/ that hold this source's files. */
  paths: string[];
}

export function copyTarget(entry: string): string {
  return entry;
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
    sources.push({
      name,
      repo: source.repo,
      ref: source.ref,
      license: source.license,
      licenseUrl: source.license_url,
      copyright: source.copyright,
      paths: Object.values(source.copy),
    });
  }
  return sources;
}
