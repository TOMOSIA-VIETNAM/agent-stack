---
paths:
  - "app/models/**/*.rb"
  - "db/migrate/**/*.rb"
---

# Soft Delete

Applies only when the `Gemfile` includes `paranoia`; otherwise ignore this file.

Records that must stay recoverable are soft-deleted with `acts_as_paranoid` (the
`paranoia` gem).

- Declare `acts_as_paranoid` in the model and add an indexed `deleted_at` column.
- `destroy` sets `deleted_at`; default scopes hide those rows. Reach them only on
  purpose, with `with_deleted` or `only_deleted`.
- A unique index on a soft-deleted table must account for deleted rows: include
  `deleted_at`, or use a partial index `where: 'deleted_at IS NULL'`. Otherwise a deleted
  row blocks re-creating the same value.
- `really_destroy!` deletes for good. Use it only where data must be erased.
- Dependent records of a soft-deleted parent are soft-deleted too
  (`dependent: :destroy` on paranoid children), or the children outlive their parent.
