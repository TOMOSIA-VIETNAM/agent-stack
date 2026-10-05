---
name: laravel-verify
description: Verify a Laravel change before opening a PR or merging - formatting, static analysis, tests, coverage, migrations, leftover debug code - using the project's own commands, then report pass/fail/skip.
disable-model-invocation: true
---

# Laravel Verify

Run the pre-PR checks. Only check and fix code; do not deploy, and do not run cache commands (`config:cache`, `route:cache`, `optimize`).

## Step 0: Collect the project's commands

Do not guess commands. Take them in this order of precedence:

1. `AGENTS.md` › Commands & environment.
2. The **Project-specific** sections of `.claude/rules/laravel-conventions.md` and `laravel-testing.md`.
3. The CI config (`.github/workflows/*.yml`, `.gitlab-ci.yml`…): the steps CI runs are the bar to meet.
4. `composer.json` › `scripts` (`lint`, `analyse`, `test`…) and `require-dev` (whether Pint, PHP-CS-Fixer, PHPStan/Larastan, Psalm, Pest are present).
5. The runtime: whether commands are wrapped in Docker/Sail (`docker compose exec …`, `./vendor/bin/sail …`).

Write down the list of commands before running them. A tool the project does not have is marked **skip**; do not install it.

## Step 1: Determine the scope of the change

- `git status` and `git diff --name-only <base branch>...HEAD` (take the base branch from CI, or ask).
- Note: which PHP files changed, whether `database/` is touched, whether `composer.json`/`composer.lock` is touched.

## Step 2: Run the checks

Run them in order. When a step fails: fix the code, rerun that step, and only then move on.

| # | Check | How to run | Notes |
|---|---|---|---|
| 1 | Composer | `composer validate --no-check-publish` | Only when `composer.json` is touched |
| 2 | Formatting | The project's script; if none, Pint/PHP-CS-Fixer on the **changed files** (`pint --dirty`, or pass the file list) | Do not format the whole repo |
| 3 | Static analysis | The project's script/config (existing level and baseline) | Add no ignores, do not create/edit the baseline, do not lower the level |
| 4 | Related tests | The project's test command + `--filter` for the tests of the changed code | |
| 5 | Full test suite | The project's test command | |
| 6 | Coverage | Only when CI enforces a threshold: run CI's exact command and threshold | Needs PCOV/Xdebug; without them, skip and say so |
| 7 | Migrations | Only when `database/migrations` is touched: confirm a local database (`php artisan db:show`), then `migrate` → `migrate:rollback --step=1` → `migrate` | If the database is not local, stop and ask |
| 8 | Leftover debug code | Search the diff for `dd(`, `dump(`, `ray(`, `var_dump(`, `->dump()`, commented-out code | |
| 9 | Dependencies | Only when `composer.lock` is touched: `composer audit` | Report findings; do not upgrade packages yourself |

## Rules when fixing failures

- Fix the code to pass the check; do not loosen tool config, skip or delete tests, or weaken assertions (see `laravel-testing.md` › Running tests).
- Pre-existing failures not caused by this change: do not fix them; list them in the report.
- Failures that need a business decision, or a large fix outside the scope: stop and ask.

## Step 3: Report

```
| # | Check           | Result    | Notes                            |
|---|-----------------|-----------|----------------------------------|
| 2 | Formatting      | pass      | 3 files                          |
| 3 | Static analysis | fail→pass | fixed 2 type errors in OrderService |
| 6 | Coverage        | skip      | CI has no threshold              |
```

Also include:
- The commands run (verbatim)
- Files changed during verification
- Pre-existing failures (not part of this change)
- Verdict: **ready for PR** or **not ready**, with the reason
