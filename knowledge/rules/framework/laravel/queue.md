---
paths:
  - "app/**/*.php"
  - "routes/console.php"
  - "bootstrap/app.php"
  - "config/queue.php"
  - "config/services.php"
---

# Laravel Queues, Scheduling & External Services

## Jobs

- Jobs must be idempotent: running one again must not corrupt data. If a job cannot be idempotent (e.g. a payment), set `$tries = 1` and document why.
- Jobs that call external services set `$timeout` (lower than the queue connection's `retry_after`) and explicit `$tries`/`$backoff`. Handle final failure in `failed(?Throwable $e)`; that method runs on a fresh job instance and cannot see state set in `handle()`.
- Data passed to a job must be serializable: a Model (via `SerializesModels`) or an ID. Never pass closures, resources or large objects.
- Jobs, commands and scheduled tasks have no authenticated user: do not call `auth()`, `Auth::user()` or `request()`. Pass in the acting user's ID when needed.
- Jobs using middleware that can release them (`RateLimited`, `WithoutOverlapping`): every release counts as an attempt, so set `retryUntil()` or a large enough `$tries`.
- `ShouldBeUnique` only prevents duplicate dispatches (it needs a cache store with locks and does not apply inside batches); it is no substitute for idempotency.
- Permanent failures (bad data, business rule violations) call `$this->fail()`; do not throw and let it retry.
- Dispatching inside a transaction: run after commit (see `laravel-pattern.md` › Transactions & concurrency).

## Scheduling

- Long-running tasks, or tasks that must not overlap: `->withoutOverlapping(<minutes>)` (the lock defaults to 24 hours; if it gets stuck, run `schedule:clear-cache`).
- With the scheduler running on several servers: add `->onOneServer()` (the default cache must be shared and support locks); closures must be given a `->name()`.
- Tasks cap their own workload per run (chunking, a deadline); never process a whole table in one run.

## Events & listeners

- Listeners in `app/Listeners` with an event type-hinted on `handle()` are auto-discovered (the default on L11+): do not also register them with `Event::listen`/`$listen`, or the listener runs twice. Follow the project's existing registration style.

## Calling external services

- `retry()` only idempotent requests (GET, PUT by ID). A POST that creates a record or charges money is retried only if the API supports an idempotency key and the same key is sent on every attempt; retry only transient failures (`ConnectionException`, 5xx, 429).
- The `Http` client times out after 30 seconds by default and does **not** throw on 4xx/5xx: set a `timeout()` that fits the use case, and call `->throw()` or check `->failed()`. `retry()`, by contrast, throws by default once attempts run out (pass `throw: false` to handle it yourself).
- External service URLs and keys live in `config/services.php`.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
