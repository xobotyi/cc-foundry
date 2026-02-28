# Module System and Imports

Extended patterns for Python's import system, module organization, and resolution
mechanics, distilled from the official Python import system documentation.

## Import Resolution Order

When Python encounters `import foo`, the import machinery follows this sequence:

1. **`sys.modules` cache** — previously imported modules return immediately. The cache
   includes intermediate paths: importing `foo.bar.baz` creates entries for `foo`,
   `foo.bar`, and `foo.bar.baz`.
2. **`sys.meta_path` finders** — queried in order. Python's default meta path has three
   finders: built-in modules, frozen modules, and the path-based finder.
3. **`sys.path` entries** (via path-based finder) — directories and zip files searched
   left to right:
   - Script directory (or current directory for `python -m`)
   - `PYTHONPATH` environment variable entries
   - Site-packages directories (where pip/uv install packages)

If no finder returns a module spec, `ModuleNotFoundError` is raised.

**Cache behavior:** `sys.modules` is writable. Deleting a key invalidates the cache
entry, causing Python to search anew on next import. Setting a key to `None` forces
`ModuleNotFoundError` on next import. `importlib.reload()` reuses the same module
object and re-executes its code.

## Import Styles

### Absolute Imports (Default)

```python
# Import the module
import mypackage.utils
mypackage.utils.helper()

# Import specific names (preferred for frequently used names)
from mypackage.utils import helper, validate
helper()

# Import module with alias (for long module names)
import mypackage.long_module_name as lmn
lmn.do_thing()
```

### Relative Imports (Within Packages Only)

```python
# From same package
from .models import User
from .utils import validate

# From parent package
from ..core import Engine

# From sibling package
from ..auth.tokens import create_token
```

**When to use relative imports:**
- Tightly coupled modules within the same package
- Internal package structure that might be reorganized

**When to use absolute imports:**
- Cross-package imports
- When the import path documents the dependency clearly
- In scripts and entry points

## Packages

Python has two types of packages:

### Regular Packages

A directory containing `__init__.py`. When imported, `__init__.py` is implicitly
executed and its objects bound to names in the package namespace.

```
parent/
    __init__.py
    one/
        __init__.py
    two/
        __init__.py
```

Importing `parent.one` executes both `parent/__init__.py` and
`parent/one/__init__.py`.

### Namespace Packages (PEP 420)

Directories without `__init__.py` — composite packages where portions may reside
in different filesystem locations. Namespace packages use a custom iterable for
`__path__` that performs a new search on each import attempt if `sys.path` changes.

```
company/
├── auth/           # no __init__.py
│   └── tokens.py
└── billing/        # no __init__.py
    └── invoices.py
```

Both `company.auth.tokens` and `company.billing.invoices` work without `__init__.py`.

**Use namespace packages when:**
- Multiple distributions contribute to the same top-level package
- You want to split a large package across repositories

**Use regular packages (`__init__.py`) when:**
- Package is a single distribution
- You need package-level initialization
- You want to control the public API via `__all__`

## Circular Import Patterns

### The Problem

```python
# models.py
from myapp.services import UserService  # imports services.py

# services.py
from myapp.models import User  # imports models.py — circular!
```

The module is added to `sys.modules` before its code fully executes. This prevents
infinite recursion but can cause `ImportError` if the requested name hasn't been
defined yet when the circular import occurs.

### Solutions (in preference order)

**1. Restructure to eliminate the cycle**

Extract shared definitions to a third module:

```python
# types.py — shared definitions
class UserData: ...

# models.py
from myapp.types import UserData

# services.py
from myapp.types import UserData
from myapp.models import User
```

**2. Import at function level (lazy import)**

```python
# services.py
class UserService:
    def get_user(self, id: str) -> User:
        from myapp.models import User  # imported when called
        return User.from_db(id)
```

**3. TYPE_CHECKING guard for annotation-only imports**

```python
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from myapp.models import User

class UserService:
    def get_user(self, id: str) -> User:
        ...
```

In Python 3.14+ with lazy annotation evaluation, forward references resolve
automatically, reducing the need for `TYPE_CHECKING` for annotation purposes.
The guard remains useful to avoid importing a module's side effects at runtime.

## __all__ and Public API

```python
# mypackage/__init__.py

from mypackage.core import Engine, process
from mypackage.models import Config, User

__all__ = [
    "Config",
    "Engine",
    "User",
    "process",
]
```

- **`__all__` defines the public API** — what `from package import *` exposes
- **Sort alphabetically** for easy scanning
- **Include only stable, documented names** — internal helpers stay out

## Dynamic and Conditional Imports

### importlib for Programmatic Imports

```python
import importlib

# Import by string name
module = importlib.import_module("mypackage.plugins.auth")

# Reload a module (rare — for development tools only)
importlib.reload(module)
```

### Conditional Imports for Optional Dependencies

```python
try:
    import orjson as json
except ImportError:
    import json  # stdlib fallback

# Or guard with availability check
import importlib.util

HAS_NUMPY = importlib.util.find_spec("numpy") is not None

if HAS_NUMPY:
    import numpy as np
```

## Import Side Effects

Some imports execute code at module time. Rules:
- Minimize module-level side effects — move initialization into functions
- Side-effect imports (`import mypackage.setup`) must be documented with a comment
- Never rely on import order for correctness — fragile and hard to debug
- Use `if __name__ == "__main__":` to guard script execution from import

## `__init__.py` Best Practices

```python
"""Package docstring — describes what the package provides."""

from mypackage.core import Engine
from mypackage.models import User

__all__ = ["Engine", "User"]

__version__ = "1.0.0"
```

- **Keep `__init__.py` minimal** — imports and `__all__` only
- **No business logic** in `__init__.py`
- **No conditional imports** unless handling optional dependencies
- **Import cost matters** — heavy imports slow everything that touches the package
