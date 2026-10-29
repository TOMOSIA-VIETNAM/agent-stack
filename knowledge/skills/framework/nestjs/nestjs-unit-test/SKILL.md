---
name: nestjs-unit-test
description: Write or change a NestJS unit spec for one class, overriding the dependencies it must not call. Use when asked to add or change a unit test or spec for a controller, resolver, service, guard, pipe, interceptor, filter, listener, or processor.
---

# NestJS Unit Test

The procedure for a unit spec of one class. The constraints live in `.claude/rules/nestjs-testing.md`; they are not repeated here. A spec that sends a request through the app belongs to `nestjs-endpoint`. An `*.e2e-spec.ts` belongs to `nestjs-testing.md` › End to end.

## Step 0: Read the context

1. Read `.claude/rules/nestjs-testing.md` and `nestjs-conventions.md`, including **Project-specific**. When the class reads or writes stored data, also read `nestjs-persistence.md`.
2. Read the class. List every constructor dependency and the token it is injected with.
3. Read the 1–2 nearest specs of the same kind. Note where they live, how they build the module, and which mock helpers they use.
4. Change the spec this class already has. Do not add a second file for it.

**Done when:** you can name the spec file, the runner, and each token you will override.

## Step 1: Build the module

Create a `TestingModule` and compile it. Register the class under test. Override every dependency that must not run for real, per `nestjs-testing.md` › Unit tests.

The token is the one the constructor receives. A library decorator hides that token, so use the same argument the decorator was given:

| Decorator | Token |
|---|---|
| `@InjectRepository(Entity)` from `@nestjs/typeorm` | `getRepositoryToken(Entity)` from `@nestjs/typeorm` |
| `@InjectRepository(Entity)` from `@mikro-orm/nestjs` | `getRepositoryToken(Entity)` from `@mikro-orm/nestjs` |
| `@InjectModel(...)` | `getModelToken(...)` from `@nestjs/mongoose` |
| `@InjectQueue(...)` | `getQueueToken(...)` from the same package as the decorator (`@nestjs/bull` or `@nestjs/bullmq`) |
| `@Inject(TOKEN)` | that same `TOKEN`: a string, a `Symbol`, or a constant |
| none | the class in that parameter (`PrismaService`, `EntityManager`, the project's own provider) |

Use a row only when this class actually has that decorator. A module that would construct the real provider is overridden with `overrideProvider` before `compile`. A stand-in listed in `providers` is enough when the module does not import the real one. Follow the nearest spec.

The stand-in implements the calls this method makes, and nothing else. A query the method awaits through `.exec()` includes `exec` on the stand-in. Do not reach into a client the spec was not given.

A request-scoped or transient class is taken with `module.resolve(Class, contextId)`. `get()` throws `InvalidClassScopeException` for those scopes. Always create `contextId` with `ContextIdFactory.create()`. When the class injects `REQUEST`, call `module.registerRequestByContextId` with the request object for that id before `resolve`.

Clear the stand-in between cases the way the nearest spec does, so one case's return value does not leak into the next. When the project has no spec of this kind yet, build a fresh module in `beforeEach` and call the runner's `clearAllMocks` (`jest` or `vi`). Type the stand-in the way that spec does. Do not use `any`, and do not add a mocking package the project does not have (`nestjs-conventions.md` › Tooling & style).

**Done when:** the module compiles and each overridden token is the one the constructor receives.

## Step 2: Write the cases

Call the class the way production calls it:

| Class | Call |
|---|---|
| Controller, resolver | the handler method |
| Service, listener, processor | the public method |
| Guard | `canActivate`, with the context shape the neighbouring guard specs build |
| Pipe | `transform` |
| Interceptor | `intercept`, with a `next` handle the spec controls. Subscribe to the Observable it returns, or pass it to `lastValueFrom`. Otherwise the code after `next.handle()` never runs and the assertion passes |
| Filter | `catch`, with the exception the case is about |

Do not call a private method through a cast. `Reflector` stays the real one unless the neighbouring guard specs replace it.

Before writing, read the method. If it skips a check the rules require, report that instead of writing a spec that freezes it.

| Case | Verify |
|---|---|
| Happy path | the return value, and the arguments the method passes to the stand-in |
| Each branch the method has | the outcome of that branch, including the boundary value |
| A failure the method turns into an exception | that exception type, and that a write the method should have skipped did not happen |
| Unauthorized | a caller without access, and that a write did not happen, when this class performs that check |
| Someone else's record | actor A using actor B's id, blocked, and the stored data unchanged, when this class performs the ownership check |
| A stand-in rejecting | the path the method takes, when it has one |

Skip a row that does not apply and say why. Expected values are written out in the spec. Do not recompute them with the same formula as the code.

A bug fix starts from a spec that fails on the current code. Then change the code.

**Done when:** each case asserts an outcome a caller can observe.

## Step 3: Run

Run the spec, then the suite CI runs, per `nestjs-testing.md` › Running tests.

## Step 4: Report

- The spec file
- The class, and the methods the cases cover
- Each token overridden
- The command and its output
- Anything the reviewer still has to decide
