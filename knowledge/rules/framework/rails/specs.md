---
paths:
  - "spec/**/*.rb"
---

# Rails Specs

- Specs mirror the source: `app/<layer>/<path>.rb` → `spec/<layer>/<path>_spec.rb`,
  `lib/<path>.rb` → `spec/lib/<path>_spec.rb`.
- Infer the spec type from the path, configured once in `spec/rails_helper.rb`; do not
  write `type:` by hand:
  ```ruby
  config.infer_spec_type_from_file_location!
  %w[service form policy decorator component blueprint].each do |layer|
    config.define_derived_metadata(file_path: %r{/spec/#{layer}s/}) { |meta| meta[:type] ||= layer.to_sym }
  end
  ```
- `context 'when ...'`, `it 'returns ...'`.
- Assert errors by class (`raise_error(ForbiddenError)`), never by message.

## By layer

- Service object: build it with `ActionController::Parameters.new(...)` and the actor,
  then `call`. One example per step outcome, including each error it raises.
- Form: one example per validation, asserting the error key:
  `expect(form.errors.details[:title]).to include(error: :blank)`.
- Blueprint: compare the whole Hash with `eq`, one example per view.
- Decorator: `build_stubbed` records, `eq` on the output, one example per fallback.
- Component: `render_inline`, then `have_css`/`have_text`; one example per variant, per
  slot, and for `render?` returning false.
- Request spec: status and response envelope only; the logic is covered by the service
  object's spec. An API documented with rswag keeps its spec in `spec/integration/` and
  ends with `run_test!`.
