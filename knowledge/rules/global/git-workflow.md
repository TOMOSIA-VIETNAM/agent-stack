---
id: git-workflow
name: Git Workflow
description: Branching, commit message, and pull request conventions.
type: rule
layer: global
priority: 12
tags: [git, process]
---

## Branches

- Branch from the default branch; never commit to it directly.
- Name branches `<type>/<short-description>`, e.g. `feat/invoice-export`,
  `fix/session-timeout`.

## Commits

- One logical change per commit. Formatting-only changes go in their own commit.
- Use Conventional Commits: `type(scope): subject`, where type is one of
  `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`.
- Write the subject in the imperative mood, under 72 characters, with no trailing
  period.
- Use the body to explain why the change was made when the reason is not obvious
  from the diff.

## Pull requests

- Keep pull requests reviewable: one concern, and small enough to read in one sitting.
- The description states what changed, why, and how it was verified.
- Do not merge with a failing pipeline or unresolved review comments.
