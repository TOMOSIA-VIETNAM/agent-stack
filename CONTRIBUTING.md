# Contributing to open-aidd

Thanks for helping. This document covers what the project is, how to run it, and what
a reviewable change looks like.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions
are licensed under [Apache-2.0](LICENSE). Vulnerabilities go through
[SECURITY.md](SECURITY.md), never a public issue.

## What this project is

open-aidd generates a project's `.claude` rules, skills and commands by **selecting**
from a curated knowledge base. It does not write rule content with a model.

Two properties hold the design together. A change that breaks either needs a very good
reason, stated in the pull request:

1. **Selection is deterministic.** Dependency resolution, compatibility checking,
   version matching, composition and validation all run in TypeScript, in `src/`. A
   model maps a request to CLI flags and relays conflicts to the operator; it decides
   nothing else.
2. **Conflicts are never resolved silently.** When two selected technologies are
   declared incompatible, the run stops and reports the conflict with the flag that
   waives it. The generator does not pick a winner.

## Getting set up

```bash
npm install
npm run check      # typecheck + tests + bundle — run this before every push
```

Node 20 or newer. `dist/aidd.mjs` is committed so the plugin runs without an install
step, so **rebuild and commit `dist/` with any change under `src/`**. `npm run check`
does the rebuild for you.

Try it against a scratch directory rather than a real project:

```bash
mkdir /tmp/scratch && cd /tmp/scratch
node /path/to/open-aidd/dist/aidd.mjs generate --language ruby@3.3 --framework rails@7.1 --out .
```

Without `--write`, the command only previews what it would do.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/` | The deterministic pipeline: catalog load, resolve, select, compose, validate, emit |
| `knowledge/` | The content: technology graph, rules, skills, commands |
| `commands/` | The plugin's own slash commands |
| `scripts/sync-upstream.mjs` | Re-copies imported content at its pinned commit |
| `tests/` | Vitest suite; `pipeline.test.ts` loads the real knowledge base |

## Changing the knowledge base

Read [knowledge/README.md](knowledge/README.md) first — it defines the layer
convention, the metadata fields and the version-range syntax.

The short version:

- The **directory decides the layer** (`global`, `language`, `framework`) and the file
  or directory name decides the `id`.
- A file authored here declares full metadata in its front matter. An imported file
  carries only Claude's own fields and everything else is derived, so imported files
  are never edited.
- Do not author anything under a path that `upstream.yaml` maps to. The next sync
  deletes it.

Write a **rule** for a convention that must always be in context, and a **skill** for
a procedure with steps. If you are numbering steps, it is a skill.

Rules and skills are engineering advice that will be applied to real code. Prefer
guidance you have seen pay off over guidance that merely sounds right, be specific
enough to act on, and say *why* when the reason is not obvious.

### Updating imported content

```bash
npm run sync                      # re-copy at the pinned commit
npm run sync -- --ref <40-char sha>   # move the pin, then copy
```

Destination directories are replaced wholesale, so an upstream deletion propagates
here. Review the diff — it shows every changed line, which is the point of committing
the content rather than fetching it — then run `npm test` and commit the pin move
together with the files it brought in.

Only a full 40-character SHA is accepted. Do not point a source at a branch.

## Changing the pipeline

- Put logic in the module that owns the concern. `resolver.ts` expands the technology
  graph, `selector.ts` decides which artifacts apply, `composer.ts` builds the output
  in memory, `emit.ts` touches the disk.
- Anything that writes or deletes belongs in `emit.ts`. The generator may only remove
  paths listed in its own previous manifest; never widen that.
- New behaviour needs a test. Bug fixes need a test that fails before the fix.
- Keep the CLI's `--json` output stable where you can; the slash commands parse it.

## Pull requests

- One concern per pull request, small enough to read in one sitting.
- Use [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`,
  `refactor:`, `docs:`, `test:`, `chore:`. The subject is imperative, under 72
  characters, no trailing period.
- The body explains *why*, not what the diff already shows.
- The description states what changed, why, and how you verified it. "Ran
  `npm run check`" plus what you exercised by hand is enough.
- `npm run check` must pass, and `dist/` must match `src/`.

## Reporting bugs and proposing content

Open an issue. For a bug, include the exact command, the output, and what you expected.
For a new rule or skill, say which layer and technology it belongs to, and why the
existing content does not already cover it — the knowledge base is meant to stay small
enough to read.
