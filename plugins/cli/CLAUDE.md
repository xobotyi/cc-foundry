# cli Plugin

CLI platform discipline: command-line interface design, shell scripting conventions, and
terminal UX patterns.

## Skills

| Skill | Purpose |
|-------|---------|
| `cli` | CLI application design: argument conventions, output streams, exit codes, configuration hierarchy, interactive modes, signal handling, and terminal UX |
| `shell-scripting` | Shell script conventions and defensive patterns: strict mode, quoting, portability, error handling, and common pitfalls |

## Skill Dependencies

The two skills are complementary but independent. `cli` covers the interface between a program
and the terminal/shell/pipeline — it applies regardless of implementation language. `shell-scripting`
covers shell-specific correctness when the implementation language IS shell (bash, sh, zsh).

Both skills assume `the-coder` for language-agnostic coding discipline (discovery, planning,
verification). Language-specific concerns (Go's cobra, Node's commander) come from their
respective language plugins.

## Plugin Scope

This plugin covers CLI platform concerns specific to building command-line tools and terminal
applications. It provides two layers:

- **Design layer** (`cli`) — how a CLI should behave: argument conventions, output streams,
  exit codes, signal handling. Applies to CLIs written in any language.
- **Implementation layer** (`shell-scripting`) — how to write correct shell scripts: strict
  mode, quoting, error handling, portability. Applies only to shell scripts.

Language-specific implementations (argument parsing libraries, terminal I/O APIs) are provided
by their respective language plugins.
