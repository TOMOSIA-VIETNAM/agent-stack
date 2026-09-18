---
description: Generate .claude rules and skills for this project from the open-aidd knowledge base
argument-hint: "[tech stack, e.g. ruby@3.3 rails@7.1 postgresql sidekiq]"
allowed-tools: Bash(node:*), Read, AskUserQuestion
---

Generate the `.claude` rules and skills for the project in the current working
directory, using the open-aidd knowledge base.

Requested stack: $ARGUMENTS

The CLI is the only thing that decides *what* is generated. Your job is to turn the
request into flags, relay conflicts to the user, and report the result. Never write a
rule or skill file yourself, and never invent content that the knowledge base does
not contain.

The knowledge base's global layer is imported from another repository, pinned to a
commit in `knowledge/vendor.yaml`. The first run on a machine fetches that commit
into `~/.cache/open-aidd`; later runs reuse it. Exit code 66 means the fetch failed —
report the CLI's message as-is and stop. Do not fall back to generating without those
skills, and do not fetch the repository yourself.

## 1. Map the request to flags

Run `node ${CLAUDE_PLUGIN_ROOT}/dist/aidd.mjs catalog --json` and map each requested
technology to a catalog id. Every flag is `--<slot> <id>[@<version>]`, where slot is
one of: language, framework, frontend, database, cache, testing, infrastructure,
architecture, library.

- Use the `kind` from the catalog as the slot.
- If a requested technology has no catalog id, do not guess a substitute: list the
  closest ids from the catalog and ask the user which they meant.
- If the user gave no version for a language or framework, ask for it — version
  ranges decide which rules apply, and an unpinned version silently drops them.
- Dependencies are resolved by the CLI. Do not add `--library activerecord` or
  `--infrastructure docker` yourself because something implies them.

## 2. Resolve and check

Run:

```
node ${CLAUDE_PLUGIN_ROOT}/dist/aidd.mjs resolve <flags> --json
```

Read `report.findings`. Exit code 2 means at least one error-severity finding.

- **stack-conflict / artifact-conflict** — two selected technologies are declared
  incompatible. Use AskUserQuestion, one question per conflict, with the options:
  keep the first, keep the second, or keep both. State what each choice means for the
  generated rules. Never decide this silently.
  - Keeping one: drop the other's flag and resolve again.
  - Keeping both: add `--accept-conflict <report finding's conflict id>`.
- **missing-version** — ask the user for the version and add it to the flag.
- **missing-language** — ask which language the project uses.
- **uncovered-technology** (warning) — the technology is valid but the knowledge base
  has no content for it yet. Report it; do not treat it as a failure.

Repeat until the resolve step exits 0.

## 3. Preview, then write

Run the generate step without `--write` first and show the user the file list:

```
node ${CLAUDE_PLUGIN_ROOT}/dist/aidd.mjs generate <flags> --out . 
```

The output lists every file that would be created or overwritten, and any stale file
from a previous run that would be removed. `CLAUDE.md` is merged, not replaced: only
the block between the `aidd:begin` / `aidd:end` markers changes.

If the target directory already has a `.claude/rules` or `.claude/skills` directory
that open-aidd did not generate (no `.claude/aidd-manifest.json`), say so and ask
before continuing — those files will be overwritten.

Once the user confirms, re-run the same command with `--write`.

## 4. Report

State:

- the resolved stack, marking which technologies were pulled in as dependencies,
- how many rules and skills were applied,
- every warning, in full,
- the files written,
- which selected technologies have no content in the knowledge base yet,
- that the global skills are imported from their upstream repository at the pinned
  commit, and that `.claude/skills/THIRD-PARTY-NOTICES.md` carries their licence.

Then stop. Do not open, summarize, or edit the generated files unless asked.
