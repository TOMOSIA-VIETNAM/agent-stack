---
name: flutter-test
description: Writes or repairs Flutter tests - unit, bloc_test or ProviderContainer state tests, widget, golden (Alchemist) and integration tests - including regression tests and flaky-test fixes. Use for Flutter test coverage, "write tests for this cubit", or a failing or flaky Flutter test.
---

# Write Flutter tests

## Steps
0. **Read the rules first.** Path-scoped rules load only after a matching file is read or edited, which has not happened yet for new files. Read `.claude/rules/flutter-conventions.md`, plus the `flutter-*.md` rules for the layers you will touch (`flutter-architecture`, `flutter-state-bloc` or `flutter-state-riverpod`, `flutter-ui`, `flutter-data`, `flutter-testing`), before writing code.
1. **Choose the test type** with the table in `../flutter-references/testing.md`. Smallest type that proves the behavior.
2. **Inspect existing tests** for the project's mocking lib (mocktail vs mockito), helpers (`pumpApp`), and naming. Match them.
3. **Bug fix?** Write the failing test first; confirm it fails for the right reason (run it); then fix; then confirm green.
4. **State tests.** BLoC: `blocTest` (build/act/expect/verify). Riverpod: `ProviderContainer` + overrides, `addTearDown(container.dispose)`. Assert the full state sequence, not just the last state. Cover success, each failure type, and edge cases (empty, duplicate, rapid repeat).
5. **Widget tests.** Pump through the shared wrapper (theme/l10n/providers). Find by key/semantics. Cover loading, empty, error, data, and one interaction. Use `pump(Duration)` over `pumpAndSettle` when animations loop.
6. **Golden tests** (only for stable, design-critical components): Alchemist, tag `golden`, fixed size/fonts. Update baselines deliberately: `flutter test --update-goldens --tags golden`, review the diff images.
7. **Determinism.** No real network/clock/random/sleep. Inject fakes and `Clock`.
8. **Flaky test?** Find the nondeterminism (timers, un-awaited futures, shared mutable state, order dependence); fix the cause; never add retries or `skip`.
9. **Verify (gate).** `dart format --set-exit-if-changed <touched>` → `flutter analyze` (no issues in touched files; total not above the count before you started, or 0 on a project with no issues; if the project has `scripts/verify.sh`, run it instead) → `flutter test <touched files>` then full `flutter test`. Report output.

Reference: `../flutter-references/testing.md`, `bloc.md`, `riverpod.md`.
