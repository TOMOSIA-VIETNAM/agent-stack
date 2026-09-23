# agent-stack

A Claude Code plugin that generates a project's `.claude` rules, skills and commands by
**selecting** from a curated knowledge base. It never writes rule content with a model.

## Two invariants

Everything here is arranged around these. A change that weakens either needs to say so
out loud, not slip through:

1. **Selection is deterministic.** Resolution, compatibility checking, composition and
   validation run in TypeScript under `src/`. A model maps a request to CLI flags and
   relays conflicts to the operator. It decides nothing else and writes no content.
   Neither does the generator: a selected file is **copied byte for byte**. The one
   exception is `CLAUDE.md`, which agent-stack composes rather than copies.
   The approval checklist only **narrows** that result: it drops artifacts, never adds
   one, and never touches what a kept artifact contains. An unattended run and an
   approved one differ in what was dropped and in nothing else.
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

npm run new-framework -- <id> "<Name>"   # catalog entry + templates/framework/ cloned into knowledge/
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
| `composer.ts` | Deciding where each file lands, merging the CLAUDE.md block |
| `prompt.ts` | The terminal approval checklist, and nothing else |
| `validator.ts` | Completeness and consistency findings |
| `emit.ts` | The only module that writes or deletes; what is on disk versus the manifest |
| `table.ts` | Box-drawn tables for human output, and nothing else |
| `cli.ts` | Flags, human and `--json` output |

**`emit.ts` may only remove paths listed in the previous run's manifest, and not one
the project has edited since.** Never widen that. Everything outside the manifest
belongs to the user, and so does anything inside it that the user changed.

The same manifest decides what may be *written over*. `inspectTargets` marks a target
`owned` when the previous manifest lists it, and `exists` when something is there that
agent-stack never wrote. An `exists` path is dropped from the selection — not emitted,
not in the new manifest, not `@`-imported — and reported as a waivable warning. Only
`--overwrite`, or a tick in the checklist, takes it over. A run must never acquire a
file by being run twice.

The manifest records a sha256 per copied file under `checksums`. A listed path whose
bytes no longer match — or a generated skill directory holding a file the manifest does
not list — is `modified`, and is handled exactly like `exists`: dropped, warned about,
taken back only by `--overwrite` or a tick. Stale output that is `modified` is
*retained*, never removed. A deleted file is not an edit. A manifest from before
`checksums` cannot tell, so it behaves as it did when it was written.

`CLAUDE.md` in a generated project is merged, never replaced: only the text between the
`agent-stack:begin` / `agent-stack:end` markers changes.

## Input

**The only input is `--framework`** (repeatable), and the catalog holds nothing but
frameworks — Rails and Laravel. A framework is the one thing an operator always knows;
every extra input is another chance to omit something and have rules vanish without a
word.

Two consequences, both deliberate:

- **An artifact is gated on a framework.** Ruby style rules are gated on `rails`, and
  Active Record rules on `rails` — never on a `ruby` or `activerecord` entry nobody can
  select. An artifact gated on something absent from the catalog can never be emitted.
- **Selection ignores versions.** A rule applies to a framework, not to one of its
  releases; content that is genuinely version-specific says so in its body.

`requires` and `conflicts_with` are still resolved and still enforced — they are what
invariants 1 and 2 are made of — but no catalog entry needs them yet.

`--yes` and `--overwrite` are not input. They waive a step the run would otherwise take
on its own — showing the checklist, and leaving the project's own files alone — the way
`--accept-conflict` waives a conflict. Neither can select an artifact, and no flag
should be added that can: what a stack needs is the knowledge base's answer, and what
gets written is the checklist's.

## Knowledge base

```
knowledge/
├── catalog.yaml                          the frameworks: requires / conflicts_with
├── upstream.yaml                         what was copied from where, pinned to a commit
├── rules/global/<name>.md                -> .claude/rules/<name>.md
├── rules/framework/<fw>/<name>.md        -> .claude/rules/<fw>-<name>.md
├── skills/framework/<fw>/<name>/SKILL.md -> .claude/skills/<name>/, with its files
├── commands/<name>.md                    -> .claude/commands/<name>.md
└── claude-md/<name>.md                   -> inlined into CLAUDE.md, no file emitted
```

**The path is the metadata, and the file is never touched.** Four things are read off
the path and nothing at all is read out of the file:

| Derived | From |
| --- | --- |
| `type` | the top directory — `rules/`, `skills/`, `commands/`, `claude-md/` |
| `layer` | segment 2, when it is `global` or `framework`; otherwise `global` |
| `applies_to` | the framework directory under `framework/` |
| `id` | the rest of the path joined with `-`, minus `.md`. A skill's is its own directory name |

A framework directory that is not a catalog id fails lint by name. A segment that is not
lowercase kebab-case fails by name, because it could not survive becoming a filename.
Nest as deep as you like below the framework — `rails/db/indexes.md` is `rails-db-indexes`.

A skill's id is its own directory name, not the joined path: skill names are a flat
namespace Claude matches a task against, so write the framework into the skill's own name
(`rails-feature`, not `rails/feature`).

**A project can select more than one framework**, and two of them will want a rule called
the same thing. For a rule or a command the framework directory is already part of the id,
so `rails/conventions.md` and `laravel/conventions.md` emit side by side and never collide.
A skill has no such prefix, so two skill directories of the same name are a load-time error
naming both files — renaming one behind the author's back would change the name Claude
matches against.

Ordering is alphabetical by that id, on disk and in the `@`-imports alike. There is no
`priority` field, and no numeric prefix, because a field that exists only to fight the
sort order is one more thing to keep in sync.

Rule = a convention, always in context, `@`-imported from CLAUDE.md. Skill = a procedure
with steps, loaded when the task comes up. Command = something the developer types.
CLAUDE.md fragment = guidance that belongs in the project's CLAUDE.md itself.

**agent-stack does not read or write front matter.** Whatever a file carries is Claude's
to read: `name` and `description` in a `SKILL.md`, `description` in a command, nothing at
all in a rule if you want nothing. Put no agent-stack metadata in a file — there is none
to put, and anything you add is copied into every generated project.
`knowledge/README.md` is the full reference for the layout.

**A fragment is the one thing inlined rather than copied**, because it becomes part of a
document agent-stack composes. Only there, and only for that reason, are two things
dropped: a leading front-matter block, which would be nonsense partway down a Markdown
file, and a leading `# Title`, which would give the project a second `h1`.

## Imported content

The global layer is copied from other repositories and committed here, pinned to a full
40-character commit SHA. A branch or tag is rejected.

- **Never edit a file under a path `upstream.yaml` maps to.** The next sync overwrites
  it. Anything an imported file lacks — a description, a layer — is declared in
  `upstream.yaml` or derived from the path.
- **Writing your own file beside the imported ones is fine.** A sync removes only what
  the previous sync delivered, recorded in `upstream.lock.json`, so a file that was never
  in that record is never a candidate for removal. Commit the lock file with the content
  it describes — without it, the next sync cannot tell an upstream deletion from your
  work, and removes nothing at all.
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

`MY_IDEA.md` states the project's purpose in plain language — read it for *why*, and this
file for *how*. What exists today is framework selection; natural-language input and full
project bootstrap are not built yet.
