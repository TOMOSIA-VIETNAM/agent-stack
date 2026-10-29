---
paths:
  - "**/*.controller.ts"
  - "**/*.dto.ts"
  - "**/*.pipe.ts"
  - "**/*.interceptor.ts"
  - "**/*.filter.ts"
  - "**/*.resolver.ts"
  - "**/*.gateway.ts"
---

# NestJS HTTP

## Handlers

- A controller method takes the request, calls the service the project uses, and returns the response. Queries and business rules live in that service, unless the nearest controllers already keep them inline.
- A GraphQL resolver follows the nearest resolver. HTTP status codes do not apply to it. Do not add a resolver, a gateway, or a microservice handler in a project that has none.
- A WebSocket gateway follows the nearest gateway, including how it authenticates the connection.
- Microservice handlers: `@MessagePattern` answers the caller; `@EventPattern` does not, and whatever it returns is thrown away. Pick by whether the sender needs a result. On the client side, `send()` returns a cold observable that sends nothing until subscribed (`await firstValueFrom(...)`), while `emit()` goes out at once.

## Where a concern goes

Each enhancer runs at a fixed point of the request, so a job placed in the wrong one runs too early, too late, or not at all.

| Enhancer | Holds | Keep out |
|---|---|---|
| Middleware | Raw request work: request id, body parsing, logging context | Authorization, validation of a handler's arguments |
| Guard | Whether this caller may reach this handler | Shaping the response, writing data |
| Pipe | Validating and converting one argument | Database writes, outbound calls |
| Interceptor | Work around the handler: timing, tracing, mapping the result | Business rules hidden from the handler |
| Exception filter | Turning an uncaught error into a response | Retrying the operation, swallowing the error |
| Param decorator | Reading something already on the request (the user, a header) | Loading from the database, checking permissions |

## Input

- Body, query, and route params the handler persists or branches on go through a DTO or a pipe. Do not read the raw request for those fields.
- Class DTOs use `class-validator` with the project's `ValidationPipe`. NestJS 12+: `StandardSchemaValidationPipe`, or a `schema` option on `@Body()`, `@Query()`, or `@Param()`, only when the project already validates with Zod, Valibot, or ArkType. Do not add one of those libraries to a `class-validator` project.
- NestJS 12.2+: an `exceptionFactory` that reads `error.target` gets `undefined` unless the project sets `validationError: { target: true }`.
- NestJS 11+ with the Express adapter (the default) uses Express 5. Nest still rewrites a legacy unnamed `*` into that syntax, so an existing route keeps matching, but the unnamed form is discouraged. On a new route, name the wildcard (`*splat`, or `{*splat}` when it must also match the root). Do the same for a middleware path passed to `forRoutes`, not only a controller decorator. When editing a route that already exists, copy its syntax, including a Fastify app or a project still on NestJS 10.
- Add `@ApiProperty` (or the project's other OpenAPI decorator) only on DTOs that already carry it.
- Import `PartialType`, `PickType`, `OmitType`, and `IntersectionType` from the package the neighbouring DTOs import them from. In a project with `@nestjs/swagger`, that is `@nestjs/swagger`: the copy in `@nestjs/mapped-types` still carries the validation rules but drops the OpenAPI metadata, so the derived DTO shows up empty in the generated docs.

## Responses & errors

- Return the shape the neighbouring handlers return. Do not invent a new envelope (`{ success, data }`) the project does not use.
- Throw the project's exception type, or `HttpException`, so the filter already registered renders it. Catching the error and returning a hand-built object skips that filter and the status it sets.
- A list uses the pagination the neighbouring list handlers use.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
