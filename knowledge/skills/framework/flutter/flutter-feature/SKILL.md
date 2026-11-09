---
name: flutter-feature
description: Builds a new Flutter feature end to end - data layer, Cubit/Bloc or Riverpod state, UI with loading/empty/error states, route, localized strings and tests - in the project's own structure. Use when asked to add a screen, page, flow, tab, module or feature to a Flutter app.
---

# Scaffold a Flutter feature

The rules in `.claude/rules/flutter-*.md` define how the code must look; this is the procedure for building a feature. Rules are not repeated here.

## Steps
0. **Read the rules first.** Path-scoped rules load only after a matching file is read or edited, which has not happened yet for new files. Read `.claude/rules/flutter-conventions.md`, plus the `flutter-*.md` rules for the layers you will touch (`flutter-architecture`, `flutter-state-bloc` or `flutter-state-riverpod`, `flutter-ui`, `flutter-data`, `flutter-testing`), before writing code.
1. **Detect conventions.** Read `pubspec.yaml` (state lib: `flutter_bloc` → BLoC, `riverpod` → Riverpod; DI lib; router; l10n), `lib/` layout, and one existing feature as the style template. Follow the project's existing structure if it differs from this kit's; do not reorganize.
2. **Clarify scope** only if ambiguous: screens, data source, states (loading/empty/error/data), navigation entry points. Otherwise decide and state assumptions.
3. **Data layer.** DTO (if new API → use `flutter-endpoint`), service, repository returning `Result<DomainModel>`; register in DI.
4. **State holder.** Cubit/Notifier (Bloc only if event transformers needed). Sealed/immutable state with value equality covering loading, empty, error, data. Consume `Result` via exhaustive `switch`.
5. **UI.** Page (route target, provides/reads state) + small widgets. All four states rendered. No hard-coded text/colors/spacing; no logic in `build`.
6. **Route.** Register in the router (typed/constant path); add entry navigation.
7. **Strings.** Add keys via `flutter-i18n` for every locale.
8. **Tests.** State-holder tests (success, failure, edge), mapper/repository tests with fakes, one widget test per state. Use `flutter-test` for details.
9. **Dispose check.** Every controller/focus node/subscription created is disposed.
10. **Verify (gate).** Run and report real output:
    - `dart run build_runner build --delete-conflicting-outputs` (only if generated code involved)
    - `dart format --set-exit-if-changed <touched files>`
    - `flutter analyze` (no issues in touched files; total not above the count before you started, or 0 on a project with no issues; if the project has `scripts/verify.sh`, run it instead)
    - `flutter test`

References: `../flutter-references/architecture.md`, `bloc.md` or `riverpod.md`.
