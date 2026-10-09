---
paths:
  - "**/*.rb"
  - "**/*.rake"
---

# Ruby Style

Run `bundle exec rubocop` on the files you changed before reporting done, and fix the
offences in the code. A metric that must be exceeded is disabled inline on that method
with the reason on the same line, never for a whole file or in `.rubocop.yml`:
`# rubocop:disable Metrics/MethodLength -- builds the full export row`.

## Formatting

- `# frozen_string_literal: true` at the top of every file.
- Two-space indentation, lines under 120 characters.
- Keyword shorthand (Ruby 3.1+): `foo(user:)`, not `foo(user: user)`.
- `%i[]`/`%w[]` for symbol and string arrays.
- Compact class names on one line: `class Articles::CreateService < ApplicationService`,
  not nested `module Articles` (RuboCop: `Style/ClassAndModuleChildren: compact`). Inside a compact class, reference sibling constants by
  full name: compact style does not open the enclosing namespace for lookup.
- Align consecutive related lines: `=`, hash keys, and the arguments of consecutive
  one-line DSL calls (`validates`, associations, `attribute`, `field`).
  ```ruby
  title    = form.title
  owner_id = current_user.id
  ```
- Guard clause first, then a blank line.

## Naming

- `snake_case` methods and variables, `CamelCase` classes and modules,
  `SCREAMING_SNAKE_CASE` constants.
- A method that raises or writes ends in `!`; a predicate ends in `?`.
- Name by the general concept, not one use case: `Shared::Counter`, not
  `Shared::ArticleLikeCounter`, when the logic works for any record.

## Values and errors

- No magic number or string: read config, a model constant or `Model.configs`.
- `Hash#fetch` when a missing key is a defect.
- Extend by adding a file or a config entry, not by growing a central `case`.
- Raise an error class, never a bare string. Never swallow an exception, never rescue
  `Exception`.
- Log with the block form `Rails.logger.info { ... }`. No `puts`/`p`.

## Idiom

- `Enumerable` methods (`map`, `select`, `sum`, `each_with_object`, `tally`) over index
  loops.
- `&.` only where `nil` is an expected value.
- Return early instead of nesting conditionals.
