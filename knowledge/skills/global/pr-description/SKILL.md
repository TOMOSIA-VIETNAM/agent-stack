---
name: pr-description
description: Analyzes a pull request and produces a structured technical summary in Markdown. Use when the user asks to describe a PR, write a PR summary, explain what a branch changes, document request flow, or generate review context before merge. Triggers on "PR description", "analyze this PR", "summarize the pull request", "/pr-description".
---

# PR Description

## Overview

Turn a pull request diff into a reviewer-ready technical brief. Focus on **what changed for the business**, **how requests move through the system**, and **what can break** — not a file-by-file changelog.

This skill complements `code-review-and-quality` (quality gates) and `caveman-review` (inline comments). Use this skill when the deliverable is a **structured PR narrative**, not line-by-line review feedback.

## When to Use

- User asks to analyze, summarize, or describe a pull request
- Preparing merge context for reviewers who did not author the change
- Documenting a branch before opening or updating a PR on GitHub
- Explaining impact to product, QA, or ops stakeholders

## Inputs

Resolve the PR scope before writing:

| Source | How |
|--------|-----|
| GitHub PR number or URL | `gh pr view <num>`, `gh pr diff <num>` |
| Current branch vs base | `git diff <base>...HEAD`, `git log <base>..HEAD --oneline` |
| Uncommitted work | `git diff`, `git diff --cached` (state this explicitly in the output) |

Default base branch: `main`, then `master`, unless the user or `gh pr view` specifies otherwise.

Gather evidence from the diff and commits — do not invent APIs, tables, or integrations that are not in the changes.

## How It Works

1. **Collect** — diff, commit messages, PR title/body (if any), linked issues.
2. **Infer intent** — why this change exists from commits, issue text, and naming; ask one clarifying question only if business purpose is still ambiguous.
3. **Trace flow** — follow entry points (HTTP routes, CLI, jobs, UI events) through services to persistence and external calls.
4. **Map surface area** — modules/classes, schema/migrations, third-party calls, risks, file list.
5. **Emit** — single Markdown document using the output template below (exact section order).

## Analysis Guide

### 1. Business purpose

Answer in plain language:

- What user or business problem does this solve?
- What behavior changes for end users or operators?
- What is explicitly **out of scope** in this PR?

If intent is unclear from the diff, say what you inferred and what remains uncertain.

### 2. Request flow

Describe the path data and control take **for this PR's changes**:

- Entry point (API, UI action, webhook, cron, queue consumer)
- Middleware / auth / validation touched by the diff
- Service or domain layer calls
- Persistence or cache reads/writes
- Response or side effects (email, push, audit log)

Use a numbered list for linear flows, or a mermaid `sequenceDiagram` / `flowchart` when multiple actors or branches help clarity. Only include steps **modified or added** unless full context is required to understand the change.

### 3. Main classes/modules involved

List the **primary** types the reviewer must understand:

- File path and symbol (class, module, function, component, hook)
- One-line role in this change
- Group by layer (API, domain, infra, UI) when helpful

Skip generated files, lockfiles, and pure formatting unless they affect behavior.

### 4. Database changes

Report migrations, schema edits, ORM model changes, seed/data scripts, and index/constraints:

| Item | Detail |
|------|--------|
| Tables/collections | created, altered, dropped |
| Columns/indexes | added, renamed, type changes |
| Migrations | filenames and up/down behavior if visible |
| Data backfill | one-off scripts, idempotent? |
| Rollback | reversible without data loss? |

If none: `None — no database changes in this PR.`

### 5. External service integrations

List third-party or internal services **called or configured** by this diff:

- Service name and purpose in this change
- New vs modified integration
- Auth method (API key, OAuth, mTLS) if visible in code/config
- Timeouts, retries, webhooks, feature flags

If none: `None — no new or modified external integrations.`

### 6. Risk points

Prioritize merge and production risks:

- Breaking API or contract changes
- Authz/authn gaps, PII exposure, secrets in diff
- Migration or data-loss risk, backward compatibility
- Performance (N+1, unbounded queries, hot paths)
- Missing tests, feature-flag requirements, deployment ordering
- Dependencies on config, env vars, or manual steps

Tag severity when useful: **High** / **Medium** / **Low**. Link to `security-and-hardening` for security-specific depth if needed.

### 7. Files affected

Summarize scope — do not dump every path unless the PR is small:

- Count of files changed (added / modified / deleted)
- Group by area (e.g. `src/api/`, `migrations/`, `tests/`)
- Call out **critical** files (entry points, migrations, auth, shared libs)

For PRs with ≤15 files, a bullet list of paths is acceptable.

## Output Template

Deliver **one** Markdown document. Use these headings **in this order** (English headings as below):

```markdown
# PR Summary: <short title>

**Branch:** `<branch>` → **Base:** `<base>`
**Scope:** <N> files (+A / ~M / -D) · <commit count> commits
**Sources:** <e.g. gh pr #123, git diff main...HEAD>

## 1. Business purpose

<paragraph>

## 2. Request flow

<numbered steps and/or mermaid diagram>

## 3. Main classes/modules involved

| Symbol | Location | Role in this PR |
|--------|----------|-----------------|
| ... | ... | ... |

## 4. Database changes

<detail or "None — no database changes in this PR.">

## 5. External service integrations

<detail or "None — no new or modified external integrations.">

## 6. Risk points

- **[High|Medium|Low]** <risk> — <mitigation or open question>

## 7. Files affected

<summary and grouped list>
```

## Present Results to User

- Output the full Markdown document in the chat (ready to paste into the PR description or a comment).
- If scope was partial (uncommitted only, no remote PR), state that limitation in **Sources**.
- Do not mix in code-review verdicts (approve/request changes) unless the user also asked for a review; point them to `code-review-and-quality` instead.

## Red Flags

Stop and ask the user if:

- No diff is available (empty branch, wrong base, PR not fetched)
- The change set is huge (>500 files) — offer to summarize by area or analyze top-level directories first
- Business purpose cannot be inferred and commit messages are generic ("fix", "update")

## See Also

- `code-review-and-quality` — multi-axis review before merge
- `caveman-review` — terse inline PR comments
- `security-and-hardening` — security depth when risks are security-related

## Verification

Before sending the summary:

- [ ] All seven sections present in order
- [ ] Claims traceable to diff, commits, or PR metadata
- [ ] "None" sections explicitly stated where applicable
- [ ] Request flow reflects **this PR's** changes, not the entire system catalog
- [ ] Risk points are actionable, not generic platitudes
