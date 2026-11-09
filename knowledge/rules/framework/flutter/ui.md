---
paths:
  - "lib/**/ui/**"
  - "lib/**/presentation/**"
  - "lib/**/widgets/**"
  - "lib/**/*_page.dart"
  - "lib/**/*_view.dart"
---

# UI & widgets

- Extract small `StatelessWidget` classes, not helper methods returning widgets (helpers defeat `const` and rebuild scoping).
- `const` constructors and `const` instances everywhere possible.
- No logic in `build`: no I/O, no parsing, no sorting of large lists, no object creation that should be cached. Compute in the state holder.
- Long/unknown-length lists: `ListView.builder` / slivers with stable `key`s. Never `shrinkWrap: true` inside a scrollable for big lists.
- `RepaintBoundary`, `Opacity` alternatives, isolates: only after profiling in profile mode with DevTools.
- Theme via `ThemeData` + `ThemeExtension` tokens (colors, spacing, radii, text styles). No literals.
- Text through l10n (`context.l10n.xxx` / `tr('key')`). Layouts must survive 2x text scale and long translations (no fixed heights on text).
- Accessibility: `Semantics`/`semanticsLabel` for icon-only buttons and images, tap targets ≥ 48×48 dp, contrast ≥ WCAG AA, do not convey meaning by color alone.
- Handle all four states explicitly: loading, empty, error (with retry), data.
- Controllers/focus nodes created in `initState`, disposed in `dispose`; `mounted` check after `await`.
- Images: size-appropriate assets, `cacheWidth`/`cacheHeight` for large network images, error + placeholder builders.
