# python

Python language discipline plugin for Claude Code targeting Python 3.14+, with LSP-powered code intelligence via
Pyright.

## The Problem

Python's flexibility is a double-edged sword. Without explicit guidance, Claude may produce code using outdated patterns
(`Optional[str]` instead of `str | None`, `os.path` instead of `pathlib`, `setup.py` instead of `pyproject.toml`), miss
modern language features (pattern matching, type parameter syntax, exception groups), or use inconsistent conventions
across a codebase. Each project ends up re-teaching the same standards.

The Python ecosystem has modernized rapidly — `uv` for package management, `ruff` for linting/formatting, built-in
generics, the `type` statement, lazy annotation evaluation — but Claude's defaults often lag behind the current state of
the art.

Beyond conventions, Claude defaults to text-based code search (Grep/Glob) even when a language server can provide
precise, scope-aware navigation. This leads to false positives in large codebases and missed references across module
boundaries.

## The Solution

This plugin provides two skills and an LSP server configuration that give Claude deep Python fluency targeting 3.14+.
The `python` skill covers core language conventions (naming, typing, data classes, pattern matching, exceptions,
generators, decorators), modern toolchain practices (uv, ruff, pyproject.toml), project structure (src layout, import
organization, packaging), and LSP-first code navigation rules. The `pytest` skill covers testing conventions (fixtures,
parametrize, markers, assertions, conftest patterns). Both skills include reference guides for extended examples and
detailed patterns.

The bundled Pyright LSP configuration enables semantic code intelligence — go to definition, find references, hover for
type info, workspace symbol search — directly in Claude Code for `.py` and `.pyi` files.

## Prerequisites

Install Pyright (the Python language server) and ensure it's available in PATH:

```bash
npm install -g pyright
```

Or via uv:

```bash
uv tool install pyright
```

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install python
```

## Skills

### python

Enforces modern Python conventions and idioms across all Python code. Covers naming (snake_case functions, PascalCase
classes, UPPER_SNAKE constants), type annotations (built-in generics, `|` unions, `type` statement, protocols), data
classes (`frozen=True`, `slots=True`, `kw_only`), pattern matching (structural dispatch, guards, class patterns),
exception handling (specific catches, chaining with `from`, exception groups), generators (lazy sequences, `yield from`,
itertools), decorators (signature preservation, ParamSpec), context managers, comprehensions, f-strings, pathlib, enums,
concurrency (asyncio TaskGroup, threading), packaging (pyproject.toml, uv, ruff, src layout), and LSP-first code
navigation.

Includes reference guides for type annotation patterns (generics, overloads, variance, ParamSpec), packaging workflows
(pyproject.toml templates, uv commands, ruff configuration), and module system details (import resolution, circular
imports, namespace packages).

**Use when:** writing, reviewing, refactoring, debugging, or exploring any Python code.

### pytest

Enforces pytest testing framework conventions. Covers fixture design (scope, autouse, factories, teardown), parametrize
patterns (multiple parameters, indirect fixtures, IDs), markers (skip, xfail, custom markers), assertion patterns
(pytest.raises, approx, custom matchers), conftest organization (scope hierarchy, plugin fixtures), and test structure
(arrange-act-assert, naming, file organization).

**Use when:** writing or reviewing Python tests with pytest.

## Related Plugins

- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)
- **backend** — Backend platform concerns (observability, API design, data persistence)
- **cli** — CLI platform concerns (argument parsing, output formatting, configuration)

## License

MIT
