# Convention checklist

Each item is a real fork: NestJS allows several valid approaches, and the project's choice changes the code Claude writes. The search hints are a starting point. Read a few real files before concluding.

Items marked **→ AGENTS.md** are recorded in `AGENTS.md` (the section in parentheses). Everything else goes in the Project-specific section of the rule named in the group heading.

Skip pure formatting, anything ESLint or `tsconfig` already rejects, and a framework default the rules already state.

## → nestjs-architecture.md

| # | Fork | Search hints |
|---|---|---|
| A1 | **Layout**: one app under `src/`, or a monorepo (`apps/`, `libs/` in `nest-cli.json`) **→ AGENTS.md (Code & architecture)** | `nest-cli.json`, directory tree |
| A2 | **Module style**: one `AppModule`, or a module per feature | `*.module.ts` |
| A3 | **Business layer**: controller calls the service / logic stays in the controller / an extra use-case or CQRS layer **→ AGENTS.md (Code & architecture)** | read 3 controllers and the services they call |
| A4 | **API surface**: REST, GraphQL (`*.resolver.ts`), WebSocket (`*.gateway.ts`), microservice, or more than one **→ AGENTS.md (Code & architecture)** | `*.controller.ts`, `*.resolver.ts`, `*.gateway.ts`, `@MessagePattern` |
| A5 | **Queues and cron**: Bull / BullMQ (`*.processor.ts`), `@nestjs/schedule`, or none | `package.json`, `*.processor.ts`, `@Cron` |
| A6 | **Circular dependencies**: `forwardRef` in use, or providers kept acyclic | grep `forwardRef` |
| A7 | **Directory map**: by feature or by layer; inside a feature, `dto/` and `entities/` folders or flat; the shared folder's name and what it holds; where guards, filters, and decorators live. Record it as a short tree **→ AGENTS.md (Code & architecture)** | directory tree of `src/` (and `apps/`, `libs/`), 2–3 features |

## → nestjs-http.md

| # | Fork | Search hints |
|---|---|---|
| H1 | **Validation**: `class-validator` with `ValidationPipe`, or a Standard Schema library (Zod, Valibot, ArkType) with `StandardSchemaValidationPipe` or a `schema` on the parameter decorator | `main.ts`, a few DTOs |
| H2 | **OpenAPI**: DTOs carry `@ApiProperty` (or another `@nestjs/swagger` decorator), or they do not | grep `ApiProperty` |
| H3 | **Response shape**: the resource as-is, a wrapper, or a shared interceptor | read 3 controllers |
| H4 | **Errors**: the project's exception filter and exception classes | `*.filter.ts`, `main.ts` |
| H5 | **Route wildcard** the project writes on new routes and in `forRoutes`, when the app is NestJS 11+ on Express | controller paths, `MiddlewareConsumer.forRoutes`, `@nestjs/platform-fastify` |
| H6 | **Pagination**: the query shape and the response shape neighbouring lists use | one list handler |

## → nestjs-persistence.md

| # | Fork | Search hints |
|---|---|---|
| D1 | **ORM**: TypeORM, Prisma, MikroORM, Mongoose, Drizzle, or none **→ AGENTS.md (Code & architecture)** | `package.json` |
| D2 | **Access**: injected repository, Prisma service, `EntityManager`, Mongoose model, or a repository class of the project's own | read 3 services that touch the database |
| D3 | **Transactions**: the helper the project calls (`QueryRunner`, `prisma.$transaction`, `em.transactional`) | grep the helper |
| D4 | **Migrations**: generated from the schema or created empty and written by hand; the script that creates and the one that applies; whether names are snake_case | `package.json` scripts, `migrations/` or `prisma/migrations/` |
| D5 | **Primary keys**: auto-increment, UUID, or ULID | one entity or `schema.prisma` |

## → nestjs-security.md

| # | Fork | Search hints |
|---|---|---|
| S1 | **Auth**: Passport strategy, a hand-written guard, `@nestjs/jwt`, or none **→ AGENTS.md (Code & architecture)** | `*.strategy.ts`, `*.guard.ts`, `package.json` |
| S2 | **Where the guard is applied**: global `APP_GUARD`, controller `@UseGuards`, or per method; with a global guard, the decorator that opts a handler out (`@Public()`, `@SkipAuth()`…) | `app.module.ts`, one controller, grep `SetMetadata` and `Reflector` |
| S3 | **How an id is scoped to the current user**: relation on the query, a tenant id, or a policy check | one handler that loads by id |
| S4 | **How sensitive fields stay out of responses**: response DTO classes, `ClassSerializerInterceptor` with `@Exclude` / `@Expose`, a `select` or projection, or raw entities | `ClassSerializerInterceptor`, grep `@Exclude`, the user entity and the handler that returns it |

## → nestjs-config.md

| # | Fork | Search hints |
|---|---|---|
| C1 | **Config access**: `ConfigService`, a typed config factory, or `process.env` in services | grep `process.env` and `ConfigService` under `src/` |
| C2 | **Env validation**: Joi, a Standard Schema library, or none | `ConfigModule.forRoot`, `package.json` |
| C3 | **Global pipe, prefix, CORS**: set in `main.ts` or not; whether `enableShutdownHooks()` is called, so shutdown hooks actually run | `main.ts` |

## → nestjs-conventions.md

| # | Fork | Search hints |
|---|---|---|
| N1 | **Commands**: package manager, lint, typecheck, test, e2e, and whether they run in a container **→ AGENTS.md (Commands & environment)** | `package.json` scripts, CI, lockfile |
| N2 | **Installed NestJS major** (10, 11, or 12), **HTTP adapter** (Express or Fastify), and **module format** (CommonJS or ESM) **→ AGENTS.md (Code & architecture)** | `package.json`, lockfile, `"type": "module"` |
| N3 | **Node.js** the app, the CLI, and the tests run on, only when the installed major has a minimum in `nestjs-conventions.md` › Versions & runtime or `nestjs-testing.md` **→ AGENTS.md (Commands & environment)** | `engines`, `.nvmrc`, CI image |
| N4 | **How files are created**: `nest g` with the flags the project passes (`--no-spec`, `--flat`), or by hand | `nest-cli.json`, the layout of recent files |
| N5 | **File names** that differ from kebab-case dotted roles | a few filenames |
| N6 | **Logger**: Nest `Logger`, `nestjs-pino`, winston, or the project's own; and how a class gets one (`new Logger(Foo.name)` or injected) | `package.json`, grep `Logger` under `src/` |

## → nestjs-testing.md

| # | Fork | Search hints |
|---|---|---|
| T1 | **Runner**: Jest or Vitest | `package.json`, `jest` config, `vitest` config |
| T2 | **Where specs live**: beside the source, or under `test/` | `*.spec.ts`, `*.e2e-spec.ts` |
| T3 | **Unit setup**: `TestingModule` overrides, shared testing module | read 2 specs |
| T4 | **End to end**: present or absent; the script that runs `*.e2e-spec.ts` **→ AGENTS.md (Commands & environment)** | `test/`, `package.json` scripts |
