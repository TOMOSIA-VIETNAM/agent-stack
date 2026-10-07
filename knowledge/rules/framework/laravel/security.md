---
paths:
  - "app/**/*.php"
  - "routes/**/*.php"
  - "config/**/*.php"
  - "bootstrap/app.php"
  - "resources/views/**/*.blade.php"
---

# Laravel Security

## Config & secrets

- Call `env()` only inside `config/`; everywhere else use `config()`. After `config:cache`, `.env` is not loaded, so `env()` outside config sees only system environment variables (usually `null`; inside Docker it may still work and hide the bug).
- Environment-dependent behaviour belongs in `config/`; do not scatter `app()->isProduction()`/`App::environment()` through business code (hard to test, easy to miss an environment).
- A new `config/` key read from `env()` gets a matching variable (with a dummy value) in `.env.example`.
- Never hard-code secrets or environment URLs. Never log passwords, tokens or personal data.

## Input & queries

- Raw SQL: use `selectRaw`/`whereRaw`/`havingRaw`/`orderByRaw` with a bindings array (`?`); never concatenate input into SQL. `DB::raw()` takes no bindings; use it only for fixed expressions. Column names and sort directions taken from input must be whitelisted.
- File uploads: validate `mimes`/`max`, store through `Storage`, and never use the original filename as the path. Private files live on a non-public disk and are served through a route that checks authorization, or through `temporaryUrl()`.
- Do not trust external data (API responses, webhooks, imported files): validate the fields you use before processing. Webhooks must verify their signature.

## Authentication & rate limiting

- Login, password reset, OTP send/verify, and mail/SMS-sending endpoints must be throttled (RateLimiter), keyed on both the account identifier and the IP.
- Do not reimplement hashing, tokens or sessions that the framework or the project's auth package already provides.

## Blade

- Output data with `{{ }}`; `{!! !!}` only for sanitized HTML. Pass data into `<script>` with `Js::from()`.
- Forms that write data include `@csrf`. Do not add a route to the CSRF exceptions to fix a 419; only signature-verified webhooks may be excluded.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
