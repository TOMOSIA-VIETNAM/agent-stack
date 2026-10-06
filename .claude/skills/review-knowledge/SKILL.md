---
name: review-knowledge
description: Review a contribution to the agent-stack knowledge base — a PR, branch or diff touching knowledge/ or templates/framework/ — for placement, front matter, trigger quality, context cost, correctness and conflicts with existing content, scoring each skill and command on an eight-criterion card. Use when asked to review a knowledge PR, or to audit whether a contributed rule, skill or command is ready to ship.
argument-hint: <pr-number | branch | base..head>
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(gh pr view *)
  - Bash(gh pr diff *)
  - Bash(npm run check)
  - Bash(npm run try *)
  - Bash(node ${CLAUDE_SKILL_DIR}/scripts/frontmatter.mjs *)
effort: medium
---

Review the knowledge contribution `$ARGUMENTS`. The standard is
`.claude/rules/knowledge-content.md`; read it first, because every finding cites it or
`CLAUDE.md`. Work through the steps in order, and do not start a step before the one
above it is done. Change no file: this is a review.

## 1. Get the change

- A PR number: `gh pr view <n> --json title,body,headRefName,baseRefName,files`, then
  `gh pr diff <n>`. Read the body — it should say why the content is needed, and for a
  skill, carry its trigger prompts (step 5).
- A branch: `git diff main...<branch> --stat`, then the full diff.
- `base..head`: use it as given. Nothing given: `git diff main...HEAD`.

Sort the touched files into: rules, skills, commands, AGENTS.md templates, `catalog.yaml`,
`upstream.yaml` / `upstream.lock.json`, `templates/framework/`, tests, everything else.
Nothing under `knowledge/` or `templates/framework/`: say so and stop — this skill does
not review pipeline code.

**Done when:** every touched file sits in exactly one group.

## 2. Let the machine judge what it can

Ask the user to check the branch out if it is not (`gh pr checkout <n>`), then run
`npm run check`. A red suite is the first finding, quoted by its failing line — do not
hand-review what lint already rejects.

For every touched skill and command, run
`node ${CLAUDE_SKILL_DIR}/scripts/frontmatter.mjs <files>`. It reports what Claude Code
fails on silently: YAML that does not parse, unknown fields, a description over the
listing cap, `name` differing from the directory, an unscoped `Bash` pre-approval.

For each framework the change touches, run `npm run try -- --framework <fw>` and read the
tree it prints: every new file lands where the author meant, under the name they meant.
`npm run try -- --clean` afterwards.

**Done when:** the suite result, the script output and each framework's tree are in hand.

## 3. Check what may not change at all

- A touched path listed in `knowledge/upstream.lock.json` is **blocking**, unless the
  same change moves the pin with `npm run sync -- --ref <sha>` and the lock file moved
  with it. Then the review is of the upstream diff the new pin brought in.
- `upstream.yaml`: the ref is a full 40-char SHA, and `license`, `license_url`,
  `copyright` are present and accurate. Content that looks copied from elsewhere without
  an entry here is **blocking** — so is content under a licence whose terms the manifest
  cannot meet.
- `catalog.yaml`: a new `requires` or `conflicts_with` changes what every stack resolves
  to. It needs a reason in the PR, not a guess.
- A second AGENTS.md template able to match the same stack as an existing one is an
  `ambiguous-agents-md` error waiting for that stack.

**Done when:** each item above is either cleared or written down as a finding.

## 4. Review each content file

Read every added or changed file in full, not just the hunk — the whole file is what
ships. Against the standard, in this order:

1. **Placement** — right type for its shape, gated on the right framework, `global/`
   only if true for every framework.
2. **Context cost** — a rule with no `paths:` loads in every session: is it worth it?
   `paths:` globs match the files the rule is about. `SKILL.md` under ~500 lines.
3. **Overlap** — `Grep` the same framework's rules and skills, and `skills/global/`, for
   the same topic. Name the file and line of any contradiction or restatement.
4. **Correctness** — verify each API, method, flag and default it names against the
   framework's documentation. Flag version-specific advice that does not state its
   version.
5. **Substance** — specific enough to act on, says why, nothing project-specific, no
   leftover `<…>` placeholders or `…` bullets.

**Done when:** every content file has been read in full and has its findings, or "none".

## 5. Score each skill and command

Only when the change adds or edits a `SKILL.md` or a command: read
`${CLAUDE_SKILL_DIR}/references/skill-scorecard.md` and fill one card per file. Award a
routing point only for a run the PR records; when it records none, score 0 and write out
what the author should run.

**Done when:** every touched skill and command has a card whose lost points each carry a
reason.

## 6. Check the tests

New framework content needs a test in `tests/pipeline.test.ts` asserting it is selected
from `--framework` alone (see `CONTRIBUTING.md`). Missing is **major**, not blocking, when
the suite is otherwise green.

**Done when:** the test is found, or its absence is a finding.

## 7. Report

One report: the cards from step 5 first, each with its `keep` line and, when the trigger
lost a point, a suggested description written out in full. Then every finding ranked most
severe first, each as:

```
<file>:<line> — <blocking|major|minor|nit> — <what is wrong>. <the fix>. (<rule or CLAUDE.md section>)
```

- **blocking**: breaks an invariant or cannot ship — imported path edited, unattributed
  copy, red suite, YAML that does not parse, wrong framework gate, factually wrong advice,
  a missing file the skill depends on.
- **major**: ships but misleads or costs — contradiction with existing content, a trigger
  that collides with another skill, a description with no trigger, unscoped `Bash`, an
  unscoped rule that should be scoped, authoring material in a skill directory, a
  side-effecting skill Claude may invoke on its own, missing test.
- **minor**: weaker than it should be — no reason given, vague bullet, duplication, a
  step with no ending condition, an `effort` mismatch, no routing evidence.
- **nit**: wording. Only when it changes how the advice is read.

A clean contribution gets a clean report — no findings are invented to fill one.

End with a count line — `N blocking · N major · N minor · N nit` — and a one-line verdict:
approve, approve after the listed fixes, or request changes. Post nothing to GitHub unless
the user asks; when they do, post the report as one `gh pr review` comment.

**Done when:** every finding from steps 2–6 appears once, and the count line matches.
