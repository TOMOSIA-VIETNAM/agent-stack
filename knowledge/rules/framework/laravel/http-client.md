---
paths:
  - "app/**/*.php"
  - "config/services.php"
---

# Laravel HTTP Client

- The `Http` client waits 30 seconds by default and does **not** throw on 4xx/5xx: set a `timeout()`/`connectTimeout()` that fits the call, and call `->throw()` or check `->failed()`.
- `retry()` only idempotent requests (GET, PUT by ID). A POST that creates or charges is retried only when the API takes an idempotency key and every attempt sends the same key. Retry only transient failures (`ConnectionException`, 5xx, 429) via the `when` callback. `retry()` throws once attempts run out (`throw: false` to handle it yourself).
- Base URL, credentials and timeouts come from `config/services.php`; build the client once (a macro or `Http::baseUrl(...)` in one place) instead of repeating them at each call.
- Call a third-party API from one place — the class the project already uses for integrations, or a single client class when it has none — so request shape, error mapping and fakes are not scattered.
- Calls a user does not need to wait for run in a job, not in the request.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
