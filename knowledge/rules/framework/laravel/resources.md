---
paths:
  - "app/Http/Resources/**/*.php"
  - "routes/api.php"
  - "routes/api/**/*.php"
---

# Laravel API Resources

- Return data through an API resource (or the project's format), never a Model or `toArray()` directly: a new column would leak to clients the moment it is added.
- `{Model}Resource` with `::collection()` for lists; create a `{Model}Collection` only when it needs its own meta.
- Expose only fields the client needs; never internal flags, hashes, tokens, or foreign keys the client cannot use.
- Inside an API resource, read relationships with `$this->whenLoaded('relation')` and counts with `$this->whenCounted('relation')`; `$this->relation` lazy-loads one query per row.
- Conditional fields use `$this->when($condition, $value)`/`mergeWhen()`, not `if` blocks that change the shape of the array.
- Dates go out in one format (ISO 8601 via `->toIso8601String()` or the project's choice); enums as their backing value, not the case name.
- Status codes: 201 for create (`->response()->setStatusCode(201)` or `response()->json(..., 201)`), 204 for delete with no body, 422 for validation (the framework's), business errors through the project's exceptions. Follow what existing endpoints return.
- Paginated lists return a resource collection built from the paginator so `links`/`meta` stay consistent; do not hand-build pagination arrays. Use `cursorPaginate()` for infinite scroll over large, append-only tables.
- API routes always answer errors in JSON, even when the client omits `Accept: application/json`; check `shouldRenderJsonWhen` in `bootstrap/app.php` before adding per-controller handling.
- Breaking a response shape a client already uses needs a new version (route prefix or the project's scheme); adding a field does not.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
