---
paths:
  - "tests/**/*.php"
---

# Laravel Testing

## Before writing tests

- Identify the framework: if there is a `tests/Pest.php` or `pestphp/pest` in `composer.json`, write Pest; otherwise PHPUnit. Do not mix the two in one directory.
- Read `tests/Pest.php`, `tests/TestCase.php` and `phpunit.xml` to learn: the test database (SQLite/MySQL/Postgres), traits already applied (`RefreshDatabase`…), shared helpers, shared setup. Do not add any of it again.
- Read the 1–2 nearest tests of the same kind and follow their style.
- Existing tests written to a project convention that differs from this rule: do not delete or rewrite them. If they have weaknesses, point them out and let the user decide.
- Use only the testing tools the project already has installed; ask before adding a testing package/plugin (browser testing, mutation testing…).

## Running tests

- Run through the project's command (`composer test`, `php artisan test`, `./vendor/bin/pest`…).
- While coding: run the relevant tests (`--filter`). Before reporting done: run the full suite.
- Coverage: `pest --coverage` or `php artisan test --coverage` (supports `--min=N`); plain PHPUnit uses `--coverage-text` (no `--min`). Requires PCOV, or Xdebug with `XDEBUG_MODE=coverage`. Take the threshold from the CI config/`composer.json`; never set a different one.
- When a test fails, fix the code or fix the wrong test; never delete the test, `->skip()`/`->todo()` it (Pest), `markTestSkipped()`/`markTestIncomplete()` it (PHPUnit), or weaken the assertion to make it pass.

## Where tests go

- Create tests with `php artisan make:test {Name}Test` (add `--unit`/`--pest` to match the project); `{Name}` has no `Feature/`/`Unit/` prefix.
- Default to Feature tests; Unit tests only for framework-independent logic (calculations, data transformation).
- `tests/Feature/`: exercised through HTTP, console or jobs; verifies behaviour across layers, authorization, validation.
- `tests/Unit/`: one class's logic, mirroring the `app/` structure. Filename `{Class}Test.php`. By default Unit tests do not boot Laravel, so the database, facades and container are unavailable; if you need them, write a Feature test, unless the project's `tests/Pest.php`/`TestCase` is configured otherwise.
- HTTP tests focus on status, validation, authorization and response format. Branch-heavy logic is tested at the layer that holds it (Service/Action/Model…), not piled into HTTP tests.
- Test names describe behaviour (`it('rejects cancel after shipment')`), not implementation.

## Test data

- Build data with factories and states (`User::factory()->admin()->create()`); no manual inserts, no hard-coded IDs.
- Each test creates the data it needs; never depend on run order or on data another test left behind.
- Create only as much data as the test needs; if a state is missing, add it to the factory instead of repeating attributes across tests.

## HTTP tests

- APIs use `getJson`/`postJson`/`putJson`/`patchJson`/`deleteJson` (they send `Accept: application/json`).
- Assert a specific status (`assertCreated()`, `assertForbidden()`…), not just `assertSuccessful()`.
- Assert response content with `assertJsonPath()`/`assertJsonStructure()`; validation errors with `assertJsonValidationErrors(['field'])` (JSON only) or `assertInvalid(['field'])` (JSON and session).
- After a write, verify the database with assertions on the test case (`$this->…`, not `$response`): `assertDatabaseHas`/`assertDatabaseMissing`/`assertDatabaseCount`/`assertSoftDeleted`/`assertModelExists`.
- Test validation by sending invalid input through the request and asserting the errors; do not assert the contents of the `rules()` array.
- Authenticate with `actingAs($user, '<guard>')`; in a multi-guard project always name the guard.
- In an Inertia project: `use Inertia\Testing\AssertableInertia;` then `->assertInertia(fn (AssertableInertia $page) => $page->component('Orders/Show')->has('order'))`; do not assert raw HTML/JSON.

## Minimum coverage

- A new endpoint: 1 happy path, 1 validation failure (if it takes input), 1 authorization failure. Take the actual status from existing tests or the exception handler; do not guess. Laravel's defaults:
  - Unauthenticated: JSON request → 401 (`assertUnauthorized()`); web request → 302 to login.
  - Unauthorized: 403 (`assertForbidden()`); 404 only when the code uses `denyAsNotFound()` or queries through the user's scope.
- Branching logic (conditions, pricing, state transitions): one test per significant branch, including boundary values.
- Fixing a bug: first write a test that reproduces it (and fails), then fix.
- Changes to wording, style or layout alone need no new test.
- Expected values are hard-coded in the test (with fixed input/time), not recomputed with the same formula as the code. Compare strictly: `assertSame()` (PHPUnit), `toBe()` (Pest), not `assertEquals()`/`toEqual()` unless loose comparison is intended.

## Side effects & external dependencies

- Outbound HTTP through `Http`: `Http::fake([...pattern => response])` together with `Http::preventStrayRequests()` (`Http::fake()` with no arguments fakes every request, so `preventStrayRequests` does nothing). SDKs with their own Guzzle client (AWS, Stripe…) are not intercepted by `Http::fake`: mock them through an interface/the container. Never call the real service.
- Code calling `Http` with an error-handling branch: test both an error response (`Http::response([], 500)`) and a connection failure (`Http::failedConnection()` from L11, or a callback that throws `ConnectionException`).
- Prefer Laravel's fakes over mocks, use each fake's own assertions, and assert the negative case too:
  - `Queue::fake()`: `assertPushed`/`assertNotPushed`/`assertNothingPushed`
  - `Bus::fake()`: `assertDispatched`/`assertNotDispatched`/`assertChained`/`assertBatched`
  - `Event::fake()`: `assertDispatched`/`assertNotDispatched`; the fake suppresses every listener (model events included), so call it after creating data with factories, or use `Event::fake([OnlyThis::class])`
  - `Mail::fake()`: `assertSent`/`assertNotSent`/`assertNothingSent`; queued mailables use `assertQueued`/`assertNothingQueued`
  - `Notification::fake()`: `assertSentTo`/`assertNotSentTo`/`assertNothingSent`
  - `Storage::fake('disk')`: `Storage::disk('disk')->assertExists()`/`assertMissing()`
- Use `Event::fake()`/`Queue::fake()` with no arguments only when the test asserts the complete outcome (`assertNothingPushed`…); otherwise pass the classes to fake. Assert the payload too when the data is part of the behaviour (`assertPushed(X::class, fn ($job) => $job->orderId === $order->id)`).
- Mocks (Mockery, `$this->mock()`) only for dependencies behind an interface, or external services with no fake. Never mock Eloquent models, the class under test, or the `Request`/`Config` facades (use the test request's input and `Config::set()`).
- Time: `$this->freezeTime()`/`$this->travelTo()`; no `sleep()`, no assertions against the real clock. Code using `Sleep` gets `Sleep::fake()` + `Sleep::assertSlept(...)`.
- Do not leave `withoutExceptionHandling()` in a test (it changes the response under test). To check that an exception is reported, use `Exceptions::fake()` + `Exceptions::assertReported(X::class)` (L11+).

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
