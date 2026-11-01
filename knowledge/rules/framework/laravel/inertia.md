---
paths:
  - "app/Http/Middleware/HandleInertiaRequests.php"
  - "resources/js/Pages/**"
  - "resources/js/pages/**"
---

# Laravel + Inertia (server side)

Component code follows the project's Vue or React rules; this file covers what the server sends.

- Every prop is serialised into the page's HTML and visible to anyone who can open it. Send only what the page renders: an API resource or `->only([...])`, never a whole Model (hidden-but-sensitive columns, every loaded relationship).
- Props that are expensive or not needed on first paint are `Inertia::defer(fn () => …)`; props fetched only on demand by a partial reload are `Inertia::optional(fn () => …)` (both Inertia 2+; Inertia 1 has only `Inertia::lazy()`, which v2 deprecates). Wrap anything costly in a closure so a partial reload that does not request it does not compute it.
- Shared data in `HandleInertiaRequests::share()` runs on every request: keep it small and lazy (`fn () => …`), e.g. the user's `id`/`name` and flash messages, not lists or permissions for every page.
- Writes go through normal controller actions with a form request and end in a redirect (`to_route(...)`, `back()`); Inertia turns validation errors into the page's `errors` prop. Do not return JSON from an Inertia form endpoint.
- Page component names passed to `Inertia::render('Orders/Show', …)` match the file under the pages directory exactly, case included: a mismatch works on a case-insensitive disk and breaks in production.
- Generate URLs on the client from named routes (Ziggy's `route()` or Wayfinder, whichever the project has), not hard-coded paths.
- Authorization stays on the server: pass `can` flags for UI only, and still authorize every action.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
