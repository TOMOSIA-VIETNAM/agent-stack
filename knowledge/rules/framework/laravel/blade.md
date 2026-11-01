---
paths:
  - "resources/views/**/*.blade.php"
  - "app/View/**/*.php"
---

# Laravel Blade

- Output with `{{ }}`; `{!! !!}` only for HTML the app sanitised itself. Pass data into `<script>` with `Js::from($data)`, never `{{ json_encode() }}`.
- Every form that writes includes `@csrf` (and `@method` for PUT/PATCH/DELETE). Fix a 419 by sending the token, never by adding the route to the CSRF exceptions; only signature-verified webhooks are excluded.
- Views display; they do not query. No `Model::where()`, no lazy relationship access in a loop, no business rules: the controller (or a view composer, if the project uses them) passes ready data, eager loaded.
- Reused markup becomes a component in `resources/views/components` (`<x-alert>`); a class component (`app/View/Components`) only when it needs logic or injected dependencies. Declare props with `@props([...])` and defaults.
- Merge caller classes with `$attributes->merge(['class' => '…'])` instead of hard-coding them, so a component can be adjusted where it is used.
- Layouts use one mechanism, the one the project already has (component layouts with `{{ $slot }}`, or `@extends`/`@section`).
- Hide UI the user cannot use with `@can`, but the server still authorizes the action.
- User-facing text goes through `__()` when the project has a `lang/` directory.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.
