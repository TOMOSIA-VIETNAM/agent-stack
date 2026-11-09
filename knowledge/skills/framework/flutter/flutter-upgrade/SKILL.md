---
name: flutter-upgrade
description: Upgrades the Flutter SDK or pub dependencies safely - outdated check, one major version at a time, changelog-driven migration, code generation and a full gate after each step. Use for "upgrade Flutter packages", "bump the Flutter SDK" or "migrate to Riverpod 3 / a new major version".
---

# Upgrade dependencies

## Steps
1. **Clean tree.** `git status` must be clean (or user-confirmed). Work on a branch.
2. **Survey.** `flutter pub outdated`. Split into: patch/minor (safe batch) vs major (one at a time) vs SDK constraint changes.
3. **Batch patch/minor** with `flutter pub upgrade`; run the gate (below); commit.
4. **Each major, alone.** Read the package changelog / migration guide on pub.dev (do not rely on memory; e.g. Riverpod 3 removed `valueOrNull`, moved legacy providers to `legacy.dart`, requires `ref.mounted` checks). Bump the constraint, `flutter pub get`, regenerate code (`dart run build_runner build --delete-conflicting-outputs`), fix compile errors, run the gate, commit separately.
5. **Flutter SDK bump.** Check release notes for breaking changes and deprecations; update `environment` constraints; run `flutter analyze` and fix new deprecations properly (see `flutter-fix-analyzer`); verify iOS (`pod install`) and Android (Gradle/AGP/Kotlin) builds if native files changed.
6. **Do not** upgrade unrelated packages, loosen constraints to `any`, or leave `dependency_overrides` behind without noting why.
7. **Gate after each step.** `dart format --set-exit-if-changed lib test` → `flutter analyze` (no issues in touched files; total not above the count before you started, or 0 on a project with no issues; if the project has `scripts/verify.sh`, run it instead) → `flutter test`. For native-affecting bumps also `flutter build apk --debug --flavor <f>` (or project equivalent).
8. **Summarize** for the PR: what moved (old → new), breaking changes handled, anything deferred and why.
