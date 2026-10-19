---
paths:
  - "app/controllers/**/*.rb"
  - "config/routes.rb"
  - "config/routes/**/*.rb"
---

# Rails Routes and Controllers

## Routes

- Declare routes with `resources`/`resource` and `only: %i[...]`. No loose
  `get`/`post`/`patch`/`delete`, no `except:`. Exceptions: `root`, `mount`,
  `devise_for`, `draw`, the health check `get 'up'`.
- An action outside CRUD becomes a new resource, not a `member`/`collection` route:
  `resources :publications, only: %i[create]`, not `post :publish, on: :member`. Seven
  actions on more controllers stay predictable; custom verbs on one controller do not.
- Version an API with `namespace :v1`. Change the URL key with `param:`. A URL that
  differs from the controller namespace uses `scope module:, path:`. A nested resource
  whose controller sits in the parent's namespace uses `module:` on the resource:
  `resources :articles { resource :publication, only: %i[create], module: :articles }`.
- Declare each resource once per block; widen its `only:` instead of repeating it.

## Base controllers

- Base controllers (`ApplicationController`, one per actor such as `AdminController`)
  live directly in `app/controllers/`. Endpoint controllers live in a namespace.
- An endpoint behind authentication inherits its actor's base controller, never
  `ApplicationController` directly, so authentication cannot be forgotten.
- Authentication and audit metadata go in `before_action` of the base controller.
- Public endpoints inherit a public base controller with no authentication; their
  service objects take no actor rather than `current_user: nil`.
- Shared controller code goes in `app/controllers/concerns/`.

## Actions

- Only the seven REST actions: `index`, `show`, `new`, `create`, `edit`, `update`,
  `destroy`.
- An action has no logic: it builds one service object with `params` and the current
  actor, calls it, then renders or redirects with what it returns.
- No conditionals, loops, queries or model calls in an action. A branch on the outcome
  belongs in the service object, or in a `rescue_from` handler.
- When the project has a form or service layer, pass `params` whole and permit them
  there. No `params.permit`/`params.require` in the controller.
- Errors are raised, never rendered by hand: no `rescue` in an action. One concern in
  the base controller maps them with `rescue_from`.
- Pass context with keyword shorthand: `current_user:`.
- HTML: assign records ready to display; with Draper, decorate here
  (`@article = service.article.decorate`) so views never call `.decorate`. Pick another
  format by template (`create.turbo_stream.erb`), not by a `respond_to` block.

```ruby
# POST /v1/articles
def create
  service = Articles::CreateService.new(params, current_user:)
  service.call

  render json: ArticleBlueprint.render(service.article), status: :created
end
```
