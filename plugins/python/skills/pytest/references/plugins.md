# Plugin Ecosystem and Configuration

pytest's plugin ecosystem extends the framework with async support, mocking, parallelism,
and coverage. Distilled from official plugin documentation.

## pytest-asyncio

Enables async test functions and fixtures.

### Configuration

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"  # auto-detect async tests (recommended)
```

| Mode | Behavior |
|------|----------|
| `auto` | Async tests and fixtures detected automatically — no decorator needed |
| `strict` | Requires explicit `@pytest.mark.asyncio` on every async test (default) |

With `auto` mode, any `async def test_*` function is treated as an async test without
needing `@pytest.mark.asyncio`.

### Event Loop Scope

```toml
[tool.pytest.ini_options]
asyncio_default_fixture_loop_scope = "session"
```

| Scope | Behavior |
|-------|----------|
| `function` | Fresh event loop per test (more isolated, default) |
| `session` | One event loop for the entire test run (faster, shared connections) |

### Async Fixtures

```python
@pytest.fixture
async def async_client():
    async with httpx.AsyncClient(base_url="http://test") as client:
        yield client

@pytest.fixture(scope="session")
async def database():
    db = await Database.connect("postgresql://test")
    yield db
    await db.disconnect()
```

Async fixtures use `yield` for teardown, same as sync fixtures. Both sync and async
fixtures can be mixed freely — a sync test can use async fixtures and vice versa when
pytest-asyncio is configured.

### Limitations

- Test classes subclassing `unittest.TestCase` are **not supported** — use
  `unittest.IsolatedAsyncioTestCase` instead or plain pytest async tests
- When using `scope="session"` on async fixtures, configure
  `asyncio_default_fixture_loop_scope = "session"` to avoid loop mismatch errors

## pytest-mock

Provides the `mocker` fixture — a thin wrapper around `unittest.mock` with automatic
cleanup after each test.

### Core API

```python
def test_sends_email(mocker):
    mock_send = mocker.patch("myapp.notifications.send_email")
    notify_user("alice@example.com", "Hello")
    mock_send.assert_called_once_with("alice@example.com", "Hello")
```

### Method Reference

| Method | Purpose |
|--------|---------|
| `mocker.patch("target")` | Replace target with `MagicMock` |
| `mocker.patch.object(obj, "attr")` | Patch attribute on a specific object |
| `mocker.patch.dict(dict_obj, values)` | Temporarily modify dict entries |
| `mocker.spy(obj, "method")` | Wrap method — track calls while preserving behavior |
| `mocker.stub(name="stub")` | Create a standalone stub (no spec) |
| `mocker.MagicMock(spec=Type)` | Create spec-constrained mock |
| `mocker.AsyncMock(spec=Type)` | Create async-compatible mock |
| `mocker.patch("target", new_callable=mocker.AsyncMock)` | Patch with async mock |

### Spy Pattern

Spy wraps the real method — calls pass through to the original implementation, but calls
are recorded for assertion:

```python
def test_spy_on_method(mocker):
    spy = mocker.spy(UserService, "create")
    service = UserService()
    result = service.create(name="Alice")

    spy.assert_called_once_with(mocker.ANY, name="Alice")
    assert result is not None  # real return value
```

### Context Manager Usage

For scoped mocking within a test:

```python
def test_scoped_mock(mocker):
    # Mock active for entire test
    mock_fetch = mocker.patch("myapp.api.fetch")

    # For narrower scope, use unittest.mock directly
    from unittest.mock import patch
    with patch("myapp.api.other_fetch") as mock_other:
        result = do_something()
        mock_other.assert_called_once()
```

### Where to Patch

Patch where the name is **looked up**, not where it's defined:

```python
# myapp/services.py
from myapp.clients import http_client  # name looked up in services module

# test
def test_service(mocker):
    # CORRECT — patch where it's imported
    mocker.patch("myapp.services.http_client")

    # WRONG — patches the definition, not the import
    # mocker.patch("myapp.clients.http_client")
```

### Improved Assertion Errors

pytest-mock enhances mock assertion error messages with introspection. When
`assert_called_once_with` fails, the error shows the actual calls made, making
debugging easier than raw `unittest.mock`.

## pytest-xdist

Parallel test execution across multiple CPUs or remote machines.

### Usage

```bash
# Auto-detect CPU count
pytest -n auto

# Specific worker count
pytest -n 4

# Distribute by file (each worker gets whole files)
pytest -n auto --dist loadfile

# Distribute by group (tests marked with same group run together)
pytest -n auto --dist loadgroup
```

### Distribution Modes

| Mode | Behavior |
|------|----------|
| `load` | Distribute tests to workers as they become free (default) |
| `loadfile` | Group tests by file — each worker runs whole files |
| `loadgroup` | Group by `@pytest.mark.xdist_group("name")` |
| `loadscope` | Group by test module/class scope |
| `no` | Disable distribution (useful for debugging) |

### Configuration

```toml
[tool.pytest.ini_options]
addopts = "-n auto"  # always run in parallel
```

### Isolation Constraints

- Tests must be **fully isolated** — no shared mutable state, no execution order dependency
- Session-scoped fixtures run once **per worker**, not once globally
- Use `tmp_path` (not hardcoded paths) to avoid file conflicts between workers
- Database tests need per-worker isolation (e.g., unique database per worker)

### Worker-Aware Fixtures

```python
@pytest.fixture(scope="session")
def database(worker_id):
    """Create a unique database per xdist worker."""
    if worker_id == "master":
        db_name = "test_db"  # not running under xdist
    else:
        db_name = f"test_db_{worker_id}"
    db = create_database(db_name)
    yield db
    db.drop()
```

`worker_id` is `"master"` when not running under xdist, or `"gw0"`, `"gw1"`, etc.
when distributed.

## pytest-cov

Coverage reporting integrated with pytest.

### Usage

```bash
# Basic coverage
pytest --cov=src

# With reports
pytest --cov=src --cov-report=term-missing --cov-report=html

# Fail under threshold
pytest --cov=src --cov-fail-under=80
```

### Configuration

```toml
[tool.coverage.run]
source = ["src"]
branch = true

[tool.coverage.report]
show_missing = true
fail_under = 80
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.:",
    "@overload",
    "raise NotImplementedError",
]
```

### Best Practices

- **Run coverage in CI only** — it slows down local development feedback loops
- **Set `source`** to include untested files in the report (files with zero imports)
- **Use `branch = true`** to measure branch coverage, not just line coverage
- **Don't chase 100%** — focus on critical paths. Defensive code and error handlers
  legitimately need `# pragma: no cover` in some cases

## Warning Testing Patterns

pytest captures warnings automatically and provides tools for testing warning behavior.

### pytest.warns

```python
def test_deprecation_warning():
    with pytest.warns(DeprecationWarning, match="use new_func"):
        old_func()

# Record and inspect warnings
with pytest.warns(RuntimeWarning) as record:
    do_something()
assert len(record) == 1
assert "expected message" in str(record[0].message)
```

### recwarn Fixture

```python
def test_warning_details(recwarn):
    trigger_warning()
    assert len(recwarn) == 1
    w = recwarn.pop(UserWarning)
    assert issubclass(w.category, UserWarning)
    assert str(w.message) == "expected text"
    assert w.filename
    assert w.lineno
```

### pytest.deprecated_call

```python
def test_function_deprecated():
    with pytest.deprecated_call():
        legacy_function()
```

Matches `DeprecationWarning`, `PendingDeprecationWarning`, and `FutureWarning`.

### filterwarnings Configuration

```toml
[tool.pytest.ini_options]
filterwarnings = [
    "error",                                        # treat all warnings as errors
    "ignore::UserWarning",                          # except UserWarning
    'ignore:function ham\(\) is deprecated:DeprecationWarning',
]
```

**Precedence:** last matching filter wins. Mark-level filters (`@pytest.mark.filterwarnings`)
take precedence over config-level filters.

**Decorator ordering caveat:** decorators evaluate bottom-to-top, so earlier (top)
`@pytest.mark.filterwarnings` decorators take precedence over later (bottom) ones — the
reverse of the config file ordering:

```python
@pytest.mark.filterwarnings("ignore:api v1")   # higher priority
@pytest.mark.filterwarnings("error")            # lower priority
def test_one():
    ...
```

## pytest-httpx

Mock `httpx` requests without touching the network:

```python
def test_api_call(httpx_mock):
    httpx_mock.add_response(
        url="https://api.example.com/users",
        json={"users": [{"name": "Alice"}]},
    )
    result = fetch_users()
    assert result[0].name == "Alice"
```

## pytest-randomly

Randomizes test execution order to catch hidden dependencies:

```bash
# Run with random seed
pytest -p randomly

# Reproduce a specific order
pytest -p randomly --randomly-seed=12345
```

Install and enable by default — hidden test dependencies cause intermittent CI failures
that are expensive to debug.
