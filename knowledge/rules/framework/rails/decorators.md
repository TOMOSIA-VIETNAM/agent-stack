---
paths:
  - "app/decorators/**/*.rb"
---

# Draper Decorators

Applies only when the `Gemfile` includes `draper`; otherwise ignore this file.

Display logic for one record lives in a decorator (the `draper` gem).

- `app/decorators/<model>_decorator.rb` → `<Model>Decorator < ApplicationDecorator`;
  `ApplicationDecorator < Draper::Decorator`. `delegate_all`.
- Holds display logic for one record: date, number and currency formats, i18n labels,
  fallbacks when blank, links and URLs.
- Name methods by output: `*_text`, `*_label`, `*_url`.
- Read the record through `object`, helpers through `h` (`h.t`, `h.l`, `h.link_to`).
- No query, no association that was not preloaded, no business logic, no JSON, no write.
- Decorate in the controller: `record.decorate`, or
  `ArticleDecorator.decorate_collection(records)`.

```ruby
class ArticleDecorator < ApplicationDecorator
  delegate_all

  def published_at_text
    return h.t('articles.unpublished') if object.published_at.blank?

    h.l(object.published_at, format: :short)
  end
end
```
