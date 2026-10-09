# Rails Structure

Every layer below has its own rule in `.claude/rules/rails-*.md`. A layer rule loads only
once you read or edit a file of that layer, so:

- **Before creating a file in a layer, Read one existing file of that layer, or its base
  class.** That loads the layer's rule and shows the project's own shape. Copy it.
- Where the project already does something one way, follow the project, not these rules.
  Do not add a layer or directory the project does not have unless asked.

## What goes where

| Code | Layer |
| --- | --- |
| HTTP: params in, render or redirect out | controller |
| Business logic of one use case | service object (`app/services`, `app/operations`, `app/interactors`) |
| Input validation for one use case | form object (`app/forms`) |
| Associations, scopes, callbacks, persistence | model |
| Who may do what | policy (`app/policies`) |
| JSON shape | serializer (`app/blueprints`) |
| Display logic for one record | decorator (`app/decorators`) |
| Reusable UI | component (`app/components`) |
| Async work | job (`app/jobs`) |
| An error the app returns | error class (`app/errors`) |
| Code with no Rails dependency | `lib/` |

## Call flow

- Request → route → controller → one service object → controller renders.
- A service object calls forms, policies, models, `lib/`, and enqueues jobs. It never
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
