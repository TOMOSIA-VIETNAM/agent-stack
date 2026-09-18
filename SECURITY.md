# Security Policy

## Supported versions

open-aidd is pre-1.0. Only the latest commit on `main` receives fixes; there are no
maintenance branches for earlier tags.

## Reporting a vulnerability

Report privately through GitHub: open the repository's **Security** tab and choose
**Report a vulnerability**. That opens a private advisory visible only to the
maintainers.

**Do not open a public issue, pull request, or discussion for a suspected
vulnerability.** A public report tells everyone how to exploit it before a fix exists.

Include what you have:

- what an attacker can do, and what they need to start (a repository they control, a
  crafted knowledge base, a specific flag),
- the steps to reproduce, with the exact command line,
- the commit or version you tested,
- anything that limits the impact, if you know of it.

A minimal reproduction is worth more than a long description. Do not include working
exploit code aimed at a third party's systems.

### What to expect

We aim to acknowledge a report within five working days and to tell you within ten
working days whether we consider it a vulnerability and what we intend to do. If a fix
is warranted, we will keep you updated until it ships, and credit you in the advisory
unless you ask us not to.

## Scope

This repository holds a code generator and the content it copies into a project. The
interesting boundaries are:

**In scope**

- Path traversal or writes outside the target directory from a crafted `catalog.yaml`,
  `upstream.yaml`, artifact front matter, or `--out` value.
- Command injection through any value that reaches `git` in `scripts/sync-upstream.mjs`.
- `npm run sync` fetching from somewhere other than the pinned repository and commit,
  or accepting a commit that does not match the pin.
- Generated output that destroys files open-aidd did not create. The generator may
  only remove paths its own previous manifest lists.
- Malicious content reaching `knowledge/` through the sync path without review.
- Generated output losing the `imported` record in its manifest, which is where the
  upstream copyright and licence of copied content are stated.

**Out of scope**

- The advice inside a rule or skill being wrong or incomplete. That is a bug — open an
  issue.
- Vulnerabilities in a project *generated* by open-aidd, where the cause is that
  project's own code.
- Vulnerabilities in upstream repositories we copy from. Report those upstream; tell
  us too, and we will move the pin.
- Findings that require an attacker to already have write access to your checkout or
  your machine.

## Notes for contributors

Two properties are load-bearing, and a change that weakens either is a security bug
regardless of intent:

1. **Generation is offline.** A generate run reads the repository and writes the
   target directory. It fetches nothing. Only `npm run sync`, run deliberately by a
   maintainer, reaches the network.
2. **Imported content is pinned and reviewed.** Sources pin a full 40-character
   commit SHA; a branch or tag is rejected. Moving a pin is a reviewable commit that
   shows every changed line, because the content is committed here rather than fetched
   at runtime.
