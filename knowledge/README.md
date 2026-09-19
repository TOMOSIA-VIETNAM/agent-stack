# Knowledge base

The content agent-stack selects from. All of it is committed here, so a generate run
needs no network.

## Layout

```
catalog.yaml                       the technology graph
upstream.yaml                      where imported content came from
rules/<layer>/<id>.md              a rule
skills/<layer>/<id>/SKILL.md       a skill, plus any files it references
commands/<id>.md                   a slash command
claude-md/<id>.md                  guidance inlined into the project's CLAUDE.md
```

`<layer>` is one of `global`, `language`, `framework` — the three layers of idea.md
§1. **The directory decides the layer**, and the file or directory name decides the
`id`.

**Rule** = a convention: *how code must be written*. Emitted as its own file and
@-imported from CLAUDE.md. **Skill** = a procedure: *how to carry out task X*, in
steps. Loaded when the task comes up. **Command** = a slash command the developer
types. If you are writing numbered steps, it is a skill.

**CLAUDE.md fragment** = guidance that belongs in the project's CLAUDE.md itself
rather than behind an import. Its body is inlined into the managed block, with its own
leading `# title` dropped so the project keeps one. Nothing is emitted for it under
`.claude/`. Fragments are always global; use one only for guidance every project needs
in context from the first token.

## Two kinds of file

**Authored here** — declares full agent-stack metadata in its front matter:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Unique per type, lowercase kebab-case. Becomes the output filename. |
| `name` | yes | Human title. For a skill, use the skill's kebab-case id — Claude sees it. |
| `description` | yes | One line. For a skill, what Claude matches a task against: what it does *and when to use it*. |
| `type` | yes | `rule`, `skill`, `command`, or `claude-md`. |
| `layer` | yes | `global`, `language`, or `framework`. Must match the directory. |
| `priority` | yes | 0–999. Sorts the output and prefixes rule filenames. |
| `applies_to` | layer ≠ global | `[{tech, versions?}]` — **all** entries must match the resolved stack. This generalizes idea.md's `language` / `framework` fields: any catalog technology can gate an artifact. |
| `dependencies` | no | Other artifact ids pulled in whenever this one is selected — but a dependency still has to apply: one gated on a version range this stack falls outside is reported as `unmet-dependency`, not emitted anyway. Give a dependency and its dependent the same range. |
| `conflicts_with` | no | Artifact ids that must not be emitted alongside this one. |
| `compatible_with` | no | Documentation only; not enforced. |
| `tags` | no | Free-form. |
| `files` | no | Extra files to copy. Defaults to every other file in the artifact's directory. |

**Imported** (see below) — carries only Claude's own front matter (`name`,
`description` for a skill; `description` for a command), or none at all when the file
is a repository's own `CLAUDE.md`, in which case `upstream.yaml` supplies the
description. Everything else is derived: `id` from the file or directory name, `layer`
from the directory, `priority` from the layer (`global` 20, `language` 30, `framework`
40), `applies_to` empty. Imported files are never edited, so syncing stays a plain
overwrite.

### Version ranges

`applies_to[].versions` and `catalog.yaml`'s `supported_versions` accept:

| Range | Matches |
| --- | --- |
| `*` or omitted | any version |
| `3.3` | `>=3.3.0 <3.4.0` |
| `8.x` | `>=8.0.0 <9.0.0` |
| `>=7 <9` | whitespace-separated comparators, all must hold |
| `^7.1` / `~7.1` | `>=7.1 <8` / `>=7.1 <7.2` |
| `7 - 8.x` | inclusive, right side widened to its prefix |

A versioned `applies_to` never matches a technology the operator did not pin — the
validator raises `missing-version` and asks, rather than assuming a version.

## Imported content

The global layer is not authored here. It is copied from two projects:

- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT) —
  25 skills into `skills/global/` and 9 commands into `commands/`.
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)
  (MIT) — its `CLAUDE.md` into `claude-md/karpathy-guidelines.md`, inlined into every
  generated project's CLAUDE.md.

`upstream.yaml` records the repository, the exact commit the files were taken at, the
licence, and which upstream path maps to which path under `knowledge/`. The commit is
a **full 40-character SHA** — a branch or tag is rejected — so the copy is traceable
to one revision.

A copy entry may be a plain target path, or an object with a `description`. The second
form exists for a file that carries no front matter at all — a repository's own
`CLAUDE.md` — where the description Claude needs is declared in `upstream.yaml` rather
than added to the copied file.

`license`, `license_url` and `copyright` travel into every generated project's
`.claude/agent-stack-manifest.json`, under `imported`. That is where the upstream notices
live — once per project, the way an installed plugin's own LICENSE sits once in its
checkout rather than at the top of every skill file. Keep it accurate, and do not add
a source that cannot be attributed there.

```bash
npm run sync                      # re-copy at the pinned commit
npm run sync -- --ref <sha>       # move the pin, then copy
```

Destination directories are replaced wholesale, so a file deleted upstream disappears
here too. Review the diff and run `npm test` before committing.

### Known limitation

The imported commands invoke skills by their upstream plugin name, e.g.
`agent-skills:test-driven-development`. In a generated project those skills live at
`.claude/skills/<id>/` with no namespace, so the reference only resolves if that
project *also* installs the upstream plugin. The files are kept as published rather
than rewritten.

## Adding content

**A technology** — add an entry to `catalog.yaml` with its `kind`, what it `requires`
(pulled in automatically) and what it `conflicts_with` (reported, never auto-resolved).
A technology with no rules is valid: it resolves and is reported as uncovered.

**A rule** — new file under `rules/<layer>/`, front matter above, body in Markdown
starting at `##`. The generator adds the `# <name>` heading, unless the body already
opens with one.

**A skill** — new directory under `skills/<layer>/<id>/` with a `SKILL.md`. Write
steps in order, and end with what to report. Keep it under ~500 lines; put long
reference material in a separate file in the same directory — it is copied
automatically.

Do not author files under a path that `upstream.yaml` maps to: the next sync deletes
them.

Run `npm test` after any change: the suite loads this directory and fails on a
dangling reference, a duplicate id, an invalid range, or a layer that declares the
wrong `applies_to`.
