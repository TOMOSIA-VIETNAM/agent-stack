---
paths:
  - "app/models/**/*.rb"
  - "app/services/**/*.rb"
  - "app/operations/**/*.rb"
  - "app/interactors/**/*.rb"
---

# Rails Search, Filter and Sort

## Always

- Filters and sort keys from params go through a whitelist. Never pass a params value
  into `where`, `order` or a column name: arbitrary predicates leak hidden columns and
  open SQL injection.
- Search on a relation already scoped to the actor and tenant, never on `Model.all`.
- Filter, sort and page params are input: permit them with their shape
  (`params.permit(q: %i[title_cont])`), so a string where a hash belongs is dropped
  instead of raising, and coerce `page`/`per_page` to integers before capping them.
- Paginate the result (see `rails-queries.md`).
- Use the project's search mechanism (a gem, or query objects); do not add a second one.

## Ransack

Applies only when the `Gemfile` includes `ransack`.

- Search with `scope.ransack(q).result`; add `distinct: true` only when the search can
  join a `has_many` association and repeat rows.
- `ApplicationRecord` returns nothing from `ransackable_attributes` and
  `ransackable_associations`; each searchable model overrides them with the exact
  columns and associations. Ransack 4+ raises when a searched model does not define them.
- A computed filter is a `ransacker` declared in the model, not a hand-built `where` in
  the service.
- Sorts (`q[s]`) go through the same whitelist.
