# Accessibility reference

- Tap targets ≥ 48×48 dp (`MaterialTapTargetSize.padded`, `ConstrainedBox`).
- Icon-only buttons: `tooltip` or `Semantics(label:)`. Decorative images: `excludeFromSemantics: true`; meaningful images: `semanticLabel`.
- Group related info with `MergeSemantics`; hide duplicates with `ExcludeSemantics`.
- Text scaling: test at 1.0, 1.5, 2.0 via `MediaQuery(textScaler:)`; no fixed heights around text; allow wrapping/scroll.
- Contrast ≥ 4.5:1 body text, 3:1 large text/UI; don't use color alone (add icon/text).
- Focus order logical; `FocusTraversalGroup` where needed; visible focus on desktop/web.
- Announce dynamic changes: `SemanticsService.announce` (sparingly), live regions for status text.
- Test: `tester.ensureSemantics()`, `meetsGuideline(androidTapTargetGuideline)`, `iOSTapTargetGuideline`, `labeledTapTargetGuideline`, `textContrastGuideline`; manual TalkBack/VoiceOver pass for key flows.
- Respect `MediaQuery.disableAnimations` / reduce motion.
