# Security reference

- Secrets: none in repo, assets, or committed `--dart-define`. App binaries are inspectable; client keys are public by definition. Real secrets stay on the server.
- Storage: tokens/credentials in `flutter_secure_storage` (Keychain/Keystore). `SharedPreferences` is plaintext.
- Transport: HTTPS only; never accept bad certificates; consider pinning for high-risk APIs (plan rotation to avoid bricking the app).
- Obfuscation: `--obfuscate --split-debug-info=build/symbols` for release; keep symbols for crash de-obfuscation. Obfuscation slows reverse engineering; it is not security.
- Logging: no tokens, PII, or full payloads; disable verbose network logs in release.
- Deep links / intents: validate and sanitize parameters; no privileged actions from a link alone.
- WebViews: restrict JS channels, allowed origins; no `javascriptMode` unrestricted with untrusted content.
- Biometric/local auth: `local_auth` gates UI only; protect secrets with Keystore-bound keys when stakes are high.
- Permissions: minimal, contextual, handle denied states.
- Dependencies: review new packages (maintainer, last release, open security issues); run `flutter pub outdated`; pin via `pubspec.lock` for apps.
