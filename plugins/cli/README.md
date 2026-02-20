# cli

CLI platform discipline for Claude Code — command-line interface design, shell scripting
conventions, and terminal UX patterns.

## The Problem

Building command-line tools requires discipline-specific knowledge that Claude doesn't
consistently apply: stdout vs stderr separation, POSIX argument conventions, signal handling,
exit code semantics, interactive vs non-interactive behavior. Shell scripts add another layer
of difficulty — unquoted variables, missing error handling, and portability traps cause subtle
bugs that pass casual review.

## The Solution

Two skills that cover the full CLI surface:

**`cli`** — CLI application design discipline. 60 numbered rules covering output streams,
argument conventions, exit codes, configuration hierarchy, color/terminal handling, signal
handling, help text, error messages, and structured output. Applies to CLIs written in any
language.

**`shell-scripting`** — Shell script conventions and defensive patterns. Covers strict mode,
quoting (the #1 source of shell bugs), variable handling, error handling, functions, control
flow, argument parsing, formatting, portability (POSIX sh vs bash), and ShellCheck integration.

Both skills follow the behavioral self-sufficiency principle: an agent reading only SKILL.md
can do the job correctly without loading references. References provide extended examples,
code pattern catalogs, and specification details.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install cli
```

## Skills

| Skill | Lines | References | Covers |
|-------|-------|------------|--------|
| `cli` | 240 | 6 files | CLI design: arguments, output, exit codes, config, interaction, signals |
| `shell-scripting` | 342 | 6 files | Shell conventions: strict mode, quoting, errors, functions, portability |

## Related Plugins

- **golang** — Go language discipline (cobra, flag, os/signal)
- **javascript** — JavaScript/TypeScript discipline (commander, yargs, process)
- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)

## License

MIT
