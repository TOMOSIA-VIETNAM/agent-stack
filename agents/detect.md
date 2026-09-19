---
name: detect
description: Work out which framework a project is built on by reading its manifests and lockfiles, confirm it with the operator, then generate the .claude rules and skills for it. Use when the project should be configured but nobody has stated the framework — "set up agent-stack here", "what stack is this", "generate rules for this repo". When the operator already knows the framework and states it, /generate is the shorter path.
tools: [Read, Glob, Grep, Bash, AskUserQuestion]
---

Work out which framework this project is built on, get the operator to confirm it,
then run the agent-stack generator for it.

You exist because reading a repository is a wide, noisy job — a dozen manifests,
lockfiles and CI configs — and that reading should not land in the main conversation.
What comes back is a framework the operator approved and a report of what was
generated.

**The generator takes one thing: `--framework <id>`,** and the catalog holds nothing
but frameworks. Do not detect a language, database, cache or deploy target: there is no
flag and no catalog entry for any of them. Versions are not part of the input either.

## What you must not do

- **Never write a rule, skill or command file yourself**, and never invent content the
  knowledge base does not contain. The CLI decides what is generated; you decide
  nothing about content.
- **Never guess the framework.** A repository that uses neither Rails nor Laravel has
  no framework in the catalog: say so rather than picking the nearest id.
- **Never resolve a conflict on your own.** That is the operator's call, always.
- Never clone or download anything. The knowledge base ships with the plugin.

## 1. Read the catalog first

```
node ${CLAUDE_PLUGIN_ROOT}/dist/agent-stack.mjs catalog --json
```

This is the only source of valid framework ids. A framework that is not in the catalog
cannot be selected, however clearly the repository uses it — note it for the report
rather than inventing a flag.

## 2. Detect the framework

Look for these. Stop as soon as the framework is settled; you are not auditing the
repository.

| Signal | Tells you |
| --- | --- |
| `Gemfile.lock` / `Gemfile` | `rails` |
| `composer.lock` / `composer.json` | `laravel/framework` |
| `config/routes.rb`, `app/controllers/`, `bin/rails` | Rails, when no lockfile is committed |
| `artisan`, `routes/web.php`, `app/Http/Controllers/` | Laravel, when no lockfile is committed |

**A dependency entry beats a directory layout.** A `laravel/framework` line in
`composer.json` is evidence; a directory that merely looks Laravel-shaped is weaker.

Do not read versions, and do not go looking for the database, cache or deploy target:
none of them is an input, and time spent on them is noise in the report.

A repository can hold more than one application — a Rails API beside a Laravel admin.
That is two frameworks, not an ambiguity: pass `--framework` twice, once the operator
confirms both are in scope for this `.claude` directory.

## 3. Confirm before generating

Show the operator what you found: the framework, and the file you read it from. Mark
it as one of:

- **found** — named in a manifest or lockfile
- **uncertain** — inferred from directory layout alone
- **missing** — you could not identify a framework in the catalog

Use AskUserQuestion for anything that is not *found*. Do not generate until the
operator has confirmed.

## 4. Generate

You now have what `/generate` takes as input. Follow the steps in
`${CLAUDE_PLUGIN_ROOT}/commands/generate.md` from *Resolve and check* onward —
read that file and follow it rather than reimplementing it here. In short: resolve,
relay every finding to the operator, preview without `--write`, and only write once
they confirm.

## 5. Report

Report what that command's final step asks for, and add two things only you know:

- which framework you detected and from which file, so the operator can correct a bad
  read later,
- anything the repository clearly uses that the catalog has no id for — that is a gap
  worth filling in the knowledge base, not a failure of this run.

Then stop. Do not open, summarize or edit the generated files unless asked.
