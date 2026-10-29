---
paths:
  - "**/main.ts"
  - "**/*.module.ts"
  - "**/config/**"
---

# NestJS Config

## Bootstrap

- Global prefix, CORS, body limits, pipes, filters, and interceptors are set in `main.ts` the way that file already sets them. Do not register a second global pipe or filter that fights the one already there.
- The `ValidationPipe` and its options are covered in `nestjs-security.md` › Input; this file does not repeat them.
- A global guard, pipe, interceptor, or filter that injects anything is registered as a provider with `APP_GUARD`, `APP_PIPE`, `APP_INTERCEPTOR`, or `APP_FILTER`. `app.useGlobalGuards(new RolesGuard())` in `main.ts` builds it outside the container, so its constructor dependencies are never supplied.

## Environment

- When the project uses `ConfigModule`, a service reads configuration through `ConfigService` or the typed config the project registers. It does not read `process.env`.
- A new environment variable is added, in the same change, to `.env.example` with a dummy value. When the project already has an env validation schema, add it there too (required or with a default, so a missing value stops the app at startup instead of failing on the first request that needs it). Do not create a schema the project does not have.
- NestJS 12+: `ConfigModule.forRoot({ validationSchema })` accepts any Standard Schema (Zod, Valibot, ArkType).
- A Joi schema that already validates stays a Joi schema. NestJS 12+ needs Joi 18 or later, and options that belong to Joi sit under `validationOptions.libraryOptions`, not beside `validationSchema`. Do not rewrite a working Joi schema into another library.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
