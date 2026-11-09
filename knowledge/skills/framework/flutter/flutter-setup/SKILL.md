---
name: flutter-setup
description: Sets up a Flutter project's quality tooling - strict lints (very_good_analysis), the analyzer gate script, folder layout, flavors, l10n, router, DI, CI and an optional format-on-edit hook. Use for "start a new Flutter app", "set up lints for this Flutter repo", "add CI to the Flutter project" or "make the analyzer strict".
---

# Flutter Setup

New project or existing repo. The rules in `.claude/rules/flutter-*.md` already describe how the code must look; this skill installs the tooling that enforces them. Everything it copies lives beside this file.

## Step 1: Detect the mode

1. No `pubspec.yaml` → new project: `flutter create --org <org> --platforms=android,ios <name>`, then continue inside it.
2. `pubspec.yaml` exists → retrofit. Change as little as possible; never move files or restructure without approval.
3. Read `pubspec.yaml` for the state library (`flutter_bloc` or `flutter_riverpod`), router, DI and l10n packages. If the state library is not decided on a new project, ask.

## Step 2: Lints

1. Add `very_good_analysis` to `dev_dependencies` (or keep `flutter_lints` if the team prefers; see the comments in the file). Check the current version and minimum SDK on pub.dev before pinning, and sort `dev_dependencies` alphabetically (`sort_pub_dependencies` is on).
2. Merge `references/analysis_options.yaml` into the project's `analysis_options.yaml`. Keep any existing `exclude:` entries.
3. Run `flutter pub get` and `flutter analyze`. On a retrofit, report the number of issues: strict rules can surface many.
4. Do not mass-suppress. Offer `flutter-fix-analyzer` as a separate step to pay the count down.
5. Check: `flutter analyze` completes and the count is reported.

## Step 3: The gate script

1. Copy `scripts/verify.sh` to `<repo>/scripts/verify.sh` and `chmod +x` it. It runs the format check on changed files, the analyzer, then tests.
2. New project: `dart format lib test`, then `scripts/verify.sh` must print `VERIFY OK`.
3. Retrofit with existing issues: run `scripts/verify.sh --write-baseline` once. The gate then means "no issues in touched files and total not above the baseline"; add `.analyze-baseline` to version control, not `.gitignore`.
4. Check: `scripts/verify.sh` prints `VERIFY OK`.

## Step 4: Skeleton (new project only)

Create what the project lacks and nothing more: `lib/core/{network,di,theme,l10n,router,utils}`, `lib/features/`, one entry point per flavor (`main_dev.dart`, `main_stg.dart`, `main_prod.dart`) with flavor config, `.env.sample` with real `.env*` in `.gitignore`, l10n setup, router, DI composition root, a `Result` type (see `../flutter-references/architecture.md`) and theme tokens. Check: `flutter run` starts on the dev flavor.

## Step 5: CI (ask first)

Copy `references/ci.yml` to `.github/workflows/flutter-ci.yml`. Enable the `build_runner` step only if the project uses code generation. Check: the workflow's commands pass locally.

## Step 6: Format-on-edit hook (optional, ask first)

1. Copy `scripts/dart-format.sh` to `<repo>/.claude/hooks/dart-format.sh` and `chmod +x` it. It needs `jq`, ignores non-`.dart` and generated files, and exits 2 on a format failure.
2. Merge `references/hooks.json` into `<repo>/.claude/settings.json`; show the diff before writing. Do not add `flutter analyze` as a per-edit hook: it is too slow, run it through `scripts/verify.sh`.

## Step 7: Wrap up

Report what was installed, what was skipped and why, the analyzer count (and baseline if written), and the output of the last `scripts/verify.sh` run.
