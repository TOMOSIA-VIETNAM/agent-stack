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
- The app → the project's settings mechanism. With the `config` gem:
  `config/settings.yml` plus `config/settings/<env>.yml`, read as `Settings.x.y`;
  without it, `config.x.*` read as `Rails.configuration.x.*`.
- Secrets → `Rails.application.credentials`.

## Rules

- Never read `ENV[...]` in `app/`. Map ENV into the settings files and read them
  there; a missing value then fails at one known place. Rake task arguments are the
  one exception.
- Cache and lock keys are format strings in settings, filled with `format`, e.g.
  `format(Settings.cache.lock.publish_article, id:)`.
- Environment-specific behaviour goes in `config/environments/` or
  the per-environment settings file, never in `if Rails.env.production?` inside `app/`.
- An initializer loads only what exists; never load a directory that does not exist.
