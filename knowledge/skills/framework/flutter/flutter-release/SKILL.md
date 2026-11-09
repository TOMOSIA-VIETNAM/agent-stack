---
name: flutter-release
description: Builds a Flutter release for one flavor - version bump, signing, obfuscation, debug-symbol archive and optional distribution. Manual only; produces release artifacts.
disable-model-invocation: true
argument-hint: "<flavor: dev|stg|prod> <android|ios>"
---

# Release build

Side-effecting. Confirm flavor, platform and version with the user before running anything that builds, signs or uploads.

## Steps
1. **Pre-flight gate.** Clean tree on the release branch. `dart format --set-exit-if-changed lib test` → `flutter analyze` (no issues in touched files; total not above the count before you started, or 0 on a project with no issues; if the project has `scripts/verify.sh`, run it instead) → `flutter test`. Stop on failure.
2. **Flavor + config.** Confirm `.env.<flavor>` / dart-defines exist (never print values). Confirm app id, Firebase config and base URL belong to the target flavor.
3. **Version.** Bump `version: x.y.z+build` in `pubspec.yaml`; build number strictly increasing. Commit `chore(release): vX.Y.Z+N`.
4. **Build.**
   - Android: `flutter build appbundle --release --flavor <f> --obfuscate --split-debug-info=build/symbols`
   - iOS: `flutter build ipa --release --flavor <f> --obfuscate --split-debug-info=build/symbols`
5. **Symbols.** Archive `build/symbols` per version; upload to the crash reporter (Crashlytics/Sentry). Do not commit symbols.
6. **Signing.** Keystore/certs come from CI secrets or local untracked files; never commit or print them.
7. **Distribute** (only if user asked): fastlane lane / store console / TestFlight. Tag the release: `git tag vX.Y.Z+N` (push only on request).
8. **Report**: artifact paths, version, flavor, checks run, anything skipped.

Reference: `../flutter-references/security.md`. CI template: `../flutter-setup/references/ci.yml`.
