---
name: pytest
description: >-
  pytest testing framework conventions and practices. Invoke whenever task involves any
  interaction with pytest — writing tests, configuring pytest, fixtures, parametrize,
  mocking, debugging test failures, or coverage.
---

# pytest

**Test behavior, not implementation. Tests are executable documentation — if the test name
doesn't explain what the code does, rewrite it.**

pytest is Python's standard testing framework. It uses plain `assert` statements, fixtures
for setup/teardown, and a rich plugin ecosystem. All patterns target Python 3.14+.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Fixture patterns, scope, factories, teardown | [fixtures.md](references/fixtures.md) | Fixture lifecycle, yield fixtures, factory pattern, request object, parametrized fixtures |
| Parametrize patterns, indirect, IDs | [parametrize.md](references/parametrize.md) | Multi-parameter examples, indirect fixtures, custom IDs, stacking decorators |
| Monkeypatch patterns, scoped patches | [monkeypatch.md](references/monkeypatch.md) | API overview, attribute/env/dict patching, scoped monkeypatch, common recipes |
| Plugin ecosystem and configuration | [plugins.md](references/plugins.md) | pytest-asyncio, pytest-mock, pytest-xdist, pytest-cov configuration patterns |

## Test Structure

### Discovery and Naming

- **Files:** `test_*.py` or `*_test.py`. Prefer `test_<module>.py` matching source module.
- **Functions:** `test_<behavior>` — describe the behavior, not the method:
  `test_returns_empty_list_when_no_matches` not `test_search`.
- **Classes:** `TestClassName` groups related tests. No `__init__` method.
  Use classes when tests share setup; use bare functions for independent tests.
- **conftest.py** is auto-discovered — no import needed. Place shared fixtures at the
  appropriate directory level.

### Arrange-Act-Assert

Structure every test in three phases:

```python
def test_user_creation_sets_defaults():
    # Arrange
    data = {"name": "Alice", "email": "alice@example.com"}

    # Act
    user = User.from_dict(data)

    # Assert
    assert user.name == "Alice"
    assert user.is_active is True
    assert user.roles == []
```

- **One act per test.** If you need multiple acts, write multiple tests.
- **Comments optional** when phases are obvious. Add them when the test is long enough
  that phases aren't immediately clear.

### Test Granularity

- **One concept per test.** Multiple assertions are fine when they verify the same behavior.
  Separate tests when behaviors are independent.
- **Fast by default.** Unit tests should run in milliseconds. Gate slow tests (network, DB)
  behind markers: `@pytest.mark.slow`.
- **Isolation is mandatory.** Tests must not depend on execution order or shared mutable
  state. Each test sets up its own world.

## Fixtures

### Core Rules

- **Fixtures over setup methods.** Fixtures are composable, scoped, and explicit. Never
  use `setUp`/`tearDown` from `unittest`.
- **Explicit injection.** Request fixtures by name in test parameters. Every dependency
  is visible in the test signature.
- **Smallest viable scope.** Default is `function` scope (fresh per test). Use broader
  scopes (`class`, `module`, `session`) only for expensive resources.
- **`autouse=True` sparingly.** Only for setup that genuinely applies to every test in
  scope (e.g., database transaction rollback, temp directory cleanup).

### Yield Fixtures (Setup + Teardown)

```python
@pytest.fixture
def db_connection():
    conn = create_connection()
    yield conn
    conn.close()

@pytest.fixture
def temp_config(tmp_path: Path):
    config_file = tmp_path / "config.toml"
    config_file.write_text('[app]\ndebug = true\n')
    yield config_file
    # cleanup automatic — tmp_path handles it
```

- **`yield`** separates setup from teardown. Code after `yield` runs even if the test fails.
- **Prefer `yield`** over `addfinalizer` — clearer control flow.
- **Teardown must not raise.** If cleanup can fail, wrap in `try`/`except` and log.

### Fixture Factories

When tests need multiple instances with varying configuration:

```python
@pytest.fixture
def make_user():
    def _make_user(name: str = "Alice", *, active: bool = True) -> User:
        return User(name=name, is_active=active)
    return _make_user

def test_inactive_users_excluded(make_user):
    active = make_user("Alice", active=True)
    inactive = make_user("Bob", active=False)
    assert filter_active([active, inactive]) == [active]
```

### Fixture Scope

| Scope | Lifetime | Use For |
|-------|----------|---------|
| `function` | Each test (default) | Most fixtures — cheap setup, isolation |
| `class` | All tests in a class | Shared expensive setup within a test class |
| `module` | All tests in a file | Database connection per test file |
| `session` | Entire test run | Server startup, heavy resource initialization |

- **Session-scoped fixtures** must be in `conftest.py` at the root test directory.
- **Don't mix scopes carelessly.** A function-scoped fixture cannot depend on a
  function-scoped fixture that modifies state from a broader scope.

### Built-in Fixtures

| Fixture | Purpose |
|---------|---------|
| `tmp_path` | `Path` to a temporary directory unique to the test (function scope) |
| `tmp_path_factory` | Factory for creating temp directories (session scope) |
| `capsys` | Capture `sys.stdout`/`sys.stderr` writes |
| `capfd` | Capture file descriptor 1/2 output (catches C-level writes) |
| `caplog` | Capture `logging` output with access to records |
| `monkeypatch` | Dynamic attribute/env/dict patching with automatic restore |
| `request` | Fixture metadata: `.param`, `.node`, `.config`, `.fspath` |
| `pytestconfig` | Access to the pytest config object |

See [fixtures.md](references/fixtures.md) for fixture lifecycle details, parametrized
fixtures, and advanced patterns.

## Parametrize

### Basic Usage

```python
@pytest.mark.parametrize("input_val, expected", [
    ("hello", 5),
    ("", 0),
    ("  spaces  ", 10),
])
def test_string_length(input_val: str, expected: int):
    assert len(input_val) == expected
```

- **Use descriptive IDs:** `pytest.param("", 0, id="empty-string")` for readable output.
- **Each row is a distinct test.** Failures report which parameter combination failed.

### Stacking Decorators

```python
@pytest.mark.parametrize("x", [1, 2])
@pytest.mark.parametrize("y", [10, 20])
def test_combinations(x: int, y: int):
    assert x + y > 0
# Generates: (1,10), (1,20), (2,10), (2,20)
```

### Indirect Parametrize

Pass parameter values to fixtures instead of directly to the test:

```python
@pytest.fixture
def user(request) -> User:
    return User(name=request.param)

@pytest.mark.parametrize("user", ["Alice", "Bob"], indirect=True)
def test_user_greeting(user: User):
    assert user.name in user.greet()
```

See [parametrize.md](references/parametrize.md) for multi-parameter patterns, conditional
skipping within parametrize, and dynamic parametrize generation.

## Markers

### Built-in Markers

- **`@pytest.mark.skip(reason="...")`** — unconditionally skip.
- **`@pytest.mark.skipif(condition, reason="...")`** — skip when condition is true:
  `@pytest.mark.skipif(sys.platform == "win32", reason="Unix only")`.
- **`@pytest.mark.xfail(reason="...")`** — expected failure. Passes if the test fails,
  reports unexpected pass if it succeeds. Use `strict=True` to fail on unexpected pass.
- **`@pytest.mark.usefixtures("fixture_name")`** — inject fixture without using its value.
- **`@pytest.mark.filterwarnings("ignore::DeprecationWarning")`** — per-test warning filter.

### Custom Markers

Register in `pyproject.toml` to avoid warnings:

```toml
[tool.pytest.ini_options]
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks integration tests",
]
```

```python
@pytest.mark.slow
def test_full_pipeline():
    ...
```

Run subsets: `pytest -m "not slow"`, `pytest -m "integration and not slow"`.

## Mocking

### monkeypatch (Preferred for Simple Cases)

```python
def test_reads_env_variable(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-key")
    assert get_api_key() == "test-key"

def test_overrides_attribute(monkeypatch):
    monkeypatch.setattr("myapp.config.DEBUG", True)
    assert is_debug_mode() is True
```

- **`monkeypatch`** auto-restores on test exit. No manual cleanup.
- **Use for:** environment variables, module attributes, dictionary entries, `sys.path`.

### unittest.mock (For Complex Mocking)

```python
from unittest.mock import MagicMock, patch, AsyncMock

def test_service_calls_repository():
    repo = MagicMock(spec=UserRepository)
    repo.get.return_value = User(name="Alice")
    service = UserService(repo=repo)

    result = service.find_user("alice")

    repo.get.assert_called_once_with("alice")
    assert result.name == "Alice"

@patch("myapp.services.httpx.get")
def test_fetches_external_data(mock_get):
    mock_get.return_value = MagicMock(json=lambda: {"status": "ok"})
    assert fetch_status() == "ok"
```

- **Always use `spec=`** on MagicMock — catches attribute typos at test time.
- **`AsyncMock`** for async functions. Auto-detected when patching async targets.
- **`patch` target is where the name is looked up**, not where it's defined:
  `@patch("myapp.services.httpx.get")` not `@patch("httpx.get")`.

### pytest-mock (mocker Fixture)

```python
def test_with_mocker(mocker):
    mock_fetch = mocker.patch("myapp.services.fetch_data")
    mock_fetch.return_value = {"key": "value"}
    result = process_data()
    mock_fetch.assert_called_once()
```

- **`mocker` auto-restores** after each test. Prefer over manual `patch` context managers.
- **`mocker.patch("module.Class", autospec=True)`** — recursively specs all attributes
  and method signatures from the real object. Catches signature mismatches at test time.
- **`mocker.spy(obj, "method")`** wraps the real method — tracks calls while preserving
  behavior.

### Mocking Rules

- **Mock at boundaries.** Mock external services, databases, filesystems, clocks — not
  internal functions.
- **Don't mock what you own** when a fake or in-memory implementation is available.
- **Prefer dependency injection** over patching. Pass collaborators as parameters, mock
  in tests.
- **Never mock the thing you're testing.** If you need to mock part of the SUT, the SUT
  has too many responsibilities — split it.

## Assertions

### Plain Assert

pytest rewrites `assert` statements to show detailed failure messages:

```python
assert result == expected          # shows both values on failure
assert "error" in message          # shows the full string
assert len(items) == 3             # shows actual length
assert all(x > 0 for x in values) # shows the values
```

- **No assertion library needed.** Plain `assert` with pytest's rewrite engine gives
  clear failure messages.
- **Multiple assertions per test are fine** when they verify the same behavior.

### Exception Testing

```python
def test_raises_on_invalid_input():
    with pytest.raises(ValueError, match=r"must be positive"):
        calculate(-1)

def test_exception_attributes():
    with pytest.raises(ValidationError) as exc_info:
        validate(bad_data)
    assert exc_info.value.field == "email"
    assert "invalid format" in str(exc_info.value)
```

- **Always use `match=`** when the exception type is broad — validates the message.
- **Access `.value`** for exception attributes via `exc_info`.
- **`pytest.raises` is a context manager.** The code that raises must be inside the `with`.

### Approximate Comparisons

```python
assert result == pytest.approx(3.14, abs=0.01)
assert results == pytest.approx([1.0, 2.0, 3.0], rel=1e-3)
```

### Warning Testing

```python
def test_deprecation_warning():
    with pytest.warns(DeprecationWarning, match="use new_func"):
        old_func()
```

## Async Testing

With `pytest-asyncio`:

```python
import pytest

@pytest.mark.asyncio
async def test_async_fetch():
    result = await fetch_data("https://api.example.com")
    assert result.status == 200

@pytest.fixture
async def async_client():
    async with AsyncClient() as client:
        yield client

@pytest.mark.asyncio
async def test_with_async_client(async_client):
    response = await async_client.get("/health")
    assert response.status_code == 200
```

- **`@pytest.mark.asyncio`** on every async test (or configure `asyncio_mode = "auto"`
  in `pyproject.toml`).
- **Async fixtures** work with `yield` for teardown — same pattern as sync fixtures.

## conftest.py Patterns

### Hierarchy

```
tests/
├── conftest.py              # session/root fixtures
├── unit/
│   ├── conftest.py          # unit test fixtures
│   └── test_models.py
└── integration/
    ├── conftest.py          # integration fixtures (DB, services)
    └── test_api.py
```

- **Fixtures cascade downward.** A fixture in `tests/conftest.py` is available to all
  tests. A fixture in `tests/unit/conftest.py` is available only to unit tests.
- **Don't import from conftest.** pytest discovers and injects conftest fixtures
  automatically.
- **Split by concern.** Root conftest for shared utilities (factories, settings). Subdirectory
  conftest for environment-specific setup (database, external services).

## Output Capture

```python
def test_prints_greeting(capsys):
    greet("Alice")
    captured = capsys.readouterr()
    assert "Hello, Alice" in captured.out

def test_logs_warning(caplog):
    with caplog.at_level(logging.WARNING):
        process_legacy_data()
    assert "deprecated" in caplog.text
    assert caplog.records[0].levelname == "WARNING"
```

## Configuration

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-ra -q --strict-markers"
markers = [
    "slow: slow tests",
    "integration: integration tests",
]
filterwarnings = [
    "error",                        # treat all warnings as errors
    "ignore::DeprecationWarning",   # except deprecations from deps
]
asyncio_mode = "auto"              # pytest-asyncio: auto-detect async tests
```

- **`--strict-markers`** — fail on unregistered markers. Catches typos.
- **`-ra`** — show summary of all non-passing tests at the end.
- **`filterwarnings = ["error"]`** — catch hidden warnings early.

## Plugin Ecosystem

| Plugin | Purpose |
|--------|---------|
| `pytest-asyncio` | Async test support with `@pytest.mark.asyncio` |
| `pytest-mock` | `mocker` fixture wrapping `unittest.mock` |
| `pytest-cov` | Coverage reporting (`--cov=src`) |
| `pytest-xdist` | Parallel test execution (`-n auto`) |
| `pytest-httpx` | Mock `httpx` requests in tests |
| `pytest-randomly` | Randomize test order to catch hidden dependencies |

See [plugins.md](references/plugins.md) for configuration patterns and usage details.

## Application

When **writing** tests: apply all conventions silently — don't narrate each rule being
followed. Match the project's existing test style. If an existing codebase contradicts a
convention, follow the codebase and flag the divergence once.

When **reviewing** tests: cite the specific issue and show the fix inline. Don't lecture —
state what's wrong and how to fix it.

```
Bad:  "According to pytest best practices, you should use fixtures
       instead of setUp methods..."
Good: "setUp/tearDown -> @pytest.fixture with yield"
```

## Integration

The **python** skill governs language choices; this skill governs pytest testing decisions.
The **coding** skill governs workflow (discovery, planning, verification).

**Test behavior, not implementation. When in doubt, mock less.**
