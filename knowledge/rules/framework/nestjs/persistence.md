---
paths:
  - "**/*.entity.ts"
  - "**/*.repository.ts"
  - "**/*.service.ts"
  - "**/*.schema.ts"
  - "**/prisma/**"
  - "**/migrations/**"
  - "**/drizzle/**"
---

# NestJS Persistence

## Which library

Apply only the section for a library listed in `package.json`. A project with none of them has no schema tool to run.

| Library | Present when `package.json` has |
|---|---|
| TypeORM | `typeorm` or `@nestjs/typeorm` |
| Prisma | `prisma` or `@prisma/client` |
| MikroORM | `@mikro-orm/core` or `@mikro-orm/nestjs` |
| Mongoose | `mongoose` or `@nestjs/mongoose` |
| Drizzle | `drizzle-orm` |

## Shared

- Writes that must succeed or fail together (an order and its lines, a debit and its credit) run in one transaction, through the helper the project already uses. Writes that stand on their own (an audit row, a view counter) do not need one. MongoDB supports transactions only on a replica set or a sharded cluster: follow the neighbouring services, and ask when the project has no transaction yet.
- Do not make an outbound HTTP call inside a transaction: a rollback cannot undo it.
- Inside a transaction, every read and write goes through the handle that transaction gives you (the `tx` of `prisma.$transaction`, the `manager` of a TypeORM `QueryRunner` or `transaction` callback, the forked `EntityManager`). A repository or client injected in the constructor is bound to its own connection, so a call through it commits on its own and survives the rollback.
- Load the relations the response needs with the parent query, or with one batched query over all the parent ids. A loop that queries once per row is an N+1.
- Make a migration the way the most recent ones were made: generated from the schema, or created empty through the CLI and written by hand. Either way the CLI names the file; do not type a timestamp yourself.
- Do not edit a migration that has been merged or already applied on a shared database. Ship a new migration.

## TypeORM

- Do not set `synchronize: true`. It edits a shared database to match the entities, including dropping columns. Change the schema with a migration.
- When the project generates migrations, change the entity first. `migration:generate` diffs the entities against a running database, so it needs one, and a migration generated before the entity change does not contain it.
- Inject the repository the way the neighbouring services do (`Repository<Entity>` or the project's custom repository). Do not call `getRepository` on a global connection when those services inject it.

## Prisma

- Change `schema.prisma` first. `migrate dev` diffs that file against the development database and applies the result at once. For a change you must edit before it runs (a rename, a backfill), use `migrate dev --create-only`, edit the SQL, then apply it.
- When `migrate dev` reports drift and offers to reset the database, stop and ask. A reset deletes every row.
- Run `prisma generate` after the schema change so the client types match the schema.
- Use the `PrismaClient` (or the service that wraps it) the project already provides. Do not construct a new client per request.

## MikroORM

- Change the entity first, then the project's migration command (`mikro-orm migration:create` unless the project names another).
- Use the `EntityManager` the neighbouring services inject. A request-scoped manager is not the global one.

## Mongoose

- Mongoose has no `synchronize`. `autoIndex` and `autoCreate` build indexes and create collections when the application starts. Leave them as the project already sets them. Do not turn them on to skip a schema step.
- Change the `*.schema.ts` file first. Mongoose does not generate a SQL migration. When existing documents cannot satisfy the new shape, use the data script the project already has for that, or ask before writing one.
- Inject the model the module registers. Do not open a second connection.

## Drizzle

- Change the schema under the project's Drizzle directory first, then the project's generate command (`drizzle-kit generate` unless the project names another). Pass the name when that command requires one.
- Run queries through the database client the project already provides.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
