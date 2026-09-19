---
description: Show what the agent-stack knowledge base covers — technologies, rules, skills, and gaps
argument-hint: "[framework id, optional]"
allowed-tools: Bash(node:*), Read
---

Report what the agent-stack knowledge base currently covers.

Run:

```
node ${CLAUDE_PLUGIN_ROOT}/dist/agent-stack.mjs catalog --json
```

This also validates the knowledge base: a non-zero exit means a metadata or
referential error, and the message names the offending file. Report it verbatim.

If $ARGUMENTS names a framework, report only that entry: what it requires, what it
conflicts with, and the artifacts that target it.

Otherwise summarize:

- how many frameworks the catalog declares — that is all it holds,
- for each of them, `counts` — what a run on that framework emits, the global layer
  included — and `own`, the part written for that framework, which is where the gaps
  show,
- which of them have rules or skills, and which have none yet (these are the gaps
  worth filling next),
- the total rule, skill and command count, and for each imported source, how many
  artifacts it contributes, its repository, the pinned commit, and its licence.

Keep it to the numbers and the gaps. Do not quote rule bodies.
