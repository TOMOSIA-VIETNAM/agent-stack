---
id: rspec-conventions
name: RSpec Conventions
description: How specs are structured and what they are allowed to stub.
type: rule
layer: framework
priority: 44
applies_to:
  - tech: rspec
dependencies: [testing-baseline]
tags: [ruby, testing]
---

## Structure

- One spec file per class, mirroring the source path under `spec/`.
- `describe` names the class or method (`#instance_method`, `.class_method`);
  `context` starts with "when", "with", or "without"; `it` completes the sentence
  "it ...".
- Prefer `let` over instance variables, and `let!` only when the record must exist
  before the example runs.
- Use `subject` only when the example group really has one subject, and name it.

## Doubles and data

- Build records with FactoryBot. Use `build_stubbed` by default, `build` when the
  object needs no database, and `create` only when the test touches persistence.
- Set only the attributes the example depends on; everything else comes from the
  factory's defaults.
- Use `instance_double` / `class_double` so a renamed method fails the spec instead
  of silently passing.
- Stub only collaborators you own the contract of, and never the object under test.
- Stub every outbound HTTP call (WebMock or VCR). A spec suite must pass with the
  network disabled.

## Assertions

- Prefer `expect(...).to have_attributes(...)` or `match` over a chain of separate
  attribute assertions.
- Assert on the change a call causes (`expect { ... }.to change { ... }`), not on the
  return value of a stub you just set up.
- Keep request specs at the HTTP level: status, body shape, and side effects — not
  internal method calls.
