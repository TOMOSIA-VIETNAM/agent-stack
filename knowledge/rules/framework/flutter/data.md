---
paths:
  - "lib/**/data/**"
  - "lib/**/repositories/**"
  - "lib/**/services/**"
  - "lib/**/api/**"
  - "lib/**/api_service/**"
---

# Data & network

- DTO ≠ domain model. DTOs (`json_serializable`) stay in the data layer; the repository maps to immutable domain models.
- One configured `Dio` instance: base URL from flavor config, timeouts, auth interceptor with single-flight token refresh, retry only for idempotent requests, logging interceptor in debug only.
- Hand-written services catch transport/parse exceptions and return `Err`. Generated Retrofit interfaces throw: the repository (or a thin wrapper) catches and converts to `Err`. Services never decide UX; repositories add caching, retry, fallback, mapping.
- Parse defensively: required vs optional fields explicit; unknown enum values map to a safe fallback, not a crash.
- Tokens and credentials only in `flutter_secure_storage`. Never in `SharedPreferences`, assets, logs, or source.
- Time: inject a clock; store UTC, format at the edge. Money: integer minor units, never `double`.
- Pagination and cancellation: repositories expose cursor/page APIs; use `CancelToken` for superseded requests.
- Idempotency: write operations safe to retry (client request ids where the API supports them).
- Changing a response shape: update DTO, mapper, fakes and tests together; regenerate with build_runner.
