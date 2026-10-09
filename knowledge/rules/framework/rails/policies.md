---
paths:
  - "app/policies/**/*.rb"
---

# Rails Policies

- Inherit `ApplicationPolicy`, which takes `(actor, record)` and returns `false` from
  every `?` method by default. A new action is denied until a policy allows it.
- One policy per record type and actor group. A variant with no differences is an empty
  subclass of the original.
- Call a policy from the service object's permission step. A controller does not check
  permissions; a view may ask a policy only to hide a link.
- No permission → raise `ForbiddenError` (or the project's equivalent).
- A policy reads the actor and the record. It runs no query beyond their loaded
  associations and writes nothing.
