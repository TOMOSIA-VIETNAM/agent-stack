---
paths:
  - "database/seeders/**/*.php"
---

# Laravel Seeders

- Dev/test data uses factories and runs only in local/testing environments.
- Master data production needs is an idempotent seeder (`updateOrCreate`, or `upsert` when the match columns have a unique/primary index) with no factories or `fake()`: `fakerphp/faker` is in `require-dev` and absent after `composer install --no-dev`.
- Never put secrets, real passwords or real personal data in a seeder.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
