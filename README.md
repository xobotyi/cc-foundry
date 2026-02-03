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

## License

MIT
