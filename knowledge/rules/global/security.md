---
id: security-baseline
name: Security Baseline
description: Non-negotiable security rules that apply to every change.
type: rule
layer: global
priority: 11
tags: [security]
---

## Secrets

- Never commit credentials, API keys, tokens, or private keys. Read them from
  environment variables or the project's secret manager.
- Never log secrets, full tokens, passwords, or complete payment details. Redact
  before logging.
- If a secret is ever committed, treat it as compromised: rotate it, do not merely
  remove it from the working tree.

## Input and output

- Validate every input crossing a trust boundary: HTTP parameters, webhook bodies,
  uploaded files, queue messages, and third-party API responses.
- Build database queries with parameter binding or the ORM's query interface. Never
  interpolate user input into SQL, shell commands, or file paths.
- Escape output by context: HTML, attributes, URLs, and JSON each need their own
  escaping. Default to the framework's auto-escaping and justify every bypass.

## Access control

- Authorize every request against the current actor, not only against the route.
  Authentication answers "who"; authorization answers "may they".
- Scope every query that reads user-owned data by the owner, so a changed identifier
  in the request cannot reach another tenant's records.
- Deny by default. A new endpoint is closed until it explicitly opens.

## Dependencies

- Pin dependency versions in the lockfile and commit it.
- Review new dependencies for maintenance status and licence before adding them.
