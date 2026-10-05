# Convention checklist

Each item is a **real fork in the road**: Laravel allows several valid approaches, and the project's choice changes the code Claude writes. The search hints are only a starting point: always read a few real files before concluding.

Items marked **→ AGENTS.md** are recorded in `AGENTS.md` (the section in parentheses), not in a rule. Everything else goes in the Project-specific section of the rule named in the group heading.

Not in the checklist (skip): pure formatting (Pint handles it), anything an enabled Rector rule converts automatically, and framework defaults the agent already writes correctly.

## → laravel-pattern.md

| # | Fork | Search hints |
|---|---|---|
| P1 | **Business layer**: controller directly / Service / Action / Job / model method **→ AGENTS.md (Code & architecture)** | `ls app/Services app/Actions`; read 3–5 controller methods |
| P2 | **Calling Actions/Services**: `handle` / `execute` / `__invoke`; constructor injection / method injection / `app()` | grep `function handle\|function execute\|function __invoke` in the business layer |
| P3 | **Query layer**: Eloquent directly / Repository / Query object **→ AGENTS.md (Code & architecture)** | `ls app/Repositories app/Queries` |
| P4 | **DTOs**: none / readonly classes / spatie/laravel-data; where DTOs live | `ls app/Data app/DTOs app/DataObjects`; `composer.json` |
| P5 | **Modules/domains**: flat `app/` / `app/Domains/*` / `Modules/*` **→ AGENTS.md (Code & architecture)** | directory tree |
| P6 | **Validation**: FormRequest / `$request->validate()` / `Validator::make()` | `ls app/Http/Requests`; grep `->validate(` in controllers |
| P7 | **Controller style**: resource / single-action invokable / free-form methods | grep `__invoke`; `Route::resource\|apiResource` |
| P8 | **Routes**: files per guard/actor, prefixes, API versioning; middleware attached at group / controller / attribute level | `routes/`, `bootstrap/app.php` or `RouteServiceProvider` |
| P9 | **Authentication**: Sanctum / Passport / JWT / session; list of guards and actors **→ AGENTS.md (Code & architecture)** | `config/auth.php`, `composer.json` |
| P10 | **Authorization**: Policy / Gate / role middleware / package (spatie/permission); where it is invoked (`authorize()` in FormRequest, `Gate::authorize`, `can:` middleware) | `ls app/Policies`; grep `Gate::define\|authorize(\|can:` |
| P11 | **API response format**: Resource directly / `{success, data, message}` wrapper / helper trait | read 3 API controllers; grep `response()->json` |
| P11b | **API always returns JSON on errors** (even when the client omits the `Accept` header): whether `shouldRenderJsonWhen` is set | `bootstrap/app.php` `withExceptions`, or `Handler.php` |
| P12 | **Business exceptions**: custom classes (static factories?) and where they are rendered | `ls app/Exceptions`; `bootstrap/app.php` or `Handler.php` |

## → laravel-security.md

| # | Fork | Search hints |
|---|---|---|
| S1 | **Mandatory middleware for sensitive data groups** (consent, 2FA, tenant) | middleware aliases in `bootstrap/app.php`/Kernel |
| S2 | **Rate limiting**: named limiters in a provider / inline `throttle:x,y` | grep `RateLimiter::for\|throttle:` |
| S3 | **File storage**: default disk; private files served through a route or `temporaryUrl()` | `config/filesystems.php`; grep `Storage::disk` |

## → laravel-queue.md

| # | Fork | Search hints |
|---|---|---|
| Q1 | **External integrations**: interface + config-driven binding / concrete class; where clients live | `app/Providers/*ServiceProvider.php`; `ls app/Services/*` |
| Q2 | **Events/Notifications**: event-listener as the backbone, or direct calls; notification directories per actor | `ls app/Events app/Listeners app/Notifications` |
| Q3 | **Jobs**: take a Model or an ID; `$tries`, dedicated queues | read 3 jobs |
| Q4 | **Queue connection/queue name** per kind of work; whether `after_commit` is enabled on the connection | `config/queue.php`; grep `onQueue(` |

## → laravel-conventions.md

| # | Fork | Search hints |
|---|---|---|
| C1 | **Format / static analysis commands**: composer scripts, Docker/Sail wrapper, PHPStan level, custom rules **→ AGENTS.md (Commands & environment)** | `composer.json` scripts; `phpstan.neon*`; `app/PHPStan` |
| C2 | **Mass assignment**: `$fillable` / `#[Fillable]` / `$guarded` | grep in `app/Models` |
| C3 | **Casts**: `casts()` / `$casts` (record only when an L11+ project still keeps `$casts`) | grep in `app/Models` |
| C4 | **Accessors/mutators**: `Attribute` class / legacy `getXxxAttribute()` | grep `Attribute::make` vs `function get.*Attribute` |
| C5 | **Enums**: directory, case style (PascalCase/UPPER), label/helper methods | `ls app/Enums`; read 2 enums |
| C6 | **`strict_types`, `final`, readonly** used consistently or not | grep `declare(strict_types` / `final class` in `app/` |
| C7 | **Mandatory docblocks** (e.g. controller docblocks required by a custom PHPStan rule; `@property` on models) | read models and controllers; custom rules |
| C8 | **Non-standard naming**: class suffixes (`*Action`, `*Service`), FormRequest names, Resource names | `ls` the directories in `app/` |

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

## → laravel-database.md

| # | Fork | Search hints |
|---|---|---|
| D1 | **Database engine** in dev/prod | `config/database.php`, `docker-compose.yml`, CI |
| D2 | **Primary keys**: auto-increment / UUID / ULID | grep `HasUuids\|HasUlids`; `id()` vs `uuid(` in migrations |
| D3 | **Soft deletes**: used widely or sparingly | grep `SoftDeletes` |
| D4 | **Naming convention for hand-named indexes/constraints** | grep `->index('` / `->unique('` with a name |
| D5 | **Migrations**: anonymous or named classes; several tables per file | read the 3 most recent migrations |
| D6 | **Timezone stored in the database**, special timestamp columns | `config/app.php` timezone; migrations |
| D7 | **Schema documentation** used as the reference | `docs/`, README |
| D8 | **Seeders required for setup** (master data) | `DatabaseSeeder.php` |
