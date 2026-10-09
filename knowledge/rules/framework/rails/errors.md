---
paths:
  - "app/errors/**/*.rb"
  - "app/controllers/**/*.rb"
---

# Rails Errors

Follow the project's error mechanism. Read how an existing action fails (the error class
it raises and where that error becomes a response) before adding a failure. The rules
below hold whatever the mechanism is.

- One place turns errors into responses: a `rescue_from` handler in the base
  controller or a concern. An action never rescues to render an error by hand.
- Every error response has the same body shape and a fixed code the client can match.
  Never put SQL, file paths, stack traces or exception class names in it.
- A business failure raises; it never returns `false` or an error string for the
  caller to inspect.
- Exceptions from gems (`ActiveRecord::RecordNotFound`, `Pundit::NotAuthorizedError`,
  `CanCan::AccessDenied`) are mapped to the app's errors in that one place.
- Rescue the narrowest class that can be raised, never `Exception`. Never swallow an
  exception: re-raise it or report it.
- Report every 500 to the error tracker, with filtered params and the user's id and
  role only. Do not report 4xx: they are the client's mistakes, not defects.
- Raise without a message string; a message, when needed, is an i18n key.

## When the project has no error classes yet

Start with one base class carrying its HTTP status and code, one subclass per file:

```ruby
# app/errors/application_error.rb
class ApplicationError < StandardError
  class_attribute :status, :code
end

# app/errors/not_found_error.rb
class NotFoundError < ApplicationError
  self.status = :not_found
  self.code   = :resource_not_found
end
```

Adding an error is then adding a file; the handler reads `error.status` and
`error.code`, with no central `case` to grow.
