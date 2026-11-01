---
name: laravel-job
description: Add or change a Laravel queued job, queued listener or event end to end - idempotency, timeout and retries, dispatching after commit, permanent and final failure handling, queue routing, tests with Queue/Bus/Event fakes. Use when asked to move work to the queue, add a background job, retry logic, an event listener, or to fix a job that runs twice, times out or fails silently.
---

# Laravel Job

The procedure for adding or changing one queued job or listener. Each step points to a rule in `.claude/rules/laravel-*.md`; the rules are not repeated here.

## Step 0: Read the context

1. Read `.claude/rules/laravel-queues.md`, `laravel-queries.md` (› Transactions & concurrency), `laravel-errors.md` and `laravel-testing.md`, plus `laravel-http-client.md` if the job calls an external service — especially each file's **Project-specific** section.
2. Establish:
   - The Laravel version (`composer show laravel/framework`): job attributes such as `#[Tries]` exist only on L13+; on L12 use the properties.
   - The queue connection and its `retry_after` (`php artisan config:show queue`), and how workers run (Horizon, `queue:work` options, timeouts).
   - Where it is dispatched from, and whether that code runs inside a transaction.
   - Whether this is a **job** (one piece of work) or an **event + listener** (several independent reactions to one fact). A single consequence is a job, not an event.
3. Read 1–2 existing jobs or listeners: directory, naming (verb + object), how they declare tries/timeout/backoff, queue routing, how they log and fail.
4. If the request does not say what must happen when the work fails for good (notify someone, mark a record, nothing), ask.

**Done when:** you can name the class you will create, where it is dispatched, the queue it runs on, its `retry_after`, and the job you are following.

## Step 1: Class & payload

- Create it with `php artisan make:job <Name>` (or `make:listener <Name> --event=<Event> --queued`).
- Constructor takes a Model (`SerializesModels`) or IDs, never closures, resources or large arrays. Pass the acting user's ID if the work needs it: there is no authenticated user in a job.
- Route it to a queue the way the project does.

**Done when:** the class exists and `php -l` / the project's static analysis passes on it.

## Step 2: Make it safe to run twice

- Write `handle()` so a second run with the same payload changes nothing: check the current state first, use `upsert`/`updateOrCreate`, and send an idempotency key to external APIs that accept one.
- If it cannot be made idempotent (a charge with no idempotency key), run it once (`tries = 1`) and say why in a comment.
- `ShouldBeUnique` only if duplicates must not be queued; it does not replace idempotency.

**Done when:** you can explain what a second run of the same job does, in one sentence, and it is harmless.

## Step 3: Time limits & failure

- Set a timeout lower than the connection's `retry_after`, explicit tries and backoff, in the form existing jobs use.
- Permanent failures (bad data, a business rule) call `$this->fail($e)`; transient ones throw and are retried.
- Handle the final failure in `failed(?Throwable $e)` as the request specified (log with context, mark the record, notify). It runs on a fresh instance.
- Middleware that releases the job (`RateLimited`, `WithoutOverlapping`) counts each release as an attempt: set `retryUntil()` or enough tries.

**Done when:** timeout < `retry_after`, and each failure path (transient, permanent, final) has a defined outcome.

## Step 4: Dispatch

- Dispatch from the place found in Step 0. Inside a transaction, it runs after commit (`->afterCommit()`, `ShouldQueueAfterCommit` for listeners, `ShouldDispatchAfterCommit` for events) unless the connection already sets `after_commit`.
- Remove the inline work the job replaces, so it does not run twice.

**Done when:** the dispatch is in place, and nothing dispatched inside a transaction can run before commit.

## Step 5: Tests

Write tests per `laravel-testing.md`, at minimum:

| Case | Verify |
|---|---|
| Dispatched | The action that triggers it: `Queue::fake([X::class])` or `Bus::fake([X::class])`, `assertPushed`/`assertDispatched` with the payload checked; and `assertNotPushed` on the path that must not dispatch |
| Handle | Run the job directly (`(new X($order))->handle(...)` or `dispatchSync`) and assert the database and side effects (with `Http::fake`, `Mail::fake`…) |
| Twice | Running `handle()` twice leaves the same state as once |
| Permanent failure | Bad data leads to `fail()` / no retry and no partial writes |
| Listener | For an event: `Event::fake([E::class])` + `assertDispatched` at the source, and the listener's `handle()` tested on its own |

Run the new tests with `--filter`, then the full suite.

## Step 6: Wrap up

1. Run formatting/static analysis per `laravel-conventions.md` › Tooling on the changed files.
2. Report:
   - Files created/changed
   - Queue and connection, timeout vs `retry_after`, tries and backoff
   - Why it is safe to run twice (or why it runs once)
   - What happens on permanent and final failure
   - Where it is dispatched, and whether after commit
   - Tests added and the output of the test run
