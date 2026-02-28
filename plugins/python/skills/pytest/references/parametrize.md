# Parametrize Patterns

Extended examples and edge cases for `@pytest.mark.parametrize`, distilled from official
pytest documentation.

## Basic Parametrize

```python
@pytest.mark.parametrize("input_str, expected_len", [
    ("hello", 5),
    ("", 0),
    ("  ", 2),
])
def test_string_length(input_str: str, expected_len: int):
    assert len(input_str) == expected_len
```

## Named Parameters with pytest.param

```python
@pytest.mark.parametrize("data, expected", [
    pytest.param({"name": "Alice"}, True, id="valid-user"),
    pytest.param({}, False, id="empty-dict"),
    pytest.param({"name": ""}, False, id="blank-name"),
])
def test_is_valid_user(data: dict, expected: bool):
    assert is_valid(data) is expected
```

IDs appear in test output: `test_is_valid_user[valid-user]`, `test_is_valid_user[empty-dict]`.

### HIDDEN_PARAM (pytest 8.4+)

Hide a parameter set from the test name when it adds noise:

```python
@pytest.mark.parametrize("db", [
    pytest.param(create_db(), id=pytest.HIDDEN_PARAM),
])
def test_query(db):
    ...
```

Can only be used on at most one parameter set per test (test names must remain unique).

## Multi-Parameter Combinations (Stacking)

```python
@pytest.mark.parametrize("method", ["GET", "POST", "PUT"])
@pytest.mark.parametrize("auth", [True, False])
def test_endpoint_access(method: str, auth: bool):
    # Runs 6 times: all combinations of method x auth
    ...
```

Parameters exhaust in the order of decorators — the **last** decorator's values vary
fastest. For the above: `(GET, True)`, `(POST, True)`, `(PUT, True)`, `(GET, False)`, ...

## Conditional Skip Within Parametrize

```python
@pytest.mark.parametrize("backend", [
    pytest.param("postgres", marks=pytest.mark.skipif(
        not HAS_POSTGRES, reason="postgres not available"
    )),
    pytest.param("sqlite"),
])
def test_query_execution(backend: str):
    ...
```

## Expected Failures in Parametrize

```python
@pytest.mark.parametrize("x, y, expected", [
    (2, 3, 5),
    (0, 0, 0),
    pytest.param(-1, 1, 0, marks=pytest.mark.xfail(reason="known bug #123")),
])
def test_addition(x: int, y: int, expected: int):
    assert add(x, y) == expected
```

## Indirect Parametrize

Pass values to fixtures instead of directly to the test:

```python
@pytest.fixture
def database(request):
    db_type = request.param
    db = create_database(db_type)
    yield db
    db.close()

@pytest.mark.parametrize("database", ["sqlite", "postgres"], indirect=True)
def test_insert_and_query(database):
    database.insert({"key": "value"})
    assert database.query("key") == "value"
```

With `indirect=True`, the parameter value arrives as `request.param` in the fixture.

### Partial Indirect

Only specific parameters routed to fixtures:

```python
@pytest.mark.parametrize(
    "database, query, expected",
    [
        ("sqlite", "SELECT 1", [(1,)]),
        ("postgres", "SELECT 1", [(1,)]),
    ],
    indirect=["database"],  # only 'database' is a fixture
)
def test_raw_query(database, query: str, expected: list):
    assert database.execute(query) == expected
```

## Dynamic Parametrize with pytest_generate_tests

For parametrization driven by CLI options, config, or runtime data:

```python
# conftest.py
def pytest_addoption(parser):
    parser.addoption(
        "--backend",
        action="append",
        default=[],
        help="database backends to test against",
    )

def pytest_generate_tests(metafunc):
    if "backend" in metafunc.fixturenames:
        backends = metafunc.config.getoption("backend") or ["sqlite"]
        metafunc.parametrize("backend", backends)
```

```bash
pytest --backend=sqlite --backend=postgres
```

**Key rules:**
- `metafunc.parametrize()` has the same interface as `@pytest.mark.parametrize`
- Cannot call `metafunc.parametrize()` multiple times with overlapping parameter names
- If the parameter list is empty, the test is skipped (controlled by
  `empty_parameter_set_mark` config option — default is `skip`)

## Module-Level Parametrize

Apply parametrize to all tests in a module via `pytestmark`:

```python
import pytest

pytestmark = pytest.mark.parametrize("n, expected", [(1, 2), (3, 4)])

def test_increment(n: int, expected: int):
    assert n + 1 == expected

def test_double_increment(n: int, expected: int):
    assert n + 2 == expected + 1
```

## Class-Level Parametrize

```python
@pytest.mark.parametrize("n, expected", [(1, 2), (3, 4)])
class TestArithmetic:
    def test_increment(self, n: int, expected: int):
        assert n + 1 == expected

    def test_double_increment(self, n: int, expected: int):
        assert n + 2 == expected + 1
```

Every method in the class runs with each parameter set.

## Complex Object Parameters

For readability with complex parameters, define data outside the decorator:

```python
VALID_CONFIGS = [
    pytest.param(
        Config(host="localhost", port=8080, debug=True),
        id="dev-config",
    ),
    pytest.param(
        Config(host="0.0.0.0", port=443, debug=False),
        id="prod-config",
    ),
]

@pytest.mark.parametrize("config", VALID_CONFIGS)
def test_config_validation(config: Config):
    assert config.validate() is True
```

## Parameter Mutation Warning

Parameter values are passed **as-is** to tests — no copy is made. If a test mutates a
list or dict parameter, subsequent tests in the same parametrize set see the mutation:

```python
# BUG — second test sees mutated list
@pytest.mark.parametrize("items", [[1, 2, 3]])
def test_append(items):
    items.append(4)
    assert len(items) == 4

# FIX — copy in the test or use a fixture factory
@pytest.mark.parametrize("items", [[1, 2, 3]])
def test_append_safe(items):
    local = items.copy()
    local.append(4)
    assert len(local) == 4
```

## Empty Parameter Sets

When a parametrize decorator receives an empty list (e.g., from dynamic generation), the
behavior is controlled by the `empty_parameter_set_mark` config option:

```toml
[tool.pytest.ini_options]
empty_parameter_set_mark = "skip"  # default: skip the test
# Other options: "xfail", "fail_at_collect"
```
