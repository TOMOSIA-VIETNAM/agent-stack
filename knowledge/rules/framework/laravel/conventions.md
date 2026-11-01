# Laravel Conventions

Written for Laravel 12–13 (PHP 8.2+); APIs added in 13 are marked (L13+). On an older project, check `composer show laravel/framework` before using an API; if it does not exist there, follow the existing code. Every layer has its own `.claude/rules/laravel-*.md`, loaded when you touch its files.

## Order of precedence

1. `AGENTS.md`, then the **Project-specific** section at the end of each `.claude/rules/laravel-*.md`.
2. Patterns already in the code: before creating a class, read the 2–3 nearest files of the same kind and follow them (directory, naming, which layer holds the logic, response format).
3. The general rules in `.claude/rules/laravel-*.md`.

Do not introduce a layer or directory (Service, Action, Repository, DTO, Module…) the project does not already have, unless asked. Do not mix two styles for the same job. Follow the structure that exists, not the version number: an upgraded app may still have `app/Http/Kernel.php`/`app/Exceptions/Handler.php`; configure there if so, otherwise in `bootstrap/app.php`.

## Tooling

- Run the project's `composer` scripts (`composer lint`, `composer test`…) so the result matches CI. Run Pint/PHPStan/Rector on changed files before reporting done; fix the code, never loosen config or add a baseline/ignore entry.
- Format with the project's config (`pint.json`, `.php-cs-fixer.php`…). Pint with no config uses the `laravel` preset; with no formatter at all, follow PSR-12. Format only the files you changed.
- Generate files with `php artisan make:*` when a matching command exists. Never hand-write a migration's name or timestamp.
- Run Artisan with `--no-interaction` and every argument supplied; a missing one opens a prompt and the command hangs.
- Inspect config with `php artisan config:show <file>`; do not read `.env`. `php artisan tinker --execute '…'` for reads only. Verify behaviour with a test, not a throwaway script.
- Do not change dependencies (`composer require`/`remove`, version bumps) without approval.
- Leave no `dd()`, `dump()`, `ray()`, `var_dump()` or commented-out code behind.

## PHP

- Variables and methods camelCase, classes PascalCase, constants UPPER_SNAKE.
- Type parameters, returns and properties. `declare(strict_types=1)` only when files of the same kind already have it: enabling it piecemeal breaks code that relies on coercion.
- Multibyte strings (Vietnamese, Japanese…) go through `Str::` or `mb_*`, not `strlen`/`substr`/`strtolower`.
- Import classes with `use`; no inline FQCN; remove unused imports.
- Compare with `===`; never silence errors with `@`.
- New code throws on failure instead of returning `false`/`null`; `null` only when "nothing" is a valid result.
- Use `now()`/`CarbonImmutable`, not `date()`/`time()`. With mutable Carbon, `->copy()` before `add*`/`sub*`.
- Wait with `Sleep::for(…)`, not `sleep()`, so tests can fake it.

## Code structure

- Return early with guard clauses; do not nest `if`/`foreach` more than 3 levels deep.
- A method longer than ~40 lines, or doing several things, is split into well-named private methods.
- Boolean names read as predicates: `isActive`, `hasPaid`, `canCancel()`.
- No magic numbers/strings: thresholds and durations go in a constant, an enum or `config()`.
- Extract shared code only once it is duplicated in ≥2 places; add no option for a need that does not exist yet.

## Naming

| Kind | Convention | Example |
|---|---|---|
| Model / table / pivot | Singular / plural snake / both singular, alphabetical | `OrderItem` / `order_items` / `product_tag` |
| Foreign key | `{relationship}_id`; anything else is passed explicitly | `belongsTo(User::class, 'created_by')` |
| Relationship | `belongsTo`/`hasOne` singular, `hasMany`/`belongsToMany` plural | `customer()`, `orderItems()` |
| Form request | `Store{Model}Request`/`Update{Model}Request`, else the use case | `CancelOrderRequest` |
| Job / Event / Listener | Verb + object / past tense / the reaction | `SyncOrderToErp` / `OrderShipped` / `SendShipmentNotification` |
| Route URI / name | Plural kebab-case / dot-separated | `/order-items` / `order-items.show` |
| Config key / short translation key | snake_case | `services.payment.api_key` |
| Migration | The action, snake_case | `add_status_to_orders_table` |

## Comments

Comments explain WHY (business reason, edge case), not WHAT. Add a docblock only when types cannot say it (generic collections, array shapes) or tooling requires it.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
