---
paths:
  - "config/**/*.rb"
  - "config/**/*.yml"
---

# Rails Configuration

## Where a value lives

Use the narrowest scope that needs it:

- One model → `class_attribute :configs, default: { ... }` on the model, read as
  `Model.configs[:key]`.
- The app → `config/settings.yml` plus `config/settings/<env>.yml` (the `config` gem),
  read as `Settings.x.y`.
- Secrets → `Rails.application.credentials`.

## Rules

- Never read `ENV[...]` in `app/`. Map ENV into `config/settings/*.yml` and read
  `Settings`; a missing value then fails at one known place. Rake task arguments are the
  one exception.
- Cache and lock keys are format strings in settings:
  `format(Settings.cache.lock.publish_article, id:)`.
- Environment-specific behaviour goes in `config/environments/` or
  `config/settings/<env>.yml`, never in `if Rails.env.production?` inside `app/`.
- An initializer loads only what exists; never load a directory that does not exist.
