---
name: flutter-review
description: Reviews Flutter code read-only for layering violations, undisposed controllers and leaks, rebuild performance, accessibility and Flutter-specific security and test gaps. Use for a review of Flutter changes or an audit of a Flutter feature; the language-neutral review is code-review-and-quality.
allowed-tools: Read, Grep, Glob, Bash(git diff *), Bash(git log *), Bash(git status *), Bash(flutter analyze *)
---

# Flutter review / audit (read-only)

Do not edit code. Report findings only.

## Steps
1. **Scope.** Diff (`git diff <base>...HEAD`) or named path. List files reviewed.
2. **Run analyzer** (`flutter analyze`) and include any issues in scope.
3. **Walk the checklist** per file; skip categories that don't apply.

| Area | Look for |
|---|---|
| Layering | view → service/HTTP calls; bloc/notifier constructing deps; repo → repo; DTO in UI; cross-feature imports |
| Result/errors | raw exceptions to UI, `catch (_) {}`, missing Err handling, `default:` on sealed switch |
| State | mutable state, missing equality, emit after close, `ref.read` in build, missing `ref.mounted` check |
| Lifecycle | undisposed controller/focus node/subscription/player/stream, `setState`/context after `await` without mounted check |
| Performance | work in `build`, helper methods instead of widgets, non-builder long lists, missing `const`, wide rebuild scope |
| i18n/theme | hard-coded text/colors/spacing/asset paths/pref keys |
| Accessibility | unlabeled icon buttons, targets < 48dp, fixed-height text, color-only meaning |
| Security | secrets/tokens in code/logs/prefs, HTTP, bad-cert bypass, unvalidated deep links |
| Tests | no regression test for fix, nondeterminism, untested failure paths |
| Hygiene | new `ignore`, hand-edited generated files, unneeded dependency, scope creep |

4. **Output**, one line per finding, most severe first:
   `path:line  🔴|🟡|🔵  problem → fix`
   🔴 bug/leak/security, 🟡 convention or maintainability, 🔵 nit. End with a one-line verdict (approve / changes requested) and what was **not** checked.
5. Never pad with praise; never report formatting nits that `dart format` handles.

References: `../flutter-references/performance.md`, `accessibility.md`, `security.md`, `architecture.md`.
