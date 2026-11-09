# Testing reference

## Which test?
| Question | Test |
|---|---|
| Pure logic, mapper, parser | unit |
| State transitions of Bloc/Cubit/Notifier | `bloc_test` / `ProviderContainer` |
| Widget renders states, reacts to taps | widget test |
| Visual regression of a stable component | golden (Alchemist) |
| Full flow on device/emulator | `integration_test` |
| Needs native UI (permission dialog, notification) | Patrol |

## Practices
- Fakes > mocks: a hand-written `FakeUserRepository` with settable result is clearer than stubbing every call. `mocktail` for the rest (no codegen). If project uses `mockito`, stay consistent and regenerate mocks via build_runner.
- `pumpApp(tester, widget, {overrides})` helper wraps theme, l10n, router, providers once.
- Find with `find.byKey` / `find.bySemanticsLabel`; avoid `find.byType` chains and index-based finds.
- `await tester.pumpAndSettle()` hangs on infinite animations — use `pump(Duration)`.
- Time: inject `Clock` (`package:clock`) and use `withClock`/`fakeAsync`.
- Golden: tag `@Tags(['golden'])`, fixed surface size, load fonts, one CI platform produces baselines. `golden_toolkit` is discontinued; use `alchemist`.
- Coverage is a signal, not a goal: cover branches in state holders and mappers.
- Regression rule: reproduce the bug in a failing test first.
