# Packaging and Project Setup

Extended patterns for Python project configuration, dependency management, and toolchain
setup targeting Python 3.14+. Complements the rules in SKILL.md with templates, edge
cases, and tool-specific configuration details.

## pyproject.toml Template

```toml
[project]
name = "my-package"
version = "0.1.0"
description = "What this package does"
readme = "README.md"
license = "MIT"
license-files = ["LICENSE"]
requires-python = ">=3.14"
authors = [
    { name = "Author Name", email = "author@example.com" },
]
dependencies = [
    "httpx>=0.27",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=5.0",
    "mypy>=1.11",
    "ruff>=0.6",
]

[project.scripts]
my-tool = "my_package.cli:main"

[project.urls]
Homepage = "https://github.com/me/my-package"
Documentation = "https://my-package.readthedocs.io"
Issues = "https://github.com/me/my-package/issues"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
target-version = "py314"
line-length = 88

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "B",    # flake8-bugbear
    "UP",   # pyupgrade
    "RUF",  # ruff-specific
]

[tool.ruff.lint.isort]
known-first-party = ["my_package"]

[tool.mypy]
python_version = "3.14"
strict = true
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-ra -q"
```

## Build Backends

| Backend | When to Use |
|---------|------------|
| `hatchling` | Default choice for new projects. Fast, configurable, well-maintained. |
| `flit-core` | Minimal projects with no custom build steps. |
| `setuptools` | Legacy projects, C extensions, complex build requirements. |
| `maturin` | Rust extension modules (PyO3). |
| `uv-build` | Projects already using uv as their primary tool. |
| `pdm-backend` | If already using PDM as project manager. |

Build system declaration examples:

```toml
# hatchling (recommended default)
[build-system]
requires = ["hatchling >= 1.26"]
build-backend = "hatchling.build"

# setuptools
[build-system]
requires = ["setuptools >= 77.0.3"]
build-backend = "setuptools.build_meta"

# uv-build
[build-system]
requires = ["uv_build >= 0.10.0, <0.11.0"]
build-backend = "uv_build"
```

## License Declaration (PEP 639)

The modern format uses SPDX license expressions (string, not table):

```toml
[project]
license = "MIT"
license-files = ["LICENSE"]

# Compound expressions
license = "MIT AND (Apache-2.0 OR BSD-2-Clause)"

# Custom license
license = "LicenseRef-My-Custom-License"
```

The older `license = {text = "..."}` table format is deprecated. Supported since
hatchling 1.27.0, setuptools 77.0.3, flit-core 3.12, uv-build 0.7.19.

## Dynamic Metadata

Let the build backend compute fields like version:

```toml
[project]
name = "my-package"
dynamic = ["version"]

# hatchling: read version from source
[tool.hatch.version]
path = "src/my_package/__init__.py"
```

Only use `dynamic` when the value genuinely needs to be computed. Static metadata is
easier to inspect and more portable across tools.

## uv Workflows

### Project Initialization

```bash
# Create new project
uv init my-project
cd my-project

# Or initialize in existing directory
uv init

# Install a specific Python version
uv python install 3.14

# Pin Python version for the project
uv python pin 3.14
```

### Dependency Management

```bash
# Add a dependency
uv add httpx
uv add "pydantic>=2.0"

# Add dev dependency
uv add --dev pytest ruff mypy

# Add optional dependency group
uv add --group docs mkdocs

# Remove a dependency
uv remove httpx

# Update lock file
uv lock

# Upgrade a specific package to latest compatible version
uv lock --upgrade-package requests

# Sync environment from lock file
uv sync

# Sync including all dependency groups
uv sync --all-groups

# Add all dependencies from a requirements.txt
uv add -r requirements.txt
```

### Running Commands

```bash
# Run a script in the project environment
uv run python script.py

# Run a tool
uv run pytest
uv run ruff check
uv run mypy src/

# Run with specific Python version
uv run --python 3.14 python script.py
```

`uv run` automatically syncs the environment before execution — it verifies the lockfile
matches `pyproject.toml` and the environment matches the lockfile.

### Virtual Environments

```bash
# Create a virtual environment (auto-created by uv sync)
uv venv

# Create with specific Python version
uv venv --python 3.14

# Activate (still needed for some workflows)
source .venv/bin/activate  # Unix
.venv\Scripts\activate     # Windows
```

### Building and Version Management

```bash
# Build source distribution and wheel
uv build
# Output: dist/my-package-0.1.0.tar.gz, dist/my-package-0.1.0-py3-none-any.whl

# Check current version
uv version
uv version --short  # just the version number
```

## Project Layout

### src Layout (Recommended)

```
my-project/
├── pyproject.toml
├── uv.lock
├── README.md
├── src/
│   └── my_package/
│       ├── __init__.py
│       ├── core.py
│       ├── models.py
│       └── utils.py
└── tests/
    ├── conftest.py
    ├── test_core.py
    └── test_models.py
```

**Why src layout:**
- Prevents accidental imports of the package from the project root during testing
- Forces tests to run against the installed version, catching packaging bugs early
- Matches how the package will be used by consumers

### Flat Layout (Simple Scripts/Small Projects)

```
my-project/
├── pyproject.toml
├── my_package/
│   ├── __init__.py
│   └── core.py
└── tests/
    └── test_core.py
```

Acceptable for small projects, scripts, and applications that won't be distributed
as packages.

## Dependency Specification

### Version Constraints

```toml
dependencies = [
    # Lower bound only — preferred for libraries
    "httpx>=0.27",

    # Compatible release (>=2.0, <3.0)
    "pydantic~=2.0",

    # Exact pin — only for applications, never libraries
    "uvicorn==0.30.1",

    # Exclusion
    "numpy>=1.26,!=1.26.2",

    # Platform-specific
    "pywin32>=306; sys_platform == 'win32'",
]
```

### Rules

- **Libraries:** use `>=` lower bound only. Upper bounds (`<4.0`) create dependency
  conflicts for consumers. Only add upper bounds for known incompatibilities.
- **Applications:** can pin exact versions via lock file (`uv.lock`). The lock file
  handles reproducibility — `pyproject.toml` specifies intent.
- **Never use `*` or unbounded dependencies** — they make builds non-reproducible.

## Entry Points and Plugins

```toml
# CLI commands
[project.scripts]
my-tool = "my_package.cli:main"

# GUI scripts (no terminal window on Windows)
[project.gui-scripts]
my-gui = "my_package.gui:main"

# Plugin entry points (for extensible frameworks like pytest, pygments)
[project.entry-points."myapp.plugins"]
auth = "myapp_auth:AuthPlugin"
```

## __init__.py Patterns

```python
# Minimal — just define public API
"""My package description."""

from my_package.core import process, transform
from my_package.models import Config, User

__all__ = ["Config", "User", "process", "transform"]
```

- **Keep `__init__.py` minimal.** Import and re-export public API. No logic.
- **Define `__all__`** to control `from package import *` and document the public API.
- **Sort `__all__` alphabetically** for easy scanning.
- **Avoid lazy imports in `__init__.py`** unless startup time is critical.
- **Empty `__init__.py`** is acceptable for packages where users import from submodules
  directly.

## ruff Configuration

### Recommended Rule Sets

```toml
[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort (import sorting)
    "B",    # flake8-bugbear (common bugs)
    "UP",   # pyupgrade (modern syntax)
    "SIM",  # flake8-simplify
    "RUF",  # ruff-specific rules
    "PTH",  # flake8-use-pathlib
    "T20",  # flake8-print (no print statements)
    "TCH",  # flake8-type-checking (TYPE_CHECKING imports)
]

ignore = [
    "E501",  # line length — handled by formatter
]
```

### Per-File Overrides

```toml
[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = [
    "S101",  # allow assert in tests
    "T20",   # allow print in tests
]
"__init__.py" = [
    "F401",  # allow unused imports (re-exports)
]
```

### Config Hierarchy

Ruff uses hierarchical config discovery — the closest `pyproject.toml` (with a
`[tool.ruff]` section), `ruff.toml`, or `.ruff.toml` wins for each file. Configs do
not merge across levels. Use `extend` to inherit from a parent config:

```toml
[tool.ruff]
extend = "../pyproject.toml"
line-length = 100  # override just this setting
```

When `target-version` is not set, ruff infers it from `requires-python` in the nearest
`pyproject.toml`.

### Formatter Configuration

```toml
[tool.ruff.format]
quote-style = "double"       # default, same as Black
indent-style = "space"       # default
skip-magic-trailing-comma = false
docstring-code-format = true  # format code blocks in docstrings
```
