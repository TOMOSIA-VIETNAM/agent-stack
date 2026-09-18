---
id: activerecord-conventions
name: Active Record Conventions
description: Query, migration, and data-integrity rules for Active Record.
type: rule
layer: framework
priority: 42
applies_to:
  - tech: activerecord
dependencies: [rails-conventions]
tags: [rails, database, performance]
---

## Queries

- Load associations you will render with `includes`, `preload`, or `eager_load`.
  An N+1 query in a list view is a defect, not a style preference.
- Never call a query inside a loop over records. Batch it with `where(id: ids)` or a
  join.
- Use `find_each` / `in_batches` for anything that can grow past a few thousand rows.
- Select only the columns you need for large reads (`select`, `pluck`), and use
  `exists?` instead of `present?` when you only need to know if a row is there.
- Name recurring conditions as scopes on the model instead of repeating `where`
  chains across the app.

## Integrity

- A model validation is not a constraint. Back uniqueness with a unique index and
  required columns with `null: false`.
- Add a foreign key for every `belongs_to`, and an index for every column used in a
  `where`, a join, or an `order`.
- Wrap multi-record writes in a transaction, and keep external calls (HTTP, mail,
  queue) outside it.
- Use `lock!` or `with_lock` for read-modify-write on a row that concurrent requests
  can touch; use `update_counters` or a database-side increment for counters.

## Migrations

- Migrations must be reversible: implement `up`/`down` when `change` cannot express
  the rollback.
- Split a destructive change into deploys: add the new column, backfill in batches,
  switch the code, then drop the old column in a later release.
- Never backfill a large table inside the migration that adds the column; that lock
  will outlast the deploy.
- Set `null: false` only after the backfill has completed on production data.
