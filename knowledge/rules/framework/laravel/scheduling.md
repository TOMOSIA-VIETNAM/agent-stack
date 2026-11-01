---
paths:
  - "routes/console.php"
  - "app/Console/**/*.php"
---

# Laravel Artisan & Scheduling

## Artisan commands

- Create with `php artisan make:command`; the signature is `namespace:action` (`orders:sync`), with every input an argument or option that has a default or fails clearly. A command run by the scheduler or CI never prompts.
- The command parses input and calls the business layer; it holds no business logic the app also needs elsewhere.
- Return `self::SUCCESS`/`self::FAILURE`; report progress with `$this->info()`/`$this->error()`, not `echo`.
- Commands that change data support `--dry-run` when a mistake would be costly, and cap their own workload (chunking, `--limit`).
- No authenticated user exists: pass actor IDs as options when needed.

## Scheduling

- Long-running tasks, or tasks that must not overlap: `->withoutOverlapping(<minutes>)`; the lock defaults to 24 hours, and a stuck one is cleared with `schedule:clear-cache`.
- With the scheduler running on several servers: `->onOneServer()` (the default cache must be shared and support locks); closures need a `->name()`.
- A task processes a bounded amount per run (chunking, a deadline), never a whole table; heavy work dispatches jobs instead of running inline.
- A task tied to local business hours sets `->timezone(...)` explicitly, because `config('app.timezone')` is usually UTC.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
