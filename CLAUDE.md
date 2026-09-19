# agent-stack

A Claude Code plugin that generates a project's `.claude` rules, skills and commands by
**selecting** from a curated knowledge base. It never writes rule content with a model.

## Two invariants

Everything here is arranged around these. A change that weakens either needs to say so
out loud, not slip through:

1. **Selection is deterministic.** Resolution, compatibility checking, version matching,
   composition and validation run in TypeScript under `src/`. A model maps a request to
   CLI flags and relays conflicts to the operator. It decides nothing else and writes no
   content.
2. **Conflicts are never resolved silently.** When two selected technologies are declared
   incompatible, the run stops, names the conflict, and prints the flag that waives it.
   The generator does not pick a winner.

A third holds for the knowledge base: **generating is offline.** A generate run reads
this repository and writes the target directory. Only `npm run sync`, run deliberately,
touches the network.

## Commands

```bash
npm run check    # typecheck + tests + bundle — before every push
npm run try      # generate into .agent-stack-try/ (gitignored) and read the result
npm run sync     # re-copy imported content at the pinned commit
```

`dist/agent-stack.mjs` is committed so the plugin runs without an install step. **Rebuild and
commit it with any change under `src/`** — `npm run check` does the rebuild.

## Pipeline

One concern per module. Put a change where the concern already lives:

| Module | Owns |
| --- | --- |
| `catalog.ts` | Loading the knowledge base, deriving metadata, lint |
| `upstream.ts` | What was copied from where, and under which licence |
| `resolver.ts` | Expanding the technology graph over `requires`, reporting conflicts |
| `selector.ts` | Which artifacts apply to a resolved stack |
| `version.ts` | Version-range matching |
| `composer.ts` | Building the output in memory, merging the CLAUDE.md block |
| `validator.ts` | Completeness and consistency findings |
| `emit.ts` | The only module that writes or deletes |
| `cli.ts` | Flags, human and `--json` output |

**`emit.ts` may only remove paths listed in the previous run's manifest.** Never widen
that. Everything outside the manifest belongs to the user.

`CLAUDE.md` in a generated project is merged, never replaced: only the text between the
`agent-stack:begin` / `agent-stack:end` markers changes.

## Knowledge base

```
knowledge/
├── catalog.yaml                  technologies: requires / conflicts_with / versions
├── upstream.yaml                 what was copied from where, pinned to a commit
├── rules/<layer>/<id>.md         emitted as a file, @-imported from CLAUDE.md
├── skills/<layer>/<id>/SKILL.md  emitted as a directory, with any files beside it
├── commands/<id>.md              emitted as a slash command
└── claude-md/<id>.md             inlined into CLAUDE.md, no file emitted
```

**The directory decides the layer** (`global`, `language`, `framework`); the file or
directory name decides the `id`. Priority defaults to the layer: global 20, language 30,
framework 40.

Rule = a convention, always in context. Skill = a procedure with steps, loaded when the
task comes up. Command = something the developer types. CLAUDE.md fragment = guidance
every project needs inline, not behind an import.

A file authored here declares full metadata in its front matter. An imported file
carries only Claude's own fields, and the rest is derived — see `knowledge/README.md`
for the field table and the version-range syntax.

## Imported content

The global layer is copied from other repositories and committed here, pinned to a full
40-character commit SHA. A branch or tag is rejected.

- **Never edit a file under a path `upstream.yaml` maps to.** The next sync overwrites
  it. Anything an imported file lacks — a description, a layer — is declared in
  `upstream.yaml` or derived from the path.
- **Never author new files there either.** The next sync deletes them.
- Moving a pin is a reviewable commit: `npm run sync -- --ref <sha>`, then read the diff
  of what it brought in.
- Attribution lives once per generated project, in `.claude/agent-stack-manifest.json` under
  `imported` — repo, commit, licence, licence URL, copyright. That is how the upstream
  MIT terms are met, so keep those fields accurate and do not add a source that cannot
  be attributed there.

## Working here

- New behaviour needs a test; a bug fix needs a test that fails before it.
- `tests/pipeline.test.ts` loads the real knowledge base, so a content change that
  breaks an invariant fails the suite.
- Keep the CLI's `--json` shape stable — `commands/generate.md` parses it.
- Rules and skills are advice that will be applied to real code. Prefer guidance that
  has paid off over guidance that sounds right, be specific enough to act on, and say
  *why* when the reason is not obvious.
- Conventional Commits, imperative subject under 72 characters. The body explains why.

`idea.md` is the original brief. Phase 1 is what exists; natural-language stack input
and full project bootstrap are not built yet.
