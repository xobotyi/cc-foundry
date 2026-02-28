---
name: python
description: >-
  Python language conventions, modern idioms, and toolchain. Invoke whenever task involves any
  interaction with Python code — writing, reviewing, refactoring, debugging, or understanding
  Python projects.
---

# Python

**Readability counts. Explicit is better than implicit. If your code needs a comment to explain
its control flow, restructure it.**

Python 3.14+ is the baseline. Use modern syntax unconditionally — no backward compatibility
with older Python versions unless the project explicitly requires it.

## References

Extended examples, packaging workflows, and detailed rationale for the rules below live in
`references/`.

| Topic | Reference | Contents |
|-------|-----------|----------|
| Type annotation patterns, generics, overloads, TypeVar, variance | [typing.md](references/typing.md) | Full annotation examples, generic class patterns, Protocol implementation, TypeVar usage |
| Project layout, pyproject.toml, uv, dependency management | [packaging.md](references/packaging.md) | pyproject.toml templates, uv workflows, src layout, dependency groups, build backends |
| Module system, imports, namespace packages, `__init__.py` | [modules.md](references/modules.md) | Import resolution order, circular import fixes, lazy imports, namespace packages |
| asyncio, TaskGroup, cancellation, timeouts, threading interop | [concurrency.md](references/concurrency.md) | TaskGroup error handling, timeout scopes, cancellation semantics, to_thread, eager task factory |

## Naming

| Entity | Style | Examples |
|--------|-------|----------|
| Variables, functions, methods | snake_case | `user_name`, `fetch_data` |
| Classes, type aliases | PascalCase | `UserService`, `HttpClient` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| Modules, packages | snake_case, short | `user_store`, `auth` |
| Private attributes/methods | `_` prefix | `_internal_cache`, `_validate()` |
| Name-mangled attributes | `__` prefix | `__secret` (rarely needed) |
| Type variables | PascalCase, short | `T`, `KT`, `VT`, `ResponseT` |
| Protocols | PascalCase, `-able`/`-ible` suffix | `Renderable`, `Serializable` |

- **Descriptive names.** `user_count` not `n`. Short names (`i`, `x`) only in tiny scopes
  (comprehensions, simple lambdas).
- **No redundant context.** `car.make` not `car.car_make`.
- **Boolean names:** `is_`/`has_`/`can_`/`should_` prefix: `is_valid`, `has_access`.
- **Dunder methods are reserved for the data model.** Never invent custom dunder names.
- **Avoid single-character names** outside loop indices, comprehension variables, and
  well-established conventions (`f` for file, `e` for exception, `k`/`v` for key/value).

## Type Annotations

Python 3.14+ uses modern annotation syntax natively. No `from __future__ import annotations`
needed — all annotations are evaluated lazily by default.

### Core Rules

- **Annotate all public API boundaries** — function signatures, class attributes, module-level
  variables. Internal code often needs fewer annotations; types flow from context.
- **Use built-in generics:** `list[str]`, `dict[str, int]`, `tuple[int, ...]`,
  `set[float]`. Never import `List`, `Dict`, `Tuple`, `Set` from `typing`.
- **Union with `|`:** `str | None`, `int | float`. Never `Optional[X]` or `Union[X, Y]`.
- **`type` statement for aliases:** `type Vector = list[float]`. Not `TypeAlias` annotation.
- **`None` return:** annotate `-> None` on functions that return nothing. Omit return type
  only on `__init__`.
- **Avoid `Any`** — it disables type checking. Use `object` when you mean "any type but still
  type-safe." Use `Any` only at true interop boundaries with untyped code.

### Generics

- **`type` parameter syntax (3.12+):** `class Stack[T]:` and `def first[T](items: list[T]) -> T:`
  instead of `TypeVar` declarations.
- **Constrained type parameters:** `def process[T: (str, bytes)](data: T) -> T:` for a
  finite set of allowed types.
- **Bounded type parameters:** `def sort[T: Comparable](items: list[T]) -> list[T]:` for
  upper-bound constraints.
- **Variance is inferred** from usage in 3.12+ generics. No manual `covariant`/`contravariant`
  flags needed.

### Protocols (Structural Typing)

- **Prefer protocols over ABCs** when you don't control the implementing types or when
  structural compatibility is sufficient.
- **`@runtime_checkable`** only when you need `isinstance()` checks — it adds overhead and
  only validates method presence, not signatures.
- **Keep protocols small** — one to three methods. A protocol with many methods is a sign
  you need an ABC or a concrete base class.

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Renderable(Protocol):
    def render(self) -> str: ...
```

### Callable Types

- **`collections.abc.Callable`** for callable annotations:
  `Callable[[int, str], bool]`.
- **`ParamSpec`** for decorators that preserve signatures:
  `def decorator[**P, R](fn: Callable[P, R]) -> Callable[P, R]:`.
- **Use `Protocol`** for complex callable signatures with keyword arguments or overloads.

### TypeGuard and TypeIs

- **`TypeIs`** (3.13+) for narrowing that refines the input type:
  `def is_str_list(val: list[object]) -> TypeIs[list[str]]:`.
- **`TypeGuard`** for narrowing where the output type is unrelated to input:
  `def is_valid_config(data: object) -> TypeGuard[Config]:`.

See [typing.md](references/typing.md) for full annotation patterns, generics, overloads,
and variance.

## Data Classes and Structured Data

### dataclasses

- **Use `@dataclass` for data containers** — classes that primarily hold data with minimal
  behavior.
- **`frozen=True`** for immutable data: `@dataclass(frozen=True)`. Default to frozen unless
  mutation is required.
- **`slots=True`** for memory efficiency and attribute safety:
  `@dataclass(slots=True, frozen=True)`.
- **`kw_only=True`** when constructors have more than 3 fields — prevents positional
  argument ordering bugs.
- **`field(default_factory=list)`** for mutable defaults. Never use mutable default
  arguments.
- **Post-init processing:** `__post_init__` for derived fields and validation.

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class User:
    name: str
    email: str
    roles: list[str] = field(default_factory=list)
```

### When NOT to Use dataclasses

- **Simple value containers** with 1-2 fields: use `NamedTuple` or plain tuples.
- **Config/settings with validation:** use Pydantic or attrs with validators.
- **Persistence/ORM models:** use the ORM's model base class.

### NamedTuple

- **Use `class` syntax** over functional form: `class Point(NamedTuple): x: float; y: float`.
- NamedTuples are immutable and iterable — useful as dict keys and in destructuring.

## Enums

- **Use `enum.Enum`** for categorical constants. Never use bare strings or ints as
  pseudo-enums.
- **`enum.StrEnum`** when the enum must interoperate with string APIs (JSON, config keys).
- **`enum.IntEnum`** only when integer interop is mandatory (legacy protocols). Prefer
  `Enum` otherwise.
- **`@enum.unique`** to prevent duplicate values.
- **Access by value:** `Color(1)`. Access by name: `Color["RED"]`. Iteration: `for c in Color:`.
- **Never subclass enums with members.** Enums with members are final.

```python
from enum import StrEnum, unique

@unique
class Status(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
```

## Pattern Matching

`match`/`case` (3.10+) is the preferred dispatch mechanism for structural patterns.

- **Use match for structural dispatch** — matching on type, shape, or destructured values.
  Don't use match as a substitute for simple `if`/`elif` chains on a single value.
- **Always include a wildcard `case _:` arm** unless the match is provably exhaustive.
- **Guard clauses** with `if`: `case Point(x, y) if x > 0:`.
- **Use `|` for alternatives:** `case "quit" | "exit" | "q":`.
- **Capture with walrus:** `case {"error": str() as msg}:` captures while matching type.
- **Class patterns** require `__match_args__` or keyword patterns:
  `case Point(x=0, y=y):`.

```python
match command:
    case {"action": "move", "direction": str() as direction}:
        move(direction)
    case {"action": "attack", "target": str() as target}:
        attack(target)
    case _:
        raise ValueError(f"Unknown command: {command}")
```

## Functions

- **Early return.** Guard clauses first, happy path flat. Reduce nesting.
- **One function, one job.** If the name contains "and", split it.
- **Type-annotate all parameters and return types** on public functions.
- **Default arguments:** immutable values only. Use `None` + conditional for mutable
  defaults: `def f(items: list[int] | None = None):` then `items = items or []` in body.
  Never `def f(items: list[int] = []):`.
- **`*` to force keyword-only arguments** after positional params:
  `def connect(host: str, *, port: int = 443):`.
- **`/` to force positional-only** for parameters that callers shouldn't name:
  `def sqrt(x: float, /) -> float:`.
- **Prefer returning values** over mutating arguments. Functions should be referentially
  transparent when possible.
- **`None` means absent, not error.** Return `T | None` for optional results. Raise
  exceptions for errors.

## Decorators

- **Preserve signatures** with `functools.wraps`:
  ```python
  def retry[**P, R](fn: Callable[P, R]) -> Callable[P, R]:
      @functools.wraps(fn)
      def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
          ...
      return wrapper
  ```
- **Decorator order matters.** Decorators apply bottom-up. `@staticmethod` and
  `@classmethod` must be outermost (topmost in source).
- **Parametric decorators** return a decorator: `@retry(attempts=3)` means `retry` returns
  the actual decorator function.
- **Don't over-abstract with decorators.** If the decorator hides important control flow
  (error handling, transaction management), make it explicit instead.

## Context Managers

- **`contextlib.contextmanager`** for simple resource management:
  ```python
  @contextmanager
  def managed_connection(url: str) -> Iterator[Connection]:
      conn = Connection(url)
      try:
          yield conn
      finally:
          conn.close()
  ```
- **Class-based context managers** when state management is complex — implement
  `__enter__` and `__exit__`.
- **`contextlib.suppress(ExceptionType)`** instead of empty `except: pass`.
- **`contextlib.closing(thing)`** for objects with `.close()` but no `__exit__`.
- **`contextlib.asynccontextmanager`** for async resource management.
- **Always use `with`** for files, locks, database connections, and any resource that
  needs deterministic cleanup.

## Generators and Iterators

- **Generators for lazy sequences.** Use `yield` to produce values on demand instead of
  building full lists in memory.
- **Generator expressions** over list comprehensions when the result is iterated only once:
  `sum(x * x for x in range(1000))`.
- **`yield from`** to delegate to sub-generators — preserves `.send()`, `.throw()`,
  `.close()` protocol.
- **`itertools`** for composition: `chain`, `islice`, `groupby`, `batched` (3.12+),
  `pairwise` (3.10+).
- **Annotate generators:** `def gen() -> Iterator[int]:` for simple generators,
  `Generator[YieldType, SendType, ReturnType]` when using `.send()`.
- **Never exhaust a generator twice.** Generators are single-pass. If you need multiple
  passes, materialize to a list or use `itertools.tee`.

## Comprehensions

- **List/dict/set comprehensions** for simple transforms: `[x.name for x in users if x.active]`.
- **One level of nesting maximum.** Two nested `for` clauses are the absolute limit.
  Beyond that, extract to a function.
- **Don't use comprehensions for side effects.** `[print(x) for x in items]` is wrong —
  use a `for` loop.
- **Walrus operator in comprehensions** for compute-once-filter-and-use:
  `[y for x in data if (y := transform(x)) is not None]`.
- **Dict comprehensions** for key transformations:
  `{k.lower(): v for k, v in headers.items()}`.

## Exception Handling

- **Be specific.** Catch the narrowest exception type: `except ValueError:` not
  `except Exception:`.
- **Never bare `except:`.** It catches `SystemExit`, `KeyboardInterrupt`, and `GeneratorExit`.
  At minimum use `except Exception:`.
- **`except* ExceptionGroup`** (3.11+) for handling multiple concurrent exceptions from
  `TaskGroup` and similar.
- **Wrap with context.** `raise AppError("context") from err` chains the original cause.
- **Don't use exceptions for flow control.** `if key in dict:` not
  `try: dict[key] except KeyError:` (unless the miss is rare and lookup is expensive).
- **Custom exceptions** inherit from a project-specific base that extends `Exception`:
  ```python
  class AppError(Exception): ...
  class NotFoundError(AppError): ...
  class ValidationError(AppError): ...
  ```
- **Error strings:** lowercase, no trailing punctuation. They compose in chains:
  `"parse config: invalid format"`.
- **`else` clause** runs only when no exception was raised — use for code that should
  execute on success but isn't part of the `try` body.
- **`finally`** for unconditional cleanup — prefer context managers when possible.
- **Exception groups (3.11+):** use `ExceptionGroup` to bundle multiple errors. Handle
  with `except*` which matches by type and re-raises unhandled exceptions.
- **Add notes with `.add_note()`** (3.11+) to attach context without creating new
  exception types.

## Strings

- **f-strings** for interpolation. Never `%` formatting or `.format()` in new code.
- **f-string expressions must be simple.** No function calls with multiple arguments,
  no nested f-strings, no complex expressions. Extract to a variable first.
- **`str.removeprefix()` / `str.removesuffix()`** (3.9+) over slicing.
- **Triple-quoted strings** for multiline. Use `textwrap.dedent` when indentation matters.
- **`"".join(parts)`** for building strings in loops — never `+=` in a loop.
- **Raw strings `r"..."`** for regex patterns and Windows paths.

## Pathlib

- **`pathlib.Path`** for all filesystem operations. Never `os.path` in new code.
- **`/` operator** for path joining: `base / "subdir" / "file.txt"`.
- **Common operations:** `path.exists()`, `path.is_file()`, `path.is_dir()`,
  `path.read_text()`, `path.write_text()`, `path.mkdir(parents=True, exist_ok=True)`,
  `path.iterdir()`, `path.glob("*.py")`, `path.rglob("**/*.py")`.
- **`path.resolve()`** for absolute paths. `path.relative_to(base)` for relative paths.
- **Accept `str | Path`** in public APIs, convert to `Path` internally.

## Imports

- **Absolute imports** by default: `from mypackage.utils import helper`.
- **Relative imports** only within packages for tightly coupled modules:
  `from .models import User`.
- **Import grouping** (separated by blank lines):
  1. Standard library (`import os`, `from pathlib import Path`)
  2. Third-party (`import httpx`, `from pydantic import BaseModel`)
  3. Local (`from myapp.models import User`)
- **Import specific names:** `from collections import defaultdict` not `import collections`
  (unless you use many names from the module).
- **Never `from module import *`** — pollutes namespace, breaks type checkers, hides
  dependencies.
- **`if TYPE_CHECKING:` block** for imports used only in annotations — avoids circular
  imports and runtime overhead. In 3.14+ with lazy annotations, this is less necessary
  but still useful for avoiding circular import side effects.
- **Lazy imports** in function bodies when a top-level import would create a circular
  dependency or when the import is expensive and rarely needed.

## Classes

### Slots

- **Always use `__slots__`** on classes that will have many instances — prevents `__dict__`
  creation, saves memory, catches typos in attribute names.
- **`@dataclass(slots=True)`** adds slots automatically.
- **Slots and inheritance:** every class in the hierarchy must declare `__slots__`.
  Missing slots on a parent reintroduces `__dict__`.

### Dunder Methods

- **`__repr__`** on every class — must be unambiguous:
  `def __repr__(self) -> str: return f"User(name={self.name!r})"`.
- **`__str__`** only when a human-readable form differs from repr.
- **`__eq__` and `__hash__`** — if you define `__eq__`, define `__hash__` too (or set
  `__hash__ = None` to make unhashable). Mutable objects should not be hashable.
- **`__bool__`** — define when truthiness of instances has meaningful semantics.
- **`__enter__`/`__exit__`** for context manager protocol.
- **`__init_subclass__`** for class registration patterns without metaclasses.
- **`__class_getitem__`** to make classes subscriptable for generic type hints.

### Inheritance

- **Composition over inheritance.** Use inheritance only for true "is-a" relationships.
- **ABCs for interfaces** when you control both sides and need enforced implementation:
  `from abc import ABC, abstractmethod`.
- **Protocols for duck typing** when you don't control implementations.
- **`super()`** — always use `super()` (no arguments in 3.x). Never hardcode parent class
  names.
- **MRO awareness.** Understand method resolution order in diamond inheritance. When in
  doubt, avoid multiple inheritance.

### Class Methods and Static Methods

- **`@classmethod`** for alternative constructors: `User.from_dict(data)`.
- **`@staticmethod`** for utility functions that don't need class or instance state — but
  prefer module-level functions unless the function is logically part of the class's API.

## Packaging and Toolchain

### pyproject.toml

- **`pyproject.toml` is the single source of truth** for project metadata, dependencies,
  tool configuration. Never `setup.py` or `setup.cfg` in new projects.
- **Build backend:** use `hatchling`, `flit-core`, or `setuptools` with
  `[build-system]` table.
- **Dependency specification:** pin with `>=` lower bound, avoid upper bounds unless
  genuinely incompatible: `httpx>=0.27`.

### uv

- **`uv`** is the preferred Python package manager and environment tool.
- **`uv sync`** to install dependencies from lock file.
- **`uv add <package>`** to add dependencies.
- **`uv run <command>`** to run commands in the project environment.
- **`uv lock`** to generate/update the lock file.
- **`uv venv`** to create virtual environments.
- **`uv python install 3.14`** to install Python versions.

### Project Layout

```
my-project/
├── pyproject.toml
├── uv.lock
├── src/
│   └── my_package/
│       ├── __init__.py
│       └── ...
└── tests/
    ├── conftest.py
    └── ...
```

- **src layout** — package code lives under `src/`. Prevents accidental imports from the
  project root during testing.
- **`__init__.py`** — keep minimal. Define `__all__` for public API. Don't put substantial
  logic in init files.

### Linting and Formatting

- **`ruff`** for both linting and formatting. Single tool, fast.
- **`ruff check`** to lint. **`ruff format`** to format.
- **Configure in `pyproject.toml`** under `[tool.ruff]`.

See [packaging.md](references/packaging.md) for pyproject.toml templates, uv workflows,
and dependency management patterns.

## Concurrency

### asyncio

- **`async`/`await`** for I/O-bound concurrency.
- **`asyncio.TaskGroup`** (3.11+) for structured concurrency — replaces
  `asyncio.gather()` with better error handling.
- **Never use `asyncio.gather()`** in new code — it has inconsistent error semantics.
  Use `TaskGroup` instead.
- **`asyncio.run()`** as the single entry point. Never `loop.run_until_complete()`.
- **Cancel via `asyncio.CancelledError`** — always clean up resources in `finally` blocks.

### threading

- **`concurrent.futures.ThreadPoolExecutor`** for CPU-light I/O-bound parallel work.
- **`threading.Lock`** for shared mutable state. Always use `with lock:` context manager.
- **GIL note:** in CPython, threads don't achieve true parallelism for CPU-bound work.
  Use `multiprocessing` or `ProcessPoolExecutor` for CPU-bound tasks.
- **Free-threaded Python (3.13+):** when running with `--disable-gil`, standard
  thread-safety practices become critical. Guard all shared mutable state with locks.

### General Rules

- **Structured concurrency preferred.** `TaskGroup` and context managers over bare
  `create_task()`.
- **Never fire-and-forget** tasks or threads — always track completion.
- **Cancellation must be cooperative.** Check for cancellation and clean up.

## Logging

- **`logging` module** over `print()` for anything beyond quick debugging.
- **`logger = logging.getLogger(__name__)`** at module level.
- **Lazy formatting:** `logger.info("User %s logged in", user_id)` not
  `logger.info(f"User {user_id} logged in")` — f-string evaluates even when level
  is disabled.
- **Use appropriate levels:** `DEBUG` for diagnostics, `INFO` for operational events,
  `WARNING` for degraded but working, `ERROR` for failures, `CRITICAL` for system-down.

## Application

When **writing** Python code: apply all conventions silently — don't narrate each rule.
If an existing codebase contradicts a convention, follow the codebase and flag the
divergence once.

When **reviewing** Python code: cite the specific violation and show the fix inline.
Don't lecture — state what's wrong and how to fix it.

```
Bad:  "According to Python best practices, you should use type unions
       with the pipe operator instead of Optional..."
Good: "Optional[str] -> str | None"
```

## Toolchain

- **`ruff`**: single entry point for linting and formatting. Must pass before committing.
  - `ruff check` — lint. `ruff check --fix` — auto-fix.
  - `ruff format` — format.
- **`uv`**: package management, virtual environments, Python version management.
- **`mypy` or `pyright`**: static type checking. Configure in `pyproject.toml`.

## Integration

The **coding** skill governs workflow (discovery, planning, verification); this skill governs
Python implementation choices. The **pytest** skill governs testing conventions — both are
active simultaneously when writing Python tests.

**Readability counts. If you read a function twice to understand it, rewrite it once to
make it clear.**
