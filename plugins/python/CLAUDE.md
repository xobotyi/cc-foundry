# python Plugin

Python language discipline: conventions, modern idioms, type annotations, packaging, testing
practices, and project structure targeting Python 3.14+.

## Skills

| Skill | Purpose |
|-------|---------|
| `python` | Python language conventions, idioms, type annotations, data classes, pattern matching, packaging (pyproject.toml, uv, ruff), and project structure |
| `pytest` | pytest testing framework conventions and practices (fixtures, parametrize, markers, assertions, conftest patterns) |

## Skill Dependencies

The `python` skill provides language-specific conventions and covers the full Python language
surface — from type annotations and data classes through packaging and concurrency. The `pytest`
skill extends those conventions to the testing domain and references Python naming, exception,
and typing rules from the `python` skill.

Both skills assume the `the-coder` plugin for language-agnostic coding discipline (discovery,
planning, verification).

## Plugin Scope

This plugin covers Python language specifics, the modern Python toolchain (uv, ruff, mypy/pyright),
and testing with pytest. Language-agnostic coding practices (discovery, planning, verification) are
provided by the `the-coder` plugin. Platform-specific concerns (backend, CLI) are provided by their
respective platform plugins.

## Conventions

- Python 3.14+ is the baseline — use modern syntax unconditionally (built-in generics,
  `type` statement, `|` unions, pattern matching)
- Type annotations are mandatory on all public API boundaries
- `pyproject.toml` is the single source of truth for project metadata and tool configuration
- `uv` is the preferred package manager and environment tool
- `ruff` is the single tool for both linting and formatting
- `pathlib.Path` over `os.path` for all filesystem operations
- `@dataclass(frozen=True, slots=True)` as default for data containers
- `asyncio.TaskGroup` over `asyncio.gather()` for structured concurrency
