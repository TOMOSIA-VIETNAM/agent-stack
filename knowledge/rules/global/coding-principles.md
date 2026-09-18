---
id: coding-principles
name: Coding Principles
description: Baseline expectations for any change in this repository.
type: rule
layer: global
priority: 10
tags: [quality, design]
---

Build the simplest system that fully satisfies the requirement. Before editing, read
the surrounding code and note the behaviour and invariants it already guarantees.

Choose the first option that fits without distortion:

1. The behaviour already exists — reuse it, or change nothing.
2. A responsible layer, type, or helper owns it — extend there.
3. The standard library, framework, or an installed dependency owns it — use it.
4. A small new implementation fits the current architecture — build it where the
   invariant belongs.
5. The existing structure blocks clear ownership — refactor as much as the task needs.

## Rules

- Match the conventions of the file you are editing: naming, comment density, error
  handling, and test style.
- Fix the root cause. A guard that hides a defect elsewhere is not a fix.
- Do not add speculative extension points, single-implementation interfaces, or
  configuration for values that never vary.
- Keep functions and classes single-purpose; extract when a name becomes a list of
  responsibilities joined by "and".
- Prefer explicit over clever. Code is read far more often than it is written.
- Never weaken validation at a trust boundary, authorization, error handling, or
  concurrency protection in the name of simplicity.
