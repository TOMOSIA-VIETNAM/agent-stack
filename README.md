# open-aidd

Generate a project's `.claude` rules and skills from a curated, version-controlled
knowledge base — by **selecting** existing content, never by writing new content with
an LLM.

Phase 1 of `idea.md`: the whole pipeline is deterministic. The model's only jobs are
turning a request into flags and asking the operator to decide a conflict.

```
Select  →  Resolve  →  Compose  →  Validate
```

## Install

```
/plugin marketplace add /path/to/open-aidd
/plugin install open-aidd@open-aidd
```

The repository is both the marketplace and the plugin.

`dist/aidd.mjs` is committed, so the plugin runs on any machine with Node 20+ and no
`npm install`.

## Use

In the project you want configured:

```
/aidd-generate ruby 3.3, rails 7.1, postgres, sidekiq, rspec
/aidd-catalog
```

The command maps the request to catalog ids, resolves dependencies, stops on any
conflict to ask you, previews the file list, and only then writes.

### Under the command

```bash
node dist/aidd.mjs catalog  [--json]
node dist/aidd.mjs resolve  --language ruby@3.3 --framework rails@7.1 [--json]
node dist/aidd.mjs generate --language ruby@3.3 --framework rails@7.1 --out . [--write]
```

Slots: `--language --framework --frontend --database --cache --testing
--infrastructure --architecture --library`, each repeatable, each taking
`tech` or `tech@version`.

Exit codes: `0` ok · `2` validation errors · `64` bad usage · `65` unknown technology.

## Output

```
CLAUDE.md                        @-imports, inside aidd:begin/end markers
.claude/rules/NN-<id>.md         one file per selected rule, priority-ordered
.claude/skills/<id>/SKILL.md     one directory per selected skill, with its files
.claude/commands/<id>.md         one file per selected command
.claude/THIRD-PARTY-NOTICES.md   licences of the imported content
.claude/aidd-manifest.json       what this run generated
```

`CLAUDE.md` is merged, never replaced: text outside the markers is left alone. On a
re-run, files listed in the previous manifest that are no longer selected are removed
— and nothing else is ever deleted.

## Knowledge base

`knowledge/` is the product. See [knowledge/README.md](knowledge/README.md) for the
metadata schema and how to add a rule, a skill, or a technology.

```
knowledge/
├── catalog.yaml            technology graph: requires / conflicts_with / versions
├── upstream.yaml           where imported content came from, pinned to a commit
├── licenses/               licence texts of imported content
├── rules/<layer>/<id>.md
├── skills/<layer>/<id>/SKILL.md
└── commands/<id>.md
```

The directory decides the layer; the file or directory name decides the id.

Coverage is split:

- **Layer 1, global** — 25 skills and 9 commands copied from
  [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT) at the
  commit pinned in `upstream.yaml`. They are committed here, so generating needs no
  network. `npm run sync` re-copies them; see
  [knowledge/README.md](knowledge/README.md#imported-content).
- **Layers 2 and 3** — authored here: Ruby, Rails, Active Record, RSpec.

Every other technology in `catalog.yaml` resolves and conflict-checks correctly but
has no content yet; the validator reports each one as `uncovered-technology`.

## Develop

```bash
npm install
npm run check      # typecheck + tests + bundle
npm run sync       # re-copy imported content at the pinned commit
```

Commit `dist/aidd.mjs` with any change to `src/`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), the [Code of Conduct](CODE_OF_CONDUCT.md), and
[SECURITY.md](SECURITY.md) for reporting a vulnerability privately.

## Licence

[Apache-2.0](LICENSE), Copyright 2026 TOMOSIA VIETNAM.

Content under `knowledge/` copied from other projects keeps its own licence; see
[NOTICE](NOTICE) and `knowledge/licenses/`.

## Not in this phase

Natural-language stack input (phase 2) and full project bootstrap with OpenSpec and
multi-tool output (phase 3). The CLI is already the seam both would plug into.
