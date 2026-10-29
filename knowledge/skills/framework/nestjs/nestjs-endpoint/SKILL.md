---
name: nestjs-endpoint
description: Add or change a NestJS endpoint end to end - module, controller or resolver, DTO, service, tests. Use when asked to add or change an endpoint, route, API, or CRUD action.
---

# NestJS Endpoint

The procedure for adding or changing one endpoint. Each step points to a rule in `.claude/rules/nestjs-*.md`; the rules are not repeated here.

## Step 0: Read the context (mandatory, before writing code)

1. Read `.claude/rules/nestjs-architecture.md`, `nestjs-http.md`, `nestjs-security.md`, `nestjs-conventions.md` and `nestjs-testing.md`, especially each file's **Project-specific** section. If the endpoint reads or writes stored data, also read `nestjs-persistence.md`.
2. Establish:
   - The **surface**: REST controller, GraphQL resolver, or WebSocket gateway, from `AGENTS.md` or the files that already exist. Do not add a surface the project does not have.
   - The **actor** who may call it, and which guard the neighbouring handlers use.
   - Whether the endpoint is **new** or an **existing** one being changed. If existing, read it, its callers, and its specs first.
3. Find the 1–2 nearest handlers of the same kind. Note and follow:
   - which module owns them, and whether the provider is exported
   - DTO, pipe, and validation style
   - response shape and exception type
   - where the spec lives
4. If the request lacks something that decides behaviour (who may call it, which fields are required, what a missing record returns), ask; do not guess.

**Done when:** you can name the files you will create or change, and the existing handlers you are following.

## Step 1: Module & handler

- Put the handler in the feature module the nearest handler lives in. Register a new provider there. Export it only when another module injects it.
- A feature with no module yet: place its folder and files per `nestjs-conventions.md` › File placement, and import the new module where the project registers its feature modules.
- Create the files the way the neighbouring ones were created, per `nestjs-conventions.md` (`nest g` or by hand).
- A controller method calls the service and returns. A resolver or gateway follows the nearest file of that kind.

## Step 2: Input

- Add or extend a DTO (or the project's schema) for every field the handler persists or branches on.
- Validate and decorate it the way the neighbouring DTOs are, per `nestjs-http.md` › Input (validation library, OpenAPI decorators, mapped types).

## Step 3: Authorization & scope

- The new handler takes the same guard as the handlers next to it. A public handler needs the user to ask for one, and when the guard is global it takes the project's opt-out decorator (`@Public()` or whatever `nestjs-security.md` names) rather than a hole in the guard.
- Load a record by an id from the request inside the current actor's scope, as `nestjs-security.md` describes. Say where that check lives (guard, service, or both) before writing it.

## Step 4: Service & persistence

- Business rules and queries go in the service, unless the nearest handlers keep them inline.
- A write across two or more tables or documents, and a list that needs its relations: apply `nestjs-persistence.md` › Shared.

## Step 5: Tests

Before writing specs, review the handler you just wrote. If authorization is never called, or input is persisted without validation, report that instead of writing a spec that freezes it.

Write specs per `nestjs-testing.md`, at the level the neighbouring specs test. A spec that builds a `TestingModule` for one class follows the `nestjs-unit-test` skill. When the access check lives in the service, that unit spec still covers Unauthorized and Someone else's record from the table below. A spec that sends a request through the app covers each case below that applies. Skip one that does not and say why: a public endpoint has no unauthenticated case, data with no owner has no someone-else's-record case.

| Case | Verify |
|---|---|
| Happy path | the result (status, payload, or return value) and, for a write, the stored fields |
| Validation | one required field missing or invalid, and the error on that field |
| Unauthenticated | the status or error the neighbouring specs expect |
| Unauthorized | a caller without access, and the stored data unchanged |
| Someone else's record | actor A using actor B's id, blocked, stored data unchanged |

Run the new specs filtered, then the full suite.

## Step 6: Wrap up

1. Run formatting and the typecheck per `nestjs-conventions.md` on the changed files.
2. Report:
   - Files created or changed
   - Route (method and path), resolver field, or gateway message
   - Who may call it, and where that is checked
   - Specs added and the test output
   - Anything the reviewer still has to decide
