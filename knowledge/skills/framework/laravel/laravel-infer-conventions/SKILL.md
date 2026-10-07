---
name: laravel-infer-conventions
description: Survey a Laravel codebase for the project's real commands, architecture and conventions, then record them in AGENTS.md and the "Project-specific" section of .claude/rules/laravel-*.md. Use when setting up the template for a new repo, or when asked to detect/document/update project conventions.
disable-model-invocation: true
---

# Laravel Infer Conventions

Record how the project **currently** does things, in the right place. Describe reality; do not improve it.

Inspired by the `infer-conventions` skill from [laravel/boost](https://github.com/laravel/boost).

## Where things go

| Information | Destination |
|---|---|
| Install, test, lint and static analysis commands; native or through Docker/Sail | `AGENTS.md` › Commands & environment |
| Architecture overview: the business layer, layers NOT used, modules/domains, actors and guards | `AGENTS.md` › Code & architecture (a few lines) |
| Details that matter when writing code (response format, exceptions, casts, test helpers, database engine…) | The **Project-specific** section of the matching rule in `.claude/rules/laravel-*.md` |
| Allow rules for commands run through Docker/Sail | `.claude/settings.json` |

`AGENTS.md` is always loaded and every AI tool reads it; rules are read only by Claude Code, and a rule with `paths:` is loaded only when working on matching files.

Record each fact in **one** place only. If it is already in `AGENTS.md`, the rules do not repeat it.

Do not fill in the `AGENTS.md` sections that cannot be inferred from code: Workflow, Security, Gotchas. Ask the user in Step 3; if they do not answer, leave them as they are.

## Principles (read before starting)

- **Reality is the standard.** The style used by the majority of the code is the convention, even when a "better" way exists. Do not propose improvements while recording.
- **Record choices, not defaults.** The question for every candidate: *without this line, would Claude write the code differently?* Record it only if the answer is yes. Anything the general rules in the rule files already say is not repeated.
- **Record deliberate absences too.** E.g. "No Service/Repository layer; controllers call Eloquent directly", so Claude does not add a layer.
- **Architecture matters most**: the business layer (Service/Action/Job/model), DTOs, query objects, module/domain folders, the entry-point method (`handle`/`execute`/`__invoke`).
- **Evidence is required**: ≥3 consistent examples, with any competing style under ~20%. Otherwise skip it. For commands, the evidence is the CI config, composer scripts, or a successful trial run.
- **Report conflicts; do not pick for the user.** If two styles both have a significant share, ask the user whether a boundary explains them (e.g. old vs. new modules); if not, report it as an unresolved conflict and record nothing.
- **Leave what the tools enforce.** Style that Pint/Rector/PHPStan already enforce (per their enabled config) is not recorded.
- **State the convention only**: 1–2 imperative sentences, at most one short syntax snippet. No counts, ratios or lists of evidence files.

## Step 0: Orientation

1. Read `AGENTS.md`, `CLAUDE.md` and every `.claude/rules/laravel-*.md` file: the general rules (to know what is already the default) and whatever the project has already filled in (skip anything already recorded, unless asked to update it).
2. Read `composer.json` (versions; packages such as Pest, Sanctum/Passport/JWT, Livewire/Inertia, Horizon, spatie/laravel-data…), `pint.json`, `phpstan.neon*`, `rector.php`, `phpunit.xml`, and the CI config.
3. List every directory under `app/` (and `Modules/`, `src/`, `Domain/` if present). Directories outside the default skeleton (`Http`, `Models`, `Providers`, `Console`, `Exceptions`) are architectural signals to confirm in Step 2.
4. Determine how commands are run: natively, through Sail, or Docker (`docker-compose.yml`, `Makefile`, scripts in `composer.json`, CI).

**Done when:** you have the list of packages, tools, non-skeleton directories, and how commands are run.

## Step 1: Scan against the checklist

Open `references/checklist.md` and go through every item that applies to the project. For each item, read a few real files (never conclude from grep counts alone), then assign exactly one verdict:

| Verdict | Meaning | Action |
|---|---|---|
| Pattern | Enough evidence; a real choice | Candidate to record, with 2–3 example files |
| Conflict | Two styles both significant | Report with counts and files; ask the user |
| Default | Consistent, but the same as the general rules/Laravel defaults | Skip |
| Insufficient signal | Too few examples, or not used | Skip |
| Tool-enforced / already recorded | Per the principles above | Skip |

On a large project, if a subagent tool is available: split the checklist groups across subagents running in parallel, each returning (item, verdict, evidence, proposed wording, destination file).

**Done when:** every applicable item has exactly one verdict.

## Step 2: Architecture and project quirks

1. For each non-skeleton directory from Step 0: confirm how it is used (e.g. Actions are called through `handle()` and injected into controllers; DTOs are readonly classes or spatie/laravel-data), applying the same evidence standard.
2. Look for other codebase-specific traits: base classes/traits most code extends, tenant/actor scoping in queries, custom helpers, a shared response format, custom exceptions. At most ~5 items beyond architecture.

## Step 3: Confirm with the user

Present all candidates **at once**, grouped by destination file:

```
### AGENTS.md › Commands & environment
1. [Pattern] Commands run inside a container. Evidence: .github/workflows/ci.yml, Makefile.
   Proposed: "Test: `docker compose exec -T app ./vendor/bin/pest`"

### AGENTS.md › Code & architecture
2. [Pattern] Business logic in Actions (app/Actions, handle()). 14 Actions, 0 Services.
   Proposed: "Business logic lives in Actions (`app/Actions`, method `handle()`), injected into controllers. Do not create Services or Repositories."

### laravel-pattern.md
3. [Conflict] Validation: 22 FormRequests, 9 controllers use $request->validate(). Is there a boundary?

### Needs the user (cannot be inferred from code)
- AGENTS.md › Workflow: branch, commit and PR format?
- AGENTS.md › Security: which external services are allowed, what must be asked first?
```

Record only the items the user approves. If the user explicitly says "record everything" or "no need to ask", record every Pattern; Conflicts still need asking.

## Step 4: Write

**AGENTS.md:**
- Write into the right section; replace the placeholder and delete the guidance `<!-- -->` comment of each section you fill. Leave sections with no information as they are.
- Commands are recorded verbatim and runnable as-is (including the Docker/Sail runner if there is one).
- Keep the whole file under 200 lines.

**Rules** (`.claude/rules/laravel-*.md`):
- Write into the `## Project-specific` section of the destination file, below the section's opening sentence. Do not edit the general rules.
- One bullet per convention, in the imperative, with all evidence removed.
- A rule file with this section filled in no longer matches what agent-stack wrote. Later runs leave it alone, so it stops receiving knowledge-base updates, and taking it back with `--overwrite` or a tick in the approval checklist replaces the whole file, this section included. Say so in Step 5.

Write it like this:
> - Business logic lives in Actions (`app/Actions`, method `handle()`), injected into controllers. Do not create Services.

Not like this:
> - The project has 14 Actions and 0 Services (e.g. `app/Actions/CreateOrder.php`), so use Actions.

**settings.json:** for commands run through Docker/Sail, propose the matching allow rule (e.g. `Bash(docker compose exec -T app ./vendor/bin/pest *)`), and edit only with the user's approval. Allow rules never put `*` before the subcommand.

## Step 5: Report

- What was recorded (file, section, content)
- Conflicts the user has not decided yet
- `AGENTS.md` sections still empty, for the user to fill in
- Notable items with insufficient signal (1 line)
- The rule files written to: before taking one back with `--overwrite` or the approval checklist, review the diff and copy its **Project-specific** section back in
- A reminder to commit `AGENTS.md`, `.claude/rules/laravel-*.md` and `.claude/settings.json` so the whole team shares them
