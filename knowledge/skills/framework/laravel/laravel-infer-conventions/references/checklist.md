# Convention checklist

Each item is a **real fork in the road**: Laravel allows several valid approaches, and the project's choice changes the code Claude writes. The search hints are only a starting point: always read a few real files before concluding.

Items marked **→ AGENTS.md** are recorded in `AGENTS.md` (the section in parentheses), not in a rule. Everything else goes in the Project-specific section of the rule named in the group heading. Skip a group whose rule the project did not receive (no Inertia, no `lang/`…).

Not in the checklist (skip): pure formatting (Pint handles it), anything an enabled Rector rule converts automatically, and framework defaults the agent already writes correctly.

## → laravel-conventions.md

| # | Fork | Search hints |
|---|---|---|
| A1 | **Business layer**: controller directly / Service / Action / Job / model method **→ AGENTS.md (Code & architecture)** | `ls app/Services app/Actions`; read 3–5 controller methods |
| A2 | **Calling Actions/Services**: `handle` / `execute` / `__invoke`; constructor injection / method injection / `app()` | grep `function handle\|function execute\|function __invoke` in the business layer |
| A3 | **Query layer**: Eloquent directly / Repository / Query object **→ AGENTS.md (Code & architecture)** | `ls app/Repositories app/Queries` |
| A4 | **DTOs**: none / readonly classes / spatie/laravel-data; where DTOs live | `ls app/Data app/DTOs app/DataObjects`; `composer.json` |
| A5 | **Modules/domains**: flat `app/` / `app/Domains/*` / `Modules/*` **→ AGENTS.md (Code & architecture)** | directory tree |
| C1 | **Format / static analysis commands**: composer scripts, Docker/Sail wrapper, PHPStan level, custom rules **→ AGENTS.md (Commands & environment)** | `composer.json` scripts; `phpstan.neon*`; `app/PHPStan` |
| C2 | **`strict_types`, `final`, readonly** used consistently or not | grep `declare(strict_types` / `final class` in `app/` |
| C3 | **Mandatory docblocks** (controller docblocks required by a custom PHPStan rule; `@property` on models) | read models and controllers; custom rules |
| C4 | **Non-standard naming**: class suffixes (`*Action`, `*Service`), form request names, API resource names | `ls` the directories in `app/` |

## → laravel-http.md

| # | Fork | Search hints |
|---|---|---|
| H1 | **Validation**: form request / `$request->validate()` / `Validator::make()` | `ls app/Http/Requests`; grep `->validate(` in controllers |
| H2 | **Controller style**: resource / single-action invokable / free-form methods | grep `__invoke`; `Route::resource\|apiResource` |
| H3 | **Routes**: files per guard/actor, prefixes; middleware attached at group / controller / attribute level | `routes/`, `bootstrap/app.php` |
| H4 | **Mandatory middleware for sensitive groups** (consent, 2FA, tenant) | middleware aliases in `bootstrap/app.php` |

## → laravel-resources.md

| # | Fork | Search hints |
|---|---|---|
| R1 | **Response format**: API resource directly / `{success, data, message}` wrapper / helper trait | read 3 API controllers; grep `response()->json` |
| R2 | **JSON errors without `Accept` header**: whether `shouldRenderJsonWhen` is set | `bootstrap/app.php` `withExceptions` |
| R3 | **API versioning** scheme, pagination style (`paginate` / `cursorPaginate` / `simplePaginate`) | `routes/api*`; grep `paginate(` |

## → laravel-authorization.md

| # | Fork | Search hints |
|---|---|---|
| Z1 | **Authentication**: Sanctum / Passport / JWT / session; guards and actors **→ AGENTS.md (Code & architecture)** | `config/auth.php`, `composer.json` |
| Z2 | **Authorization**: Policy / Gate / role middleware / package (spatie/permission); where it is invoked (`authorize()` in form request, `Gate::authorize`, `can:` middleware) | `ls app/Policies`; grep `Gate::define\|authorize(\|can:` |
| Z3 | **Tenant/actor scoping**: global scope / relationship queries / package | grep `addGlobalScope\|tenant` |

## → laravel-eloquent.md

| # | Fork | Search hints |
|---|---|---|
| M1 | **Mass assignment**: `#[Fillable]` / `$fillable` / `$guarded` | grep in `app/Models` |
| M2 | **Casts**: `casts()` / `$casts` | grep in `app/Models` |
| M3 | **Accessors/mutators**: `Attribute::make` / `getXxxAttribute()` | grep `Attribute::make` vs `function get.*Attribute` |
| M4 | **Enums**: directory, case style (PascalCase/UPPER), label/helper methods | `ls app/Enums`; read 2 enums |
| M5 | **Observers**: used / model `booted()` closures / none | `ls app/Observers`; grep `ObservedBy\|::observe(` |

## → laravel-queries.md

| # | Fork | Search hints |
|---|---|---|
| Q1 | **Cache store** in production, whether tags/locks are available, key naming | `config/cache.php`; grep `Cache::` |
| Q2 | **Lazy loading prevention**: `preventLazyLoading()`/`shouldBeStrict()` enabled and where | grep in `app/Providers` |

## → laravel-errors.md

| # | Fork | Search hints |
|---|---|---|
| E1 | **Business exceptions**: custom classes (static factories?) and where they are rendered | `ls app/Exceptions`; `bootstrap/app.php` |
| E2 | **Logging**: channels used, shared context (`Context::add`, `withContext`), error tracker (Sentry, Flare, Nightwatch) | `config/logging.php`; `composer.json` |

## → laravel-security.md

| # | Fork | Search hints |
|---|---|---|
| S1 | **Rate limiting**: named limiters in a provider / inline `throttle:x,y` | grep `RateLimiter::for\|throttle:` |
| S2 | **File storage**: default disk; private files served through a route or `temporaryUrl()` | `config/filesystems.php`; grep `Storage::disk` |

## → laravel-http-client.md

| # | Fork | Search hints |
|---|---|---|
| X1 | **External integrations**: interface + config-driven binding / concrete client class / `Http` macro; where clients live | `app/Providers/*`; `ls app/Services app/Integrations app/Clients` |

## → laravel-queues.md

| # | Fork | Search hints |
|---|---|---|
| J1 | **Jobs**: take a Model or an ID; attributes (`#[Tries]`) or properties; dedicated queues | read 3 jobs |
| J2 | **Queue routing**: `Queue::route()` / `onQueue()` / property; whether `after_commit` is on | `config/queue.php`; grep `onQueue(\|Queue::route` |
| J3 | **Events**: event-listener as the backbone, or direct calls; registration (discovery / `Event::listen`) | `ls app/Events app/Listeners`; `app/Providers` |

## → laravel-notifications.md

| # | Fork | Search hints |
|---|---|---|
| N1 | **Mailable vs Notification** split; notification directories per actor; locale handling | `ls app/Mail app/Notifications`; grep `HasLocalePreference\|->locale(` |

## → laravel-blade.md / laravel-inertia.md

| # | Fork | Search hints |
|---|---|---|
| U1 | **Frontend stack**: Blade / Inertia (Vue or React) / mixed **→ AGENTS.md (Code & architecture)** | `composer.json` (`inertiajs/inertia-laravel`); `resources/js` |
| U2 | **Blade layouts**: component layouts / `@extends`; class vs anonymous components | `ls resources/views/components app/View` |
| U3 | **Inertia**: pages directory casing, route helper (Ziggy / Wayfinder), shared props | `resources/js/{Pages,pages}`; `HandleInertiaRequests.php` |

## → laravel-lang.md

| # | Fork | Search hints |
|---|---|---|
| L1 | **Key style**: PHP short keys / JSON source sentences; supported locales | `ls lang/`; grep `__('` |

## → laravel-testing.md

| # | Fork | Search hints |
|---|---|---|
| T1 | **Framework**: Pest / PHPUnit; Pest plugins | `tests/Pest.php`, `composer.json` |
| T2 | **Test and coverage commands**, CI threshold **→ AGENTS.md (Commands & environment)** | CI config, `composer.json` scripts |
| T3 | **Test database**: in-memory SQLite / MySQL / Postgres; where traits are applied (`RefreshDatabase`, `LazilyRefreshDatabase`) | `phpunit.xml`, `tests/Pest.php`, `tests/TestCase.php` |
| T4 | **Shared setup in TestCase** (headers, cache flush, seeding) | `tests/TestCase.php` |
| T5 | **Shared helpers** (global functions in Pest.php, traits) | `tests/Pest.php`, `tests/Concerns` |
| T6 | **Test directory structure** (per guard/actor, per API version) | `ls -R tests/Feature` |
| T7 | **Whether Unit tests boot Laravel/the database** | `tests/Pest.php` (`uses(...)->in('Unit')`) |
| T8 | **Test naming/grouping conventions** (`describe` with ticket IDs, `group`) | read 3 tests |
| T9 | **Default status for unauthorized access**: 403 or 404 | existing authorization tests |

## → laravel-migrations.md

| # | Fork | Search hints |
|---|---|---|
| D1 | **Database engine** in dev/prod | `config/database.php`, `docker-compose.yml`, CI |
| D2 | **Primary keys**: auto-increment / UUID / ULID | grep `HasUuids\|HasUlids`; `id()` vs `uuid(` in migrations |
| D3 | **Soft deletes**: used widely or sparingly | grep `SoftDeletes` |
| D4 | **Naming convention for hand-named indexes/constraints** | grep `->index('` / `->unique('` with a name |
| D5 | **Migrations**: anonymous or named classes; several tables per file | read the 3 most recent migrations |
| D6 | **Timezone stored in the database**, special timestamp columns | `config/app.php` timezone; migrations |
| D7 | **Schema documentation** used as the reference | `docs/`, README |

## → laravel-factories.md / laravel-seeders.md

| # | Fork | Search hints |
|---|---|---|
| F1 | **Seeders required for setup** (master data) and how they run in production | `DatabaseSeeder.php`; deploy scripts |
| F2 | **Factory states**: naming (`paid()` / `asPaid()` / `withStatus()`), use of `sequence()`/`for()`/`has()` | read 3 factories |

## → laravel-config.md

| # | Fork | Search hints |
|---|---|---|
| G1 | **Own config files**: one per feature / everything in `services.php` / an `app.php` section | `ls config/`; grep `config('` |
| G2 | **Feature flags**: config values / Laravel Pennant / environment checks | `composer.json` `laravel/pennant`; grep `Feature::\|isProduction` |

## → laravel-scheduling.md

| # | Fork | Search hints |
|---|---|---|
| K1 | **Where the schedule lives**: `routes/console.php` / `bootstrap/app.php` `withSchedule()` / `app/Console/Kernel.php` | grep `Schedule::\|withSchedule\|->schedule(` |
| K2 | **Multi-server and timezone**: `onOneServer()`, `withoutOverlapping()`, `->timezone()` used consistently | read the schedule definition |
