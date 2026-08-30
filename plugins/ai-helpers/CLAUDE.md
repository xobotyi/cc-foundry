# ai-helpers Plugin

Skills and output styles for engineering AI artifacts: prompts, skills, subagents, and output styles.

## Skills

- **`prompt-engineering`** — instruction text on any surface; the wording rules the other four skills defer to
- **`skill-engineering`** — the skill artifact: routing metadata, body content, references, evaluation, distribution
- **`subagent-engineering`** — the subagent artifact: the delegation decision, frontmatter, the agent's system prompt
- **`output-style-engineering`** — the output-style artifact: mechanism choice, frontmatter, role, voice, rules
- **`prompt-terser`** — terseness audit of a prompt that drifted across edit cycles

## Output Styles

- **`ai-engineer`** — collaborative peer persona for artifact work

## Plugin Scope

The AI artifact itself. Coding workflow belongs to `the-coder`, language conventions to the language plugins, git
workflow to `git-commit`.

## Conventions

- `skill-engineering`, `subagent-engineering`, and `output-style-engineering` each declare `prompt-engineering` as a
  hard `<prerequisite>` — every AI artifact is a prompt. `prompt-terser` names it as a boundary with no invoke pointer,
  which is the soft tier of ADR 0003
- `prompt-terser` is user-invoked only (`disable-model-invocation`) — its triggers sit inside `prompt-engineering`'s, so
  in the routing pool it only draws a contest it cannot win
- Other plugins depend inward on these skills: `the-workflow`'s `claude-md` declares a hard `<prerequisite>` on
  `prompt-engineering`, and `git-commit`'s CLAUDE.md cites `skill-engineering`. Renaming a skill here, or dropping a
  section a dependent defers to, breaks a file in another plugin
