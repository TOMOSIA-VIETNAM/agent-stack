---
paths:
  - "app/models/**/*.rb"
---

# Rails Models

## The model file is declarations

- `app/models/<model>.rb` holds declarations only: `include`s, constants,
  `class_attribute`, associations, validations, scopes, callbacks, `delegate`, and the
  macros of the gems the project uses. Methods live in concerns, so the model file
  stays a readable table of what the model is. The exceptions are class methods a gem
  requires on the class itself, such as Ransack's `ransackable_attributes`, and the
  defaults other rules place in the abstract `ApplicationRecord`.
- Declare each association, scope and `delegate` once.
- Align the arguments of consecutive one-line declarations into columns. A blank line
  starts a new group.

```ruby
class Article < ApplicationRecord
  include Article::Reader
  include Article::Writer

  belongs_to :user
  has_many   :comments, dependent: :destroy

  scope :by_user,         ->(user) { where(user:) }
  scope :order_by_recent, -> { order(published_at: :desc) }

  before_save :normalize_title
end
```

## Methods live in concerns

- `app/models/concerns/<model>/`, one module per role, `extend ActiveSupport::Concern`:
  - `reader.rb`: queries and computations, no writes;
  - `writer.rb`: methods that write;
  - `callback.rb`: the callback methods;
  - more (`repository.rb` for complex SQL, `counter.rb`, `cache.rb`) when the model needs
    them.
- A method that writes ends in `!`; a predicate ends in `?`.
- A writer that changes state checks its own precondition (`publish!` raises unless the
  record is a draft), so every caller gets the guard, not only the one service.

## Declarations

- Scope names start with `with_`, `without_`, `by_` or `order_by_`, so a chain reads as
  a sentence. One line `-> { }`, multi-line `lambda { }`.
- Every `has_many`/`has_one` declares `dependent:`, even `dependent: nil`, so deleting a
  parent is a decision, not an accident.
- Static per-model config: `class_attribute :configs, default: { ... }`, read as
  `Article.configs[:key]`. Durations and limits used only by the model are constants.
- A secondary database has an abstract `<Db>::ApplicationRecord` with `connects_to`.
- A model may enqueue jobs and call `lib/`. It never calls a service object, form,
  serializer or decorator.
- Keep callbacks to the record's own data. Side effects on other records, mail or
  external calls belong in the service object.

## Integrity

- A validation is not a constraint: two requests can both pass it. Back uniqueness with
  a unique index, required columns with `null: false`, and every `belongs_to` with a
  foreign key.
- The reverse holds too: a `null: false` column a caller can leave blank has a presence
  validation, so a blank value is a validation error, not a database exception.
- Index every column used in a `where`, a join or an `order` on a growing table.
