---
name: rails-migration
description: Change a Rails database schema safely — add, backfill, rename, or drop a column or table without downtime or data loss. Use when writing a migration, planning a backfill, or splitting a destructive schema change across deploys.
---

A migration runs against production data while the old code is still serving
requests. Plan for both versions of the code running at once.

## 1. Classify the change

| Change | Safe in one deploy? |
| --- | --- |
| Add a nullable column | yes |
| Add an index | yes; on a large PostgreSQL table with `disable_ddl_transaction!`, `algorithm: :concurrently`, `if_not_exists:` and explicit `up`/`down` |
| Add a column with a default | yes on PostgreSQL 11+ / MySQL 8+, otherwise backfill separately |
| Backfill data | no — a data migration or a rake task, in batches |
| Add `null: false` | no — only after the backfill has finished |
| Rename a column | no — add, dual-write, migrate readers, drop |
| Drop a column or table | no — stop using it first, drop one deploy later |

Anything in the "no" column is a sequence of deploys. Write out the sequence before
writing the migration.

## 2. Write the migration

- One schema change per migration. Never edit a migration that has already run in a
  shared environment; write a new one.
- Name every index explicitly with `name:`.
- Make it reversible: use `change` only when Rails can invert every statement,
  otherwise write `up` and `down`.
- Never load or update records inside the migration — a long-running write holds the
  lock for the whole deploy.
- For a destructive step, add `safety_assured` (or the project's equivalent) only
  with a comment explaining why it is safe here.

## 3. Backfill separately

- Never change data in `db/migrate/`. A data change goes in `db/data_migrations/`; a
  long batched backfill is a rake task in `lib/tasks/<namespace>.rake` whose logic lives in a
  runner, `lib/task_runners/<namespace>/<name>_runner.rb`.
- Process in batches (`in_batches(of: batch_size)`, with `batch_size:` passed in by the
  rake task), and make it resumable: it must be safe to run twice.
- Log progress with `Rails.logger.info { ... }` so a half-finished run can be picked
  up.

## 4. Verify

- Run `rails db:migrate`, then `rails db:rollback`, then migrate again. A migration
  that cannot roll back is not finished.
- Check the resulting `db/schema.rb` diff: it should contain exactly the intended
  change and nothing else.
- Confirm the app boots and the affected specs pass against the new schema.

## 5. Check the diff against the rules

Run `git diff` and re-read `.claude/rules/rails-migrations.md`, plus the rule of any
other layer you touched. Fix each line that breaks one, or say why it has to.

## 6. Report

State the deploy sequence, which step this change is, and what must happen before the
next one.
