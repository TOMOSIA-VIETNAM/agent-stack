---
paths:
  - "app/**/*.rb"
  - "lib/**/*.rb"
---

# Rails Performance

Query rules (N+1, batching, `pluck`, pagination) are in `rails-queries.md`. This file
covers the rest.

## Loading

- `includes` by default. `preload` for several `has_many` or a large set. `eager_load`
  only to filter or sort on the association, and never with several `has_many`: the
  join multiplies rows.
- List endpoints select only the columns they render (`select(...)`, or a named scope).
- After `includes`, count with `size`, not `count`, which runs a new query.
- Never `association.count` per record in a list. One grouped count per page
  (`where(id: ids).group(...).count`) is fine; move to a `counter_cache` (or a counter
  table) when that grouped count is measured slow.

## Work out of the request

- Move heavy work to a job: PDF, zip, bulk email, bulk generation, slow external calls.
  Pass ids, not records.
- Build large exports with `find_each` and stream them, or generate them in a job.
  Never hold the whole file in memory.
- Queue complex reports instead of computing them in the request.

## Caching

- Cache an expensive read with `Rails.cache.fetch(key, expires_in:)`. The key includes
  the owning record's id (or `cache_key_with_version`), and the expiry comes from config.
- Invalidate by key change or `touch`, not by hunting down keys to delete.

## Logging and checks

- Log with the block form, `Rails.logger.debug { ... }`, so the message is not built
  when the level is off.
- Use `bullet` in development, when the project has it, to catch N+1 queries.
- Measure before and after a performance change (query count, response time) and state
  both numbers.
