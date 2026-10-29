---
paths:
  - "**/*.controller.ts"
  - "**/*.service.ts"
  - "**/*.strategy.ts"
  - "**/*.guard.ts"
  - "**/*.resolver.ts"
  - "**/*.gateway.ts"
  - "**/config/**"
---

# NestJS Security

## Authentication

- A new controller route, resolver method, or gateway handler takes the same guard as the handlers next to it. Leave a handler public only when its neighbours are public, or the user asked for a public one.
- When the guard is registered globally (`APP_GUARD`) and the project has a metadata decorator for opting out (`@Public()`, `@SkipAuth()`, read through `Reflector`), a public handler takes that decorator. Do not remove the global guard, and do not add a path check inside the guard to let one route through.
- Use the strategy (`*.strategy.ts`) and guard the project already has. Do not add a second auth library (a new Passport strategy package, a hand-rolled JWT verify) beside the one in use.
- Hash passwords and sign tokens with the helper the project already uses. Do not write a new hash or a new token format.

## Object access

- An id that arrives on the request (route param, query, body, GraphQL argument) must be loaded inside the current actor's scope: their relation, a tenant id, or the check the neighbouring handlers already make. A lookup by that id alone lets one user read or change another user's record.

## Secrets

- Never log passwords, tokens, connection strings, or the raw `Authorization` header.

## Input

- Do not concatenate request input into a raw query. Bind it through the ORM or the driver.
- A webhook verifies the signature the provider documents before any field in the body is used.
- The project's `ValidationPipe` stays where it is registered (global in `main.ts` or `APP_PIPE`, or per controller) with the options it has. Do not add a second one on a controller unless the neighbouring controllers already do, and do not change `whitelist`, `forbidNonWhitelisted`, or `transform` for one route.
- When `whitelist` is off, a field the DTO does not declare still reaches the handler, so pick the fields you persist one by one instead of passing the whole DTO to `save`, `create`, or `update`.

## Output

- Shape the response the way the neighbouring handlers do: a response DTO, a `select`/projection, or the entity under the project's serializer. Whichever it is, a column that holds a secret (password hash, reset token, API key, internal flag) never reaches the client. When the neighbours return the raw entity and it has such a column, hide that column (`@Exclude`, a projection) rather than returning it.
- A new column that holds a secret is hidden from responses in the same change that adds it.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
