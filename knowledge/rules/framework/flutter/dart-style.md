---
paths:
  - "**/*.dart"
---

# Dart style

- Follow Effective Dart. Files `snake_case`, types `PascalCase`, members `camelCase`, constants `lowerCamelCase`.
- No `dynamic`, no unchecked casts. Analyzer runs with `strict-casts`, `strict-inference`, `strict-raw-types`.
- `final` for locals and fields unless reassigned. Prefer `const` constructors.
- Trailing commas on multi-line argument/parameter lists; `dart format` decides the layout.
- Prefer switch expressions and patterns over `is` chains. Prefer collection-if/for over imperative building in widget trees.
- Null safety: avoid `!`; use pattern matching, `?.`, `??`, or early return. A `!` needs an invariant you can name.
- Do not use `print`/`debugPrint` for logging; use the project logger. No logging of tokens, PII or full payloads.
- Doc comments (`///`) on public API of shared packages only; elsewhere, comment the "why", not the "what".
- Keep files < ~300 lines and functions < ~50 lines; split by responsibility.
