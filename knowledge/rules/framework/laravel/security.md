---
paths:
  - "app/**/*.php"
  - "routes/**/*.php"
---

# Laravel Security

Authorization lives in `laravel-authorization.md`, secrets in `laravel-config.md`, Blade output in `laravel-blade.md`.

## Input & queries

- Raw SQL: `selectRaw`/`whereRaw`/`havingRaw`/`orderByRaw` with a bindings array (`?`); never concatenate input into SQL. `DB::raw()` takes no bindings: use it only for fixed expressions. Column names and sort directions taken from input are whitelisted.
- Do not trust external data (API responses, webhooks, imported files): validate the fields you use before processing.
- Outbound requests to a URL the user supplies (webhook target, avatar or import URL) allow only `https` and expected hosts, and reject private, loopback and link-local addresses (`127.0.0.0/8`, `10.0.0.0/8`, `169.254.169.254`…) after resolving DNS; otherwise the server can be used to reach internal services (SSRF).
- Never redirect to a URL taken from input (`redirect($request->input('next'))`): use `redirect()->intended()`, or accept only a relative path or an allow-listed host (open redirect).
- Webhooks verify their signature (HMAC over the raw body, compared with `hash_equals()`) before reading the payload, and reject old timestamps to block replays.

## Files

- Uploads validate `mimes`/`max` (and `dimensions` for images), are stored through `Storage`, and never use the client's filename as the path (`store()`/`storeAs()` with a generated name).
- Private files live on a non-public disk and are served through a route that authorizes, or through `temporaryUrl()`.
- Never pass user input to a filesystem path, `include`, or a shell command; if unavoidable, whitelist it.

## Authentication & abuse

- Login, password reset, OTP send/verify, and endpoints that send mail/SMS are throttled with a named `RateLimiter`, keyed on both the account identifier and the IP.
- Do not reimplement hashing, tokens, sessions or signed URLs the framework or the project's auth package provides. Compare secrets with `hash_equals()`.
- Generate tokens with `Str::random()`/`random_bytes()`, never `rand()`/`uniqid()`.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
