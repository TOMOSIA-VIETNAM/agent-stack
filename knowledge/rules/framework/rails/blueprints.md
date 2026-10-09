---
paths:
  - "app/blueprints/**/*.rb"
---

# Blueprinter

Applies only when the `Gemfile` includes `blueprinter`; otherwise ignore this file.

JSON responses are built with the `blueprinter` gem. A blueprint only maps loaded data to
keys.

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
- No DB access: no query, `count`, `where`, `order`. Load and aggregate in the service
  object; an association read here that was not preloaded is an N+1.
- Views only when the key set differs (`view :basic`, `view :detail`). A view differing
  by a key or two uses `include_view`, in one direction only. No empty view. More than
  four views → split the blueprint.
- Same keys with different values → options, not a new view.
- Datetimes stay ISO 8601; do not set a global `datetime_format`.
- Never build a response Hash by hand in a controller or service object.
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
