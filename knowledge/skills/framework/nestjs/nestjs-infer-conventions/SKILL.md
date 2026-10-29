---
name: nestjs-infer-conventions
description: Survey a NestJS codebase for the project's real commands, architecture and conventions, then record them in AGENTS.md and the "Project-specific" section of .claude/rules/nestjs-*.md. Use when setting up the template for a new repo, or when asked to detect, document, or update project conventions.
disable-model-invocation: true
---

# NestJS Infer Conventions

Record how the project **currently** does things, in the right place. Describe reality; do not improve it.

Inspired by the `infer-conventions` skill from [laravel/boost](https://github.com/laravel/boost).

## Where things go

| Information | Destination |
|---|---|
| Install, test, lint, typecheck and build commands; package manager; native or through a container; monorepo filter | `AGENTS.md` › Commands & environment |
| Architecture overview: REST, GraphQL, gateway or microservice; where modules live; layers NOT used | `AGENTS.md` › Code & architecture (a few lines) |
| Details that matter when writing code (ORM, validation, auth, response shape, test helpers) | The **Project-specific** section of the matching rule in `.claude/rules/nestjs-*.md` |
| Allow rules for commands run through a container | `.claude/settings.json` |

`AGENTS.md` is always loaded and every AI tool reads it; rules are read only by Claude Code, and a rule with `paths:` is loaded only when working on matching files.

Record each fact in **one** place only. If it is already in `AGENTS.md`, the rules do not repeat it.

Do not fill in the `AGENTS.md` sections that cannot be inferred from code: Workflow, Security, Gotchas. Ask the user in Step 3; if they do not answer, leave them as they are.

## Principles (read before starting)

- **Reality is the standard.** The style used by the majority of the code is the convention, even when a "better" way exists. Do not propose improvements while recording.
- **Record choices, not defaults.** The question for every candidate: *without this line, would Claude write the code differently?* Record it only if the answer is yes. Anything the general rules already say is not repeated.
- **Record deliberate absences too.** For example, "No repository layer; services inject `Repository<Entity>`", so Claude does not add one.
- **Architecture matters most**: the HTTP surface, the module layout, the ORM, where business logic lives.
- **Evidence is required**: at least 3 consistent examples, with any competing style under about 20%. Otherwise skip it. For commands, the evidence is the CI config, `package.json` scripts, or a successful trial run.
- **Report conflicts; do not pick for the user.** If two styles both have a significant share, ask whether a boundary explains them (old module versus new). If not, report a conflict and record nothing.
- **Leave what the tools enforce.** Style that ESLint, Prettier, Biome or `tsconfig` already enforce is not recorded.
- **State the convention only**: 1–2 imperative sentences, at most one short syntax snippet. No counts, ratios, or lists of evidence files.

## Step 0: Orientation

1. Read `AGENTS.md`, `CLAUDE.md`, and every `.claude/rules/nestjs-*.md` file. Skip a fact already recorded, unless asked to update it.
2. Read `package.json` (the installed `@nestjs/core`, the ORM, the auth library, the test runner), `nest-cli.json`, `tsconfig*.json`, and the CI config.
3. List the directories under `src/` (and `apps/`, `libs/` when `nest-cli.json` defines projects).
4. Decide how commands run: on the host, or through Docker (`docker-compose.yml`, `Makefile`, CI).

**Done when:** you can name the NestJS major, the module format (CommonJS or ESM), the libraries in play, and how commands run.

## Step 1: Scan against the checklist

Open `references/checklist.md` and go through every item that applies. For each item, read a few real files (a grep count is not enough), then assign exactly one verdict:

| Verdict | Meaning | Action |
|---|---|---|
| Pattern | Enough evidence; a real choice | Candidate to record, with 2–3 example files |
| Conflict | Two styles both significant | Report with files; ask the user |
| Default | Matches the general rules | Skip |
| Insufficient signal | Too few examples, or not used | Skip |
| Tool-enforced / already recorded | Per the principles above | Skip |

**Done when:** every applicable item has exactly one verdict.

## Step 2: Architecture and project quirks

1. For each directory under `src/` that is not a feature module: confirm how it is used, with the same evidence standard.
2. Look for a shared response helper, a base exception filter, a base entity, and tenant scoping. At most about 5 items beyond architecture.

## Step 3: Confirm with the user

Present all candidates at once, grouped by destination file. Record only the items the user approves. If the user says to record everything, record every Pattern. Conflicts still need a decision.

## Step 4: Write

**AGENTS.md:**
- Write into the right section. Leave a section with nothing to add as it is.
- Commands are recorded verbatim and runnable as-is, including a container prefix when there is one.
- Keep the whole file under 200 lines.

**Rules** (`.claude/rules/nestjs-*.md`):
- Write into the `## Project-specific` section, below its opening sentence. Do not edit the general rules.
- One bullet per convention, imperative, with the evidence removed.
- A rule file with this section filled in no longer matches what agent-stack wrote. Later runs leave it alone, so it stops receiving knowledge-base updates, and taking it back with `--overwrite` or a tick in the approval checklist replaces the whole file, this section included. Say so in Step 5.

**settings.json:** for commands run through a container, propose the matching allow rule, and edit only with the user's approval. Allow rules never put `*` before the subcommand.

## Step 5: Report

- What was recorded (file, section, content)
- Conflicts the user has not decided
- `AGENTS.md` sections still empty
- Notable items with insufficient signal (one line each)
- The rule files written to: before taking one back with `--overwrite` or the approval checklist, copy its **Project-specific** section out first
- A reminder to commit `AGENTS.md`, `.claude/rules/nestjs-*.md`, and `.claude/settings.json` so the team shares them
