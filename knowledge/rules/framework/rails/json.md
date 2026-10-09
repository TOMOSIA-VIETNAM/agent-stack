---
paths:
  - "app/blueprints/**/*.rb"
  - "app/serializers/**/*.rb"
  - "app/views/**/*.jbuilder"
---

# Rails JSON Responses

## Always

- JSON is built by the project's serializer layer (Blueprinter, a serializer gem,
  Jbuilder). Never build a response Hash by hand in a controller or service object, and
  never render a model with `render json: record`: every column, secrets included,
  would go out.
- A serializer maps loaded data to keys. No query, `count`, `where` or `order`: load and
  aggregate in the service object; an association read here that was not preloaded is
  an N+1.
- Every response has the same envelope (data, pagination meta, errors), built in one
  place.
- Datetimes are ISO 8601. Keys follow one case convention across the API.
- Never expose a password digest, token or internal flag; list fields explicitly.

## Blueprinter

Applies only when the `Gemfile` includes `blueprinter`.

- `app/blueprints/<namespace>/<model>_blueprint.rb` → `<Model>Blueprint < ApplicationBlueprint`;
  `ApplicationBlueprint < Blueprinter::Base`. One blueprint per model per namespace.
- Shared logic goes in `ApplicationBlueprint` or an extractor
  (`app/blueprints/extractors/<name>_extractor.rb`, `< Blueprinter::Extractor`, one type
  conversion each).
- `identifier :id` first, then `field :x`. Rename a key with `name:`; convert a type
  with `extractor:`.
- `association :comments, blueprint: CommentBlueprint`. Always name the blueprint.
- A value computed by the service object comes in through options:
  `field(:comment_count) { |article, options| options.fetch(:comment_counts).fetch(article.id) }`.
- Views only when the key set differs (`view :basic`, `view :detail`). A view differing
  by a key or two uses `include_view`, in one direction only. No empty view. More than
  four views → split the blueprint.
- Same keys with different values → options, not a new view.
- Use `render_as_hash` when the result goes inside a larger body (an envelope with
  `meta`); `render` when it is the whole body. Never put a `render` String inside a Hash:
  it is encoded twice.

```ruby
class ArticleBlueprint < ApplicationBlueprint
  identifier :id

  view :basic do
    field :title
    field :published_at
  end

  view :detail do
    include_view :basic
    field :body
    association :comments, blueprint: CommentBlueprint
  end
end
```
