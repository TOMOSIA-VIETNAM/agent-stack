---
paths:
  - "app/Policies/**/*.php"
  - "app/Http/**/*.php"
  - "app/Providers/**/*.php"
  - "routes/**/*.php"
---

# Laravel Authorization

- Every new endpoint checks authorization: a Policy/Gate, `authorize()` in the form request, or `can:` middleware, the way the project already does it. A Policy that exists but is never called protects nothing.
- One Policy per model (`{Model}Policy`), created with `php artisan make:policy {Model}Policy --model={Model}`. Policies in `app/Policies` named after the model are discovered automatically; do not also register them by hand.
- Route model binding does not check ownership. Records fetched by an ID from the request are scoped to the actor: query through the actor's relationship (`$request->user()->orders()->findOrFail($id)`), authorize with a Policy after binding, or `scopeBindings()` for nested routes. Skipping this is an IDOR: user A reads or changes user B's record.
- Out-of-scope records in a multi-tenant design return 404, not 403, so their existence is not revealed: query through the actor's scope, or use `Response::denyAsNotFound()` in the Policy. Follow the status existing tests expect.
- Policy methods return `bool` or a `Response`; put the reason a business rule denies access in `Response::deny('…')`, not in a controller `if`.
- A `before()` hook that grants super-admins everything returns `null` (not `false`) for everyone else, so the real check still runs.
- API tokens with abilities (Sanctum): check the ability (`tokenCan()` or `abilities:`/`ability:` middleware) in addition to the Policy; a token ability does not replace record-level authorization.
- Do not hide a button and call it authorization: the server checks every action whatever the UI shows.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
