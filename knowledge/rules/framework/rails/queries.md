---
paths:
  - "app/models/**/*.rb"
  - "app/services/**/*.rb"
  - "app/operations/**/*.rb"
  - "app/interactors/**/*.rb"
  - "app/jobs/**/*.rb"
  - "lib/**/*.rb"
  - "app/controllers/**/*.rb"
---

# Rails Queries

- Build queries by chaining scopes. A `where` chain written twice becomes a scope.
- Preload every association the serializer, decorator or view reads: `includes`, or
  `preload`, or `eager_load` when you filter on the association. An N+1 in a list is a
  defect.
- Never run a query inside a loop over records. Batch with `where(id: ids)` or a join.
- Iterate anything that can grow past a few thousand rows with `find_each` or
  `in_batches`.
- Read only what you need: `pluck`/`select` for columns, `exists?` rather than
  `present?` to test for a row.
- Count, sum and group in SQL, in the service object or a model reader, never in a
  serializer, decorator or component; pass the result in.
- Paginate every list that can grow, after filtering and ordering. Cap the page size with
  a configured maximum so a client cannot ask for every row, and end the order on a
  unique column (`order(created_at: :desc, id: :desc)`) or rows repeat across pages.
- Read-modify-write on a row concurrent requests can touch: `with_lock`/`lock!`.
  Counters: `update_counters` or a DB-side increment, not `count += 1; save`.
