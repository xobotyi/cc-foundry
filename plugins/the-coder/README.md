# the-coder

Language-agnostic software engineering discipline for Claude Code.

## The Problem

**Claude writes code before understanding what exists.** It assumes API signatures from memory, guesses at method names,
and skips verification until compile failures force corrections. This wastes tokens debugging preventable errors and
burns context on fix attempts that could have been avoided with 30 seconds of upfront discovery.

**Tests get skipped.** Code that "looks right" ships without validation. Regressions appear in production. The symptom
is broken code — the cause is declaring "done" before actually verifying the work meets requirements.

**Abstractions multiply without justification.** Every task becomes an opportunity to add layers, extract interfaces,
and invent patterns the codebase doesn't need. The result is code bloat that makes future changes harder, not easier.

## The Solution

This plugin enforces a discovery-first workflow and provides an implementation-focused output style. The `coding` skill
interrupts assumption-based reasoning and requires verification before any code runs. The `software-engineer` style
brings engineering judgment, LSP-first navigation, and a skill queue system that composes language-specific disciplines.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-coder
```

## Skills

### coding

Universal coding discipline that runs before language-specific skills. Enforces the core loop: Discover → Plan →
Implement → Verify. Contains assumption interrupt patterns that flag reasoning mistakes before they become code
mistakes. Requires reading actual API signatures instead of guessing them. Demands test execution before declaring work
complete. Includes debugging discipline (build a red feedback loop first, minimize the repro, rank falsifiable
hypotheses, bisect, never ship a fix you can't explain) and a hard rule against silencing failing checks — tests, lint,
and type errors get fixed, not suppressed.

**Use when:** Starting any code task — writing, modifying, debugging, or refactoring. This skill is a prerequisite for
implementation work and should run before language-specific skills engage.

**Invocation:** `/coding` or automatically activated by the `software-engineer` output style.

## Output Styles

### software-engineer

Implementation-focused persona with engineering judgment. Treats Claude as a peer engineer, not a code execution
service. Enforces the `coding` skill before implementation, uses LSP tools for semantic navigation, and composes
multiple skills into a queue (e.g., `coding` → `golang` → verification). Pushes back on bad approaches, surfaces
concerns immediately, and prioritizes working code over clever abstractions. Plans vertically — phase 1 is a tracer
bullet end-to-end, subsequent phases add depth in vertical passes; rejects horizontal "all DB, then all API, then all
UI" decomposition.

**Activate:** `/config` → **Output style** → `Software Engineer`, or set `"outputStyle": "Software Engineer"` in a
settings file. (The standalone `/output-style` command was removed in Claude Code v2.1.91.)

## Related Plugins

Language and platform disciplines are provided by separate plugins:

- **golang** — Go language conventions, idioms, and toolchain
- **javascript** — JavaScript and TypeScript conventions and patterns
- **frontend** — Frontend platform (CSS, accessibility)
- **backend** — Backend platform (observability, API design)
- **cli** — CLI platform (command-line design patterns)

## License

MIT
