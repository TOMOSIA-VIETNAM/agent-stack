---
name: flutter-fix-analyzer
description: Fixes `flutter analyze` errors, warnings and lints at the root cause without suppressing them, working down to zero or to the baseline. Use when the Flutter analyzer reports issues, a lint rule was just enabled, or CI fails on analyze.
---

# Fix analyzer issues

## Steps
1. **Baseline.** `flutter analyze` → save the count and group issues by rule (`grep`/sort by lint name).
2. **Fix by category, most severe first**: errors → warnings → infos. Fix a whole rule across the codebase in one pass when mechanical (`dart fix --dry-run` then `dart fix --apply` for safe fixes; review the diff).
3. **Root cause, not suppression.**
   - `use_build_context_synchronously` → capture what you need before `await` or check `context.mounted`.
   - `unawaited_futures` → `await` it, or `unawaited(...)` with a reason.
   - `avoid_dynamic_calls` / strict-* → add real types.
   - `deprecated_member_use` → migrate to the replacement API; read the deprecation message.
   - `cancel_subscriptions` / dispose lints → add the cancel/dispose.
4. **Suppression is last resort**: line-level `// ignore: rule` with a one-line reason, only with user approval. Never `ignore_for_file` or disable a rule in `analysis_options.yaml` to get green.
5. **Generated files**: fix the generator input or exclude patterns in `analysis_options.yaml`; never hand-edit `*.g.dart`/`*.freezed.dart`.
6. **Do not change behavior** while silencing lints; if a fix would, stop and ask.
7. **Verify (gate).** `dart format --set-exit-if-changed <touched>` → `flutter analyze` (no issues in touched files; total not above the count before you started, or 0 on a project with no issues; if the project has `scripts/verify.sh`, run it instead) → `flutter test`. Report before/after counts.
