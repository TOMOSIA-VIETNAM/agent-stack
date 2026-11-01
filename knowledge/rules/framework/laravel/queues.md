---
paths:
  - "app/Jobs/**/*.php"
  - "app/Events/**/*.php"
  - "app/Listeners/**/*.php"
  - "config/queue.php"
---

# Laravel Queues & Events

## Jobs

- Jobs are idempotent: running one twice must not corrupt data (check state before acting, use upserts, pass an idempotency key to external APIs). A job that cannot be (a payment without an idempotency key) runs once (`$tries = 1`, or `#[Tries(1)]` on L13+) with a comment saying why.
- Jobs calling external services declare a timeout lower than the connection's `retry_after`, explicit tries and backoff, in the form existing jobs use (the `$timeout`, `$tries`, `$backoff` properties, or the `#[Timeout]`, `#[Tries]`, `#[Backoff]` attributes on L13+). Without `retry_after` > timeout the job runs twice in parallel.
- Final failure is handled in `failed(?Throwable $e)`; it runs on a fresh instance and cannot see state set in `handle()`.
- Pass a Model (via `SerializesModels`) or an ID, never closures, resources or large arrays. A model deleted before the job runs throws; set `$deleteWhenMissingModels = true` when that is acceptable.
- Jobs, listeners, commands and scheduled tasks have no authenticated user or request: never `auth()`, `Auth::user()` or `request()`. Pass the acting user's ID in.
- Permanent failures (bad data, a business rule) call `$this->fail($e)` instead of throwing and burning retries.
- Job middleware that releases the job (`RateLimited`, `WithoutOverlapping`) counts each release as an attempt: set `retryUntil()` or enough tries.
- `ShouldBeUnique` only stops duplicate dispatches while one is pending (it needs a lock-capable cache, and is ignored inside batches); it does not replace idempotency.
- Route jobs to queues the way the project does: `Queue::route()` in a provider (L13+), `onQueue()` at dispatch, or a property; do not mix them for the same job.
- Dispatching inside a transaction: after commit (see `laravel-queries.md` › Transactions).

## Events & listeners

- Listeners in `app/Listeners` with a type-hinted `handle(OrderShipped $event)` are registered by event discovery; also registering them with `Event::listen` makes them run twice. Follow the project's registration style.
- Use an event when several independent reactions follow one fact; a single direct consequence is a direct call, not an event nobody else listens to.
- Events carry the minimum (the model or its ID), not computed payloads that go stale in the queue.
- A listener that calls external services or sends mail implements `ShouldQueue`; one that must see committed data implements `ShouldQueueAfterCommit`.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
