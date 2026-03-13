# python Plugin

Python language discipline: conventions, modern idioms, type annotations, packaging, testing practices, project
structure targeting Python 3.14+, and LSP-powered code intelligence via `pyright-langserver`.

## Skills

| Skill    | Purpose                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `python` | Python language conventions, idioms, type annotations, data classes, pattern matching, packaging (pyproject.toml, uv, ruff), project structure, and LSP navigation rules |
| `pytest` | pytest testing framework conventions and practices (fixtures, parametrize, markers, assertions, conftest patterns)                                                       |

## LSP Integration

This plugin ships a `pyright-langserver` LSP configuration (`.lsp.json`). When installed, Claude Code automatically
connects to Pyright for `.py` and `.pyi` files, enabling LSP tools (`goToDefinition`, `findReferences`, `hover`,
`workspaceSymbol`, etc.).

The `python` skill enforces LSP-first navigation: agents must use LSP tools for semantic code navigation (finding
definitions, references, implementations, call hierarchies) instead of falling back to Grep/Glob pattern matching. Text
search tools remain appropriate for non-semantic searches (comments, string literals, config values).

**Prerequisite:** Users must have `pyright-langserver` installed and available in PATH. Install via
`npm install -g pyright` or `uv tool install pyright`.

## Skill Dependencies

The `python` skill provides language-specific conventions and covers the full Python language surface — from type
annotations and data classes through packaging and concurrency. The `pytest` skill extends those conventions to the
testing domain and references Python naming, exception, and typing rules from the `python` skill.

Both skills assume the `the-coder` plugin for language-agnostic coding discipline (discovery, planning, verification).

## Plugin Scope

This plugin covers Python language specifics, the modern Python toolchain (uv, ruff, mypy/pyright), testing with pytest,
and LSP-powered code intelligence. Language-agnostic coding practices (discovery, planning, verification) are provided
by the `the-coder` plugin. Platform-specific concerns (backend, CLI) are provided by their respective platform plugins.

## Conventions

- Python 3.14+ is the baseline — use modern syntax unconditionally (built-in generics, `type` statement, `|` unions,
  pattern matching)
- Type annotations are mandatory on all public API boundaries
- `pyproject.toml` is the single source of truth for project metadata and tool configuration
- `uv` is the preferred package manager and environment tool
- `ruff` is the single tool for both linting and formatting
- `pathlib.Path` over `os.path` for all filesystem operations
- `@dataclass(frozen=True, slots=True)` as default for data containers
- `asyncio.TaskGroup` over `asyncio.gather()` for structured concurrency
- LSP tools are required for code navigation — Grep/Glob only for non-semantic text search
