---
paths:
  - "app/**/*.php"
  - "routes/**/*.php"
  - "bootstrap/app.php"
---

# Laravel Patterns

## Order of precedence

1. `AGENTS.md` and the **Project-specific** section at the end of each rule file in `.claude/rules/laravel-*.md`.
2. Patterns already in the code: before creating a new class, read the 2–3 nearest files of the same kind and follow them (directory, naming, which layer holds the logic, response format).
3. The general rules in `.claude/rules/laravel-*.md`.

Do not introduce a new layer or directory (Service, Action, Repository, DTO, Module…) the project does not already have, unless explicitly asked. Do not mix two styles for the same job.

## Versions

- Check the Laravel/PHP version before using a newer API or syntax. `composer.json` holds only a constraint (`^11.0`); for an API added in a minor release, check the installed version with `composer show laravel/framework` or `composer.lock`.
- Follow the structure of the files that exist, not the version number: an app upgraded from L10 to L11+ may keep the old structure. If `app/Http/Kernel.php`/`app/Exceptions/Handler.php` exist, configure middleware/exceptions there; if not, use `withMiddleware()`/`withExceptions()` in `bootstrap/app.php`.

## Requests & controllers

- Validate with a FormRequest (or whatever the project uses). Use only validated data (`$request->validated()`); never `$request->all()` for create/update.
- No business logic in route closures or Blade. If the project has a business layer (Service, Action…), the controller only takes the request → calls that layer → returns the response; if it has none, write it like the existing controllers.
- Authorize with a Policy/Gate or middleware; never skip authorization on a new endpoint.
- Records fetched by an ID from the request must be scoped to the current user: through a relationship (`$request->user()->orders()->findOrFail($id)`), a Policy after route model binding, or `scopeBindings()` for nested routes. Route model binding alone does not check ownership (an IDOR vulnerability).
- APIs return data through an API Resource (or the project's format), never a Model directly. Inside a Resource, access relationships with `$this->whenLoaded('relation')`, not `$this->relation` (which lazy-loads and causes N+1 queries).
- Structured data passed through several layers: use a DTO if the project already has them (same directory, same kind); otherwise pass the array from `validated()`.

## Routes

- Add new routes to the existing group for their middleware/guard. Do not redeclare an existing middleware group.
- `Route::resource`/`apiResource` name routes `{resource}.{action}` automatically; name standalone routes with `->name()`. Use route model binding.
- Generate URLs with `route('name', $params)`/`to_route()`; never hard-code paths.

## Transactions & concurrency

- An operation that writes to ≥2 tables is wrapped in `DB::transaction()`. Do not make outbound HTTP calls inside a transaction.
- Read-modify-write on a row that concurrent requests can touch (balances, stock, status): `lockForUpdate()` inside `DB::transaction()`. Increment/decrement counters with `increment()`/`decrement()` (an atomic update in the database), not by reading the value and calling `save()`: two concurrent requests will overwrite each other.
- Async work dispatched inside a transaction must run after commit (unless the queue connection has `'after_commit' => true`):
  - Job: `XJob::dispatch(...)->afterCommit()`
  - Queued Mail/Notification: `(new X(...))->afterCommit()`
  - Event: the class implements `ShouldDispatchAfterCommit` (events have no `afterCommit()` method)
  - Queued listener: implement `ShouldQueueAfterCommit`
- Cache: read with `Cache::remember()`, not `get()` followed by a truthiness check (a cached `0`/`false` is treated as a miss). Conditional writes use `Cache::add()` (atomic), not `has()` then `put()`. Deduplication not tied to a database row uses `Cache::lock()` (the store must support locks).
- Use `Cache::tags()` only when the cache store supports tags in every environment (Redis, Memcached…); on `file`/`database`/`dynamodb` the call throws.

## Queries & performance

- Eager load (`with()`/`load()`) relationships accessed in a loop. Enable `Model::preventLazyLoading()` only when asked: turning it on globally can break existing tests and code.
- Endpoints returning a list that grows with the data are paginated; return everything only for a small, fixed set (categories, master data). Process large data sets with `chunkById()`/`lazyById()`, never `->get()` on a whole table.
- Paginated lists need an explicit `orderBy`; when the sort column is not unique (`created_at`, `name`), add `->orderBy('id')` so pages neither repeat nor skip rows.
- When reading many rows, select only the columns you need (`select()`, `pluck()`), but keep the keys relationships depend on: the parent query keeps the PK and any `belongsTo` FK; an eager load keeps PK + FK (`with('author:id,name')`). Without them the relationship silently comes back `null`/empty.
- Count or check existence in the query with `count()`/`exists()`, not by loading a collection and counting it. Aggregate over relationships with `withCount()`/`withSum()`/`withExists()`, not `$model->relation->count()` in a loop.
- `update()`/`delete()` on a query builder (including `whereIn()->delete()`, `toQuery()`) runs a single SQL statement: no model events, observers, casts, or model-level soft deletes. If you need those, iterate over models (`chunkById()` + `$model->update()`).
- Add no new global scope except for a constraint that applies to every query (tenant, soft delete); business filters use local scopes.
- Slow work (sending mail, calling external APIs, processing files) goes on the queue (see `laravel-queue.md`).

## Errors

- Catch the most specific exception that can occur (e.g. `RequestException`, `QueryException`); no blanket `catch (\Throwable)`/`catch (\Exception)` except at the outermost layer.
- Never catch and swallow an error. If you catch to handle it, `report($e)` or rethrow a meaningful exception. If you deliberately ignore an error, comment why.
- Business errors use dedicated exceptions rendered centrally, the way the project already does it; do not build error responses ad hoc.
- Messages returned to the client must not leak internals (stack traces, SQL, responses from external services); log the details with context (relevant IDs), without sensitive data.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
