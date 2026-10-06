---
name: laravel-migration
description: Change the database schema of a Laravel project safely - create tables, add/change/drop columns, indexes, foreign keys - and update the related model, factory, validation, Resource and tests. Use when asked to add/change/drop a column, table, index, foreign key, or migration.
---

# Laravel Migration

The procedure for a schema change and every file it affects. The detailed rules live in `.claude/rules/laravel-database.md`; they are not repeated here.

## Step 0: Read the context

1. Read `.claude/rules/laravel-database.md` and `laravel-conventions.md` (the Models and Laravel naming sections), including their **Project-specific** sections.
2. Check the connected database: `php artisan db:show` (do not read `.env`). Note the engine (MySQL/PostgreSQL/SQLite), because what is safe differs between them. If the command reports that `doctrine/dbal` is missing (L10 and earlier), use `php artisan tinker --execute="echo DB::connection()->getDriverName().' '.DB::connection()->getDatabaseName();"` instead; do not install the package yourself.
3. Read the 1–2 most recent migrations in `database/migrations/` and follow their style (anonymous class, primary key type, index naming).
4. If the affected table already exists:
   - Read its current schema: `php artisan db:table <table>`, or the migration that created it plus every later migration that altered it.
   - Find where the table/columns are used: model, `$fillable`/casts, factory, FormRequest, Resource, queries (`grep` for the column name).

## Step 1: Classify the change

| Kind | Approach |
|---|---|
| New table | 1 migration, continue to Step 2 |
| Add a nullable column, or one with a default | 1 migration |
| Add a NOT NULL column with no default to a table with data | Multi-step: add it `nullable()` → backfill → a later migration makes it NOT NULL |
| Rename / drop / change the type of a column the code uses | Multi-step (expand/contract), one PR/release per step |
| Add an index on a large table, or one of unknown size | 1 migration + a note in the PR so the team can choose when to run it |

For a multi-step change: present the plan for every step and ask for confirmation before writing anything. Do only the first step this time, unless asked otherwise.

## Step 2: Write the migration

- Create it with `php artisan make:migration <descriptive_snake_case_name>`.
- Follow `laravel-database.md`: column types, `nullable`/`default`, foreign keys with delete behaviour chosen for the domain, indexes for filter/join/sort columns, `unique()` for business constraints.
- `down()` exactly reverses `up()`. If it cannot be reversed, say why in a comment.
- Backfilling data: `DB::table()` with `chunkById()`, not Models; keep large data migrations out of the schema migration.
- Never edit a migration that has been merged to the main branch.

## Step 3: Update related files

Go through the list, skipping what does not apply:

| File | What to do |
|---|---|
| Model | `$fillable`, casts (dates, booleans, JSON, enums) the way the model already declares them; new relationships with return types |
| Enum | New status/type column: a backed enum (`php artisan make:enum` from L11) |
| Factory | New NOT NULL columns get a value in `definition()`; states for variants; relationships through the related model's factory |
| FormRequest | Rules for columns the client may send |
| Resource | Add the fields the client needs; expose no internal fields |
| Seeder | Only when master data is needed for the new column (idempotent) |
| Queries, scopes, code using the old column | Renamed/dropped column: update every usage found in Step 0 |

## Step 4: Verify

1. Confirm the database is local/testing (`php artisan db:show`). If it is not, stop and ask.
2. Run `php artisan migrate` → `php artisan migrate:rollback --step=1` → `php artisan migrate`. All three must succeed.
3. Review the schema: `php artisan db:table <table>`.
4. Run the tests related to the changed model/table (`--filter`), then the full suite (see `laravel-testing.md` › Running tests).
5. Add or update tests when behaviour changes (unique constraints, enum casts, a new column in the response).

## Step 5: Report

- The migration created and a summary of the schema change
- Related files updated
- Results of migrate/rollback/migrate and of the tests
- Production risks: table locks, backfill duration, next steps for a multi-step change
