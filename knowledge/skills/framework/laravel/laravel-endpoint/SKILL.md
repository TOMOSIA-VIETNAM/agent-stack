---
name: laravel-endpoint
description: Add or change a Laravel endpoint (API or web form) end to end - route, FormRequest, authorization, controller, Resource, tests. Use when asked to add/change an endpoint, route, API, or CRUD action.
---

# Laravel Endpoint

The procedure for adding or changing one endpoint. Each step points to a rule in `.claude/rules/laravel-*.md`; the rules are not repeated here.

## Step 0: Read the context (mandatory, before writing code)

1. Read `.claude/rules/laravel-pattern.md`, `laravel-security.md`, `laravel-conventions.md` and `laravel-testing.md`, especially each file's **Project-specific** section. If the endpoint dispatches jobs or calls external services, also read `laravel-queue.md`.
2. Establish:
   - The **actor** calling the endpoint (guest, user, admin…) and its **guard**.
   - The **kind**: API (JSON) or web (redirect/view/Inertia).
   - Whether the endpoint is **new** or an **existing** one being changed. If existing, read its current tests first.
3. Find the 1–2 nearest endpoints of the same kind and actor. Note how they do it and follow suit:
   - route file and group, middleware, route naming
   - location and name of the FormRequest, Policy, controller, and the class holding the business logic (Service/Action/model…)
   - response format (Resource, wrapper), how errors are returned
4. If the request lacks information that decides behaviour (who may call it, which fields are required, which status to return), ask; do not guess.

## Step 1: Route

- Add it to the **right file and group** for the actor/guard; do not redeclare an existing middleware group.
- CRUD uses `Route::apiResource`/`resource` (`->only([...])` when not every action is needed); name standalone routes with `->name()`.
- Nested routes with a child parameter: `->scopeBindings()`, or scope the query to the parent.
- Generate URLs in code and tests with `route('name')`; never hard-code paths.
- Check: `php artisan route:list --path=<uri>` shows the right method, URI, name and middleware.

## Step 2: Validation

- A new FormRequest follows the naming convention (`Store{Model}Request`/`Update{Model}Request`, or named after the use case). Create it with `php artisan make:request`.
- A rule for every field written to the database; updates use `sometimes` for optional fields; a `unique` rule on update must ignore the current record.
- Uploads, and login/OTP/mail-sending endpoints: follow `laravel-security.md`.

## Step 3: Authorization

- A new endpoint **always** checks authorization: a Policy/Gate, `authorize()` in the FormRequest, or middleware, the way the project already does it.
- Records fetched by ID must be scoped to the actor (the user's relationship, a Policy after route model binding, or `scopeBindings()`). User A must not be able to read or change user B's records (IDOR). For a new multi-tenant design, query through the actor's relationship so out-of-scope records return 404 and do not reveal that they exist.
- If the model has no Policy yet, create one with `php artisan make:policy {Model}Policy --model={Model}`.

## Step 4: Controller & business logic

- The controller takes the FormRequest → calls the business layer the project uses → returns the response. If the project separates layers, do not query Eloquent or write business logic in the controller.
- Use only `$request->validated()` (or a DTO, if the project has them).
- Writes to ≥2 tables: a transaction; any job/mail/event dispatched inside it must run after commit (see `laravel-pattern.md` › Transactions & concurrency).
- Returning a list: paginate, and eager load the relationships the Resource uses.

## Step 5: Response

- API: return through a Resource (or the project's format), never a Model directly. Expose only the fields the client needs; no internal or sensitive fields.
- Status: 201 for creation, 204 for deletion (or the project's choice); business errors through the project's exceptions.
- Web: redirect with a flash message, or render a view/Inertia page like similar pages do.

## Step 6: Tests

Before writing tests, review the code you just wrote and the code the endpoint relies on. If you find a design flaw, report it to the user rather than writing a test that enshrines it — e.g. an action that writes data without validation, a Policy that exists but is never called, an empty method.

Write Feature tests per `laravel-testing.md`, at minimum:

| Case | Verify |
|---|---|
| Happy path | status, response content (`assertJsonPath`/`assertJsonStructure`), database (`assertDatabaseHas`…) |
| Validation | 1 required field missing or invalid → 422 + error on the right field |
| Unauthenticated | status per the project's handler (API usually 401, web usually 302) |
| Unauthorized | a user without permission → 403 (or 404 if the project uses it) and the database unchanged |
| Someone else's record | user/tenant A calling on B's record → blocked, database unchanged |

Add a case for each significant business branch and side effect (fake it and assert the negative case too).

Run the new tests with `--filter`, then the full suite (see `laravel-testing.md` › Running tests).

## Step 7: Wrap up

1. Run formatting/static analysis per `laravel-conventions.md` › Tooling & style on the changed files.
2. Report:
   - Files created/changed
   - Route (method, URI, name, middleware)
   - Authorization: who may call it, and where that is checked
   - Tests added and the output of the test run
   - Points the reviewer needs to decide (if any)
