---
name: nestjs-verify
description: Verify a NestJS change before opening a PR or merging - formatting, typecheck, tests, migrations, leftover debug code - using the project's own commands, then report pass/fail/skip.
disable-model-invocation: true
---

# NestJS Verify

Run the pre-PR checks. Only check and fix code. Do not deploy, and do not run a migration against a database that is not local.

## Step 0: Collect the project's commands

Do not guess commands. Take them in this order:

1. `AGENTS.md` › Commands & environment.
2. The **Project-specific** sections of `.claude/rules/nestjs-conventions.md` and `nestjs-testing.md`.
3. The CI config (`.github/workflows/*.yml`, `.gitlab-ci.yml`…): the steps CI runs are the bar.
4. `package.json` › `scripts`, and the lockfile for the package manager.
5. Whether those commands run inside a container (`docker compose exec …`, a `Makefile`).

Write the list down before running anything. A tool the project does not have is **skip**. Do not install it.

## Step 1: Determine the scope of the change

- `git status` and `git diff --name-only <base branch>...HEAD` (the base branch from CI, or ask).
- Note whether a schema file, a migration, or `package.json` changed.

## Step 2: Run the checks

Run them in order. When a step fails, fix the code, rerun that step, then continue.

| # | Check | How to run | Notes |
|---|---|---|---|
| 1 | Formatting | The project's format script, on the changed files only | Do not format the whole repo |
| 2 | Lint | The project's lint script | Add no ignore comments and do not edit the config to pass |
| 3 | Types | The project's typecheck script | `nest start` is not a typecheck |
| 4 | Related tests | The project's test script, filtered to the changed specs | |
| 5 | Full test suite | The project's test script, including e2e when CI runs it | |
| 6 | Migrations | Only when a schema or migration file changed, and only against a local database | If the database is not local, stop and ask |
| 7 | Client generation | Prisma: `prisma generate` when `schema.prisma` changed | Skip for the other libraries |
| 8 | Leftover debug code | Search the diff for `console.log`, `debugger`, and commented-out code | |
| 9 | Dependencies | Only when the lockfile changed: the package manager's audit command | Report findings; do not upgrade packages |

## Rules when fixing failures

- Fix the code so the check passes. Do not loosen tool config, skip or delete tests, or weaken assertions.
- A failure that was already present and that this change did not cause: list it, do not fix it.
- A failure that needs a product decision: stop and ask.

## Step 3: Report

```
| # | Check      | Result    | Notes                       |
|---|------------|-----------|-----------------------------|
| 2 | Lint       | pass      | 3 files                     |
| 3 | Types      | fail→pass | fixed a missing return type |
| 6 | Migrations | skip      | no schema change            |
```

Also include the commands run, files changed while verifying, pre-existing failures, and a verdict of **ready for PR** or **not ready** with the reason.
