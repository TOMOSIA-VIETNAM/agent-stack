---
paths:
  - "app/services/**/*.rb"
  - "app/operations/**/*.rb"
  - "app/interactors/**/*.rb"
---

# Rails Service Objects

A service object holds the business logic of one use case, usually one controller
action. Projects call it a service, operation or interactor; the directory and suffix
are the project's, the rules are the same. Copy the naming of the existing ones.

## Shape

- Inherit the project's base class when there is one.
- One public entry point, `call`. Outputs are `attr_reader`s. Everything else is
  `private`.
- `call` only lists the steps, each a private method, so the use case reads top to
  bottom:
  ```ruby
  def call
    authorize!
    validate!
    create_article!
    enqueue_notifications
  end
  ```
- A variant of a use case (another actor, another version) inherits the original and
  overrides only the steps that differ, calling `super` where it extends.
- Never call another service object. Share code through inheritance or a mixin placed
  at the narrowest scope that has two users; with one user it is a private method.

## Input and validation

- Permit params in a private method of the service, not in the controller.
- Validation is its own step, before any write: build the form object for this use case
  (the first one also creates `ApplicationForm`) and raise when it is invalid. Where
  `AGENTS.md` says the project validates in models, validate there instead. Do not
  interleave checks with writes.
- A use case with nothing to validate has no form and no validation step.

## Loading and writing

- Load a record the actor owns through its associations: `current_user.articles.find(id)`,
  not `Article.find(id)`. Load one it may act on but does not own (another user's
  article to comment on) through the authorization scope (`policy_scope`,
  `accessible_by`). Either way the lookup is the boundary; a bare `find` lets any id
  through.
- Preload every association the serializer, decorator or view reads, and compute
  aggregates here; pass them to the presentation layer.
- Writes to more than one row or table go in one `ActiveRecord::Base.transaction`.
- Enqueue jobs, write caches and send mail after the transaction commits, never inside
  it: a rolled-back transaction cannot take back a job already sent.
- A contended resource takes a lock: a row lock (`with_lock`, `lock!`) for one record,
  or the project's distributed lock for anything wider. Lock keys come from config.
- A method that writes ends in `!`.

## Failure

- A business failure raises the project's error class. Never return `false` or an
  error string for the controller to inspect.
- When the project authorizes in the service layer, a class-level check is the first
  step; a record-level check runs right after the step that loads the record.
