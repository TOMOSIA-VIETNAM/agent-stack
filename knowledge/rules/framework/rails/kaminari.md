---
paths:
  - "app/controllers/**/*.rb"
  - "app/services/**/*.rb"
  - "app/operations/**/*.rb"
  - "app/interactors/**/*.rb"
  - "app/views/**/*"
---

# Kaminari

Lists are paginated with the `kaminari` gem.

- Paginate every list that can grow: `.page(params[:page]).per(per_page)`.
- Bound `per_page` by config: default when absent, capped at a maximum, so a client
  cannot ask for every row at once (`Settings.pagination.per_page.default` and `.max`).
- Paginate after filtering and ordering, and order by a unique column last
  (`order(created_at: :desc, id: :desc)`), or rows repeat across pages.
- An API returns the page metadata (`current_page`, `total_pages`, `total_count`) in one
  place shared by every list endpoint. A very large table that does not need a total
  uses `without_count`.
