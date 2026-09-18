---
id: documentation-baseline
name: Documentation Baseline
description: Where explanation belongs, and how much of it to write.
type: rule
layer: global
priority: 14
tags: [documentation]
---

- Comment the *why*, not the *what*. The code states what it does; the comment
  states the constraint, the trade-off, or the bug that forced this shape.
- Delete a comment that repeats the line below it.
- Document every public interface: what it returns, what it raises, and any side
  effect a caller cannot see from the signature.
- Keep the README accurate about how to install, run, and test the project. A stale
  setup section costs every new contributor an hour.
- Record decisions that are expensive to reverse — a datastore choice, an API
  contract, an auth model — where the next maintainer will look, not in a chat thread.
- Update the documentation in the same commit as the behaviour it describes.
