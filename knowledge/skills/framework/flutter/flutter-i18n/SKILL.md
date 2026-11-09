---
name: flutter-i18n
description: Adds or changes localized strings in a Flutter app (ARB gen_l10n or easy_localization JSON) across every locale and replaces hard-coded UI text. Use when new user-facing text appears, a Flutter locale file is out of sync, or a hard-coded string is found.
---

# Add an i18n key

## Steps
1. **Detect the system.** `flutter_localizations` + `l10n.yaml` + `.arb` → gen_l10n. `easy_localization` + `assets/**/*.json` → JSON keys. Identify the base/source locale and every other locale file.
2. **Name the key** after existing conventions (e.g. dotted `feature.screen.purpose` or camelCase). Reuse an existing key when meaning is identical; check with grep first.
3. **Add to the base locale**, then to **every other locale** (never leave a locale missing; if translation is unknown, add best-effort text and tell the user which need review).
4. **Placeholders** identical across locales (`{name}` / `{count}`); plurals/select via the system's ICU syntax, not string concatenation.
5. **Regenerate** if gen_l10n: `flutter gen-l10n`.
6. **Replace the literal** in code with the localized accessor (`context.l10n.key` / `AppLocalizations.of(context)!.key` / `tr('key')`). No concatenating translated fragments.
7. **Validate JSON locales.** Run `python3 .claude/skills/flutter-i18n/scripts/validate_locales.py <locale_dir> <base_file>` (e.g. `assets/languages en.json`). It prints missing keys, extra keys and placeholder mismatches per locale and exits 1 on any. Fix each line, rerun until it prints `OK`. For ARB, `flutter gen-l10n` is the check.
8. **Verify (gate).** `dart format --set-exit-if-changed <touched>` → `flutter analyze` (no issues in touched files; total not above the count before you started, or 0 on a project with no issues; if the project has `scripts/verify.sh`, run it instead) → `flutter test`. Report output and list of keys added.
