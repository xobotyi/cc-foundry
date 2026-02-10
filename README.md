# cc-foundry

Plugins that make Claude Code better at its job.

Claude Code is powerful out of the box, but it has gaps. It forgets skills mid-session. Commits are messy. Building AI artifacts is trial-and-error. These plugins fix that.

## Installation

Add the marketplace, then install any plugin:

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install <plugin-name>
```

## Plugins

### skill-enforcer

Claude skips skills and forgets about them mid-session. This plugin injects checkpoints at key lifecycle points (user prompt, after read, after edit, after skill load) that force Claude to evaluate which skills apply and what references to read.

```
/plugin install skill-enforcer
```

---

### git-commit

Messy commits — mixed changes, vague messages, wrong order. This plugin adds a `/commit` command that analyzes your diff, identifies atomic changes, orders them correctly (style → refactor → fix → feature), validates messages, and creates focused commits.

```
/plugin install git-commit
```

---

### ai-helpers

Creating prompts, skills, agents, and output styles is guesswork. This plugin provides skills that encode best practices for each artifact type: creation patterns, evaluation criteria, iteration techniques, and reference examples.

```
/plugin install ai-helpers
```

---

### the-blueprint

Planning is ad-hoc — design decisions live in chat, task breakdowns are inconsistent, context is lost between sessions. This plugin provides a four-stage pipeline: design documents (problem analysis → recommendation), technical designs (solution → components), task decomposition (components → tracked tasks), and task creation (tasks → issue tracker). Each stage produces a persistent artifact and hands off to the next.

```
/plugin install the-blueprint
```

---

### the-crucible

Code quality is checked manually or not at all. This plugin provides a two-level validation pipeline: task completion validation (did you deliver what was asked?) and multi-agent code evaluation (8 specialized agents reviewing naming, complexity, comments, tests, error handling, security, observability, and documentation). All agents are read-only — they report, you decide.

```
/plugin install the-crucible
```

---

### the-statusline

No visibility into context window usage, cost, or active model. This plugin adds a status line showing real-time session metrics.

```
/plugin install the-statusline
```

## License

MIT
