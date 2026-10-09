---
name: rails-feature
description: Implement a Rails endpoint or screen layer by layer — route, thin controller, service object, form, serializer or decorator/component, errors and specs — copying the project's existing shape, then prove it with RuboCop and RSpec. Use when adding a new endpoint or screen to a Rails codebase, or extending one with new behaviour. Not for fixing a bug in existing behaviour.
---

A request flows route → controller → one service object → controller renders. Each
layer has its rule in `.claude/rules/rails-*.md`, loaded when you read a file of that
layer. Read before you write, layer by layer.

## 1. Locate before you build

- Read `config/routes.rb` and find the closest existing resource.
- Read one controller, its service object, form and serializer (or decorator and
  component) that already do something similar. The new code copies their shape:
  directory, naming, base class.
- Search `app/models` for the domain nouns, and the service directory for a mixin that
  already does part of the work.

State what you found. If the behaviour exists, extend it instead of adding a parallel
path.

## 2. Design the change

Name, in one line each:

- the route: resource, action, and URL. An action outside the seven REST actions is a
  new resource, not a `member`/`collection` route;
- the namespace shared by controller, service object, form and serializer;
- the steps the service object's `call` lists;
- whether the use case needs a form (it takes input to validate) or not;
- the response: a serializer for JSON, or a decorator and component for HTML;
- each failure, and the error class it raises;
- what persists, and whether it needs a migration (use the `rails-migration` skill).

If two designs are reasonable, say which you picked and why.

## 3. Route

- Add `resources`/`resource` with `only: %i[...]` inside the right namespace.
- Run `bin/rails routes -g <resource>` and confirm the controller#action you expect.

## 4. Controller

- Inherit the actor's base controller.
- The action builds the service object with `params` and the current actor, calls it,
  and renders or redirects. No conditionals, queries or `params.permit`.

## 5. Service object

- Put the logic where the project's existing use cases put it: same directory, base
  class and naming. When the project has no business layer yet, create the first
  service object as `rails-services.md` describes, unless `AGENTS.md` says otherwise.
- `call` lists private steps: permission (when the project authorizes here), validation,
  writes, then side effects.
- Load records through the actor's associations, or the authorization scope for records
  it does not own, preloading what the response reads.
- Wrap multi-table writes in one transaction; enqueue jobs after it.
- Logic two service objects share goes in a mixin, never in a call from one to another.

## 6. Validation — only if the use case validates input

- Validate where the project does: a form object
  (`app/forms/<namespace>/<action>_form.rb`, inheriting `ApplicationForm`; the first one
  creates the base class), or the model when `AGENTS.md` says so.
- Every input is `attribute :name, :type`. Custom checks are `validate :must_<x>` with
  `errors.add(:attr, :symbol_key)`.
- Build it only in the service object's validation step, from the permitted params.

## 7. Response

- JSON: the project's serializer (with Blueprinter, a blueprint in `app/blueprints/`;
  add a view only when the key set differs). Pass aggregates in from the service object.
- HTML: display formatting goes in a decorator or helper, reusable markup in a
  component or partial, whichever the project uses. Strings go through i18n.
- Neither layer queries the DB.

## 8. Errors

- Raise each new failure the way the project's existing actions do (often a new class
  in `app/errors/` with its status and code), without a message string.
- Add the i18n keys the form and errors use to `config/locales/`, in every locale.

## 9. Specs

Write them beside the code, mirroring its path:

- service object: one example per step outcome and per raised error;
- form: one example per validation;
- serializer: whole-Hash `eq` per view or shape; for HTML, decorator, helper or component
  specs;
- endpoint: a request spec (or rswag spec) checking status and envelope.

## 10. Verify

Run the project's lint and test commands (from `AGENTS.md`, else `bundle exec rubocop`
and `bundle exec rspec`) on the changed paths, then on the touched directories. Fix every
offence in the code; do not disable a cop to get green.

## 11. Check the diff against the rules

Run `git diff` and, for each layer you touched, re-read its rule in
`.claude/rules/rails-*.md` and `rails-structure.md`. Fix each line that breaks one, or
say why it has to.

## 12. Report

State the route, the files added or changed per layer, the commands you ran with their
result, and anything you deliberately left out.
