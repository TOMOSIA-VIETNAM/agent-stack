---
paths:
  - "routes/**/*.php"
  - "app/Http/**/*.php"
  - "bootstrap/app.php"
---

# Laravel HTTP

## Routes

- Add a route to the existing group for its middleware/guard; do not redeclare a group.
- `Route::resource`/`apiResource` (with `->only([...])`) for CRUD; name standalone routes with `->name()`. Resource controller actions keep the standard names: `index`, `show`, `store`, `update`, `destroy` (plus `create`, `edit` for web).
- Use route model binding; nested routes use `->scopeBindings()` so a child must belong to its parent.
- Generate URLs with `route('name', $params)`/`to_route()`; never hard-code paths.

## Controllers

- No business logic in route closures or Blade. If the project has a business layer (Service, Action…), the controller takes the request → calls that layer → returns the response; otherwise write it like the existing controllers.
- Every new action checks authorization (see `laravel-authorization.md`).
- Slow work (mail, external APIs, files) is queued, not done in the request.

## Validation

- Validate with a form request (or whatever the project uses). Use only `$request->validated()` (or `safe()`) for writes; never `$request->all()`: it lets the client set any fillable column.
- A rule for every field written; `sometimes` for optional fields on update; a `unique` rule on update ignores the current record (`Rule::unique(...)->ignore($model)`).
- Validate enums with `Rule::enum(Status::class)`, not a hand-written `in:` list that drifts from the enum.
- Normalise input (trim, lowercase email, cast flags) in `prepareForValidation()`, not in the controller.
- Pass structured data between layers as a DTO only if the project already has DTOs; otherwise pass the `validated()` array.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
