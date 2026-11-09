---
paths:
  - "test/**"
  - "integration_test/**"
  - "**/*_test.dart"
---

# Testing

- Pyramid: many unit + state tests (`bloc_test` / `ProviderContainer`), fewer widget tests, few golden tests, very few integration tests.
- Prefer **fakes** over mocks for repositories/services; use `mocktail` (no codegen) unless the project already standardised on `mockito` — then stay consistent.
- Every bug fix ships with a regression test that fails before the fix.
- Tests are deterministic: no real network, no real clock, no randomness, no sleeping. Inject `Clock`, use `fakeAsync` / `pump(Duration)`.
- Widget tests: pump the widget inside the same providers/theme/l10n wrapper as the app (shared `pumpApp` helper); find by semantics/keys, not by brittle text/index.
- Golden tests: Alchemist (`golden_toolkit` is discontinued); tag `golden`; fixed fonts and surface size; commit baselines; run on one CI platform.
- Integration: plain `integration_test` for Flutter-only flows; Patrol only when native UI is needed (permissions, notifications, system dialogs).
- Test names state behavior: `'emits [loading, failure] when repository returns Err'`.
- Mirror `lib/` structure under `test/`. Shared builders/fakes in `test/helpers/`.
- Do not test generated code or trivial getters; test behavior and boundaries.
