# Knowledge base

The content agent-stack selects from. All of it is committed here, so a generate run
needs no network.

## The one rule

**agent-stack never reads or writes what is inside a file.** A selected file is copied
into the project byte for byte. Everything the generator needs — what the file is, who
it is for, what it will be called — is read off its **path**.

That is why there is no `id`, `priority`, `layer`, `applies_to` or `type` field to
declare. There is nothing to declare. Put the file in the right place and name it well.

## Layout

```
catalog.yaml                            the frameworks
upstream.yaml                           what was copied from where, pinned to a commit
upstream.lock.json                      what the last sync delivered

rules/global/<name>.md                  -> .claude/rules/<name>.md
rules/framework/<fw>/<name>.md          -> .claude/rules/<fw>-<name>.md
skills/global/<name>/SKILL.md           -> .claude/skills/<name>/
skills/framework/<fw>/<name>/SKILL.md   -> .claude/skills/<name>/
commands/<name>.md                      -> .claude/commands/<name>.md
commands/framework/<fw>/<name>.md       -> .claude/commands/<fw>-<name>.md
claude-md/<name>.md                     -> inlined into CLAUDE.md
claude-md/framework/<fw>/<name>.md      -> inlined into CLAUDE.md, only for <fw>
```

`<fw>` is a framework id from `catalog.yaml`. Any file beside a `SKILL.md` — a
`references/` directory, a script — is copied with it.

## What the path decides

| Derived | From | Example |
| --- | --- | --- |
| type | the top directory | `rules/` → a rule |
| layer | segment 2, when it is `global` or `framework`; otherwise `global` | `rules/framework/…` → framework |
| which framework it applies to | the directory under `framework/` | `rails/` → applies to Rails |
| emitted filename | the rest of the path, joined with `-`, minus `.md` | `rails/security.md` → `rails-security.md` |

Nest as deep as you like below the framework directory: `rails/db/indexes.md` becomes
`rails-db-indexes.md`. Use it to group a growing set.

**A skill is the exception**: its id is its *own directory name*, not the joined path,
so `skills/framework/rails/rails-feature/` stays `rails-feature`. Skill names are a flat
namespace Claude matches a task against, so write the framework into the skill's own
name rather than relying on the directory above it.

Every path segment must be lowercase kebab-case, because the path becomes a filename.
Anything else is refused by name when the knowledge base loads.

## Front matter

Whatever you write in front matter is Claude's to read, and lands in every generated
project untouched. agent-stack has no opinion on it.

| File | What Claude needs |
| --- | --- |
| `SKILL.md` | `name` and `description`. The description is what Claude matches a task against — say what it does **and when to use it** |
| a command | `description` |
| a rule | nothing. Give it a `# Title` and write Markdown |
| a fragment | nothing |

Do not add metadata for agent-stack. There is none to add, and it would be copied into
every project that selects the file.

## Four kinds of content

| Kind | What it is | When it loads |
| --- | --- | --- |
| **Rule** | A convention — *how code must be written* | Always in context, `@`-imported from CLAUDE.md |
| **Skill** | A procedure — *how to carry out task X*, in steps | When that task comes up |
| **Command** | Something the developer types | When invoked |
| **CLAUDE.md fragment** | Guidance that belongs in the project's CLAUDE.md itself | From the first token |

If you are writing numbered steps, it is a skill.

A fragment is the **only** thing not copied as a file: its text is spliced into a
document agent-stack composes. Only there, and only because of that, are two things
dropped — a leading front-matter block, which would be nonsense partway down a Markdown
file, and a leading `# Title`, which would give the project a second `h1`.

Keep a `SKILL.md` under ~500 lines. Long reference material goes in a separate file in
the same directory; it is copied automatically.

## Ordering

Alphabetical by emitted filename, on disk and in the `@`-imports alike. There is no
priority field. To put a rule above another, give it a name that sorts above.

## More than one framework

A project can select several. Rules and commands carry their framework directory in
their name, so two frameworks can each have a `conventions.md`:

```
rules/framework/rails/conventions.md    -> .claude/rules/rails-conventions.md
rules/framework/laravel/conventions.md  -> .claude/rules/laravel-conventions.md
```

Skills have no such prefix, so two skill directories of the same name are a load-time
error naming both files. agent-stack will not rename one for you: that would change the
name Claude matches against.

## catalog.yaml

Every entry is a framework, because a framework is the only thing an operator selects.
There is no `kind` field — it would be the same word on every row — and no versions: a
rule applies to a framework, not to one of its releases.

```yaml
version: 1

technologies:
  rails:
    name: Ruby on Rails

  laravel:
    name: Laravel
```

| Field | Meaning |
| --- | --- |
| `name` | Required. The human name |
| `requires` | Pulled in automatically, transitively. No entry needs it today |
| `conflicts_with` | Reported, **never** settled automatically. The run stops and prints the waiver flag |
| `compatible_with` | Documentation only; not enforced |

A framework with no content is valid: the validator reports it as `uncovered-technology`
rather than failing. `agent-stack catalog` prints what each framework has, so the gaps
are visible at a glance:

```
  ┌─────────┬───────────────┬───────┬────────┬──────────┐
  │ id      │ name          │ rules │ skills │ commands │
  ├─────────┼───────────────┼───────┼────────┼──────────┤
  │ rails   │ Ruby on Rails │     3 │     29 │        9 │
  │ laravel │ Laravel       │     — │     26 │        9 │
  └─────────┴───────────────┴───────┴────────┴──────────┘

  Every row counts the global layer too, which applies whatever the framework:
  0 rule(s), 26 skill(s), 9 command(s), 1 CLAUDE.md fragment(s).
```

Each row is what `--framework <id>` actually emits, the global layer included, because
that layer is selected whatever the framework is. Laravel's blank rules column is the
gap; its 26 skills and 9 commands are the global layer it gets regardless. The `--json`
output splits the two, as `counts` and `own`.

## Adding content

**A rule** — a Markdown file under `rules/framework/<fw>/`. Give it a `# Title` and
write the convention. Nothing else.

**A skill** — a directory under `skills/framework/<fw>/<skill-name>/` holding a
`SKILL.md` with `name` and `description`. Write the steps in order, and end with what to
report. Name the directory for what Claude should call it, framework included.

**A command** — a Markdown file under `commands/framework/<fw>/`, or `commands/` for one
that applies everywhere.

**A fragment** — a Markdown file under `claude-md/`. Use one only for guidance every
project needs inline rather than behind an import.

**A framework** — an entry in `catalog.yaml`, then a directory named after it.

Run `npm test` after any change: the suite loads this directory and fails on a duplicate
name, an unknown framework directory, or a path that cannot become a filename.

## Imported content

The global layer is copied from two MIT-licensed projects and committed here:

- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) — skills into
  `skills/global/`, commands into `commands/`.
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)
  — its `CLAUDE.md` into `claude-md/karpathy-guidelines.md`, inlined into every project.

`upstream.yaml` records the repository, the exact commit, the licence, and which upstream
path maps to which path here. The commit is a **full 40-character SHA** — a branch or tag
is rejected — so the copy is traceable to one revision.

```bash
npm run sync                      # re-copy at the pinned commit
npm run sync -- --ref <sha>       # move the pin, then copy
```

**Never edit an imported file.** The next sync overwrites it.

**Writing your own file beside them is fine.** A sync removes only the files the
*previous* sync delivered, which `upstream.lock.json` records. An upstream deletion still
propagates — that file was in the record and is not in the new snapshot — while a file
that was never in the record is never a candidate for removal. Commit the lock file with
the content it describes; without it a sync cannot tell an upstream deletion from your
work, so it removes nothing and says so.

`license`, `license_url` and `copyright` travel into every generated project's
`.claude/agent-stack-manifest.json` under `imported`. That is where the upstream notices
live — once per project. Keep them accurate, and do not add a source that cannot be
attributed there.

### Known limitation

The imported commands invoke skills by their upstream plugin name, e.g.
`agent-skills:test-driven-development`. In a generated project those skills live at
`.claude/skills/<name>/` with no namespace, so the reference only resolves if that project
*also* installs the upstream plugin. The files are kept as published rather than rewritten.

## When loading fails

| Message | Cause |
| --- | --- |
| `"X_y" cannot be a filename under .claude/` | A path segment is not lowercase kebab-case |
| `a framework artifact lives under <type>/framework/<framework>/` | A file sits directly in `framework/` with no framework directory |
| `the directory "x" is not a framework in catalog.yaml` | The directory under `framework/` names nothing in the catalog |
| `duplicate <type> id "x" (a, b)` | Two files would be emitted under the same name |
| `catalog.yaml: x conflicts with itself` | `conflicts_with` lists its own id |
| `catalog.yaml: x.requires references unknown technology "y"` | A dangling reference in the graph |
