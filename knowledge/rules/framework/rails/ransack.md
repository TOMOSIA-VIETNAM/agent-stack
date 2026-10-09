---
paths:
  - "app/models/**/*.rb"
  - "app/services/**/*.rb"
  - "app/operations/**/*.rb"
  - "app/interactors/**/*.rb"
---

# Ransack

List filtering and sorting go through the `ransack` gem.

- Search with `Model.ransack(params[:q]).result(distinct: true)`, on a relation already
  scoped to the actor (`current_user.articles.ransack(...)`).
- Whitelist explicitly. `ApplicationRecord` returns nothing from
  `ransackable_attributes` and `ransackable_associations`; each searchable model
  overrides them with the exact columns and associations. An open whitelist lets a
  client filter on any column, including secrets.
- A computed filter is a `ransacker` declared in the model, not a hand-built `where` in
  the service.
- Sort keys go through the same whitelist; never pass a raw `order` from params.
