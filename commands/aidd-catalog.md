---
description: Show what the open-aidd knowledge base covers — technologies, rules, skills, and gaps
argument-hint: "[technology id, optional]"
allowed-tools: Bash(node:*), Read
---

Report what the open-aidd knowledge base currently covers.

Run:

```
node ${CLAUDE_PLUGIN_ROOT}/dist/aidd.mjs catalog --json
```

This also validates the knowledge base: a non-zero exit means a metadata or
referential error, and the message names the offending file. Report it verbatim.

If $ARGUMENTS names a technology, report only that entry: its kind, what it
requires, what it conflicts with, the curated version range, and the artifacts that
target it.

Otherwise summarize:

- how many technologies the catalog declares, grouped by kind,
- which of them have rules or skills, and which have none yet (these are the gaps
  worth filling next),
- the total rule and skill count.

Keep it to the numbers and the gaps. Do not quote rule bodies.
