---
paths:
  - "database/factories/**/*.php"
---

# Laravel Factories

- `definition()` produces a valid record: every NOT NULL column filled, required relationships built through the related factory (`'user_id' => User::factory()`).
- Variants are states (`->paid()`, `->cancelled()`), so tests do not repeat attributes.
- Columns under a unique index use `fake()->unique()`; composite uniqueness uses `sequence()` or derived values.
- Adding a NOT NULL column to a table updates its factory in the same change.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
