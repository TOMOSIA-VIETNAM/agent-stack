---
paths:
  - "db/migrate/**/*.rb"
  - "db/data_migrations/**/*.rb"
---

# Rails Migrations

- One schema change per migration. Never edit a migration that has run in any shared
  environment; write a new one.
- Reversible: `change` only when Rails can invert every statement, otherwise explicit
  `up` and `down`.
- Name every index explicitly with `name:`.
- An index whose columns are a leading prefix of another index is redundant: drop it in
  the migration that adds the wider one.
- Index on a large PostgreSQL table: `disable_ddl_transaction!`,
  `algorithm: :concurrently`, `if_not_exists:`/`if_exists:`, and explicit `up`/`down`:
  ```ruby
  class AddIndexOnArticlesPublishedAt < ActiveRecord::Migration[7.1]
    disable_ddl_transaction!

    def up
      add_index :articles, :published_at,
                name: 'index_articles_on_published_at', algorithm: :concurrently, if_not_exists: true
    end

    def down
      remove_index :articles, name: 'index_articles_on_published_at', algorithm: :concurrently, if_exists: true
    end
  end
  ```
- Data changes are separate from schema changes: never load models or update rows in
  `db/migrate/`. A small data fix goes in `db/data_migrations/`; a long batched backfill
  is a rake task.
- Back every uniqueness validation with a unique index, every required column with
  `null: false`, and every `belongs_to` with a foreign key.
- A destructive change spans deploys: add the new column, backfill in batches, switch
  the code, drop the old column in a later release. Add `null: false` only after the
  backfill has finished on production data.
