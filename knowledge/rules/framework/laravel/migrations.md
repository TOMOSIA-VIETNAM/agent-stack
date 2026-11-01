---
paths:
  - "database/migrations/**/*.php"
---

# Laravel Migrations

## Writing

- Read the 1–2 most recent migrations and follow their style (anonymous class, primary key type, index naming).
- Create with `php artisan make:migration`. Never edit a migration merged to the main branch or released; change the schema with a new one. Edit only an unmerged migration that belongs to the change in progress.
- `down()` exactly reverses `up()`. If it cannot (data is destroyed), say why in a comment.
- No Models in migrations: later changes to the Model make old migrations misbehave. Data changes use `DB::table()`.
- `->change()` restates every attribute to keep (`nullable`, `default`, `unsigned`, `comment`…); an attribute not restated is dropped. `change()` does not touch indexes; write those separately.

## Column types & constraints

- Money: `decimal(p, s)` or an integer in the smallest currency unit, never `float`/`double`.
- Status/type: a `string` column plus a PHP backed enum, not the database `enum()` type: changing its values always needs a migration and may rebuild the table (SQLite always; MySQL when inserting in the middle or removing a value).
- `nullable()` only when null carries meaning; otherwise a sensible `default()`. A default that code reads right after creation is also declared in the model's `$attributes` (see `laravel-eloquent.md`).
- Foreign keys: `foreignId()->constrained()` with the delete behaviour chosen for the domain (`cascadeOnDelete()`, `restrictOnDelete()`, `nullOnDelete()`). Modifiers (`nullable()`…) go before `constrained()`; `nullOnDelete()` needs a nullable column.
- Index for real queries: filter + sort together uses a composite index in that order (`index(['status', 'created_at'])`); do not add an index duplicating the leading column of another. MySQL indexes a `constrained()` FK automatically; PostgreSQL does not.
- Business uniqueness lives in the database with `unique()`, not in validation alone.

## Tables that hold data

- New column: `nullable()` or with a `default()`. NOT NULL with no default: add it nullable → backfill → make it NOT NULL in a later migration, after the backfill finished in production.
- New `unique()`: check for duplicates first; for a new column, add it nullable → backfill distinct values → add the unique index later.
- Renaming or dropping a column the code still uses is several releases (add new → write both → migrate data → read new → drop old), never one migration.
- Large data changes stay out of schema migrations and process with `chunkById()` (a separate migration, command or job).
- An index on a large or unknown-size table is noted in the PR so the team can schedule it. MySQL InnoDB builds indexes online; on PostgreSQL/SQL Server use `->online()`, and on PostgreSQL the migration sets `public $withinTransaction = false;` (CONCURRENTLY cannot run in a transaction).

## Running

- `migrate:fresh`, `migrate:refresh`, `migrate:reset`, `migrate:rollback`, `db:wipe`, or anything with `--force`: only against a local/testing database, confirmed with `php artisan db:show` (not by reading `.env`), and only after asking.
- The one exception that needs no asking: after writing a migration, on a local database, run `migrate` → `migrate:rollback --step=1` → `migrate` to verify `down()`.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
