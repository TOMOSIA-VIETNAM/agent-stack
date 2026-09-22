---
description: Generate .claude rules and skills for this project from the agent-stack knowledge base
argument-hint: "[framework, e.g. rails]"
allowed-tools: Bash(node:*), Read, AskUserQuestion
---

Generate the `.claude` rules and skills for the project in the current working
directory, using the agent-stack knowledge base.

Requested framework(s): $ARGUMENTS

The CLI is the only thing that decides *what* is generated. Your job is to turn the
request into flags, relay conflicts to the user, and report the result. Never write a
rule or skill file yourself, and never invent content that the knowledge base does
not contain.

The knowledge base's global layer — 26 skills and 9 slash commands — is copied from
another repository and committed into the plugin, so generating needs no network and
fetches nothing. Never clone or download anything yourself; keeping that content
current is `npm run sync`, run by a maintainer of this plugin, not by this command.

## 1. Map the request to flags

Run `node ${CLAUDE_PLUGIN_ROOT}/dist/agent-stack.mjs catalog --json` and map each requested
framework to a catalog id. There is exactly one flag: `--framework <id>`, repeatable.

- **The catalog holds frameworks and nothing else.** There is no flag for a language,
  database, cache or deploy target, and no catalog entry for one either. A run is
  described entirely by which frameworks the project uses.
- Versions are not part of the input. Do not ask for one and do not append `@`
  anything — selection does not look at versions.
- If a requested framework has no catalog id, do not guess a substitute. The CLI exits
  65, names the near miss, and prints a table of every framework the catalog holds —
  relay that output as it is, and ask the user which they meant.
- If the user named something that is not a framework (say `postgresql`), explain that
  rules are selected per framework, and ask which framework the project uses.

## 2. Resolve and check

Run:

```
node ${CLAUDE_PLUGIN_ROOT}/dist/agent-stack.mjs resolve <flags> --json
```

Read `report.findings`. Exit code 2 means at least one error-severity finding.

- **stack-conflict / artifact-conflict** — two selected technologies are declared
  incompatible. Use AskUserQuestion, one question per conflict, with the options:
  keep the first, keep the second, or keep both. State what each choice means for the
  generated rules. Never decide this silently.
  - Keeping one: drop the other's flag and resolve again.
  - Keeping both: add `--accept-conflict <report finding's conflict id>`.
- **missing-framework** — nothing was selected. Ask which framework the project uses.
- **uncovered-technology** (warning) — the technology is valid but the knowledge base
  has no content for it yet. Report it; do not treat it as a failure.

Repeat until the resolve step exits 0.

## 3. Preview, then write

Run the generate step without `--write` first and show the user the file list:

```
node ${CLAUDE_PLUGIN_ROOT}/dist/agent-stack.mjs generate <flags> --out .
```

The output lists every file that would be created, and any stale file from a previous
run that would be removed. `CLAUDE.md` is merged, not replaced: only the block between
the `agent-stack:begin` / `agent-stack:end` markers changes.

**A file the project already has is left where it is.** The CLI compares every target
path against the previous run's manifest: a path agent-stack has never written is the
project's, so it is skipped, kept out of the manifest, and not `@`-imported into
`CLAUDE.md`. Each one is reported as an `existing-file` warning naming the path. Read
those warnings out in full — a rule the user expected may be one of them — and ask
whether they want agent-stack's version instead. Only if they say yes, re-run with
`--overwrite`, which takes over *every* such path, and say so before you do.

The CLI's own approval checklist needs a terminal, which a command run does not have,
so it never appears here. **You are the approval step.** Show the preview, wait for the
user, and run `--write` only once they have agreed. If they want to pick artifact by
artifact, tell them to run the CLI directly in their terminal:

```
node ${CLAUDE_PLUGIN_ROOT}/dist/agent-stack.mjs generate <flags> --out . --write
```

Once the user confirms, re-run the same command with `--write`.

## 4. Report

State:

- the resolved stack, marking which technologies were pulled in as dependencies,
- how many rules, skills and commands were applied,
- every warning, in full,
- the files written, grouped as rules, skills and commands,
- every path left untouched because the project already had it, and what that means:
  the project's own file is still there, and agent-stack's version was not applied,
- which selected technologies have no content in the knowledge base yet,
- that the global skills and commands come from their upstream repository at the
  pinned commit, and that `.claude/THIRD-PARTY-NOTICES.md` carries their licence.

One caveat worth stating once, if commands were written: the imported commands invoke
their skills by the upstream plugin name (`agent-skills:<skill>`), which resolves only
if the project also installs that plugin. The generated skills themselves are
unaffected.

Then stop. Do not open, summarize, or edit the generated files unless asked.
