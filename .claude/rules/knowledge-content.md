---
paths:
  - "knowledge/**"
  - "templates/framework/**"
---

# Knowledge Content Standard

Every file under `knowledge/` is copied byte for byte into every project that selects
it. Nothing rewrites it on the way out, so the bar is the bar for the generated project,
not for this repository. Hold a contribution — yours or someone else's — to this.

`npm run check` already enforces the mechanical half: kebab-case segments, framework
directories that exist in `catalog.yaml`, duplicate output names, unknown top-level
directories, leaked `TEMPLATE:` comments. Do not re-check those by eye; run the suite.
What follows is the half no test can judge.

## Placement

- **Pick the type by shape, not by topic.** A convention (*how code must look*) is a
  rule. Numbered steps (*how to do task X*) are a skill. Something the developer types is
  a command — and if it needs files beside it, it should be a skill instead.
- **Gate on a framework.** Ruby style lives under `framework/rails/`, PHP style under
  `framework/laravel/`. A `global/` rule loads in every project of every framework, so it
  must hold for all of them.
- **Never edit an imported path.** Anything listed in `knowledge/upstream.lock.json` is
  overwritten by the next `npm run sync`. A change to one is a defect however good the
  edit is; the fix is a sibling file of our own.
- **Content copied from elsewhere goes through `upstream.yaml`**, pinned to a 40-char SHA
  with licence, licence URL and copyright. Pasted text with no attribution cannot ship:
  the manifest is where upstream terms are met.

## Front matter

- `SKILL.md`: `name` equal to the directory name, and a `description` that says what the
  skill does **and when to use it**. Claude matches tasks against the description; a
  description with no trigger means the skill is never invoked on its own.
- Skill names are one flat namespace across frameworks: put the framework in the name
  (`rails-migration`, not `migration`).
- Command: `description`. Rule: nothing, or only `paths:`.
- No agent-stack metadata (`id`, `priority`, `layer`, `applies_to`, `type`, `version`, an
  author) — it is read by nobody and lands in every generated project.
- Only fields Claude Code reads. It ignores an unknown one (`tags`, `category`,
  `keywords`) without a word, and a skill whose YAML does not parse loads with no fields
  at all — still typeable, never matched to a task.
- `allowed-tools` pre-approves; it does not restrict. It ships into every selecting
  project, so grant the exact commands the steps run (`Bash(git diff *)`), never `Bash`.
- A skill that deploys, publishes, sends, pushes or deletes sets
  `disable-model-invocation: true`, so only a person can start it.

## Context cost

- A rule without `paths:` loads at launch in every session of every selecting project.
  It must earn that: short, and true of most files the project has. Scope anything
  narrower with real globs (`app/models/**/*.rb`, `database/migrations/**/*.php`), never
  a leftover placeholder like `<ext>`.
- Keep `SKILL.md` under ~500 lines. Move long reference material into a sibling file and
  name that file from `SKILL.md` — a sibling nothing points to is never read.
- A skill directory holds what the skill uses at run time and nothing else. Every file
  beside `SKILL.md` is copied into every project: test prompts, `evals/` and authoring
  notes belong in the PR, not in `knowledge/`.

## Substance

- **Specific enough to act on.** "Write clean controllers" is not a rule; "a controller
  action calls one object and renders" is. If two reviewers would apply it differently,
  it is not finished.
- **Say why when the reason is not obvious.** A rule without its reason gets applied where
  it does not fit and dropped where it does.
- **Proven over plausible.** Prefer practice the team has seen pay off. Ask the author for
  the incident, PR or project it came from when a rule is non-obvious or contrarian.
- **Technically correct for the framework as it is today.** Check APIs, method names and
  defaults against the framework's documentation. Selection ignores versions, so anything
  true only from a release on must say so in its body ("Rails 7.1+: …").
- **No contradiction with what is already selected.** Read the other rules for the same
  framework and the global skills. Two files giving opposite advice to the same project is
  a conflict resolved silently — by whichever one Claude happens to weigh more.
- **No duplication.** A framework rule restating a global skill adds context cost and a
  second place to keep in sync. Link the idea, or make the framework-specific point only.
- **Nothing project- or person-specific.** No internal hostnames, customer names, ticket
  numbers, credentials, or paths from one codebase — the file goes to every project.
- **No leftover placeholders** — `<Framework>`, `<…>`, `…` bullets. A file that is half
  template is worse than no file.
- **Each skill step ends on something observable** — a command run, a file written, a
  check passed. "Understand the code" cannot tell Claude when to move on.
- **A skill's description is its trigger.** It names what the skill does and the kinds of
  request it handles, in the third person and in words a developer would type, leads with
  what sets it apart, and claims no prompt another skill in the same stack already claims.
- **Code examples run.** Claude copies them into real code, so an example with an
  undefined name or a removed API is wrong advice, however clear the prose around it.
- Content is written in English: imperative bullets for rules, ordered imperative steps
  for skills — "Add the index", not "You should add the index".
