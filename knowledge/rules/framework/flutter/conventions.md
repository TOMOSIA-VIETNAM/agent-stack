# Flutter Conventions

Apply to every Dart file in the project. A violation is a bug, not a style choice.

- **Layers.** UI (View + Bloc/Cubit/Notifier/ViewModel) → Data (Repository → Service). Views hold no business logic. Repositories are the source of truth for one data type, map DTO → domain model, and never depend on other repositories. Services are stateless and wrap one source. Add a domain/use-case layer only when logic merges ≥2 repositories or is reused across state holders.
- **Result boundary.** Repositories always return `sealed class Result<T>` (`Ok` / `Err`; do not shadow `dart:core` `Error`); hand-written services do too. A generated Retrofit interface returns `Future<Dto>` and throws; leave it as is and let the repository (or a thin wrapper) catch and convert to `Result`. State holders consume `Result` with an exhaustive `switch`. No raw exceptions reach the UI.
- **Dart 3.** States, events and results are `sealed`. Use exhaustive `switch`; never `default:` on a sealed type. Records for tiny multi-value returns. `final class` / `base` where extension is unwanted.
- **Immutability.** State classes are immutable with value equality (Equatable or freezed). `const` wherever possible.
- **DI.** One composition root, constructor injection. Never construct a Bloc/Repository/Service inside a widget or inside another state holder.
- **No hard-coded** user text, colors, spacing, asset paths, preference keys. Use l10n, theme tokens, constants.
- **Lifecycle.** Dispose/close every controller, focus node, subscription, stream controller, notifier, audio/video player. Check `mounted` / `context.mounted` after every `await` that precedes context use.
- **Generated files** (`*.g.dart`, `*.freezed.dart`, `*.mocks.dart`) are never hand-edited. Regenerate with `dart run build_runner build --delete-conflicting-outputs`.
- **Imports.** One style (package imports). No cross-feature imports except through that feature's public barrel.
- **Async.** No unawaited futures; mark intentional ones with `unawaited(...)`. Cancel stale work (restartable/droppable transformers, `ref.onDispose`, `StreamSubscription.cancel`).
- **Scope.** Touch only what the task needs. Format only touched files. New dependency only with a stated reason and a maintenance check (pub.dev score, last release, null-safety).
- **No suppression.** No new `// ignore:` or `ignore_for_file` without a one-line reason and user approval.
- **Definition of done.** Run `dart format --set-exit-if-changed <touched files>`, then `flutter analyze` (no issues in touched files; total not above the count before you started), then `flutter test`, and report the real output. If the project has `scripts/verify.sh`, run it instead. Never claim "done" or "works" without having run them; if one cannot run, say so.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
