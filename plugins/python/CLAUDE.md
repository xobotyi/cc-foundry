# python Plugin

Python language discipline: conventions, modern idioms, type annotations, packaging, testing practices, project
structure targeting Python 3.14+, and LSP-powered code intelligence via `pyright-langserver`.

## Skills

- **`python`** — Python language conventions, idioms, type annotations, data classes, pattern matching, packaging
  (pyproject.toml, uv, ruff), project structure, and LSP navigation rules
- **`pytest`** — pytest testing framework conventions and practices (fixtures, parametrize, markers, assertions,
  conftest patterns)

## LSP Integration

- `.lsp.json` ships a `pyright-langserver` config for `.py` and `.pyi`; the `python` skill's LSP-first navigation rules
  are written against it

## Plugin Scope

- Language-agnostic coding workflow belongs to `the-coder`; backend and CLI concerns belong to their platform plugins
