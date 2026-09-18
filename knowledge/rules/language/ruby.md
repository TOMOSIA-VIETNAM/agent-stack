---
id: ruby-conventions
name: Ruby Conventions
description: Style and idiom rules for Ruby code.
type: rule
layer: language
priority: 30
applies_to:
  - tech: ruby
    versions: ">=3.1 <4"
tags: [ruby, style]
---

## Style

- Two-space indentation, no tabs. Keep lines under 120 characters.
- `snake_case` for methods and variables, `CamelCase` for classes and modules,
  `SCREAMING_SNAKE_CASE` for constants. A predicate ends in `?`; a method that
  mutates the receiver or raises ends in `!`.
- Prefer `if`/`unless` modifiers for single-line guards; never nest a modifier.
- Use string interpolation over concatenation, and single quotes only when the
  string contains no interpolation and no escapes.
- Freeze string literals with the `# frozen_string_literal: true` magic comment at
  the top of every file.

## Idiom

- Prefer `Enumerable` methods (`map`, `select`, `sum`, `each_with_object`, `tally`)
  over manual index loops.
- Use keyword arguments for anything with more than two parameters, and for any
  boolean parameter.
- Use the safe navigation operator `&.` only where `nil` is a genuine, expected
  value — not to silence an unexplained `nil`.
- Prefer `Hash#fetch` with an explicit default or a raised error over `Hash#[]` when
  a missing key is a defect.
- Use `Struct` or `Data.define` for value objects instead of passing hashes around.
- Return early. A method that ends in a deeply nested conditional wants guard clauses.

## Errors

- Raise a specific error class, never a bare `RuntimeError` or a string.
- Rescue the narrowest class that can actually be raised; never rescue `Exception`.
- A `rescue` that swallows an error must say in a comment why that is safe.

## Tooling

- RuboCop governs formatting; run it before committing and fix offences rather than
  disabling cops inline. An inline `rubocop:disable` needs a reason on the same line.
