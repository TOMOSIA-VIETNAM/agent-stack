---
paths:
  - "app/**/*.php"
---

# Laravel Queries, Transactions & Cache

## Queries

- Eager load (`with()`/`load()`) relationships read in a loop. Turn on `Model::preventLazyLoading()` only when asked: enabling it globally can break existing code and tests.
- Lists that grow with the data are paginated; return everything only for a small fixed set (master data). Process large sets with `chunkById()`/`lazyById()`, never `->get()` on a whole table.
- Paginated queries have an explicit `orderBy`; when the column is not unique (`created_at`, `name`), add `->orderBy('id')` so pages neither repeat nor skip rows.
- When selecting columns (`select()`, `with('author:id,name')`), keep the primary key and every foreign key a relationship needs; without them the relationship silently comes back `null`/empty.
- Count or test existence in SQL (`count()`, `exists()`, `withCount()`/`withSum()`/`withExists()`), not by loading a collection.
- Query-builder `update()`/`delete()` (including `whereIn()->delete()`, `toQuery()`) is one SQL statement: no model events, observers, casts or model-level soft deletes. Iterate models (`chunkById()` + `$model->update()`) when you need them.

## Transactions & concurrency

- An operation writing to ≥2 tables runs in `DB::transaction()`. No outbound HTTP inside a transaction: it holds locks for the length of the call.
- Read-modify-write on a row concurrent requests can touch (balance, stock, status): `lockForUpdate()` inside the transaction. Counters use `increment()`/`decrement()` (atomic in SQL), not read + `save()`.
- Async work dispatched inside a transaction runs after commit, unless the connection sets `'after_commit' => true`:
  - Job: `XJob::dispatch(...)->afterCommit()`
  - Queued Mail/Notification: `(new X(...))->afterCommit()`
  - Event: the class implements `ShouldDispatchAfterCommit` (events have no `afterCommit()`)
  - Queued listener: implements `ShouldQueueAfterCommit`

## Cache

- Read with `Cache::remember()`/`rememberForever()`, not `get()` + truthiness check (a cached `0`/`false` reads as a miss). Use `Cache::flexible()` when serving slightly stale data while refreshing is acceptable.
- Conditional writes use `Cache::add()` (atomic), not `has()` then `put()`. Deduplication not tied to a row uses `Cache::lock()` (the store must support locks).
- Every cached value has a TTL and a known invalidation point (the write that changes it); build keys from a fixed prefix plus IDs, never from raw user input.
- `Cache::tags()` only when the store supports tags in every environment (Redis, Memcached); on `file`/`database`/`dynamodb` it throws.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
