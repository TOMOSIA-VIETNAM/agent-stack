---
paths:
  - "app/**/*.rb"
  - "lib/**/*.rb"
---

# Enumerize

Enumerated attributes use the `enumerize` gem, not Rails `enum`.

- Declare with `extend Enumerize` and
  `enumerize :status, in: %i[draft published], predicates: true, scope: :shallow`.
- Where the `in:` list lives: used only by the model → inline `%i[]`; read outside the
  model → `Model.configs[...]`; app-wide → config.
- Read a value from its source, never as a literal: `Article.status.published`, not
  `'published'` or `:published`. A renamed value then fails loudly instead of matching
  nothing.
- Validate input against the source: `inclusion: { in: Article.status.values }`.
- Test a value with the predicate (`article.status.published?`), not by comparing
  strings.
