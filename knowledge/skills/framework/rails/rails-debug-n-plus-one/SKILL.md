---
name: rails-debug-n-plus-one
description: Diagnose and fix slow Rails endpoints caused by repeated queries, missing indexes, or unbounded loads. Use when a page or API call is slow, when logs show repeated identical queries, or when a list view degrades as data grows.
---

Measure before changing anything. A guessed `includes` often fixes nothing and hides
the real cost.

## 1. Reproduce and measure

- Hit the endpoint with realistic data volume, not an empty development database.
- Read the development log for the request: count the queries, and group identical
  ones. A block of the same `SELECT` with different ids is an N+1.
- Note the total time and how it splits between database and view rendering.

## 2. Classify the cost

- **N+1 query** — the same query repeated per record. Fix with `includes` (separate
  queries), `preload` (always separate), or `eager_load` (one join, needed when you
  filter on the association).
- **Missing index** — one slow query. Run `EXPLAIN ANALYZE`; a sequential scan on a
  large table with a `WHERE` on an unindexed column is the cause.
- **Unbounded load** — the query returns everything. Paginate, or use `find_each`.
- **Over-fetching** — loading full records to read one column. Use `pluck` or
  `select`.
- **View cost** — the queries are fine and rendering is slow. Cache the fragment, or
  move the computation out of the template.

## 3. Fix the narrowest thing

- Add the association load where the view actually uses it, not everywhere.
- Add the index in a migration with `algorithm: :concurrently`.
- Prefer a scope on the model over repeating the fix at each call site.

## 4. Prove it

- Re-run the same request and compare the query count and the total time against the
  numbers from step 1. State both.
- Add a spec that fails on the regression — assert the query count around the call,
  or assert the endpoint's behaviour with a record count that would have triggered
  the old path.

## 5. Report

State the measured before and after, what caused the cost, and what you changed.
