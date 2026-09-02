# cc-foundry

Plugins that make Claude Code better at its job.

Claude Code does a lot out of the box, and it still has gaps: it forgets skills mid-session, produces messy commits,
turns AI-artifact work into trial and error, and ships code without validation. These plugins close those gaps.

## Installation

Add the marketplace, then install any plugin:

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install <plugin-name>
```

## Workflow Plugins

### skill-enforcer

Claude skips skills and forgets about them mid-session. This plugin injects a Skill Enforcement Framework via lifecycle
hooks that forces Claude to evaluate which skills apply at every checkpoint: user prompt, after reading files, after
editing, and after loading skills. The framework treats skills as non-atomic, so a phase shift from coding to testing
sends Claude back to the unread references of skills it already loaded.

```
/plugin install skill-enforcer
```

---

### git-commit

Messy commits — mixed changes, vague messages, wrong order. The `/git-commit:commit` skill runs a five-stage pipeline:
identify logical units in the diff, plan commit order (style to refactor to fix to feature), run quality gates, then a
per-unit loop of stage, draft, self-review, validate, commit — and finally verify. The distinguishing step is the body
audit: before each commit the drafted message is checked paragraph by paragraph against the staged diff, with a visible
`keep` or `cut` verdict, so a body that documents the code instead of recording the reason gets caught rather than
committed.

```
/plugin install git-commit
```

---

### open-source

Contributing to a project you don't maintain means following rules that live outside the code, and agents mostly don't
find them — measured across four frontier models, agents opened a repository's AI policy file in 3.5% of unaided runs.
Two skills handle the artifacts maintainers see: `issue-writing` (routing a report to the right channel, the evidence
bar, bug and feature and vulnerability shapes) and `pr-contribution` (finding and obeying the project's rules, earning a
reviewer, titles and descriptions, fork mechanics). Both start from the project's own files and draft for a human to
submit. Neither treats machine authorship as a defect to hide, and neither touches implementation or commit messages,
which stay with `the-coder` and `git-commit`.

```
/plugin install open-source
```

---

### the-blueprint

Planning is either too shallow or too detailed. This plugin implements the **DRAFT** methodology (Discovery → Research →
Alignment → Frame → Tasks), a pipeline whose artifacts are consumable by both humans and agents. Discovery stress-tests
ideas, research investigates the codebase blind to intent, alignment surfaces patterns for human correction, frame
enforces vertical-slice implementation phases, and tasks decompose phases into sized work items. Each stage builds on
the previous with explicit approval gates. Four standalone skills sit alongside the pipeline: `task-creation` (what a
tracked item says — the reader it targets, the verification behind every claim, the location and acceptance criteria,
and the approval gate before creation), `glossary` (shared project vocabulary that prevents naming drift), `youtrack`
(YouTrack behavior an agent has to know: what a project configures, what a write changes besides the field it names, and
which failures report success), and `diagramming` (Excalidraw and Mermaid with visual design principles).

```
/plugin install the-blueprint
```

---

### the-coder

Claude writes code before understanding what exists: guessing at APIs, skipping tests, multiplying abstractions. This
plugin provides a `coding` skill that enforces a discovery-first workflow (Discover, Plan, Implement, Verify) and a
`software-engineer` output style that carries the peer-engineering register and the skill queue. Every language-specific
skill runs on top of it.

```
/plugin install the-coder
```

---

### the-statusline

No visibility into context window usage, cost, or model. This plugin installs a 3-row status line to your user-level
Claude configuration showing output style, model, session cost, context window remaining, cache hit rate, and current
working directory. Color urgency increases as context approaches limits. Auto-syncs on every session start and survives
agent directory changes.

```
/plugin install the-statusline
```

---

### the-workflow

Agentic workflow mechanics — the foundational skills that make working with Claude Code effective across sessions and
teams. The `claude-md` skill owns the CLAUDE.md and `.claude/rules/` artifacts, starting from the loading model that
most advice about them gets wrong: which files reach the session at launch, which wait for a file to be read, what
survives compaction, and which split actually reclaims context. From there it covers layer routing, what belongs in the
file, trimming, and an ordered diagnosis for a rule that is written down and still ignored. The `handoff` skill produces
structured transfer documents for the moments when work crosses a context boundary: a session restart, a teammate
delegation, an async resumption. Each document carries the decisions, constraints, and remaining work in 500-2000 tokens
and drops the noise.

```
/plugin install the-workflow
```

---

### the-writer

Agent-written prose carries fingerprints: inflated significance, hedged comparisons, participle padding, chat-register
leaks, leftover citation tokens. Readers notice them and discount the substance along with the style. The `humanize`
skill traces these tells to the six post-training pressures that produce them, so the agent catches variants no flat
list would name — and decides whether to edit before deciding what to edit, because model editing measurably improves
weak drafts and damages strong ones. Hard constraints: never fabricate specifics, never inject voice the source lacked,
conserve every claim, fix writing for readers and never for AI detectors.

```
/plugin install the-writer
```

---

### wall-clock

Claude Code tells the model today's date and nothing else about time: no clock, no timezone, no sense of elapsed time.
So the agent resumes after your lunch break as though you never left, and finishes an hour of unattended work unable to
say how long it took. This plugin injects the wall clock on every prompt (`away`, the gap since it last spoke) and once
a minute during a turn (`turn`, elapsed since your prompt landed). Every figure is computed in the hook from the
transcript Claude Code already writes, so the model never subtracts timestamps and no state file can go stale. Tick
period is configurable.

```
/plugin install wall-clock
```

## AI Artifact Plugins

### ai-helpers

Creating prompts, skills, agents, and output styles is guesswork without structured guidance. This plugin provides
skills encoding best practices for each artifact type: `prompt-engineering` (foundation), `skill-engineering`,
`subagent-engineering`, `output-style-engineering`, and `prompt-terser` (retrospective audit). All skills build on
prompt-engineering fundamentals. Includes an `ai-engineer` output style for collaborative artifact work.

```
/plugin install ai-helpers
```

## Language Discipline Plugins

### golang

Go's idioms differ from what other languages teach, and the common pitfalls follow: premature abstraction, incorrect
error handling, interface misuse, concurrency bugs. This plugin provides a `golang` skill covering conventions, error
handling, interfaces, generics, concurrency, testing, and project structure, with per-version references so it writes
code the module's `go` directive permits, plus library skills: `templ` for type-safe HTML templating, `charm-tui` for
terminal UIs with the Charmbracelet v2 stack (Bubble Tea, Bubbles, Lip Gloss, Huh, Glamour), and `zog` for schema
validation.

```
/plugin install golang
```

---

### javascript

Claude writes JavaScript from twenty years of the language at once, and the wrong choice rarely fails loudly — the value
coerces, the runtime warns, the test passes. Five skills fix a baseline instead: `javascript` (the language, gated on
the engine baseline a project declares), `typescript` (the type system, `tsconfig`, and the compiler), `nodejs` (the
runtime, gated on `engines.node`, with the stability index of every API it names), `bun` (the runtime and its
toolchain), and `vitest` (Vitest, carrying the configuration renames across majors). Ships a
`typescript-language-server` config and the LSP-first navigation rules that use it. Skills activate automatically based
on file context.

```
/plugin install javascript
```

---

### php

PHP language discipline targeting 8.5+. Three skills cover the full PHP surface: `php` handles conventions, type
declarations (union, intersection, DNF), enums, readonly classes, property hooks, closures, Fibers, error handling,
Composer, PSR-4/PER-CS, and project structure; `phpunit` handles PHPUnit testing conventions (test structure, data
providers, assertions, stubs vs mocks, attributes, configuration); and `pest` handles the Pest framework (function-style
tests, the `expect()` API, datasets, architecture/mutation/type-coverage/browser testing). Bundled Intelephense LSP for
semantic code navigation.

```
/plugin install php
```

---

### python

Python language discipline targeting 3.14+. Two skills divide it: `python` handles conventions, modern idioms, type
annotations (built-in generics, `|` unions, protocols), data classes, pattern matching, exception handling, packaging
(pyproject.toml, uv, ruff), and project structure, while `pytest` handles testing conventions (fixtures, parametrize,
markers, mocking, async testing, conftest patterns).

```
/plugin install python
```

---

### rust

Rust language discipline targeting the 2024 edition. Two skills cover the language and its test ecosystem: `rust`
handles ownership and borrowing, error handling (`thiserror`/`anyhow`), traits and generics, iterators, concurrency
(CPU-bound parallelism with threads/rayon vs I/O-bound async with Tokio), the cargo/clippy/rustfmt toolchain, and Rust
2024 edition specifics, while `rust-testing` covers testing conventions (unit/integration/doctest layout, cargo-nextest,
proptest, insta, criterion, mockall, rstest). Bundled rust-analyzer LSP for semantic code navigation.

```
/plugin install rust
```

## Platform Discipline Plugins

### frontend

Browser development requires knowledge beyond general programming: CSS layout systems, accessibility standards,
framework-specific patterns. This plugin provides six skills: `css` (conventions, layout, SCSS/SASS, responsive design,
methodologies), `tailwindcss` (Tailwind v4 CSS-first config, `@theme` tokens, class composition), `react` (component
patterns, hooks, state, performance, testing), `vue` (Composition API, reactivity, composables), `svelte` (Svelte 5
runes, SvelteKit conventions), and `accessibility` (WCAG 2.2, ARIA, semantic HTML, keyboard navigation). Keeps platform
discipline separate from language discipline.

```
/plugin install frontend
```

---

### backend

Building reliable services requires consistent approaches to observability and instrumentation. Four skills:
`observability` (the three pillars: logging, metrics, tracing; how they interconnect; high-level practice), `prometheus`
(metric types, naming, labels, PromQL, alerting), `statsd` (metric types, UDP push model, DogStatsD extensions), and
`otel-tracing` (spans, context propagation, instrumentation, sampling, semantic conventions). Technology-agnostic
guidance in `observability`; tool-specific depth in the others.

```
/plugin install backend
```

---

### grafana

The observability consumption stack — querying, visualizing, alerting on, and managing telemetry through Grafana. Seven
skills cover the full surface: `dashboards` (JSON model, panels, variables, transformations), `promql` (Prometheus query
writing, native histograms, optimization), `metricsql` (VictoriaMetrics PromQL superset: behavioral diffs, rollup
extensions, WITH templates), `logsql` (VictoriaLogs log querying: filters, pipes, stats), `alerting` (unified alerting,
notification routing, templates), `provisioning` (file YAML, HTTP API, gcx CLI, Terraform), and `dataviz` (encoding
hierarchy, color theory, dashboard layout, observability frameworks). Companion to `backend` — backend produces
telemetry, grafana consumes it.

```
/plugin install grafana
```

---

### cli

CLI platform discipline: command-line interface design, shell scripting conventions, and terminal UX patterns. Two
skills split it by layer: `cli` handles the design layer (argument conventions, output streams, exit codes,
configuration hierarchy, signal handling) for CLIs written in any language, while `shell-scripting` handles the
implementation layer (strict mode, quoting, portability, error handling) for scripts written in shell.

```
/plugin install cli
```

---

### infrastructure

Ansible playbooks, Docker containers, Proxmox clusters, network segments: infrastructure work requires domain knowledge
that generic coding assistants lack. Without it, agents produce configurations with insecure defaults, no idempotency,
and naive networking. Six skills supply it: `devops` (foundational discipline, what good infrastructure looks like,
analogous to `the-coder/coding`), `ansible` (playbooks, roles, vault, collections, molecule testing), `containers`
(Docker/Podman, Compose, image optimization, security), `proxmox` (VMs, LXC, storage backends, clustering, API
automation), `unraid` (arrays, Docker, VMs, shares, plugins), and `networking` (VLANs, firewalls, DNS, reverse proxies,
VPN, TLS). The devops skill runs in a sandwich pattern: principles first, tool skill, then verification.

```
/plugin install infrastructure
```

## License

MIT
