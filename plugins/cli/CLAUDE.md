# cli Plugin

CLI platform discipline: command-line interface design, shell scripting conventions, and terminal UX patterns.

## Skills

- **`cli`** — CLI application design: argument conventions, output streams, exit codes, configuration hierarchy,
  interactive modes, signal handling, and terminal UX
- **`shell-scripting`** — shell script conventions and defensive patterns: strict mode, quoting, portability, error
  handling, and common pitfalls

## Skill Dependencies

- `cli` and `shell-scripting` are complementary but independent
- `cli` covers the interface between a program and the terminal/shell/pipeline, regardless of implementation language
- `shell-scripting` covers shell-specific correctness when the implementation language is shell (bash, sh, zsh)

## Plugin Scope

- Both skills assume `the-coder` for language-agnostic coding discipline
- Language-specific concerns (Go's cobra, Node's commander) come from their respective language plugins
