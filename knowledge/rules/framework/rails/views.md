---
paths:
  - "app/views/**/*"
  - "app/helpers/**/*.rb"
---

# Rails Views and Helpers

Views and helpers read loaded data only: no query, no write, no side effect.

## Views

- A view receives records ready to display from the controller; with Draper it never
  calls `.decorate` itself.
- Display strings go through `t`, never hardcoded.
- A reusable piece of UI with its own logic is a component where the project uses
  ViewComponent; otherwise a partial whose logic lives in a helper or decorator.
- No association read that the service object did not preload.

## Helpers

- Global helpers only: `application_helper.rb` and `<topic>_helper.rb`
  (`DateTimeHelper`, `MarkupHelper`). No helper per controller or screen; set
  `config.generators.helper = false`.
- A helper works on bare values (date and number format, truncation) or shared markup
  (icon, flash, breadcrumb).
- A helper never takes a model to read its attributes (→ decorator), never holds logic
  for one screen (→ decorator or component), and never reads instance variables.
