# cc-foundry

Plugins that make Claude Code better at its job.

Claude Code is powerful out of the box, but it has gaps. It forgets skills mid-session. Commits are messy. Building AI
artifacts is trial-and-error. Code ships without validation. These plugins fix that.

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
editing, and after loading skills. Skills are treated as non-atomic — phase shifts (coding to testing) trigger
re-evaluation of unread references from already-loaded skills.

```
/plugin install skill-enforcer
```

---

### git-commit

Messy commits — mixed changes, vague messages, wrong order. The `/commit` command enforces an 8-step pipeline: identify
logical units in the diff, plan commit order (style to refactor to fix to feature), run quality gates, self-review,
stage selectively, validate messages against conventions, commit, and verify. Each message runs through automated
validation before execution.

```
/plugin install git-commit
```

---

### the-blueprint

Planning is either too shallow or too detailed. This plugin implements the **DRAFT** methodology (Discovery → Research →
Alignment → Frame → Tasks) — a pipeline that produces artifacts consumable by both humans and agents. Discovery
stress-tests ideas, research investigates the codebase blind to intent, alignment surfaces patterns for human
correction, frame enforces vertical-slice implementation phases, and tasks decompose phases into sized work items. Each
stage builds on the previous with explicit approval gates.

```
/plugin install the-blueprint
```

---

### the-coder

Claude writes code before understanding what exists — guessing APIs, skipping tests, multiplying abstractions. This
plugin provides a `coding` skill that enforces a discovery-first workflow (Discover, Plan, Implement, Verify) and a
`software-engineer` output style with LSP-first navigation and engineering judgment. Runs before language-specific
skills as a prerequisite.

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
teams. The `claude-md` skill applies prompt engineering principles to CLAUDE.md files: what belongs where, writing
instructions Claude actually follows, diagnosing why rules get ignored (buried, vague, stale, contradictory), and
systematic improvement. The `handoff` skill produces structured transfer documents when work crosses context boundaries
— session restarts, teammate delegation, async resumption — preserving decisions, constraints, and remaining work in
500-2000 tokens while dropping noise.

```
/plugin install the-workflow
```

## AI Artifact Plugins

### ai-helpers

Creating prompts, skills, agents, and output styles is guesswork without structured guidance. This plugin provides
skills encoding best practices for each artifact type: `prompt-engineering` (foundation), `skill-engineering`,
`subagent-engineering`, `output-style-engineering`, `prompt-terser` (retrospective audit), and `claude-code-sdk`
(reference). All skills build on prompt-engineering fundamentals. Includes an `ai-engineer` output style for
collaborative artifact work.

```
/plugin install ai-helpers
```

## Language Discipline Plugins

### golang

Go has strong idioms that differ from other languages — premature abstraction, incorrect error handling, interface
misuse, and concurrency bugs are common pitfalls. This plugin provides a `golang` skill covering conventions, error
handling, interfaces, concurrency, testing, and project structure, plus library skills: `templ` for type-safe HTML
templating, `charm-tui` for terminal UIs with the Charmbracelet v2 stack (Bubble Tea, Bubbles, Lip Gloss, Huh, Glamour),
and `zog` for schema validation.

```
/plugin install golang
```

---

### javascript

Claude knows JS/TS syntax but defaults to outdated patterns, mixes module systems, and ignores runtime-specific APIs.
This plugin provides five skills: `javascript` (core language conventions), `typescript` (type system and strict mode),
`nodejs` (Node.js runtime APIs), `bun` (Bun runtime APIs), and `vitest` (testing framework practices). Skills activate
automatically based on file context.

```
/plugin install javascript
```

### infrastructure

Infrastructure work — Ansible playbooks, Docker containers, Proxmox clusters, network segments — requires deep domain
knowledge that generic coding assistants lack. Without it, agents produce configurations with insecure defaults, no
idempotency, and naive networking. This plugin provides six skills: `devops` (foundational discipline — what good
infrastructure looks like, analogous to `the-coder/coding`), `ansible` (playbooks, roles, vault, collections, molecule
testing), `containers` (Docker/Podman, Compose, image optimization, security), `proxmox` (VMs, LXC, storage backends,
clustering, API automation), `unraid` (arrays, Docker, VMs, shares, plugins), and `networking` (VLANs, firewalls, DNS,
reverse proxies, VPN, TLS). The devops skill runs in a sandwich pattern: principles first, tool skill, then
verification.

```
/plugin install infrastructure
```

---

## Platform Discipline Plugins

### frontend

Browser development requires knowledge beyond general programming — CSS layout systems, accessibility standards,
framework-specific patterns. This plugin provides five skills: `css` (conventions, layout, SCSS/SASS, responsive design,
methodologies), `react` (component patterns, hooks, state, performance, testing), `vue` (Composition API, reactivity,
composables), `svelte` (Svelte 5 runes, SvelteKit conventions), and `accessibility` (WCAG 2.2, ARIA, semantic HTML,
keyboard navigation). Keeps platform discipline separate from language discipline.

```
/plugin install frontend
```

---

### backend

Building reliable services requires consistent approaches to observability and instrumentation. This plugin provides
four skills: `observability` (three pillars — logging, metrics, tracing — their interconnection and high-level
practices), `prometheus` (metric types, naming, labels, PromQL, alerting), `statsd` (metric types, UDP push model,
DogStatsD extensions), and `otel-tracing` (spans, context propagation, instrumentation, sampling, semantic conventions).
Technology-agnostic guidance in `observability`; tool-specific depth in the others.

```
/plugin install backend
```

---

### grafana

The observability consumption stack — querying, visualizing, alerting on, and managing telemetry through Grafana. Seven
skills cover the full surface: `dashboards` (JSON model, panels, variables, transformations), `promql` (Prometheus query
writing, native histograms, optimization), `metricsql` (VictoriaMetrics PromQL superset — behavioral diffs, rollup
extensions, WITH templates), `logsql` (VictoriaLogs log querying — filters, pipes, stats), `alerting` (unified alerting,
notification routing, templates), `provisioning` (file YAML, HTTP API, gcx CLI, Terraform), and `dataviz` (encoding
hierarchy, color theory, dashboard layout, observability frameworks). Companion to `backend` — backend produces
telemetry, grafana consumes it.

```
/plugin install grafana
```

---

### cli

CLI platform discipline — command-line interface design, shell scripting conventions, and terminal UX patterns. Two
skills cover the full CLI surface: `cli` handles the design layer (argument conventions, output streams, exit codes,
configuration hierarchy, signal handling) for CLIs written in any language, while `shell-scripting` handles the
implementation layer (strict mode, quoting, portability, error handling) for scripts written in shell.

```
/plugin install cli
```

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

Python language discipline targeting 3.14+. Two skills cover the full Python surface: `python` handles conventions,
modern idioms, type annotations (built-in generics, `|` unions, protocols), data classes, pattern matching, exception
handling, packaging (pyproject.toml, uv, ruff), and project structure, while `pytest` handles testing conventions
(fixtures, parametrize, markers, mocking, async testing, conftest patterns).

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

## License

MIT
