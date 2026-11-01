---
paths:
  - "lang/**"
---

# Laravel Localization

- A new Laravel app has no `lang/`; create it with `php artisan lang:publish` only when the project is translated.
- Use the key style the project has: short keys in PHP files (`__('orders.cancelled')`) or translation strings as keys in JSON files (`__('Order cancelled')`). Do not mix both for the same text.
- A new key is added to every locale file in the same change; a missing key silently prints the key itself to the user.
- Placeholders are named (`:name`), never concatenated around the translated string: word order differs between languages.
- Plurals use `trans_choice()` with the full form list each language needs, not `if ($count === 1)`.
- Validation messages and attribute names are translated in `lang/{locale}/validation.php` (`attributes` array), not hard-coded in each form request.
- Dates, numbers and currency are formatted for the locale (`Number::currency()`, Carbon `->isoFormat()` with the locale set), not with fixed formats.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
