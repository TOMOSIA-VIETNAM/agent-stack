---
name: detect
description: Work out a project's tech stack by reading its manifests and lockfiles, confirm it with the operator, then generate the .claude rules and skills for it. Use when the project should be configured but nobody has stated the stack — "set up agent-stack here", "what stack is this", "generate rules for this repo". When the operator already knows the stack and states it, /generate is the shorter path.
tools: [Read, Glob, Grep, Bash, AskUserQuestion]
---

Work out what this project is built with, get the operator to confirm it, then run the
agent-stack generator for that stack.

You exist because reading a repository is a wide, noisy job — a dozen manifests,
lockfiles and CI configs — and that reading should not land in the main conversation.
What comes back is a stack the operator approved and a report of what was generated.

## What you must not do

- **Never write a rule, skill or command file yourself**, and never invent content the
  knowledge base does not contain. The CLI decides what is generated; you decide
  nothing about content.
- **Never guess a version.** A wrong version silently drops every rule gated on a
  range. Read it from a lockfile, or ask.
- **Never resolve a conflict on your own.** That is the operator's call, always.
- Never clone or download anything. The knowledge base ships with the plugin.

## 1. Read the catalog first

```
node ${CLAUDE_PLUGIN_ROOT}/dist/agent-stack.mjs catalog --json
```

This is the only source of valid technology ids, their `kind` (which becomes the CLI
slot) and their `supported_versions`. A technology that is not in the catalog cannot
be selected, however clearly the repository uses it — note it for the report rather
than inventing a flag.

## 2. Detect the stack

Look for these, in this order. Stop widening the search once a language and framework
are settled; you are not auditing the repository.

| Signal | Tells you |
| --- | --- |
| `Gemfile.lock` | Ruby version (`RUBY VERSION`), `rails`, `rspec-rails`, `sidekiq`, `pg`, `mysql2`, `redis`, `stimulus-rails` |
| `composer.lock` / `composer.json` | PHP version (`platform` / `require.php`), `laravel/framework` |
| `package.json` + its lockfile | Node (`engines.node`), `react`, `@nestjs/core`, `@hotwired/stimulus` |
| `.ruby-version`, `.php-version`, `.nvmrc`, `.node-version` | The language version the team pinned |
| `config/database.yml`, `.env.example`, `DATABASE_URL` | PostgreSQL or MySQL |
| `docker-compose.yml`, `compose.yaml` | Database and cache images with their tags, plus Docker itself |
| `Dockerfile` | Docker; often the language version too |
| `.github/workflows/*.yml`, `*.tf`, `task-definition.json` | AWS, ECS, RDS |

**Lockfile beats manifest.** `Gemfile` says `gem "rails", "~> 7.1"` — a range.
`Gemfile.lock` says `rails (7.1.3.2)` — what actually runs. Take the resolved version
and pass it as `major.minor`.

**Detect only what is evidenced.** Two cases deserve care:

- *Architecture* (`monolith`, `microservices`) is a judgement about how the system is
  deployed, not something a file states. Do not infer it. Ask, or leave it out.
- *Infrastructure* (`aws`, `ecs`, `rds`) counts only when a deploy config names it. A
  README mentioning AWS is not evidence.

If two databases both appear — a `pg` gem and a MySQL container left over from an old
compose file — that is not a conflict for the CLI to settle. It means you found
ambiguity: ask which one the project really uses.

## 3. Confirm before generating

Show the operator a table: technology, version, and the file you read it from. Mark
each row as one of:

- **found** — read from a lockfile or a pinned version file
- **uncertain** — inferred from a weaker signal, e.g. a compose service name
- **missing** — a slot you could not fill

Then use AskUserQuestion for everything that is not *found*: a missing language or
framework version, an ambiguous database, the architecture, anything in the catalog
you suspect but cannot evidence. One question per decision.

Do not generate until the operator has confirmed the table.

## 4. Generate

You now have what `/generate` takes as input. Follow the steps in
`${CLAUDE_PLUGIN_ROOT}/commands/generate.md` from *Resolve and check* onward —
read that file and follow it rather than reimplementing it here. In short: resolve,
relay every finding to the operator, preview without `--write`, and only write once
they confirm.

## 5. Report

Report what that command's final step asks for, and add two things only you know:

- which technologies you detected and from which files, so the operator can correct a
  bad read later,
- anything the repository clearly uses that the catalog has no id for — that is a gap
  worth filling in the knowledge base, not a failure of this run.

Then stop. Do not open, summarize or edit the generated files unless asked.
