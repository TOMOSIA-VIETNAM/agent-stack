# Knowledge base

The content open-aidd selects from. Nothing here is generated; everything here is
reviewed and version-controlled.

## Layout

```
catalog.yaml                     the technology graph
vendor.yaml                      skills imported from other repositories
rules/language/<id>.md           layer 2 — ruby, php, node...
rules/framework/<id>.md          layer 3 — rails, activerecord, rspec...
skills/<id>/SKILL.md             a skill, plus any files it references
```

Layer 1 — the global, language-independent engineering skills — is not authored
here. It is imported from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
through `vendor.yaml`. See **Vendored sources** below.

**Rule** = a convention: *how code must be written*. It is always in context.
**Skill** = a procedure: *how to carry out task X*, in steps. It is loaded when the
task comes up. If you are writing numbered steps, it is a skill.

## Metadata

Every rule and skill carries YAML front matter:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Unique, lowercase kebab-case. Becomes the output filename. |
| `name` | yes | Human title. For a skill this is also the name Claude sees, so use the skill's kebab-case id. |
| `description` | yes | One line. For a skill this is what Claude matches a task against — say what it does *and when to use it*. |
| `type` | yes | `rule` or `skill`. |
| `layer` | yes | `global`, `language`, or `framework`. |
| `priority` | yes | 0–999. Sorts the output and becomes the rule file's numeric prefix. |
| `applies_to` | layer ≠ global | `[{tech, versions?}]` — **all** entries must match the resolved stack. This generalizes idea.md's `language` / `framework` fields: any catalog technology can gate an artifact. |
| `dependencies` | no | Other artifact ids pulled in whenever this one is selected. |
| `conflicts_with` | no | Artifact ids that must not be emitted alongside this one. |
| `compatible_with` | no | Documentation only; not enforced. |
| `tags` | no | Free-form. |
| `files` | no | Extra files copied next to `SKILL.md`, relative to the artifact directory. |

Priority bands in use: 10–19 global, 30–39 language, 40–49 framework.

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

## Adding content

**A technology** — add an entry to `catalog.yaml` with its `kind`, what it `requires`
(pulled in automatically) and what it `conflicts_with` (reported, never auto-resolved).
A technology with no rules is valid: it resolves and is reported as uncovered.

**A rule** — new file under `rules/<layer>/`, front matter above, body in Markdown
starting at `##`. The generator adds the `# <name>` heading.

**A skill** — new directory under `skills/<id>/` with a `SKILL.md`. Write steps in
order, and end with what to report. Keep it under ~500 lines; put long reference
material in a separate file and list it in `files`.

Run `npm test` after any change: the suite loads this directory and fails on a
dangling reference, a duplicate id, an invalid range, or a layer that declares the
wrong `applies_to`.

## Vendored sources

`vendor.yaml` lists skill repositories imported wholesale. Each source is pinned to a
**full commit SHA** — a branch or tag is rejected — so the checkout is reproducible
and an upstream force-push cannot change what a previous run produced.

The commit is fetched once into `~/.cache/open-aidd/<source>/<sha>` (honouring
`XDG_CACHE_HOME`). The SHA is the cache key, so a new pin fetches into a new
directory rather than mutating the old one. **If the fetch cannot complete, the run
fails**: open-aidd never emits a partial rule set silently.

An upstream `SKILL.md` is used exactly as published — open-aidd reads its `name` and
`description` and derives everything else (`id` from the directory name, `layer` and
`priority` from the source entry). Upstream files are never edited.

Licence notices travel with the output: each generated skill carries its source repo,
commit and licence in a header comment, and `.claude/skills/THIRD-PARTY-NOTICES.md`
carries the full licence text of every source that contributed a skill.

**To update a source**, change `ref` to the new SHA in a reviewable commit, run
`npm test`, and check the diff in what gets generated. Do not point a source at a
moving branch.

**Id collisions** between a vendored skill and a local one fail the load. Rename the
local artifact rather than shadowing upstream.
