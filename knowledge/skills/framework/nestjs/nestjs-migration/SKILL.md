---
name: nestjs-migration
description: Change the database schema of a NestJS project safely. Use when asked to add, change, or drop a column, table, index, or migration.
---

# NestJS Migration

The procedure for a schema change. The library-specific rules live in `.claude/rules/nestjs-persistence.md`; they are not repeated here.

## Step 0: Read the context

1. Read `.claude/rules/nestjs-persistence.md` and `nestjs-conventions.md`, including their **Project-specific** sections.
2. Decide which library applies from `package.json` (TypeORM, Prisma, MikroORM, Mongoose, Drizzle). If none of them is installed and the repo has no migration directory, stop and ask. Do not pick one.
3. Read the 1–2 most recent migrations (or the schema file, for Mongoose). Note how they were made (generated, or created empty and written by hand) and follow their style.
4. Find every use of the table or column you will change: entity or schema, DTO, service, spec.
5. Find which database the migration commands connect to: the ORM config, `.env.example`, the Docker service. TypeORM `migration:generate` and Prisma `migrate dev` both connect to it. If it is not a local database, or you cannot tell, stop and ask.

**Done when:** you can name the library, the schema file you will edit, the command the project uses to create a migration, and the local database it will reach.

## Step 1: Classify the change

| Kind | Approach |
|---|---|
| New table or collection | One migration, or a schema edit for Mongoose |
| Add a nullable column, or one with a default | One migration |
| Add a NOT NULL column with no default to a table that has rows | Add it nullable, backfill, then a later migration makes it NOT NULL |
| Rename, drop, or retype a column the code still reads | Expand then contract, one release per step |

The staged rows protect a table that already holds production data while old and new code run side by side. When the table is not released yet, or the project ships this kind of change in one migration, one migration is enough. Say which case applies.

For a staged change, show every step and wait for confirmation. Do only the first step this time, unless asked otherwise.

## Step 2: Edit the schema source first

| Library | Edit |
|---|---|
| TypeORM | The entity |
| Prisma | `schema.prisma` |
| MikroORM | The entity |
| Mongoose | The `*.schema.ts` file |
| Drizzle | The schema in the project's Drizzle directory |

A generator diffs this source, so a migration generated before the edit does not contain the change. Leave schema sync as `nestjs-persistence.md` requires.

## Step 3: Create the migration

- Create it the way the recent migrations were made, through the project's command, passing a name when the command takes one.
- Prisma: for a change that needs hand edits (a rename, a backfill), use `--create-only` and edit before applying. If the command offers to reset the database, stop and ask. Generate the client afterwards.
- When generating needs a database that is not running, say so. Do not hand-write the file to get around it, unless the project writes its migrations by hand anyway.
- Open the generated file and read every statement before keeping it. A generator sees a renamed column as one dropped and one added, and may emit changes from unrelated drift between the schema and your local database. Rewrite a drop-and-add into a rename, and remove statements this change did not ask for.
- Mongoose has no SQL migration generator. When existing documents cannot satisfy the new shape, use the project's data script, or ask before writing one.

## Step 4: Update related code

Update DTOs, services, and specs that read or write the column. Skip a file the change does not affect.

## Step 5: Verify

Run the project's migrate command against the local database from Step 0, then the specs for the changed model. Never point a migration at a shared database to "see if it works".

## Step 6: Report

- The schema edit and the migration that was created
- Related files updated
- The migrate and test commands, and their results
- A staged change: which step landed, and which step is next
