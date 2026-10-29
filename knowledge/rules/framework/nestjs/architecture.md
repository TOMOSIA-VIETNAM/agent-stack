---
paths:
  - "**/*.module.ts"
  - "**/*.service.ts"
  - "**/*.processor.ts"
  - "**/*.listener.ts"
  - "**/main.ts"
---

# NestJS Architecture

## Order of precedence

1. `AGENTS.md` and the **Project-specific** section at the end of each rule file in `.claude/rules/nestjs-*.md`.
2. Patterns already in the code: before creating a class, read the 1–2 nearest files of the same kind and follow them (directory, naming, which layer holds the logic, how a provider is registered).
3. The general rules in `.claude/rules/nestjs-*.md`.

Do not introduce a layer the project does not already have (repository, use-case, CQRS bus, a second `AppModule`). Do not mix two styles for the same job.

## Modules & providers

- Put a feature in its own module when the project already splits that way. Register a provider in the module that owns it, and export it only when another module injects it.
- A provider is listed in the `providers` of one module only. Listing the same class in a second module builds a second instance with its own state, so a cache or a counter silently splits in two. To use it elsewhere, import the module that owns it.
- Do not mark a module `@Global()` to save an import. Only a module the project already treats as global is.
- Inject dependencies through the constructor. Do not `new` a provider from another provider: the container then no longer supplies its dependencies, its scope, or its mocks in tests.
- A TypeScript interface is erased at compile time, so it cannot be an injection token. Inject an abstraction through the token form the project already uses: a `Symbol` or string constant with `@Inject(TOKEN)`, or an abstract class.
- Declare what a provider needs in its constructor. `ModuleRef.get()` and `ModuleRef.resolve()` are for plugin-style lookups the project already does, not a way to reach a provider without declaring it.
- NestJS 12+: a subclass that declares its own constructor repeats `@Optional()` on that constructor. Otherwise the missing dependency throws `UnknownDependenciesException`.
- NestJS 12.0.x also drops the parent's optional markers when the subclass declares no constructor of its own. From 12.1, that subclass keeps them.
- `forwardRef` only where the project already uses it to break a real cycle, with a comment that names the cycle. Do not reach for it to paper over a layering mistake the nearest modules do not make.
- A queue processor (`*.processor.ts`) is a provider: register it in the module that owns the queue, the same way the nearest processor is registered.

## Work outside a request

Exception filters only see errors thrown while a request, message, or gateway event is being handled. Code that runs on its own (a job, a listener, a scheduled method, a promise nobody awaits) does not reach a filter:

- A promise left floating "so the response returns sooner" (a welcome mail, an audit write) rejects with nobody listening: an unhandled rejection, which stops the process on Node.js 15+. `await` it, or give it a `.catch` that logs through the project's logger.
- A `@OnEvent` listener or a `@Cron` / `@Interval` method that throws is caught by Nest, written to the Nest logger, and forgotten: no retry, no alert, and the emitter never hears about it. When the failure matters (money, a notification the user expects), handle it inside the method the way the neighbouring listeners do: a retry, a queue, or the project's alerting.
- A queue processor lets a failure throw, so the queue records it and retries. Catching the error and returning normally marks the job as done.
- A queue job can be delivered more than once, and a `@Cron` method fires in every running instance of the app. Write the handler so a second run changes nothing (check state first, or key the write uniquely), or follow the lock or single-instance setup the project already has.

## Lifecycle hooks

- Async setup (opening a connection, loading a remote value) goes in `onModuleInit` or `onApplicationBootstrap`, and the hook returns or awaits the promise so Nest waits for it. A constructor stays synchronous.
- Cleanup goes in `onModuleDestroy`, `beforeApplicationShutdown`, or `onApplicationShutdown`. `app.close()` runs them either way. A termination signal (`SIGTERM`, `SIGINT`) reaches them only when `main.ts` calls `app.enableShutdownHooks()`. If the process is stopped by a signal and shutdown hooks are not enabled, say so instead of relying on the hook.
- Request-scoped providers never receive lifecycle hooks.

## Scope

- Providers are singletons unless the project already marks that kind of provider request-scoped or transient. A request-scoped provider forces every provider that injects it to be request-scoped too, so do not mark one without the same reason the existing code has.
- Do not store request data on a field of a singleton. The next request would read it.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
