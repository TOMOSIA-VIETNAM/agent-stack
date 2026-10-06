# Skill and command scorecard

Read this only when the change adds or edits a `SKILL.md` or a command. Score each such
file on the eight criteria below; a rule file is reviewed against
`.claude/rules/knowledge-content.md` alone.

The target is Claude Code only — agent-stack writes `.claude/`, nothing else — so no
criterion asks about other hosts.

| # | Criterion | Max | One point each for |
| --- | --- | --- | --- |
| 1 | identity | 2 | `name` equals the directory, lowercase kebab-case, carries the framework · no other skill in `knowledge/` that the same stack selects shares the name |
| 2 | trigger | 4 | description names the capability, in the third person · names the distinct kinds of request it handles, in words a developer would type · leads with the discriminating terms · fits the listing cap without synonym piles |
| 3 | front matter | 3 | YAML parses · every field is one Claude Code reads · `allowed-tools` grants only what the steps run |
| 4 | invocation | 2 | a skill with side effects (deploy, publish, send, delete, push) sets `disable-model-invocation: true` or says why automatic invocation is safe · a declared `effort` matches the work |
| 5 | workflow contract | 4 | purpose and boundary explicit · steps ordered, actionable, written as imperatives to Claude · each step ends on an observable condition · no placeholder left |
| 6 | resource closure | 3 | every local link resolves · every script, template or reference it depends on exists beside it, and every code example is complete enough to run · bundled scripts are called through `${CLAUDE_SKILL_DIR}`, nothing outside the skill directory is assumed |
| 7 | instruction economy | 3 | one source per rule, nothing restating a rule file or another skill · no instruction that only restates what Claude does anyway · material only one branch needs lives in a sibling file |
| 8 | routing evidence | 4 | the PR lists at least 8 prompts that should trigger it and 2 close ones that should not · the prompts read like real requests, boundary cases included · each was run in a fresh session with the skill present and its result recorded · the same prompts were run with the skill absent, to show it changes the outcome |

Thresholds, as a share of applicable points: **≥ 80 % good**, **60–79 % needs work**,
**< 60 % fix**. A skill or command meant only to be typed (`disable-model-invocation:
true`) skips criterion 8 and is scored out of 21.

## How to judge each criterion

**1 · identity.** Skill names are one flat namespace across every framework a project can
select together. `Grep -r "^name:" knowledge/skills` lists them; two the same is a load
error the suite reports, but a near-twin (`rails-migration` beside a global
`deprecation-and-migration`) is a trigger collision only a reader sees.

**2 · trigger.** The description is the only part of a skill Claude sees before it
decides to load it. Count branches, not synonyms: a branch is a different kind of request
handled by different steps. Put the case that distinguishes this skill first, because a
long listing is shortened from the end. Then read the descriptions of every skill the same
stack selects — the framework's and all of `skills/global/` — and name any that could
claim the same prompt. Two skills claiming one prompt is a correctness defect: the
project gets whichever Claude happens to pick.

The description is injected into Claude's context as a statement about the skill, so
write it in the third person — "Implements a feature in…", "Use when…" — not "I can
help…" or "You can use this to…". Test it against the words a developer actually types
("add an index", "N+1 on the orders page"), not the skill's own vocabulary. When this
criterion loses a point, write the improved description out in full on the card: a
concrete rewrite is acted on, "make it more specific" is not.

**3 · front matter.** `scripts/frontmatter.mjs` decides parse, unknown fields, the
listing cap and an unscoped `Bash`. Judge the rest: `allowed-tools` is a pre-approval, not
a restriction — every other tool stays callable with a prompt — and it ships into every
project that selects the skill, trusted repository or not. A read-only procedure
pre-approves the exact commands it runs (`Bash(git diff *)`), never `Bash`. No
`allowed-tools` at all is fine: the project's own permission settings apply.

**4 · invocation.** `effort` is optional. When declared: `low` for mechanical steps,
`medium` for bounded analysis of one change, `high` for design or adversarial reasoning,
`xhigh`/`max` for long fan-out work. A mismatch is a minor finding with both levels named.

**5 · workflow contract.** For each step, name the condition that lets the next one start
— a command run, a file produced, a check passed, a decision written down. "Understand the
code" or "analysis complete" is not one: nothing can test it. Steps are instructions to
Claude: "Run the migration", not "You should probably run the migration" or "The
migration is run".

**6 · resource closure.** List every path the skill names and check each one exists;
report a missing one by its exact path. Read code examples as code: an example Claude
copies is applied to a real project, so a snippet with an undefined variable or an
outdated API is a correctness defect, not a style point. Everything beside `SKILL.md` is
copied into every generated project, so the directory holds what the skill uses at run time and nothing else. An
`evals/` folder, authoring notes or a corpus of test prompts in the skill directory is a
finding: it ships. Routing evidence belongs in the PR, not in `knowledge/`.

**7 · instruction economy.** Sentence by sentence: would removing it change what Claude
does? Is the same rule authoritative in a rule file or another skill? Does every
invocation need it? Each "no", "yes", "no" is a cut.

**8 · routing evidence.** Never award a point without a recorded run. When the PR has
none, score 0 and say what to run: each prompt in a fresh `claude` session opened on a
project generated with `npm run try`, once as generated and once with the skill turned
off through `skillOverrides` set to `"off"`. A session that has the authoring
conversation in it proves nothing — it already knows the answer.

## Edge cases

- **Nothing wrong.** Say so and give the full score. Do not invent findings to look
  thorough — a reviewer who always finds three things teaches authors to ignore them.
- **A thin first draft.** Score it honestly, then say what the next version needs, in
  order: trigger first, then steps, then resources.
- **A `SKILL.md` over ~500 lines.** Name the sections that only one branch of the
  workflow needs and the sibling file each should move to.

## Card format

```
<skill-name> — <score>/<max> <good | needs work | fix>
  identity 2/2 · trigger 2/4 · front matter 3/3 · invocation 2/2
  workflow 3/4 · resources 3/3 · economy 2/3 · routing 0/4
  - trigger: overlaps skills/global/debugging-and-error-recovery on "fix a failing test"
  - workflow: step 3 has no condition that ends it
  - routing: no prompts in the PR
  keep: step 2's "Done when" on the migration status — exact and testable
  suggested description: "Diagnoses N+1 queries in a Rails app … Use when a page is slow, …"
```

`keep` names what works, so the fixes do not take it out with them. `suggested
description` appears only when the trigger criterion lost a point.

Each lost point also appears as a finding in the main report, with its severity.
