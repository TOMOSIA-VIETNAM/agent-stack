---
id: testing-baseline
name: Testing Baseline
description: What must be tested, and what a good test looks like.
type: rule
layer: global
priority: 13
tags: [testing, quality]
---

## What to test

- Every bug fix starts with a test that fails for the reported reason and passes
  after the fix.
- Cover the behaviour at its boundaries: empty input, the maximum allowed size, the
  permission denied path, and the concurrent case when one exists.
- Test behaviour through the public surface. A test that asserts on private state
  breaks on every refactor without catching a single defect.

## How to write tests

- One reason to fail per test. If the name needs "and", split it.
- Name tests after the behaviour and its condition, not after the method.
- Arrange, act, assert — in that order, with the assertion visible without scrolling.
- Build test data with factories or fixtures that state only the fields the test
  cares about; defaults carry the rest.
- Keep tests deterministic: no reliance on wall-clock time, random values, network
  access, or the order tests happen to run in. Freeze time and seed randomness.

## What not to do

- Do not assert on log output or on the exact wording of a message that is not part
  of the contract.
- Do not weaken an assertion to make a flaky test pass. Find the race.
