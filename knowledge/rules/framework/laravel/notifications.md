---
paths:
  - "app/Mail/**/*.php"
  - "app/Notifications/**/*.php"
  - "resources/views/mail/**"
  - "resources/views/emails/**"
---

# Laravel Mail & Notifications

- A message to a user that may go out on several channels (mail, database, Slack, SMS) is a Notification; a one-off email with its own layout to an address (not a user) is a Mailable. Follow the project's existing split.
- Mail and notifications implement `ShouldQueue`: SMTP and SMS providers are slow and fail, and a request should not wait or 500 on them.
- Sent from inside a transaction: `->afterCommit()` (or the connection's `after_commit`), so a rolled-back record is never announced.
- Pass models or IDs, not pre-rendered strings; build the content in the message class so a retry renders fresh data.
- The recipient's language: `->locale($user->preferred_locale)` or implement `HasLocalePreference` on the notifiable; queued messages do not inherit the request's locale.
- Subjects and lines go through `__()`/the project's lang files when the app is translated.
- Markdown mail uses the project's components (`<x-mail::message>`, `<x-mail::button>`); links are absolute (`route()` / `URL::signedRoute()` for actions that must not be guessable).
- Never put secrets or one-time codes in the subject line; it shows on lock screens and in logs.
- A notification stored on the `database` channel returns a small, stable `toArray()`: it is rendered later by code that may have changed.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
