# cc-foundry

Plugins that make Claude Code better at its job.

Claude Code is powerful out of the box, but it has gaps. It forgets skills mid-session.
Commits are messy. Building AI artifacts is trial-and-error. Code ships without validation.
These plugins fix that.

## Installation

Add the marketplace, then install any plugin:

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install <plugin-name>
```

## Workflow Plugins

### skill-enforcer

Claude skips skills and forgets about them mid-session. This plugin injects a Skill
Enforcement Framework via lifecycle hooks that forces Claude to evaluate which skills apply
at every checkpoint: user prompt, after reading files, after editing, and after loading
skills. Skills are treated as non-atomic — phase shifts (coding to testing) trigger
re-evaluation of unread references from already-loaded skills.

```
/plugin install skill-enforcer
```

---

### git-commit

Messy commits — mixed changes, vague messages, wrong order. The `/commit` command enforces
an 8-step pipeline: identify logical units in the diff, plan commit order (style to refactor
to fix to feature), run quality gates, self-review, stage selectively, validate messages
against conventions, commit, and verify. Each message runs through automated validation
before execution.

```
/plugin install git-commit
```

---

### the-blueprint

Planning is either too shallow or too detailed. This plugin provides a four-stage pipeline
that produces artifacts consumable by both humans and agents: design documents (problem
analysis and recommendation), technical designs (component mapping and sequencing), task
decomposition (actionable hierarchies with acceptance criteria), and task creation (issue
tracker items). Each stage builds on the previous with explicit approval gates.

```
/plugin install the-blueprint
```

---

### the-coder

Claude writes code before understanding what exists — guessing APIs, skipping tests,
multiplying abstractions. This plugin provides a `coding` skill that enforces a
discovery-first workflow (Discover, Plan, Implement, Verify) and a `software-engineer`
output style with LSP-first navigation and engineering judgment. Runs before
language-specific skills as a prerequisite.

```
/plugin install the-coder
```

---

### the-crucible

Code quality is checked manually or not at all. This plugin provides a two-level validation
pipeline: `quality-validation` checks that deliverables match the original request before
completion, and `code-quality-evaluation` orchestrates 8 specialized review agents (naming,
complexity, comments, tests, error handling, security, observability, documentation) that
evaluate code in parallel. All agents are read-only — they report, you decide. A Stop hook
automatically validates task completion before Claude reports work as done.

```
/plugin install the-crucible
```

---

### the-statusline

No visibility into context window usage, cost, or model. This plugin installs a 3-row
status line to your user-level Claude configuration showing output style, model, session
cost, context window remaining, cache hit rate, and current working directory. Color urgency
increases as context approaches limits. Auto-syncs on every session start and survives agent
directory changes.

```
/plugin install the-statusline
```

## AI Artifact Plugins

### ai-helpers

Creating prompts, skills, agents, and output styles is guesswork without structured guidance.
This plugin provides skills encoding best practices for each artifact type:
`prompt-engineering` (foundation), `skill-engineering`, `subagent-engineering`,
`output-style-engineering`, and `claude-code-sdk` (reference). All skills build on
prompt-engineering fundamentals. Includes an `ai-engineer` output style for collaborative
artifact work.

```
/plugin install ai-helpers
```

## Language Discipline Plugins

### golang

Go has strong idioms that differ from other languages — premature abstraction, incorrect
error handling, interface misuse, and concurrency bugs are common pitfalls. This plugin
provides a `golang` skill covering conventions, error handling, interfaces, concurrency,
testing, and project structure, plus a `templ` skill for type-safe HTML templating with
component composition, attribute handling, and JS integration.

```
/plugin install golang
```

---

### javascript

Claude knows JS/TS syntax but defaults to outdated patterns, mixes module systems, and
ignores runtime-specific APIs. This plugin provides five skills: `javascript` (core language
conventions), `typescript` (type system and strict mode), `nodejs` (Node.js runtime APIs),
`bun` (Bun runtime APIs), and `vitest` (testing framework practices). Skills activate
automatically based on file context.

```
/plugin install javascript
```

## Platform Discipline Plugins

### frontend

Browser development requires knowledge beyond general programming — CSS layout systems,
accessibility standards, framework-specific patterns. This plugin provides five skills:
`css` (conventions, layout, SCSS/SASS, responsive design, methodologies), `react` (component
patterns, hooks, state, performance, testing), `vue` (Composition API, reactivity,
composables), `svelte` (Svelte 5 runes, SvelteKit conventions), and `accessibility` (WCAG 2.2,
ARIA, semantic HTML, keyboard navigation). Keeps platform discipline separate from language
discipline.

```
/plugin install frontend
```

---

### backend

Building reliable services requires consistent approaches to observability and instrumentation.
This plugin provides four skills: `observability` (three pillars — logging, metrics, tracing —
their interconnection and high-level practices), `prometheus` (metric types, naming, labels,
PromQL, alerting), `statsd` (metric types, UDP push model, DogStatsD extensions), and
`otel-tracing` (spans, context propagation, instrumentation, sampling, semantic conventions).
Technology-agnostic guidance in `observability`; tool-specific depth in the others.

```
/plugin install backend
```

---

### cli

CLI platform discipline — command-line interface design, shell scripting conventions, and
terminal UX patterns. Two skills cover the full CLI surface: `cli` handles the design layer
(argument conventions, output streams, exit codes, configuration hierarchy, signal handling)
for CLIs written in any language, while `shell-scripting` handles the implementation layer
(strict mode, quoting, portability, error handling) for scripts written in shell.

```
/plugin install cli
```

## License

MIT
