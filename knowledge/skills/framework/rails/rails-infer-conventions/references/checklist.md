# Rails convention checklist

Each item is a fork where Rails allows several valid approaches and the project's choice
changes the code Claude writes. The hints are a starting point; read real files before
deciding.

## Open choices → AGENTS.md (Code & architecture)

| # | Fork | Hints |
| --- | --- | --- |
| A1 | **Business layer**: controller and model only / `app/services` / `app/operations` / `app/interactors` / another directory; entry point (`#call`, `.call`, `perform`); class suffix; base class | `ls app/`; read 3–5 controller actions and what they call |
| A2 | **Validation**: model validations / form objects (`app/forms`) / dry-validation contracts; where params are permitted | `ls app/forms app/contracts`; grep `params.permit\|require(` |
| A3 | **Authentication**: Devise / JWT / `has_secure_password` / other; the actors and their base controllers | `Gemfile`; `app/controllers/*.rb` |
| A4 | **Authorization**: Pundit / CanCanCan / Action Policy / hand-rolled; checked in the controller or the business layer | `ls app/policies`; `app/models/ability.rb`; grep `authorize\|can?` |
| A5 | **Tenancy**: none / `acts_as_tenant` / schema per tenant / a scoping column set by hand | `Gemfile`; grep `tenant\|company_id` in base controllers |
| A6 | **JSON**: Blueprinter / Active Model Serializers / jsonapi-serializer / Alba / Jbuilder; the envelope helper and its shape | `ls app/blueprints app/serializers`; read 3 API actions |
| A7 | **Errors**: error classes and their directory; the handler; the error body shape | `ls app/errors app/exceptions`; grep `rescue_from` |
| A8 | **HTML presentation**: helpers and partials / Draper / ViewComponent / Phlex; Hotwire or not | `Gemfile`; `ls app/decorators app/components` |
| A9 | **Pagination**: kaminari / pagy / will_paginate; the meta helper; the page size config | `Gemfile`; grep `.page(\|pagy(` |
| A10 | **Search**: Ransack / pg_search / searchkick / query objects | `Gemfile`; `ls app/queries` |
| A11 | **Enums**: Rails `enum` / enumerize | `Gemfile`; grep `enum \|enumerize` in models |
| A12 | **Soft delete**: none / paranoia / discard | `Gemfile`; grep `acts_as_paranoid\|include Discard` |
| A13 | **Settings**: `config` gem (`Settings`) / `config.x` / ENV read directly; credentials | `Gemfile`; `ls config/settings*` |
| A14 | **Background jobs**: Sidekiq / GoodJob / Solid Queue / other; queues; job directory layout | `Gemfile`; `config/sidekiq.yml`; `ls app/jobs` |
| A15 | **Locks**: row locks only / Redlock / advisory locks; where lock keys live | `Gemfile`; grep `with_lock\|lock!\|redlock\|advisory` |
| A16 | **Namespacing**: compact (`class A::B`) or nested modules; API versioning by namespace or header | `.rubocop.yml` `Style/ClassAndModuleChildren`; `config/routes.rb` |
| A17 | **Model organisation**: methods in the model / concerns per role / query objects | read 3 large models and `app/models/concerns` |
| A18 | **Tests**: RSpec or Minitest; factory_bot or fixtures; request specs or rswag; shared helpers | `ls spec test`; `spec/rails_helper.rb`; `spec/support` |

## Commands → AGENTS.md (Commands & environment)

| # | Fork | Hints |
| --- | --- | --- |
| K1 | Host or container (`docker compose exec`, `bin/dev`) | `docker-compose*.yml`, `Makefile`, `bin/` |
| K2 | Run one spec, run the suite, lint, security scan, exactly as CI does | CI config, `bin/`, `Rakefile` |
| K3 | Services needed first (database, Redis, search) and how to start them | `docker-compose*.yml`, `config/database.yml` |

## Rules that may not apply → report

A gem rule applies only when its gem is in `Gemfile.lock`:

| Rule | Gem |
| --- | --- |
| `rails-json` › Blueprinter section | `blueprinter` |
| `rails-decorators` | `draper` |
| `rails-view-components` | `view_component` |
| `rails-enumerize` | `enumerize` |
| `rails-soft-delete` | `paranoia` |
| `rails-search` › Ransack section | `ransack` |

A whole-file rule whose gem is missing → untick it. A missing gem behind one section →
report it; the rest of the file still applies.

## Rule conflicts → report

For each `.claude/rules/rails-*.md`, check the lines that make a concrete, checkable
claim against the code. The ones most often contradicted in an existing codebase:

| Rule | Line | How to check |
| --- | --- | --- |
| `rails-controllers` | Only the seven REST actions; no `member`/`collection` | `config/routes.rb`; non-REST `def` in controllers |
| `rails-controllers` | No conditionals, queries or `permit` in an action | read 5 actions |
| `rails-services` | `call` lists steps; never calls another service | read 5 services |
| `rails-models` | Declarations only; methods in concerns per role | read 3 large models |
| `rails-models` | Scope name prefixes `with_`/`without_`/`by_`/`order_by_` | grep `scope :` |
| `rails-validations` | `errors.add(:attr, :symbol)`, never a string | grep `errors.add` |
| `rails-config` | No `ENV[` in `app/` | grep `ENV\[` in `app/` |
| `rails-style` | Compact class names | `.rubocop.yml`; open 5 files |
| `rails-specs` | No hand-written `type:` | grep `type: :` in `spec/` |

Report a conflict only with the same evidence bar as a pattern: three or more files, and
the rule's way under about 20%.
