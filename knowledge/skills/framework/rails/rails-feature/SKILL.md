---
name: rails-feature
description: Implement a new user-facing feature in a Rails application — route, controller, model, service, view, and specs — in the order that keeps the app deployable at every step. Use when adding or changing a screen, endpoint, or user-visible behaviour in a Rails codebase.
---

Work through the steps in order. Do not skip ahead to code.

## 1. Locate before you build

- Read `config/routes.rb` and find the closest existing resource.
- Read one controller and one service that already do something similar; the new code
  copies their shape.
- Search for the domain nouns in `app/models` — the concept often already exists
  under another name.

State what you found before writing anything. If the behaviour already exists,
extend it instead of adding a parallel path.

## 2. Design the change

Name, in one sentence each:

- the route and HTTP verb,
- the object that owns the new behaviour (model, service, or job),
- what persists, and which migration it needs,
- what the user sees on success and on each failure.

If two designs are reasonable, say which you picked and why.

## 3. Data layer first

- Write the migration: columns, `null: false` where the value is required, indexes
  for every lookup column, foreign keys for every association.
- Add validations and associations to the model.
- Run the migration and confirm `db/schema.rb` changed as expected.

## 4. Behaviour

- Put the operation in the model when it concerns one record, in `app/services` when
  it spans several or calls outside the app.
- Return a result object or raise a domain error; do not return `true`/`false` for an
  operation that can fail in more than one way.
- Keep external calls (HTTP, mail, queue) outside the database transaction.

## 5. Controller and view

- Add the route as a RESTful action on a resource.
- Controller: strong parameters, an authorized and owner-scoped lookup, one call into
  the behaviour object, then render.
- Handle the failure path explicitly: `422` with the errors, not a redirect that
  loses them.

## 6. Specs

- Model or service spec for the behaviour, including each failure path.
- Request spec for the endpoint: success, validation failure, and unauthorized.
- Run the full spec file, then the suite for the touched directories.

## 7. Report

State what changed, the command you ran to verify it, and anything you deliberately
left out.
