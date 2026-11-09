# go_router reference

go_router is feature-complete (bug fixes only); check pub.dev for the current major before pinning.

- One `GoRouter` built in the composition root; routes declared per feature and aggregated.
- Path constants or **typed routes** (`go_router_builder`, `@TypedGoRoute`) — no stringly-typed paths in widgets.
- Auth guard: top-level `redirect` reading auth state; `refreshListenable` bound to an auth notifier/stream. Redirect must be pure, fast, and avoid loops (return `null` when no redirect needed).
- `go` replaces the stack; `push` adds to it; use `pop` with a result for flows returning data.
- Shell routes (`StatefulShellRoute`) for bottom-nav tabs with preserved state.
- Pass ids in the path/query, not whole objects; load data in the destination state holder. `extra` is not restored on web/deep-link.
- Deep links: declare routes for every link, handle unknown with `errorBuilder`.
- Test: pump `MaterialApp.router` with a test router; assert location via `router.state.uri`.
