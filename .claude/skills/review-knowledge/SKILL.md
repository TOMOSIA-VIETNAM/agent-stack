---
name: review-knowledge
description: Review a contributor's change to the agent-stack knowledge base — rules, skills, commands, AGENTS.md templates, catalog.yaml or upstream.yaml — for placement, front matter, context cost, correctness and conflicts with existing content. Use when asked to review a PR, branch or diff that touches knowledge/ or templates/framework/.
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
---

Review the knowledge contribution `$ARGUMENTS`. The standard is
`.claude/rules/knowledge-content.md`; read it first, because every finding cites it or
`CLAUDE.md`. Work through the steps in order. Change no file: this is a review.

## 1. Get the change

- A PR number: `gh pr view <n> --json title,body,headRefName,baseRefName,files`, then
  `gh pr diff <n>`. Read the PR body — it should say why the content is needed.
- A branch: `git diff main...<branch> --stat`, then the full diff.
- `base..head`: use it as given. Nothing given: `git diff main...HEAD`.

List the touched files and sort them into: knowledge content, `catalog.yaml`,
`upstream.yaml` / `upstream.lock.json`, `templates/framework/`, tests, everything else.
If nothing touches `knowledge/` or `templates/framework/`, say so and stop — this skill
does not review pipeline code.

## 2. Let the machine judge what it can

Check the branch out (`gh pr checkout <n>` only if the user agreed; otherwise ask them to)
and run `npm run check`. A red suite is the first finding, quoted by its failing line —
do not hand-review what lint already rejects.

For each framework the change touches, run `npm run try -- --framework <fw>` and read the
tree it prints: every new file must land where the author meant, under the name they
meant. `npm run try -- --clean` afterwards.

## 3. Check what may not change at all

- Any touched path listed in `knowledge/upstream.lock.json` is **blocking**, unless the
  same change moves the pin through `npm run sync -- --ref <sha>` and the lock file moved
  with it. Then the review is of the upstream diff: read what the new pin brought in.
- `upstream.yaml`: the ref is a full 40-char SHA, and `license`, `license_url`,
  `copyright` are present and accurate. Content that looks copied from elsewhere without
  an entry here is **blocking**.
- `catalog.yaml`: a new `requires` or `conflicts_with` changes what every stack resolves
  to. It needs a reason in the PR, not a guess.
- A second AGENTS.md template that can match the same stack as an existing one is an
  `ambiguous-agents-md` error waiting for that stack.

## 4. Review each content file

Read every added or changed file in full, not just the hunk — the whole file is what
ships. Against the standard, check in this order:

1. **Placement** — right type for its shape, gated on the right framework, `global/`
   only if true for every framework.
2. **Front matter** — skill `name` equals its directory and carries the framework;
   `description` says what and when; no agent-stack metadata; rule `paths:` are real
   globs that match the files the rule is about.
3. **Context cost** — a rule with no `paths:` loads in every session: is it worth it?
   `SKILL.md` under ~500 lines, every sibling file referenced from it.
4. **Overlap** — `Grep` the same framework's rules and skills, and `skills/global/`, for
   the same topic. Name the file and line of any contradiction or restatement.
5. **Correctness** — verify each API, method, flag and default it names against the
   framework's documentation. Flag version-specific advice that does not state its
   version.
6. **Substance** — specific enough to act on, says why, nothing project-specific, no
   leftover `<…>` placeholders or `…` bullets.

## 5. Check the tests

New framework content needs a test in `tests/pipeline.test.ts` asserting it is selected
from `--framework` alone (see `CONTRIBUTING.md`). Missing is **major**, not blocking, when
the suite is otherwise green.

## 6. Report

One report, findings ranked most severe first, each as:

```
<file>:<line> — <blocking|major|minor|nit> — <what is wrong>. <the fix>. (<rule or CLAUDE.md section>)
```

- **blocking**: breaks an invariant or cannot ship — imported path edited, unattributed
  copy, red suite, wrong framework gate, factually wrong advice.
- **major**: ships but misleads or costs — contradiction with existing content, missing
  trigger in a description, unscoped rule that should be scoped, missing test.
- **minor**: weaker than it should be — no reason given, vague bullet, duplication.
- **nit**: wording. Only when it changes how the advice is read.

End with a one-line verdict: approve, approve after the listed fixes, or request changes.
Post nothing to GitHub unless the user asks; when they do, post the report as one
`gh pr review` comment.
