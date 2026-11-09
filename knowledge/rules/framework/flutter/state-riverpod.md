---
paths:
  - "lib/**/providers/**"
  - "lib/**/notifiers/**"
  - "lib/**/*_provider.dart"
  - "lib/**/*_notifier.dart"
---

# Riverpod (3.x)

Applies only when `pubspec.yaml` depends on `flutter_riverpod` or `riverpod`. In a BLoC project ignore this file. Version notes below are for Riverpod 3.0+.

- Use `@riverpod` code generation plus `riverpod_lint`. Generated providers are autoDispose by default; use `keepAlive: true` only with a reason.
- `ref.watch` in `build` / provider bodies. `ref.read` only inside callbacks (button handlers). Never `ref.read` in `build`.
- After any `await` in a notifier, check `ref.mounted` before touching state or `ref`; v3 throws on use after dispose.
- Providers depend on repositories, repositories on services; override the bottom layer in tests with `ProviderContainer(overrides: [...])`.
- Use `AsyncValue` + `.when` / pattern `switch` in UI; use `.value` (not the removed `valueOrNull`); handle loading, error and data explicitly.
- State is immutable with value equality. v3 filters updates with `==`, so mutated-in-place state will not notify.
- Legacy `StateProvider` / `StateNotifierProvider` / `ChangeNotifierProvider` live in `legacy.dart`; do not use in new code.
- Do not mandate experimental v3 features (mutations, offline persistence); their APIs may change without a major bump.
- `ref.listen` for side effects (navigation, snackbars), never inside `build` logic that returns widgets.

Reference: `.claude/skills/flutter-references/riverpod.md`.
