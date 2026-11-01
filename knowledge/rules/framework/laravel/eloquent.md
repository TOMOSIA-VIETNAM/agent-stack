---
paths:
  - "app/Models/**/*.php"
  - "app/Observers/**/*.php"
  - "app/Enums/**/*.php"
---

# Laravel Eloquent

- Declare mass-assignable attributes explicitly, the way existing models do (`$fillable`, or `#[Fillable([...])]` on L13+); never `$guarded = []`. Hide serialised secrets the same way (`$hidden`, or `#[Hidden]` on L13+).
- Cast dates, booleans, JSON and enums completely, in the form existing models use (`casts()` method or `$casts`). Do not convert existing models from one form to the other.
- Status/type columns cast to a backed enum (in `app/Enums`); compare against enum cases, never magic strings.
- Declare relationship return types (`BelongsTo`, `HasMany`…). Pass the foreign key explicitly when it breaks the `{relationship}_id` convention.
- A column with a database default holds `null` on a fresh `create()`/`new` model until it is reloaded. If code reads it right away (an API resource, an enum cast), declare the same value in `$attributes`, or `->refresh()`.
- Secrets that must be read back (third-party tokens) use the `encrypted` cast and stay hidden; the column is `text` and cannot be queried with `where`. Passwords use the `hashed` cast, never `encrypted`.
- Accessors/mutators use the `Attribute::make(get:, set:)` form unless the model already uses `getXxxAttribute()`.
- Business filters are local scopes; add a global scope only for a constraint every query must have (tenant, soft delete), because it silently changes every query, including in admin tools and jobs.
- Observers and model events run only for model operations: a query-builder `update()`/`delete()` skips them. Keep observers small; side effects that call external services are queued and run after commit.
- Do not touch the database or the container in a model's constructor or `booted()` beyond registering events.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
