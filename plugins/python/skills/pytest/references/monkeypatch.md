# Monkeypatch Patterns

Extended patterns for pytest's `monkeypatch` fixture, distilled from official pytest
documentation. Covers attribute patching, environment variables, dictionary mutation, and
scoped patches.

## API Overview

All modifications are automatically undone after the test (or fixture) completes.

| Method | Purpose |
|--------|---------|
| `monkeypatch.setattr(obj, name, value)` | Replace attribute on object or module |
| `monkeypatch.delattr(obj, name)` | Remove attribute |
| `monkeypatch.setitem(mapping, name, value)` | Set dictionary key |
| `monkeypatch.delitem(mapping, name)` | Remove dictionary key |
| `monkeypatch.setenv(name, value)` | Set environment variable |
| `monkeypatch.delenv(name)` | Remove environment variable |
| `monkeypatch.syspath_prepend(path)` | Prepend to `sys.path` |
| `monkeypatch.chdir(path)` | Change working directory |
| `monkeypatch.context()` | Context manager for scoped patches |

The `raising` parameter (default `True`) controls whether `KeyError`/`AttributeError`
is raised when the target doesn't exist. Pass `raising=False` to silently skip.

## Patching Functions

```python
from pathlib import Path

def test_getssh(monkeypatch):
    monkeypatch.setattr(Path, "home", lambda: Path("/abc"))
    assert getssh() == Path("/abc/.ssh")
```

`setattr` must be called **before** the function under test is invoked.

### String Target Syntax

`setattr` accepts a dotted string path instead of `(obj, name)`:

```python
def test_override(monkeypatch):
    monkeypatch.setattr("myapp.config.DEBUG", True)
    assert is_debug_mode() is True
```

## Patching Returned Objects (Mock Classes)

When a function returns a complex object (e.g., HTTP response), create a mock class:

```python
import requests
import app

class MockResponse:
    status_code = 200

    @staticmethod
    def json():
        return {"mock_key": "mock_value"}

def test_get_json(monkeypatch):
    def mock_get(*args, **kwargs):
        return MockResponse()

    monkeypatch.setattr(requests, "get", mock_get)
    result = app.get_json("https://example.com")
    assert result["mock_key"] == "mock_value"
```

### Extracting to a Fixture

```python
@pytest.fixture
def mock_response(monkeypatch):
    """Patch requests.get to return a mock response."""
    def mock_get(*args, **kwargs):
        return MockResponse()
    monkeypatch.setattr(requests, "get", mock_get)

def test_api_call(mock_response):
    result = app.get_json("https://example.com")
    assert result["mock_key"] == "mock_value"
```

## Environment Variables

```python
def test_env_set(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-key-123")
    assert os.getenv("API_KEY") == "test-key-123"

def test_env_missing(monkeypatch):
    monkeypatch.delenv("API_KEY", raising=False)
    with pytest.raises(OSError):
        get_api_key()  # expects API_KEY to exist
```

### PATH Modification

```python
def test_custom_path(monkeypatch):
    monkeypatch.setenv("PATH", "/custom/bin", prepend=os.pathsep)
    # PATH is now "/custom/bin:<original PATH>"
```

### Env Fixtures

```python
@pytest.fixture
def mock_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///test.db")
    monkeypatch.setenv("SECRET_KEY", "test-secret")

def test_config(mock_env):
    config = load_config()
    assert config.database_url == "sqlite:///test.db"
```

## Dictionary Patching

```python
# app.py
DEFAULT_CONFIG = {"user": "admin", "database": "prod_db"}

# test_app.py
def test_custom_config(monkeypatch):
    monkeypatch.setitem(app.DEFAULT_CONFIG, "user", "test_user")
    monkeypatch.setitem(app.DEFAULT_CONFIG, "database", "test_db")
    result = app.create_connection_string()
    assert "test_user" in result

def test_missing_key(monkeypatch):
    monkeypatch.delitem(app.DEFAULT_CONFIG, "user", raising=False)
    with pytest.raises(KeyError):
        app.create_connection_string()
```

## Scoped Patches with context()

`monkeypatch.context()` limits patches to a specific block — useful when patching stdlib
or third-party code that pytest itself uses:

```python
import functools

def test_partial(monkeypatch):
    with monkeypatch.context() as m:
        m.setattr(functools, "partial", lambda *a, **kw: None)
        assert functools.partial is not None
    # functools.partial is restored here, even within the same test
```

### When to Use context()

- Patching stdlib functions (`os`, `sys`, `functools`) that pytest depends on
- Patching third-party libraries used by pytest plugins
- When you need different patches for different phases within a single test

## Global Patches (autouse)

Prevent network access across all tests:

```python
# conftest.py
@pytest.fixture(autouse=True)
def no_requests(monkeypatch):
    """Block all HTTP requests in tests."""
    monkeypatch.delattr("requests.sessions.Session.request")
```

Any test that tries to make an HTTP request will get `AttributeError` instead of a
network call.

## Stdlib Patching Warnings

Patching builtins (`open`, `compile`, etc.) can break pytest internals. If unavoidable:

- Use `monkeypatch.context()` to limit the patch scope
- Pass `--tb=native --assert=plain --capture=no` to pytest to reduce pytest's own
  use of patched functions
- Prefer `mocker.patch` (pytest-mock) for complex patching — it integrates better with
  pytest's assertion rewriting

## monkeypatch vs mocker.patch

| Aspect | `monkeypatch` | `mocker.patch` |
|--------|---------------|----------------|
| **Source** | Built-in pytest fixture | pytest-mock plugin |
| **Best for** | Env vars, simple attrs, dicts | Complex mocking with assertions |
| **Auto-restore** | Yes | Yes |
| **Call tracking** | No | Yes (`assert_called_once_with`, etc.) |
| **Spec enforcement** | No | Yes (`spec=Type`) |
| **Async support** | No native async mock | `AsyncMock` |

Use `monkeypatch` for simple value replacement. Use `mocker.patch` when you need call
tracking, return value configuration, or spec enforcement.
