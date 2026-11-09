---
paths:
  - "android/**"
  - "ios/**"
  - "**/*flavor*"
  - "**/.env*"
  - ".github/workflows/**"
---

# Security & release

- Never commit secrets: keystores, `google-services.json`/`GoogleService-Info.plist` real values for prod, `.env*` real values, API keys. Commit `.env.sample` only. Never print secret values.
- Client-embedded keys are public. Anything truly secret lives on the server.
- Release builds: `flutter build <apk|appbundle|ipa> --release --flavor <f> --obfuscate --split-debug-info=build/symbols`; archive/upload symbols to the crash reporter.
- Flavors `dev` / `stg` / `prod` with separate app ids, icons, Firebase projects and base URLs. Always pass `--flavor`.
- Network: HTTPS only; no `badCertificateCallback` that returns true; consider certificate pinning for sensitive APIs.
- Permissions: request minimum, at point of use, with rationale; handle denial and "permanently denied".
- Versioning: bump `version: x.y.z+build` per release; build number strictly increasing.
- CI runs the same checks as local (format, analyze, test) before any build job.
