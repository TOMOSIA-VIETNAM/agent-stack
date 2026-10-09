---
paths:
  - "app/errors/**/*.rb"
  - "app/controllers/concerns/**/*.rb"
---

# Rails Errors

Every error the app returns is a subclass of one base error class that carries its own
HTTP status and code. One controller concern turns errors into responses.

- Errors live in `app/errors/`, one class per file, never nested inside another class:
  `app/errors/<name>_error.rb` → `<Name>Error < ApplicationError`; domain errors under
  `app/errors/<namespace>/`.
- `ApplicationError < StandardError` declares `class_attribute :status, :code`; every
  subclass sets both:
  ```ruby
  class NotFoundError < ApplicationError
    self.status = :not_found
    self.code   = :resource_not_found
  end
  ```
- Adding an error is adding a file. Never map statuses in a central `case`.
- Keep the shared minimum: `BadRequestError`, `UnauthorizedError`, `ForbiddenError`,
  `NotFoundError`, `ConflictError`, `UnprocessableEntityError`.
- Exceptions from gems (`ActiveRecord::RecordNotFound`, `Pundit::NotAuthorizedError`)
  map to an `ApplicationError` subclass in one hash inside the handling concern.
- The handling concern uses `rescue_from` and is the only place that formats an error
  response. It reports every 500 to the error tracker.
- Raise without a message string; a message, when needed, is an i18n key.
- Never swallow an exception. Rescue the narrowest class that can be raised, never
  `Exception`.
