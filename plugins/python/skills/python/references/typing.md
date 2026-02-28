# Type Annotation Patterns

Extended examples and patterns for Python 3.14+ type annotations. Complements the rules
in SKILL.md with detailed examples, edge cases, and lesser-used constructs.

## Built-in Generic Syntax

```python
# Modern (3.9+) — always use this
names: list[str] = []
config: dict[str, int] = {}
coordinates: tuple[float, float] = (0.0, 0.0)
unique_ids: set[int] = set()
optional_name: str | None = None

# Nested generics
matrix: list[list[float]] = []
registry: dict[str, list[Callable[[], None]]] = {}
```

## Type Aliases (3.12+)

```python
# type statement — preferred
type Vector = list[float]
type Matrix = list[Vector]
type Handler = Callable[[Request], Response]
type Result[T] = T | Error

# Generic type alias
type Pair[T] = tuple[T, T]
type Mapping[K, V] = dict[K, list[V]]
```

## Generics with New Syntax (3.12+)

### Generic Functions

```python
def first[T](items: Sequence[T]) -> T:
    return items[0]

def merge[K, V](a: dict[K, V], b: dict[K, V]) -> dict[K, V]:
    return {**a, **b}

# Constrained type parameter — T must be str or bytes
def encode[T: (str, bytes)](data: T) -> T:
    ...

# Bounded type parameter — T must implement Comparable
def maximum[T: Comparable](items: Iterable[T]) -> T:
    ...
```

### Generic Classes

```python
class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

    def peek(self) -> T:
        return self._items[-1]

# Usage — type is inferred
stack = Stack[int]()
stack.push(42)
```

### Generic Protocols

```python
class Comparable[T](Protocol):
    def __lt__(self, other: T, /) -> bool: ...
    def __le__(self, other: T, /) -> bool: ...

class Repository[T](Protocol):
    def get(self, id: str) -> T | None: ...
    def save(self, entity: T) -> None: ...
    def delete(self, id: str) -> bool: ...
```

### Bounded vs Constrained Type Variables

Bounded and constrained type parameters have different solving behavior:

```python
# Bounded — solved to the most specific subtype
def print_cap[S: str](x: S) -> S:
    print(x.capitalize())
    return x

class MyStr(str): ...
reveal_type(print_cap(MyStr("hi")))  # MyStr (preserves subtype)

# Constrained — solved to exactly one of the constraints
def concat[A: (str, bytes)](x: A, y: A) -> A:
    return x + y

reveal_type(concat(MyStr("a"), MyStr("b")))  # str (not MyStr!)
concat("one", b"two")  # Error: can't mix str and bytes
```

Use bounded when you want subtype preservation. Use constrained when the type must be
exactly one of a fixed set.

## NewType

Creates a distinct type for the type checker with zero runtime overhead. Unlike type
aliases (which are interchangeable), `NewType` prevents accidental mixing:

```python
from typing import NewType

UserId = NewType("UserId", int)
OrderId = NewType("OrderId", int)

def get_user(uid: UserId) -> User: ...

get_user(UserId(42))    # OK
get_user(OrderId(42))   # Error — OrderId is not UserId
get_user(42)            # Error — int is not UserId

# Arithmetic returns the base type
result = UserId(1) + UserId(2)  # type is int, not UserId
```

Use `NewType` for domain identifiers (user IDs, order IDs, file paths) where mixing
distinct-but-same-typed values would be a logic error.

## ParamSpec for Decorator Signatures

```python
from collections.abc import Callable

# Modern syntax (3.12+)
def retry[**P, R](fn: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        for attempt in range(3):
            try:
                return fn(*args, **kwargs)
            except Exception:
                if attempt == 2:
                    raise
        raise RuntimeError("unreachable")
    return wrapper

# Decorator with parameters
def timeout[**P, R](seconds: float) -> Callable[[Callable[P, R]], Callable[P, R]]:
    def decorator(fn: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            ...
        return wrapper
    return decorator
```

### Concatenate for Argument Injection

Use `Concatenate` when a decorator adds or removes parameters:

```python
from typing import Concatenate
from threading import Lock

def with_lock[**P, R](
    f: Callable[Concatenate[Lock, P], R],
) -> Callable[P, R]:
    def inner(*args: P.args, **kwargs: P.kwargs) -> R:
        return f(my_lock, *args, **kwargs)
    return inner

@with_lock
def update_data(lock: Lock, key: str, value: int) -> None:
    with lock:
        ...

# Caller doesn't pass the lock — decorator injects it
update_data("key", 42)
```

## Overloads

```python
from typing import overload

@overload
def process(data: str) -> str: ...
@overload
def process(data: bytes) -> bytes: ...
@overload
def process(data: int) -> float: ...

def process(data: str | bytes | int) -> str | bytes | float:
    match data:
        case str():
            return data.upper()
        case bytes():
            return data.decode().upper().encode()
        case int():
            return float(data)
```

## TypeGuard vs TypeIs

```python
from typing import TypeGuard, TypeIs

# TypeIs (3.13+) — narrows the input type, works in both branches
def is_str_list(val: list[object]) -> TypeIs[list[str]]:
    return all(isinstance(x, str) for x in val)

# TypeGuard — output type unrelated to input, only narrows True branch
def is_valid_user(data: dict[str, object]) -> TypeGuard[UserDict]:
    return "name" in data and "email" in data
```

| | TypeIs | TypeGuard |
|---|--------|-----------|
| True branch | intersection of original + narrowed type | exactly the guard type |
| False branch | excludes the narrowed type | no narrowing |
| Type relationship | narrowed must be subtype of input | no constraint |
| Use when | refining an existing type | output type unrelated to input |

Prefer `TypeIs` for standard narrowing. Use `TypeGuard` when the narrowed type is
incompatible with the input (e.g., `list[object]` to `list[str]` — `list` is invariant).

## TypedDict

```python
from typing import TypedDict, Required, NotRequired, ReadOnly

# All keys required by default
class Movie(TypedDict):
    title: str
    year: int
    director: str

# total=False makes all keys optional; use Required to mark exceptions
class Options(TypedDict, total=False):
    verbose: bool
    timeout: int
    output: Required[str]  # this one is required

# ReadOnly (3.13+) — key cannot be mutated
class Config(TypedDict):
    host: ReadOnly[str]
    port: ReadOnly[int]
    retries: int  # mutable

# Unpack for typed **kwargs (3.12+)
from typing import Unpack

class RequestOpts(TypedDict, total=False):
    timeout: float
    headers: dict[str, str]

def fetch(url: str, **kwargs: Unpack[RequestOpts]) -> bytes:
    ...

# Caller gets type-checked keyword arguments
fetch("https://example.com", timeout=30.0, headers={"Auth": "token"})
```

## Self Type

```python
from typing import Self

class Builder:
    def set_name(self, name: str) -> Self:
        self._name = name
        return self

    def set_age(self, age: int) -> Self:
        self._age = age
        return self

class ExtendedBuilder(Builder):
    def set_email(self, email: str) -> Self:
        self._email = email
        return self

# ExtendedBuilder.set_name() returns ExtendedBuilder, not Builder
```

Use `Self` for any method that returns `self` — fluent builders, `__enter__`, and
`@classmethod` alternative constructors.

## Variance

In 3.12+ generics, variance is inferred from usage:

```python
# Inferred as covariant (T appears only in return positions)
class Producer[T]:
    def get(self) -> T: ...

# Inferred as contravariant (T appears only in parameter positions)
class Consumer[T]:
    def accept(self, item: T) -> None: ...

# Inferred as invariant (T appears in both positions)
class Container[T]:
    def get(self) -> T: ...
    def set(self, item: T) -> None: ...
```

## Never and NoReturn

```python
from typing import Never

# Function that never returns (always raises or loops forever)
def fail(msg: str) -> Never:
    raise RuntimeError(msg)

# Exhaustiveness checking with assert_never
from typing import assert_never

def handle(status: Status) -> str:
    match status:
        case Status.ACTIVE:
            return "active"
        case Status.INACTIVE:
            return "inactive"
        case _:
            assert_never(status)  # Error if Status gains a new member
```

## Literal and LiteralString

```python
from typing import Literal, LiteralString

type Direction = Literal["north", "south", "east", "west"]

def move(direction: Direction, steps: int = 1) -> None: ...

move("north")  # OK
move("up")     # Error

# LiteralString — prevents injection attacks
def run_query(sql: LiteralString) -> None: ...

run_query("SELECT * FROM users")           # OK — literal
run_query(f"SELECT * FROM {user_input}")   # Error — not a literal string
```

## Annotated

Attach metadata to types without affecting type checking:

```python
from typing import Annotated

# Pydantic-style validation metadata
type PositiveInt = Annotated[int, Gt(0)]
type Email = Annotated[str, Pattern(r"^[\w.]+@[\w.]+$")]

# FastAPI dependency injection
def get_user(user_id: Annotated[int, Path(ge=1)]) -> User: ...

# Metadata is preserved at runtime
>>> Annotated[int, "metadata"].__metadata__
('metadata',)
```

## Annotating Tricky Patterns

```python
# Variadic tuples with TypeVarTuple
def head_tail[T](items: tuple[T, *tuple[T, ...]]) -> tuple[T, tuple[T, ...]]:
    return items[0], items[1:]

# Final for constants
from typing import Final
MAX_CONNECTIONS: Final = 100

# ClassVar for class-level attributes
from typing import ClassVar

class Config:
    instances: ClassVar[list[Config]] = []
    name: str

# type[C] for class objects (not instances)
def create[T: Widget](cls: type[T]) -> T:
    return cls()
```

## Annotating Generators and Coroutines

```python
from collections.abc import Generator, Iterator, AsyncGenerator, AsyncIterator

# Simple generator — use Iterator
def count_up(start: int) -> Iterator[int]:
    while True:
        yield start
        start += 1

# Generator with send/return — use Generator[YieldType, SendType, ReturnType]
# SendType and ReturnType default to None
def echo_round() -> Generator[int, float, str]:
    sent = yield 0
    while sent >= 0:
        sent = yield round(sent)
    return "Done"

# Async generator
async def stream_data(url: str) -> AsyncIterator[bytes]:
    async with httpx.AsyncClient() as client:
        async with client.stream("GET", url) as resp:
            async for chunk in resp.aiter_bytes():
                yield chunk
```

## Common Pitfalls

- **Don't annotate `self` or `cls`** — the type checker infers them.
- **`tuple[int, ...]`** means variable-length homogeneous tuple. `tuple[int, str]` means
  exactly two elements of specified types. `tuple[()]` means empty tuple.
- **`dict[str, Any]`** disables value type checking. Prefer `dict[str, object]` or a
  TypedDict.
- **Avoid circular type references** — in 3.14+ with lazy annotation evaluation, forward
  references resolve automatically. For older versions, use string literals
  `"ClassName"` or `from __future__ import annotations`.
- **`object` vs `Any`**: `object` is type-safe (rejects most operations), `Any` is an
  escape hatch (accepts all operations). Use `object` when you mean "any type but still
  type-safe."
