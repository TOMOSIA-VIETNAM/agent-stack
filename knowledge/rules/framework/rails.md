---
id: rails-conventions
name: Rails Conventions
description: Layering, controller, and configuration rules for a Rails application.
type: rule
layer: framework
priority: 40
applies_to:
  - tech: rails
    versions: ">=7 <9"
dependencies: [ruby-conventions]
tags: [rails, architecture]
---

## Layering

- Controllers parse the request, call one object, and render. No business logic, no
  multi-step orchestration, no direct `where` chains.
- Models own persistence, associations, validations, and scopes. Keep them free of
  HTTP and view concerns.
- Put a multi-step operation that spans several models in `app/services`, as a class
  with a single public entry point that returns a result, not a boolean.
- Views render. Move any conditional beyond a simple presence check into a helper or
  a presenter.

## Controllers

- Stick to the seven RESTful actions. A new verb is a new controller, often nested.
- Use strong parameters; never pass `params` straight into `create` or `update`.
- Authorize inside every action, and scope the lookup to the current actor:
  `current_user.invoices.find(params[:id])`, not `Invoice.find(params[:id])`.
- Return the right status: `201` on create, `422` on validation failure, `404` when a
  scoped lookup misses.

## Jobs and mail

- Background jobs take primitive arguments (ids, not records) so they serialize
  safely and survive a deploy.
- Jobs must be idempotent: the queue will deliver twice.
- Never send mail or enqueue from inside a database transaction; use
  `after_commit`.

## Configuration

- Read configuration through `Rails.application.credentials` or environment
  variables, never from a literal in the code.
- Keep environment-specific behaviour in `config/environments`, not in `if
  Rails.env.production?` scattered through the codebase.
- Every new table gets a migration; never edit a migration that has run in any shared
  environment.
