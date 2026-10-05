---
paths:
  - "database/**/*.php"
---

# Laravel Database

## Migrations

- Read the 1–2 most recent migrations/factories and follow their style (anonymous class, primary key type, index naming…).
- Create with `php artisan make:migration`. Never edit a migration that has been merged to the main branch or released; change the schema with a new migration. Only edit an unmerged migration that belongs to the change in progress.
- Write a `down()` that exactly reverses `up()`. If it cannot be reversed (data is destroyed), say why in a comment.
- Do not use Models in migrations (later changes to the Model make old migrations misbehave); for data changes use `DB::table()`.
- `->change()`: always restate every attribute you want to keep (`nullable`, `default`, `unsigned`, `comment`…); from L11, any attribute not restated is dropped. `change()` does not alter indexes; write those separately. L11+ does not need `doctrine/dbal`; L10 needs it with SQLite; L9 and earlier need it on every database.

## Column types & constraints

- Money: `decimal(p, s)` or an integer in the smallest currency unit, never `float`/`double`.
- Status/type: a `string` column plus a PHP backed enum, not the database `enum()` type: changing the list of values always needs a migration, depending on the database it may rebuild the table (SQLite always does; MySQL when inserting in the middle or removing a value), and L10 with `doctrine/dbal` cannot `change()` an enum column.
- `nullable()` only when null carries meaning; otherwise set a sensible `default()`.
- A column with a `default()` that code reads right after creation: declare the same value in the model's `$attributes` (see `laravel-conventions.md` › Models).
- Foreign keys: `foreignId()->constrained()`, with the delete behaviour chosen deliberately for the domain (`cascadeOnDelete()`, `restrictOnDelete()`, `nullOnDelete()`). Call column modifiers (`nullable()`…) before `constrained()`; `nullOnDelete()` requires a `nullable()` column.
- Design indexes for real queries (frequent filters, joins and sorts on large tables): filtering plus sorting together uses a composite index in the right column order (`index(['status', 'created_at'])`); do not add an index that duplicates the leading column of an existing one. MySQL creates an index for a `constrained()` FK automatically; PostgreSQL does not.
- Put business uniqueness constraints in the database with `unique()`; do not rely on validation alone.

## Changing tables that hold data

- Adding a column to a table with data: `nullable()` or with a `default()`. A column that must be NOT NULL with no default: add it `nullable()` → backfill → make it NOT NULL in a later migration, once the backfill has finished in production.
- Adding `unique()` to a table with data: check for duplicates first; for a new column, add it `nullable()` → backfill distinct values → add the unique index in a later migration.
- Renaming or dropping a column the code still uses: split it into steps (add the new column → code writes to both → migrate the data → code uses only the new column → drop the old one), never in a single migration.
- Large data migrations: keep them out of schema migrations and process with `chunkById()` (in a separate migration, or a command/job).
- Adding an index on a large table (or one of unknown size): note it in the PR so the team can choose when to run it. MySQL InnoDB builds indexes online; PostgreSQL `CREATE INDEX` blocks writes, and L12 has `->online()` (CONCURRENTLY; the migration needs `public $withinTransaction = false;`).

## Factories

- `definition()` produces a valid record: every NOT NULL column filled, and required relationships built with the related model's factory (`'user_id' => User::factory()`).
- Express variants as states (`->paid()`, `->cancelled()`); do not repeat attributes across tests.
- Columns with a unique index use `fake()->unique()`; composite uniqueness uses `sequence()` or derived values.
- When adding a NOT NULL column to a table, update its factory in the same change.

## Seeders

- Dev/test data uses factories and runs only in local/testing environments.
- Master data needed in production: an idempotent seeder (`updateOrCreate`, or `upsert` when the match columns have a unique/primary index), with no factories/`fake()`: `fakerphp/faker` is in `require-dev` and is absent after `composer install --no-dev`.
- Never put secrets, real passwords or real personal data in a seeder.

## Running commands

- Commands that wipe or roll back data (`migrate:fresh`, `migrate:refresh`, `migrate:reset`, `migrate:rollback`, `db:wipe`, anything with `--force`): run only against a local/testing database, confirm which database is connected with `php artisan db:show` (not by reading `.env`), and ask before running.
- The one exception that needs no asking: after writing a migration, on a local database, run `migrate` → `migrate:rollback --step=1` → `migrate` to verify `down()`.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
