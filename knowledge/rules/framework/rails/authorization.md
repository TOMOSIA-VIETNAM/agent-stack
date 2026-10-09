---
paths:
  - "app/policies/**/*.rb"
  - "app/models/ability.rb"
  - "app/abilities/**/*.rb"
  - "app/controllers/**/*.rb"
---

# Rails Authorization

Use the project's authorization gem, usually Pundit (policy classes) or CanCanCan (an
`Ability` class). Never mix two mechanisms, and never add a hand-rolled check beside the
one the project has.

## Always

- Deny by default. A new action is forbidden until a rule allows it.
- Check permission on the server for every action. Hiding a button is not a check.
- Check in one layer, the one the project already uses: the controller
  (`authorize`, `load_and_authorize_resource`) or the service object's first step.
  Never split the checks of one action across both.
- Scope collections by permission (`policy_scope`, `accessible_by`) and by tenant.
  Loading through the actor's association (`current_user.orders.find(id)`) is the
  minimum: a changed id must never return another user's or tenant's record.
- Map the gem's denial (`Pundit::NotAuthorizedError`, `CanCan::AccessDenied`) to a 403
  in the central error handler.
- Test both sides of every rule: one example allowed, one denied.

## Pundit

- Inherit `ApplicationPolicy`, which takes `(user, record)` and returns `false` from
  every `?` method.
- One policy per record type; a variant with no differences is an empty subclass.
- `Scope#resolve` returns what the user may list; use it through `policy_scope`.
- A policy reads the user and the record. It queries nothing beyond their loaded
  associations and writes nothing.
- Add `after_action :verify_authorized` (and `verify_policy_scoped` on `index`) in the
  base controller when the controller layer authorizes, so a forgotten check fails.

## CanCanCan

- All rules live in `Ability` (or one ability class per actor). Grant with `can`;
  rely on the default deny rather than `cannot`, except to narrow a broad `can`.
- Grant with hash conditions (`can :update, Article, user_id: user.id`) so
  `accessible_by` can turn them into SQL. A block condition cannot be used for lists.
- Add `check_authorization` in the base controller when the controller layer
  authorizes, so a forgotten check fails.
