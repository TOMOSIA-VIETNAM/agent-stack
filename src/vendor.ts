import { execFile } from 'node:child_process';
import { access, mkdir, readFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const run = promisify(execFile);

const SHA = /^[0-9a-f]{40}$/;

export const vendorSourceSchema = z.object({
  /** Clone URL. Only https:// is accepted, so a checkout never prompts for a key. */
  repo: z.string().url().startsWith('https://'),
  /** Full 40-character commit SHA. A branch or tag is rejected: the checkout must be reproducible. */
  ref: z.string().regex(SHA, 'ref must be a full 40-character commit SHA'),
  license: z.string().min(1),
  /** File in the checkout holding the licence text, copied into the output. */
  license_file: z.string().min(1).default('LICENSE'),
  copyright: z.string().min(1),
  /** Directory inside the checkout holding one subdirectory per skill. */
  path: z.string().min(1),
  layer: z.enum(['global', 'language', 'framework']).default('global'),
  priority: z.number().int().min(0).max(999),
});

export type VendorSource = z.infer<typeof vendorSourceSchema>;

export const vendorFileSchema = z.object({
  version: z.literal(1),
  sources: z.record(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), vendorSourceSchema),
});

export class VendorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VendorError';
  }
}

function cacheRoot(): string {
  const xdg = process.env['XDG_CACHE_HOME'];
  return join(xdg && xdg.length > 0 ? xdg : join(homedir(), '.cache'), 'open-aidd');
}

export function checkoutPath(name: string, source: VendorSource): string {
  return join(cacheRoot(), name, source.ref);
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

/**
 * Fetch exactly one commit into a per-SHA cache directory and leave it there.
 *
 * The SHA is the cache key, so an upstream force-push cannot change what a
 * previous run resolved, and a later run with a new pin fetches into a new
 * directory instead of mutating the old one.
 */
export async function ensureCheckout(name: string, source: VendorSource): Promise<string> {
  const target = checkoutPath(name, source);
  if (await exists(join(target, '.git'))) {
    return target;
  }

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });

  const git = async (...args: string[]): Promise<void> => {
    await run('git', ['-C', target, ...args], { timeout: 120_000 });
  };

  try {
    await git('init', '--quiet');
    await git('remote', 'add', 'origin', source.repo);
    await git('fetch', '--quiet', '--depth', '1', 'origin', source.ref);
    await git('checkout', '--quiet', 'FETCH_HEAD');
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    const detail = error instanceof Error ? error.message.trim().split('\n').at(-1) : String(error);
    throw new VendorError(
      `Could not fetch ${source.repo} at ${source.ref} (vendored source "${name}"): ${detail}\n` +
        'The pinned commit is required to build the knowledge base. Check network access, then re-run.',
    );
  }

  const { stdout } = await run('git', ['-C', target, 'rev-parse', 'HEAD'], { timeout: 30_000 });
  const head = stdout.trim();
  if (head !== source.ref) {
    await rm(target, { recursive: true, force: true });
    throw new VendorError(
      `Vendored source "${name}" checked out ${head}, expected ${source.ref}.`,
    );
  }

  return target;
}

/** MIT and similar licences require the notice to travel with the copied files. */
export async function readLicense(
  name: string,
  source: VendorSource,
  checkout: string,
): Promise<string> {
  const path = join(checkout, source.license_file);
  const text = await readFile(path, 'utf8').catch(() => undefined);
  if (text === undefined) {
    throw new VendorError(
      `Vendored source "${name}" declares ${source.license} but ${source.license_file} is missing from the checkout.`,
    );
  }
  return text.trim();
}
