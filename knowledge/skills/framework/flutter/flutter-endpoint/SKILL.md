---
name: flutter-endpoint
description: Adds or changes a backend API call in a Flutter app - DTO, Retrofit/Dio service, repository mapping to a domain model, Result error handling and tests. Use when an endpoint is added, a response or request shape changes, or a repository method is needed.
---

# Add / change an API endpoint

## Steps
0. **Read the rules first.** Path-scoped rules load only after a matching file is read or edited, which has not happened yet for new files. Read `.claude/rules/flutter-conventions.md`, plus the `flutter-*.md` rules for the layers you will touch (`flutter-architecture`, `flutter-state-bloc` or `flutter-state-riverpod`, `flutter-ui`, `flutter-data`, `flutter-testing`), before writing code.
1. **Read the contract.** Get the exact request/response shape (OpenAPI, backend code, sample JSON). Do not guess field names or nullability; ask if unavailable.
2. **DTO.** `@JsonSerializable` class in the data layer; mark nullable vs required per contract; unknown enum values map to a safe fallback (`@JsonKey(unknownEnumValue: ...)`).
3. **Service.** Add the method to the existing Retrofit interface / Dio service. A hand-written Dio service returns `Result<Dto>`. A generated Retrofit interface returns `Future<Dto>` and throws; do not edit generated code. In that case the repository (or a thin wrapper) catches `DioException`/parse errors and maps them to typed failures (offline, timeout, unauthorized, server, parse) inside `Err`.
4. **Domain model + mapper.** Immutable domain model; mapper DTO → model lives in the repository or a dedicated mapper. DTOs never reach UI.
5. **Repository.** Expose `Future<Result<Model>>` (or `Stream`); add caching/retry only if requirement says so.
6. **DI.** Register new classes where siblings are registered.
7. **Generate.** `dart run build_runner build --delete-conflicting-outputs`. Never hand-edit generated files.
8. **Tests.** Mapper tests with real sample JSON (incl. missing/null/unknown values); repository tests with a fake service for Ok and each Err type.
9. **Callers.** Update state holders that use the changed repository; fix compile errors, update their tests.
10. **Verify (gate).** `dart format --set-exit-if-changed <touched>` → `flutter analyze` (no issues in touched files; total not above the count before you started, or 0 on a project with no issues; if the project has `scripts/verify.sh`, run it instead) → `flutter test`. Report output.

References: `../flutter-references/architecture.md` (Result pattern), `../flutter-references/testing.md`.
