---
paths:
  - "app/**/*.php"
  - "bootstrap/app.php"
  - "config/logging.php"
---

# Laravel Errors & Logging

## Exceptions

- Catch the most specific exception that can occur (`RequestException`, `QueryException`, `ModelNotFoundException`); a blanket `catch (\Throwable)`/`catch (\Exception)` only at the outermost layer (a job's `failed()`, a command's top level).
- Never catch and swallow. Handle it, `report($e)` and continue, or rethrow a meaningful exception with the original as `previous`. A deliberate ignore gets a comment saying why.
- Business errors are dedicated exception classes rendered in one place (`withExceptions()` in `bootstrap/app.php`, or the exception's own `render()`), the way the project already does it; do not build error responses ad hoc in controllers.
- Messages returned to the client never contain stack traces, SQL, or an external service's response body. Keep `APP_DEBUG=false` outside local.
- An expected, handled condition (validation, not found, a declined payment) is not reported as an error: use `dontReport`/`$dontReport` or a `report()` method returning `false`, so alerts stay meaningful.

## Logging

- Log through `Log::` with a message that is stable (searchable) and the variable parts in the context array: `Log::warning('Payment declined', ['order_id' => $order->id])`, not interpolated into the string.
- Add request- or job-wide identifiers once with `Log::withContext()`/`Context::add()` instead of repeating them on every call.
- Never log passwords, tokens, full card numbers, or personal data; log the ID of the record instead.
- Pick the level by who must act: `error` pages someone, `warning` is reviewed later, `info` is a business event, `debug` is off in production.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
