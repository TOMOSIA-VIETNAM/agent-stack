---
name: rails-infer-conventions
description: Survey an existing Rails codebase for the choices the general Rails rules leave open — business layer, validation, authorization, serializer, gems, commands — record them in AGENTS.md, and report every rule that does not apply or that the code contradicts. Use once after agent-stack first generates rules into a project, especially one already in maintenance, or when asked to detect or document a Rails project's conventions.
disable-model-invocation: true
---

Record how the project **currently** works, so Claude stops guessing. Describe reality;
do not improve it.

## What this skill writes, and what it does not

| Finding | Where it goes |
| --- | --- |
| Commands: install, run one spec, full suite, lint, security scan; host or container | `AGENTS.md` › Commands & environment |
| A choice the rules leave open (which service directory, which serializer, which authorization gem...) and layers deliberately not used | `AGENTS.md` › Code & architecture |
| A `rails-*` rule whose gem is not in the `Gemfile` | Report only |
| A rule line the code consistently contradicts | Report only |

Never edit `.claude/rules/`. A rule file that is edited stops receiving knowledge-base
updates, and settling a conflict is the user's decision, not this skill's. Never write a
conflict into `AGENTS.md` as a winner either: an `AGENTS.md` line and a rule line saying
opposite things leaves Claude to guess on every task.

## Principles

- **Reality is the standard.** The style most of the code uses is the convention, even
  when a better one exists.
- **Record choices, not defaults.** Record a line only if, without it, Claude would
  write the code differently. Anything a rule already says is not repeated.
- **Record deliberate absences**: "No form objects; validations live in models", so
  Claude does not add a layer.
- **Evidence**: at least three consistent examples, with any competing style under about
  20%. Read the files; never conclude from grep counts alone. Commands need the CI
  config, a `bin/` script, or a run that succeeds.
- **Two significant styles** (for example old and new modules): ask whether a boundary
  explains them. If it does, record the boundary; if not, report it and record nothing.
- **Leave what tools enforce.** Anything `.rubocop.yml` enforces is not recorded.
- **State the convention only**: one or two imperative sentences, no counts and no
  evidence lists.

## 1. Orient

- Read `AGENTS.md`, `CLAUDE.md` and every `.claude/rules/rails-*.md`. Skip anything
  already recorded unless asked to update it. A line already in `AGENTS.md` or
  `CLAUDE.md` that contradicts a rule is a rule conflict: report it in step 3.
- Read `Gemfile` and `Gemfile.lock`, `.rubocop.yml`, `config/application.rb`, the CI
  config, `bin/`, `Makefile`, `Procfile*` and `docker-compose*.yml`.
- List every directory under `app/` and `lib/`. A directory outside the Rails skeleton
  is an architectural signal to confirm in step 2.

**Done when** you have the gem list, the non-skeleton directories, and how commands run.

## 2. Scan

Go through `references/checklist.md`. For each item that applies, read a few real files
and give it exactly one verdict:

| Verdict | Action |
| --- | --- |
| Pattern — a real choice, enough evidence | Candidate for `AGENTS.md`, with 2–3 example files |
| Rule conflict — the code contradicts a rule line | Report, with the rule, the line and 2–3 files |
| Not applicable — a gem rule whose gem is absent | Report |
| Split — two styles both significant | Ask the user about a boundary |
| Default, insufficient signal, tool-enforced, already recorded | Skip |

On a large codebase, split the checklist groups across subagents running in parallel;
each returns item, verdict, evidence, proposed wording.

**Done when** every applicable item has exactly one verdict.

## 3. Confirm with the user

Present everything at once, grouped:

```
### AGENTS.md › Code & architecture
1. [Pattern] Business logic in app/services, `.call` class method, `Service` suffix.
   Evidence: app/services/orders/create_service.rb, ...
   Proposed: "Business logic lives in `app/services/<namespace>/<name>_service.rb`, called with `.call`."

### Rule conflicts — you decide
2. rails-models: "Declarations only; methods live in concerns". 31 of 40 models define methods inline
   (app/models/order.rb, app/models/user.rb). Options: edit or untick the rule; or keep it
   and treat the models as debt to move gradually.

### Rules that do not apply
3. rails-enumerize — `enumerize` is not in the Gemfile. Untick it at the next generate run.

### Needs you (cannot be read from code)
- AGENTS.md › Workflow: branch, commit and PR format?
- AGENTS.md › Security: what must be asked before running?
```

Write only the `AGENTS.md` items the user approves. Conflicts and inapplicable rules are
the user's to act on.

## 4. Write AGENTS.md

- Write into the matching section; replace its placeholder and delete its `<!-- -->`
  guidance comment. Leave sections with no finding as they are.
- Commands verbatim and runnable as written, container runner included.
- Keep the file under 200 lines.

Write it like this:
> - Business logic lives in `app/services/<namespace>/<name>_service.rb`, called with `.call`. No form objects: validations live in models.

Not like this:
> - The project has 42 services and 0 operations (e.g. `app/services/orders/create_service.rb`), so use services.

## 5. Report

- What was recorded in `AGENTS.md`, by section.
- The rule conflicts still open, each with its options.
- The rules to untick at the next generate run.
- The `AGENTS.md` sections still empty.
- A reminder to commit `AGENTS.md` so the whole team shares it.
