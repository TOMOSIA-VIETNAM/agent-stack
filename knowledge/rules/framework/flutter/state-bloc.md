---
paths:
  - "lib/**/bloc/**"
  - "lib/**/blocs/**"
  - "lib/**/cubit/**"
  - "lib/**/*_bloc.dart"
  - "lib/**/*_cubit.dart"
---

# BLoC / Cubit

Applies only when `pubspec.yaml` depends on `flutter_bloc`. In a Riverpod project ignore this file.

- Default to **Cubit**. Use **Bloc** only when you need event traceability or event transformers.
- State: `sealed` hierarchy or one immutable class with a status enum, plus value equality (Equatable/freezed). Equal consecutive states are dropped, so equality must be correct.
- Emit only inside the Cubit/Bloc. Never emit after `close()`; guard async gaps with `if (isClosed) return;`.
- Bloc: one handler per event; pick the transformer from `bloc_concurrency` deliberately (`restartable` for search, `droppable` for submit, `sequential` for ordered work, debounce for typing).
- Blocs/Cubits call repositories only, never services or HTTP clients directly. Map `Result` to state with an exhaustive `switch`.
- Report failures with `addError` and handle them in `BlocObserver`; do not swallow exceptions in `catch (_) {}`.
- Provide with `BlocProvider` at the narrowest useful scope; a bloc created with `create:` is closed automatically, one passed via `.value` is not.
- Narrow rebuilds: `BlocSelector`, `buildWhen`, `context.select`. Side effects (navigation, snackbars) go in `BlocListener`, not `BlocBuilder`.
- Tests: `bloc_test` with fake repositories; assert full state sequence and verify calls.

Reference: `.claude/skills/flutter-references/bloc.md`.
