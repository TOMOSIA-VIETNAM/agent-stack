---
description: Check whether this project's generated .claude files are behind the agent-stack knowledge base
argument-hint: "[framework, optional — defaults to what the last run recorded]"
allowed-tools: Bash(node:*), Read
---

Report whether the project in the current working directory is what a generate run
would make of it today. This command writes nothing.

Run:

```
node ${CLAUDE_PLUGIN_ROOT}/dist/agent-stack.mjs check --out . --json
```

With no flags, it checks against the frameworks the last run recorded in
`.claude/agent-stack-manifest.json`. If $ARGUMENTS names frameworks, map each to a
catalog id exactly as `/agent-stack:generate` does, and pass them as `--framework <id>`.

The exit code is the answer:

- **0** — up to date. Say so in one line.
- **3** — behind. `changes` lists every path a generate run would `add`, `update` or
  `remove`. Report them grouped by change, then offer `/agent-stack:generate` to apply them. Do not
  run it yourself.
- **2** — either nothing was generated here yet (stderr says so: offer `/agent-stack:generate`),
  or `report.findings` has an error, which you relay as `/agent-stack:generate` does.
- **65** — a recorded or requested framework is not in the catalog any more. Relay the
  CLI's output as it is.

Whatever the exit code, read out every warning in `report.findings` in full. Two of
them concern the project's own edits:

- `modified-file` — the project edited a file agent-stack wrote. Generate will leave
  it alone and stop managing it; only `--overwrite` takes it back.
- `retained-file` — a file agent-stack no longer generates, which it will not delete
  because the project edited it. It is the project's to keep or delete.

Then stop. Do not edit any file.
