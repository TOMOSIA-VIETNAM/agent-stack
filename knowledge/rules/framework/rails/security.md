---
paths:
  - "app/**/*.rb"
  - "app/views/**/*"
  - "config/**/*.rb"
  - "lib/**/*.rb"
---

# Rails Security

## Access

- Every action checks authentication and permission on the server; see
  `rails-authorization.md`. Put authentication in `before_action` of the per-actor base
  controller, never repeated per controller.
- Load records through the current actor's association, and scope every query by
  tenant. A changed `id`, `company_id` or filter must never return another user's data.
- Consider non-sequential public ids (UUID, signed id) for sensitive resources, to limit
  enumeration if a check is ever missed.
- A second factor fails closed: a session without proof of verification must verify.
- Internal API keys live in `Rails.application.credentials` and are compared with
  `ActiveSupport::SecurityUtils.secure_compare`.

## Input

- Validate every external input on the server, even when the client validates too.
- Mass assignment only through `permit` with an explicit list. Never pass `params`,
  `permit!` or `to_unsafe_h` to `create`/`update`.
- No string interpolation into SQL. Use hash conditions or placeholders
  (`where("title LIKE ?", "%#{Article.sanitize_sql_like(term)}%")`). A column or direction from
  params is checked against a whitelist before `order`.
- `redirect_to` a URL from params only after checking it is a path of this app. Keep
  `config.action_controller.raise_on_open_redirects` on (Rails 7.0+), and never pass
  `allow_other_host: true` with a URL from params.
- `send_file` and `File.open` never take a path built from params.
- Treat external data as possibly `nil`: `nil.to_i == 0`, `nil.to_s == ""`, and a `nil`
  flag falls into the `else` branch. Handle `nil` on purpose.

## Output

- Never call `html_safe` or `raw` on user data; use `sanitize` with an allow-list when
  HTML is required.
- Never return a password, password digest, reset token or API key in a response,
  including through a nested serializer. Never render secrets or personal data into
  HTML or JavaScript sent to the browser.
- Error responses never show SQL, file paths, stack traces or exception class names.
- Keep CSRF protection on for every session-authenticated controller. Skip it only for
  token-authenticated API controllers.

## Data and files

- Passwords use `has_secure_password` (bcrypt). Never store them in plain text or with
  reversible encryption.
- Files in external storage are private and served through short-lived signed URLs,
  never a public bucket.
- Generated exports get unique, unguessable names, and still require authorization to
  download.
- Delete temporary files in `ensure`, so the error path cleans up too.
- Check the content type and size of an upload on the server.

## Logs and notifications

- Keep `config.filter_parameters` up to date with every password, token, secret and
  personal field, and strip the same keys from what is sent to the error tracker.
- Send the error tracker the user's id and role, never the whole record.
- Never put a password or security token in an email body; send a link.

## Concurrency

- Never check a counter, stock or quota and then change it without a lock covering both
  the read and the write.
- For a shared resource where over-allocation costs money (prizes, limited stock), take a
  distributed lock around the use case and a row lock (`with_lock`) around the
  read-modify-write. If the lock is not acquired, return a 4xx and do nothing.
- Scope lock keys per user and resource, not globally, and index the column the row
  lock looks up.
- Ship a concurrent test (parallel threads or processes) with every allocation or
  decrement change.

## External calls

- Every HTTP call to another system sets connect and read timeouts, and handles a
  timeout, a non-2xx status and a malformed body.

## Tools

- Run `bundle exec brakeman` and `bundle exec bundler-audit` when the project has them,
  and fix new warnings rather than ignoring them.
