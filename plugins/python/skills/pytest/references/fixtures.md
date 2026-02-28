# Fixture Patterns

Extended patterns and lifecycle details for pytest fixtures, distilled from official
pytest documentation.

## Fixture Lifecycle

Fixtures execute in dependency order. When test `test_foo(db, user)` runs:

1. pytest resolves the fixture dependency graph
2. Broadest-scope fixtures initialize first (session > package > module > class > function)
3. Within the same scope, fixtures initialize in dependency order
4. After the test completes, teardown runs in reverse order

Fixtures are cached within their scope. If two tests in the same module both request a
module-scoped fixture, the fixture executes once and both tests receive the same instance.
Parametrized fixtures are the exception — pytest caches only one instance at a time and
may invoke a fixture more than once in a given scope.

## Yield Fixtures (Recommended)

```python
@pytest.fixture
def managed_resource():
    # SETUP — runs before test
    resource = acquire_resource()
    yield resource
    # TEARDOWN — runs after test, even on failure
    resource.release()
```

Teardown code after `yield` runs unconditionally — even when the test fails or raises
an exception. This makes yield fixtures more reliable than try/finally in test bodies.

### Teardown Order

Teardown runs in reverse fixture initialization order. For a test requesting
`(fix_a, fix_b)`, `fix_b` tears down first:

```python
@pytest.fixture
def fix_a():
    yield
    print("teardown_a")  # runs second

@pytest.fixture
def fix_b():
    yield
    print("teardown_b")  # runs first
```

### Error Handling in Yield Fixtures

- If a yield fixture raises **before** `yield`, its teardown code does not run, but all
  previously-initialized fixtures still tear down normally.
- If teardown itself can raise, wrap it to avoid masking the original test failure:

```python
@pytest.fixture
def db_session():
    session = create_session()
    yield session
    try:
        session.rollback()
        session.close()
    except Exception:
        logging.warning("Session cleanup failed", exc_info=True)
```

### Safe Fixture Structure

Each fixture should perform **one state-changing action** with its corresponding teardown.
Avoid monolithic fixtures that create multiple resources and try to clean them all up:

```python
# BAD — if create_user raises, browser never closes
@pytest.fixture
def setup():
    browser = launch_browser()
    user = create_user()
    yield browser, user
    delete_user(user)
    browser.quit()

# GOOD — independent fixtures, independent teardown
@pytest.fixture
def browser():
    b = launch_browser()
    yield b
    b.quit()

@pytest.fixture
def user(admin_client):
    u = admin_client.create_user()
    yield u
    admin_client.delete_user(u)
```

If `user` raises during setup, `browser` still tears down correctly because each fixture
manages its own lifecycle independently.

## addfinalizer (Alternative to Yield)

`request.addfinalizer` registers teardown callbacks that run in LIFO order. Unlike yield,
finalizers execute even if the fixture raises after registration — useful when setup has
multiple steps that each need independent cleanup:

```python
@pytest.fixture
def complex_resource(request):
    db = start_database()
    request.addfinalizer(db.shutdown)  # runs even if next line raises

    schema = db.create_schema()
    request.addfinalizer(schema.drop)  # registered second, runs first

    return db
```

**Prefer `yield`** for straightforward setup/teardown. Use `addfinalizer` only when you
need multiple independent cleanup steps where later steps might fail during setup.

## Fixture Factories

Use factories when tests need multiple instances with different configurations:

```python
@pytest.fixture
def make_order():
    created = []

    def _make_order(
        *,
        product: str = "Widget",
        quantity: int = 1,
        status: str = "pending",
    ) -> Order:
        order = Order(product=product, quantity=quantity, status=status)
        created.append(order)
        return order

    yield _make_order

    # Cleanup all created orders
    for order in created:
        order.cancel()
```

**When to use factories vs direct fixtures:**
- **Direct fixture** — test needs exactly one instance with standard config
- **Factory** — test needs multiple instances or custom configuration per test

## Parametrized Fixtures

```python
@pytest.fixture(params=["sqlite", "postgres"])
def db_backend(request):
    if request.param == "sqlite":
        db = create_sqlite()
    else:
        db = create_postgres()
    yield db
    db.teardown()
```

Every test using `db_backend` runs twice — once per parameter value. This is powerful for
testing the same behavior against multiple backends.

### IDs for Parametrized Fixtures

```python
@pytest.fixture(params=[
    pytest.param("sqlite", id="sqlite"),
    pytest.param("postgres", id="pg"),
    pytest.param("mysql", id="mysql"),
])
def db_backend(request):
    ...
```

IDs can also be a callable that receives the param value and returns a string (or `None`
to fall back to auto-generated ID):

```python
@pytest.fixture(params=[0, 1, 2], ids=lambda val: f"level-{val}")
def severity(request):
    return request.param
```

### Marks on Parametrized Fixtures

```python
@pytest.fixture(params=[
    pytest.param(0),
    pytest.param(1),
    pytest.param(2, marks=pytest.mark.skip),
])
def data_set(request):
    return request.param
```

### Automatic Test Grouping

pytest minimizes active fixture instances. With parametrized fixtures, all tests run with
the first parameter value, then finalizers execute before the next value is created. This
keeps resource usage predictable and avoids interleaving.

## Dynamic Scope

Set fixture scope at runtime based on configuration:

```python
def determine_scope(fixture_name, config):
    if config.getoption("--keep-containers", None):
        return "session"
    return "function"

@pytest.fixture(scope=determine_scope)
def docker_container():
    yield spawn_container()
```

The callable receives `fixture_name` (str) and `config` (pytest config object), executes
once during fixture definition, and must return a valid scope string.

## Request Object

The `request` fixture provides test metadata and introspection:

```python
@pytest.fixture
def resource(request):
    # request.param — parametrize value (if parametrized)
    # request.node — the test item (access markers, name, etc.)
    # request.node.name — test function name
    # request.node.get_closest_marker("name") — access custom markers
    # request.config — pytest config object
    # request.fspath — test file path
    # request.fixturename — name of this fixture
    # request.module — test module object
    # request.cls — test class (or None)
    ...
```

### Passing Data via Markers

```python
@pytest.fixture
def resource(request):
    marker = request.node.get_closest_marker("resource_config")
    config = marker.args[0] if marker else {}
    return create_resource(**config)

@pytest.mark.resource_config({"timeout": 30})
def test_slow_resource(resource):
    ...
```

## Scope Interactions

```python
@pytest.fixture(scope="session")
def database():
    """Expensive — created once for entire test run."""
    db = start_database()
    yield db
    db.shutdown()

@pytest.fixture(scope="function")
def clean_db(database):
    """Function-scoped — uses session-scoped database."""
    database.reset()
    yield database
```

**Rules:**
- A fixture can depend on same-scope or broader-scope fixtures
- A fixture CANNOT depend on narrower-scope fixtures (session cannot use function-scoped)
- pytest raises `ScopeMismatch` if this rule is violated

## conftest.py Fixture Discovery

```
tests/
├── conftest.py          # fixtures available to ALL tests
├── api/
│   ├── conftest.py      # fixtures for api tests only
│   └── test_endpoints.py
└── unit/
    ├── conftest.py      # fixtures for unit tests only
    └── test_models.py
```

- pytest collects `conftest.py` files from the rootdir down to the test file's directory
- Fixtures in closer conftest files override those in parent directories
- Never import from conftest — pytest handles injection automatically
- Session-scoped fixtures should live in the root `conftest.py`

## Autouse Fixtures

```python
@pytest.fixture(autouse=True)
def reset_state():
    """Runs for every test in scope without explicit request."""
    yield
    global_state.reset()
```

- Autouse fixtures execute for every test within their scope without being requested
- Useful for environment reset, transaction rollback, or test isolation
- Autouse fixtures in `conftest.py` apply to all tests in that directory and below
- Autouse fixtures in a test class apply only to that class's tests
- Use sparingly — implicit dependencies make tests harder to understand

## Fixture Composition

Build complex fixtures from simple ones:

```python
@pytest.fixture
def auth_token() -> str:
    return create_token(user_id="test-user", expires_in=3600)

@pytest.fixture
def authenticated_client(async_client, auth_token):
    async_client.headers["Authorization"] = f"Bearer {auth_token}"
    return async_client
```

Each fixture is independently testable and reusable. Prefer composition over monolithic
fixtures that set up everything at once.
