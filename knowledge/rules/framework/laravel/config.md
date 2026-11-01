---
paths:
  - "config/**/*.php"
  - "app/Providers/**/*.php"
  - ".env.example"
---

# Laravel Configuration

- Call `env()` only inside `config/`; everywhere else read `config()`. After `config:cache` the `.env` file is not loaded, so `env()` elsewhere returns `null` (inside Docker it may still work and hide the bug).
- Environment-dependent behaviour is a config value, not `app()->isProduction()`/`App::environment()` scattered through business code: config can be set per test, an environment check cannot.
- Every new `env()` key gets a line in `.env.example` with a dummy value, so the next developer and CI know it exists.
- Third-party credentials and URLs go in `config/services.php`; a feature's own settings get their own config file only when there are several.
- Never hard-code secrets or environment URLs; never commit a real value to `.env.example` or a config default.
- Service providers only bind and configure; no queries, HTTP calls or file I/O in `register()`/`boot()`, because they run on every request and every Artisan command, including `config:cache` in CI.
- Bind an interface to an implementation in a provider only when there are (or will be in this change) two implementations or a test needs to swap it; otherwise inject the concrete class.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
