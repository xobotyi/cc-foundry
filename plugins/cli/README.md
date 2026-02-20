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

Two skills that cover the full CLI surface — one for design, one for shell implementation.
Both follow the behavioral self-sufficiency principle: an agent reading only SKILL.md can do
the job correctly without loading references. References provide extended examples, code
pattern catalogs, and specification details.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install cli
```

## Skills

### cli

CLI application design discipline. Covers output stream separation (the #1 composability
mistake), POSIX/GNU argument conventions, subcommand patterns, exit code semantics,
configuration hierarchy (flags > env vars > config files > defaults), color/terminal handling,
signal handling (SIGINT, SIGTERM, SIGPIPE), help text design, error message formatting,
structured output (`--json`, `--plain`), and robustness patterns (idempotency, crash recovery).

Applies to CLIs written in any language — the skill covers the interface between a program and
the terminal/shell/pipeline. Language-specific implementation details (argument parsing
libraries, terminal I/O APIs) come from their respective language plugins.

**Use when:** building or reviewing any command-line tool or terminal application.

| References | Contents |
|------------|----------|
| `arguments.md` | Full POSIX guidelines, GNU long option table, subcommand patterns, flag design |
| `output.md` | Stream separation details, color codes, ANSI escapes, NO_COLOR spec, pager setup |
| `exit-codes.md` | Standard/extended code tables, signal exit codes, partial success patterns |
| `interaction.md` | TTY detection, prompting patterns, confirmation levels, progress display |
| `configuration.md` | Full hierarchy, XDG spec, env var catalog, config file formats, secret handling |
| `signals.md` | Full signal table, SIGPIPE handling, crash-only design, child process signals |

### shell-scripting

Shell script conventions and defensive patterns. Shell defaults are hostile — unquoted
variables split, unset variables vanish silently, failed commands continue — so the skill
counteracts each default with explicit rules. Covers strict mode (`set -euo pipefail`),
quoting (the #1 source of shell bugs), variable handling, error handling and traps, function
patterns, control flow, argument parsing (`getopts` and manual), formatting, portability
(POSIX sh vs bash, GNU vs BSD tools, macOS bash 3.2), and ShellCheck integration.

**Use when:** writing or reviewing shell scripts (`.sh`, `.bash`, `.zsh` files).

| References | Contents |
|------------|----------|
| `strict-mode.md` | errexit caveats, pipefail examples, trap patterns, temp file safety, debugging |
| `quoting.md` | Three quoting mechanisms, `"$@"` vs `"$*"`, array expansion, printf vs echo |
| `portability.md` | Feature comparison table, GNU vs BSD tool differences, portable pattern catalog |
| `arguments.md` | getopts template, manual long-option parsing, validation patterns, usage messages |
| `pitfalls.md` | Iteration pitfalls, variable pitfalls, test pitfalls, pipeline pitfalls |
| `builtins.md` | Parameter expansion table, replacing sed/cut/basename/expr, arrays, read patterns |

## Skill Dependencies

The two skills are complementary but independent. `cli` covers the interface between a program
and the terminal/shell/pipeline — it applies regardless of implementation language.
`shell-scripting` covers shell-specific correctness when the implementation language IS shell
(bash, sh, zsh). When writing a shell-based CLI tool, both skills apply.

Both skills assume `the-coder` for language-agnostic coding discipline (discovery, planning,
verification). Language-specific concerns (Go's cobra, Node's commander) come from their
respective language plugins.

## Related Plugins

- **golang** — Go language discipline (cobra, flag, os/signal)
- **javascript** — JavaScript/TypeScript discipline (commander, yargs, process)
- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)

## License

MIT
