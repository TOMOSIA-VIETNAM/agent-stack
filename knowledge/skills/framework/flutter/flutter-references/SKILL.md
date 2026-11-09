---
name: flutter-references
description: Reference notes for the other flutter-* skills and rules, covering architecture and the Result pattern, BLoC, Riverpod 3, testing, performance, accessibility, security and go_router. Read by path when a Flutter task needs detail beyond the rules; never invoked on its own.
disable-model-invocation: true
---

# Flutter references

Knowledge files, loaded on demand. Other flutter-* skills link here via `../flutter-references/<file>`.

| File | Read when |
|---|---|
| `architecture.md` | layering, Result pattern, repository/service/use-case boundaries |
| `bloc.md` | Cubit vs Bloc, transformers, selectors, bloc_test |
| `riverpod.md` | Riverpod 3 rules, migration from v2, testing with overrides |
| `testing.md` | choosing test type, fakes, goldens, integration/Patrol |
| `performance.md` | jank, rebuilds, lists, images, profiling |
| `accessibility.md` | Semantics, targets, text scale, contrast |
| `security.md` | secrets, storage, pinning, obfuscation, permissions |
| `go-router.md` | routes, typed routes, redirects, deep links |

Architecture, Result pattern, BLoC and Riverpod 3 notes were checked against official docs/changelogs at authoring time (sources: docs.flutter.dev app-architecture guide, bloclibrary.dev, riverpod.dev). Performance, accessibility, security, Dart 3 lint and mocktail/Alchemist guidance is established practice written from experience, not re-fetched; re-verify against current docs and re-check package versions on pub.dev before relying on specifics.
