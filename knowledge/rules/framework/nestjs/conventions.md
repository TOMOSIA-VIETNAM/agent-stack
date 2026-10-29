# NestJS Conventions

## Tooling & style

- Detect the package manager from the lockfile (`package-lock.json` → npm, `pnpm-lock.yaml` → pnpm, `yarn.lock` → Yarn, `bun.lock`/`bun.lockb` → Bun) or the `packageManager` field in `package.json`. Use only that one; a second lockfile in the repo is a bug.
- Run checks through the `package.json` scripts (`lint`, `typecheck`, `test`, `format`…) so the result matches CI. Do not assemble your own command when a script exists.
- Check `package.json` and the config files for ESLint, Prettier, Biome and TypeScript. If present, run them on the changed files before reporting done; on a violation, fix the code — do not loosen the config or add an ignore entry.
- Do not add `eslint-disable`, `// @ts-ignore`, `// @ts-nocheck` or `as any` to get past a check. If a suppression is genuinely unavoidable, use `// @ts-expect-error` with the reason on the same line.
- Run the project's typecheck script when `package.json` has one. `nest start` passing proves nothing about types.
- Format only the files you changed; do not mass-reformat unrelated files.
- Leave no `console.log`, `debugger`, or commented-out code behind. Keep `console.error`/`console.warn` only where the project already logs that way.
- Do not change dependencies (install, remove, upgrade) without approval. Before adding a library for something small, check whether the project already has one that does it.
- Do not read `.env` files; read `.env.example` and the config that consumes the variables.
- Create files the way the neighbouring ones were created. Use `nest g` when they look generated, with the flags the project passes (`--no-spec`, `--flat`); otherwise write them by hand after the nearest file of the same kind. `nest g resource` writes a whole CRUD set and edits the module, so check what it added and remove what the task did not ask for.
- In a monorepo (`projects` in `nest-cli.json`, with `apps/` and `libs/`), pass `--project <name>` to `nest g`, `nest build`, and `nest start`, and run the scripts for the app you changed.

## File placement

Decide where a new file goes before writing it, in this order:

1. The directory map in `AGENTS.md` or a **Project-specific** section.
2. A file of the same kind in the same feature: put the new one beside it.
3. A file of the same kind in another feature: copy its sub-folder pattern into the target feature (`dto/`, `entities/`, or flat).
4. No example anywhere: under the app root (`apps/<name>/src` when `nest-cli.json` lists projects, otherwise `src/`), `<feature>/` holds `<feature>.module.ts`, `<feature>.controller.ts`, and `<feature>.service.ts`, with `dto/` and `entities/` beside them. A unit spec sits next to its source; end-to-end specs go in `test/`.

A project organised by layer (`controllers/`, `services/`, `dtos/` at the top) stays organised by layer. Add to the layer folders; do not start a feature folder or move files.

Shared code:

- Code used by one feature stays in that feature, however generic it looks.
- When a second feature needs a provider, import the module that owns it. Move code to the project's shared folder (`common/`, `shared/`, whichever exists) only when it belongs to no feature: a guard, filter, interceptor, or decorator used across the app.
- Do not create a `SharedModule`, a `CoreModule`, or a shared folder the project does not have. Ask first.

Monorepo (`apps/` and `libs/`):

- Code for one app goes in `apps/<app>`. It moves to `libs/` only when two or more apps use it, or a lib for that job already exists.
- An app never imports from another app's folder, including its entities. Apps share contracts through `libs/` (DTOs, message types, constants), not database models: two apps on one entity cannot change that table on their own.

## Versions & runtime

- Read `@nestjs/core` in `package.json`, then the lockfile for the installed version, before using an API added in a later release. An application still on NestJS 10 or 11 keeps that release's patterns; do not upgrade it as part of an unrelated change.
- Follow the files that exist, not the newest documentation. A project upgraded across a major may still use the old module layout, the old route syntax, or CommonJS.
- NestJS 12+: the core packages ship as ESM. A CommonJS application stays CommonJS unless it already is ESM or the user asks to switch. `nest` does not change the module format on upgrade. Consuming those packages from CommonJS needs Node.js 20.19+ or 22.12+ (the 21.x line cannot). Generating or upgrading with the CLI needs Node.js 22.22.3+, 24.15+, or 26+.

## TypeScript

- If the project uses TypeScript, new files are `.ts`. Match the project's `tsconfig` strictness; never relax it.
- Do not introduce a new `any`. An existing `any` stays until the signature that carries it is already being edited.
- Data from outside the program (request bodies, query strings, webhook payloads, `JSON.parse`, environment variables) is `unknown` until a pipe, a schema, or a narrowing check accepts it. Never assert it with `as User`.
- Import types with `import type` when the project's ESLint or `tsconfig` (`consistent-type-imports`, `verbatimModuleSyntax`) requires it.

## Naming

| Kind | Convention | Example |
|---|---|---|
| Module | PascalCase + `Module` | `OrdersModule` |
| Controller | Plural + `Controller` | `OrdersController` |
| Service | Plural + `Service` | `OrdersService` |
| DTO | Verb + model + `Dto` | `CreateOrderDto` |
| Guard | PascalCase + `Guard` | `JwtAuthGuard` |
| Pipe | PascalCase + `Pipe` | `ParseOrderIdPipe` |
| Interceptor | PascalCase + `Interceptor` | `LoggingInterceptor` |
| Filter | PascalCase + `Filter` | `HttpExceptionFilter` |
| Entity / model | Singular PascalCase | `Order` |
| Resolver | Plural + `Resolver` | `OrdersResolver` |
| Gateway | PascalCase + `Gateway` | `OrdersGateway` |
| Processor | PascalCase + `Processor` | `OrderProcessor` |
| File | kebab-case, dotted role | `orders.controller.ts`, `create-order.dto.ts` |
| Unit spec | Same base name + `.spec.ts` | `orders.service.spec.ts` |
| End-to-end spec | `*.e2e-spec.ts` | `orders.e2e-spec.ts` |

Follow the project's file names when they differ from this table. A DTO named after the use case (`CancelOrderDto`) beats a CRUD name when the action is not create or update.

## Comments

- Comments explain WHY (a business rule, a framework quirk, a workaround with a link), not WHAT the code already says.
- Add a docblock only where types cannot express enough, or where the project's tooling requires one.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
