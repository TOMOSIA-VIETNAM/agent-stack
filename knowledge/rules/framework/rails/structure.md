# Rails Structure

Every layer below has its own rule in `.claude/rules/rails-*.md`. A layer rule loads only
once you read or edit a file of that layer, so:

- **Before creating a file in a layer, Read one existing file of that layer, or its base
  class.** That loads the layer's rule and shows the project's own shape. Copy it. When
  the layer has no file yet, Read its rule in `.claude/rules/` instead.
- A concern the project does not handle yet goes in the layer the table below names.
  Do not add a second layer for a job the project already does elsewhere (interactors
  beside services, form objects where `AGENTS.md` says models validate) unless asked.
- When a rule contradicts `AGENTS.md` or what the existing code consistently does, do
  not pick a side. Name the rule, the line, and two or three files that disagree, and ask
  the user. They settle it by editing `AGENTS.md`, the rule, or the code; until then a
  guess in either direction spreads the inconsistency.

## What goes where

| Code | Layer |
| --- | --- |
| HTTP: params in, render or redirect out | controller |
| Business logic of one use case | service object (`app/services`, `app/operations`, `app/interactors`) |
| Input validation for one use case | form object (`app/forms`) |
| Associations, scopes, callbacks, persistence | model |
| Who may do what | authorization (`app/policies`, or `app/models/ability.rb`) |
| JSON shape | serializer (`app/blueprints`) |
| Display logic for one record | decorator (`app/decorators`) |
| Reusable UI | component (`app/components`) |
| Async work | job (`app/jobs`) |
| An error the app returns | the project's error classes (often `app/errors`) |
| Code with no Rails dependency | `lib/` |

## Call flow

- Request → route → controller → one service object → controller renders.
- A service object calls forms, authorization, models, `lib/`, and enqueues jobs. It never
  calls another service object; share code by inheritance or a mixin.
- A model calls `lib/` and enqueues jobs; never a service, form, serializer or decorator.
- A job calls models and `lib/`.
- Serializers, decorators, components, helpers and views read loaded data only: no
  query, no write, no side effect.

## Everywhere

- Namespace = directory path (Zeitwerk). Every class carries its layer suffix
  (`Controller`, `Form`, `Policy`, `Job`, ...).
- No limit, list, key or duration as a literal in logic: read it from config.
- Run the project's own linter and tests on what you changed before reporting done.
