---
paths:
  - "app/forms/**/*.rb"
  - "app/validators/**/*.rb"
---

# Rails Forms and Validators

A form object validates the input of one use case. Only the service object of that use
case builds it, in its validation step.

## Forms

- `app/forms/<namespace>/<action>_form.rb`, inheriting `ApplicationForm`, which includes
  `ActiveModel::Model` and `ActiveModel::Attributes` and raises the project's 422 error
  from a bang method such as `valid!`.
- Name the form after the same namespace and action as its service object.
- Declare every input with `attribute :name, :type`, type always given. No
  `attr_accessor`: an untyped attribute skips casting, so `"0"` stays truthy.
- Array and hash inputs use types registered with `ActiveModel::Type.register` in an
  initializer.
- A base form shared by several actions holds the common attributes; each child declares
  only what it adds. Reuse a form by inheritance, never by building another action's form.
- Custom validation: `validate :must_<condition>` with a `private` method, guard clause
  first:
  ```ruby
  validate :must_be_unpublished

  private

  def must_be_unpublished
    return unless article.status.published?

    errors.add(:article, :already_published)
  end
  ```
- `errors.add(:attr, :symbol_key)`, never a message string; the message comes from i18n.
- `inclusion:` reads its list from the source (`Article.status.values`, config), never a
  literal list, except `[true, false]`.
- Numeric limits come from config.
- No DB access in a form other than an `existence:` or `uniqueness:` validator.
- Nested hash input → validate it with its own form and copy its errors onto the parent
  key.

## Validators

- `app/validators/<name>_validator.rb` → `<Name>Validator < ActiveModel::EachValidator`,
  implementing `validate_each`.
- Used by key: `validates :url, url: true`.
- Start with `return if value.blank?` and leave presence to `presence:`; report with
  `record.errors.add(attribute, :symbol_key)`.
