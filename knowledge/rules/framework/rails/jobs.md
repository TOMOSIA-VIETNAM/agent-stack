---
paths:
  - "app/jobs/**/*.rb"
  - "app/mailers/**/*.rb"
---

# Rails Jobs and Mailers

- `<Name>Job < ApplicationJob`, namespaced by directory.
- `perform` takes ids and primitives, never records, and loads what it needs. A record
  serialized into the queue can be stale or deleted by the time the job runs.
- A job must be idempotent: the queue may deliver it twice.
- A job with several steps lists them in `perform`, like a service object's `call`.
- A job calls models and `lib/`. It never calls a service object meant for a request.
- `ApplicationJob` notifies on failure and re-raises; never swallow the error inside a
  job, or the retry never happens.
- Enqueue jobs and deliver mail only after the transaction that produced their data
  commits (`deliver_later`, `after_commit`).
