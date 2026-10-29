---
paths:
  - "**/*.spec.ts"
  - "**/*.e2e-spec.ts"
  - "**/test/**"
---

# NestJS Testing

## Before writing tests

- Use the runner the project already uses: Jest when `package.json` or the Nest config points at Jest, Vitest when it points at Vitest. Do not mix the two in one suite.
- Read the 1–2 nearest specs of the same kind and follow their style (where they live, how they build the module, which matcher they use).
- An existing spec that follows a project convention different from this rule stays as it is. Point out a weakness and let the user decide; do not rewrite the file to match this rule.
- NestJS 12+ and a project that still runs Jest: Jest loads the ESM-only Nest packages only on Node.js 24.9 or later. Do not switch the runner to Vitest to get past an older Node. Finish the code and the specs, and report that they could not be run and why.

## Unit tests

- Build a `TestingModule` and override the providers the class under test must not call. Do not boot the real database, the real HTTP server, or a real broker.
- Override the injection token the class depends on. Do not stub a method inside the ORM client the test was not given.

## End to end

- End-to-end files are named `*.e2e-spec.ts`. `*.spec.ts` does not match that name.
- Boot the app the way the existing end-to-end file does (`INestApplication` and the project's setup). Run them with the project's e2e script when that script differs from the unit-test script.
- The test app applies the same global setup as `main.ts`: prefix, pipes, filters, interceptors. Without it, a request that production rejects passes in the test. Reuse the project's setup helper when there is one, rather than copying the calls.
- Close the app (`await app.close()`) in the teardown hook, so open connections do not hang the runner or leak into the next file.

## Running tests

- Run through the `package.json` script. While coding, filter to the spec you changed. Before reporting done, run the full suite the CI runs.
- When a test fails, fix the code or the wrong test. Do not delete the test, call `.skip`, or weaken the assertion to make it pass.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
