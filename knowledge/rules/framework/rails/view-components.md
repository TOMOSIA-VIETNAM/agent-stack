---
paths:
  - "app/components/**/*"
  - "spec/components/**/*.rb"
---

# ViewComponent

Applies only when the `Gemfile` includes `view_component`; otherwise ignore this file.

Reusable UI is a component (the `view_component` gem).

- `app/components/<namespace>/<name>_component.rb` with `<name>_component.html.erb`
  beside it; a sidecar directory `<name>_component/` once there is more than one extra
  file. `<Name>Component < ApplicationComponent`; `ApplicationComponent < ViewComponent::Base`.
- Make a component for UI repeated on a page (once per record in a list counts) or used on
  several pages, or with its own render logic.
- Explicit keyword arguments: `initialize(article:, size: :md)`; defaults live there.
- Methods for the template are `private`. Hide the component with `render?`.
- Slots with `renders_one`/`renders_many`; a block arrives as `content`.
- Pass everything in through the constructor: no `params`, `session`, `current_*`, and no
  query or service call inside. That keeps a component renderable in a preview and a
  spec with no request.
- Record formatting → take an already decorated object.
- Display strings go through i18n. Call the app's own helpers (`app/helpers`)
  through `helpers.`; Rails' built-in view helpers (`time_tag`, `link_to`) are called
  directly.
- Render a collection with `with_collection`.
- Every component has a preview: `spec/components/previews/<namespace>/<name>_component_preview.rb`, one
  method per variant or slot, no DB reads.
