---
name: phpunit
description: >-
  PHPUnit testing framework conventions and practices. Invoke whenever task involves any
  interaction with PHPUnit — writing tests, configuring PHPUnit, data providers, mocking,
  assertions, debugging test failures, or coverage.
---

# PHPUnit

**Test behavior, not implementation. Tests are executable documentation — if the test name doesn't explain what the code
does, rewrite it.**

PHPUnit is PHP's standard testing framework. It uses test case classes extending `TestCase`, `setUp()`/`tearDown()` for
fixtures, and a rich assertion API. All patterns target PHPUnit 11+ on PHP 8.5+. Use PHP 8 attributes exclusively —
annotations are deprecated in 11, removed in 12.

## References

| Topic                                                  | Reference                                            | Contents                                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Assertion catalog, constraints, exception expectations | [`${CLAUDE_SKILL_DIR}/references/assertions.md`]     | Full assertion API grouped by category, constraint system, custom assertions                    |
| Test doubles — stubs, mocks, MockBuilder               | [`${CLAUDE_SKILL_DIR}/references/mocking.md`]        | createStub vs createMock, return config, invocation matchers, argument constraints, MockBuilder |
| Data providers — static, named, generators             | [`${CLAUDE_SKILL_DIR}/references/data-providers.md`] | #[DataProvider], #[TestWith], named datasets, generator providers, external providers           |
| phpunit.xml structure, test suites, source config      | [`${CLAUDE_SKILL_DIR}/references/configuration.md`]  | XML elements, strict settings, source element, coverage reports, execution order                |

## Test Structure

### Discovery and Naming

- **Files:** `*Test.php` in configured test directories. Mirror source structure: `src/Service/PaymentService.php` →
  `tests/Unit/Service/PaymentServiceTest.php`.
- **Classes:** `final class PaymentServiceTest extends TestCase`. Always `final`.
- **Methods:** `test` prefix or `#[Test]` attribute. Describe the behavior: `testReturnsEmptyCollectionWhenNoResults`
  not `testSearch`.
- **One test class per production class.** Split into Unit/Integration directories.

### Arrange-Act-Assert

Structure every test in three phases:

```php
public function testUserCreationSetsDefaults(): void
{
    // Arrange
    $data = ['name' => 'Alice', 'email' => 'alice@example.com'];

    // Act
    $user = User::fromArray($data);

    // Assert
    $this->assertSame('Alice', $user->getName());
    $this->assertTrue($user->isActive());
    $this->assertSame([], $user->getRoles());
}
```

- **One act per test.** If you need multiple acts, write multiple tests.
- **Comments optional** when phases are obvious. Add them when the test is long enough that phases aren't immediately
  clear.

### Test Granularity

- **One concept per test.** Multiple assertions are fine when they verify the same behavior. Separate tests when
  behaviors are independent.
- **Fast by default.** Unit tests should run in milliseconds. Gate slow tests behind groups: `#[Group('slow')]`.
- **Isolation is mandatory.** Tests must not depend on execution order or shared mutable state. Each test sets up its
  own world.

## Fixtures

### setUp() / tearDown()

- **`setUp()`** runs before each test method on a fresh instance. Create the SUT and its stubs here.
- **`tearDown()`** runs after each test. Only needed for external resources (files, sockets, DB connections). Not needed
  for plain object cleanup.
- **`setUpBeforeClass()` / `tearDownAfterClass()`** run once per class. Use for expensive shared resources (DB
  connections). Store in `static` properties.

```php
final class PaymentServiceTest extends TestCase
{
    private PaymentService $service;
    private Gateway&Stub $gateway;

    protected function setUp(): void
    {
        $this->gateway = $this->createStub(Gateway::class);
        $this->service = new PaymentService($this->gateway);
    }
}
```

### Fixture Lifecycle

| Method                   | Scope  | Runs                        |
| ------------------------ | ------ | --------------------------- |
| `setUpBeforeClass()`     | Class  | Once before first test      |
| `setUp()`                | Method | Before each test            |
| `assertPreConditions()`  | Method | After setUp, before test    |
| `assertPostConditions()` | Method | After test, before tearDown |
| `tearDown()`             | Method | After each test             |
| `tearDownAfterClass()`   | Class  | Once after last test        |

- **Call `parent::setUp()`** when extending abstract test cases — otherwise parent fixture setup is silently skipped.
- **Use `#[Before]` / `#[After]` attributes** when multiple setup methods are needed (avoids fragile `parent::setUp()`
  chains).

## Data Providers

### Basic Usage

```php
use PHPUnit\Framework\Attributes\DataProvider;

#[DataProvider('additionCases')]
public function testAdd(int $a, int $b, int $expected): void
{
    $this->assertSame($expected, $a + $b);
}

public static function additionCases(): array
{
    return [
        'zeros'        => [0, 0, 0],
        'positive sum' => [1, 2, 3],
        'negative'     => [-1, 1, 0],
    ];
}
```

- **Providers must be `public static`.** Non-static providers are removed in PHPUnit 11.
- **Always use named datasets** — string keys produce readable failure output.
- **Use `#[DataProvider]` attribute**, not `@dataProvider` annotation.

### Inline Data

For small, simple datasets — no provider method needed:

```php
use PHPUnit\Framework\Attributes\TestWith;

#[TestWith([0, 0, 0])]
#[TestWith([1, 2, 3])]
#[TestWith([-1, 1, 0])]
public function testAdd(int $a, int $b, int $expected): void
{
    $this->assertSame($expected, $a + $b);
}
```

### Generator Providers

For large or computed datasets:

```php
public static function boundaryCases(): Generator
{
    yield 'min int' => [PHP_INT_MIN, 0, PHP_INT_MIN];
    yield 'max int' => [PHP_INT_MAX, 0, PHP_INT_MAX];
}
```

### Provider Rules

- **Data must be scalar or immutable** — no service objects or complex graphs in providers.
- **No mock objects in providers** — framework isn't initialized during provider execution.
- **Empty providers are forbidden** in PHPUnit 11 — throws `InvalidDataProviderException`.
- **Multiple providers** can be stacked on one test method — datasets are combined.

See `${CLAUDE_SKILL_DIR}/references/data-providers.md` for external providers, TestDox integration, and edge cases.

## Assertions

### Core Assertions

```php
$this->assertSame($expected, $actual);        // Strict === (preferred)
$this->assertEquals($expected, $actual);       // Loose == (use sparingly)
$this->assertTrue($condition);
$this->assertFalse($condition);
$this->assertNull($value);
$this->assertInstanceOf(Expected::class, $obj);
$this->assertCount(3, $collection);
$this->assertEmpty($collection);
$this->assertArrayHasKey('key', $array);
$this->assertContains($needle, $haystack);     // Strict comparison
```

- **Prefer `assertSame()` over `assertEquals()`** — strict type comparison catches more bugs.
- **Multiple assertions per test are fine** when they verify the same behavior.

### String Assertions

```php
$this->assertStringStartsWith('Error:', $message);
$this->assertStringEndsWith('.php', $filename);
$this->assertStringContainsString('needle', $haystack);
$this->assertMatchesRegularExpression('/^\d{4}-\d{2}$/', $date);
```

### Float Comparison

```php
$this->assertEqualsWithDelta(3.14, $result, 0.01);
```

### Exception Testing

```php
public function testThrowsOnInvalidInput(): void
{
    $this->expectException(InvalidArgumentException::class);
    $this->expectExceptionMessage('must be positive');

    $calculator->divide(1, 0);
}
```

- **Call `expectException()` before the throwing code** — it sets up the expectation.
- **Use `expectExceptionMessage()`** when the exception type is broad — validates the message contains the substring.
- **Use `expectExceptionMessageMatches()`** for regex matching.

### Deprecation / Error Expectations

```php
public function testTriggersDeprecation(): void
{
    $this->expectUserDeprecationMessage('use newMethod() instead');

    $service->oldMethod();
}
```

See `${CLAUDE_SKILL_DIR}/references/assertions.md` for the full assertion catalog, constraint system, and format string
assertions.

## Mocking

### Stubs vs Mocks

- **Stub** (`createStub()`) — controls return values. No call verification.
- **Mock** (`createMock()`) — verifies interactions (method called, arguments matched).

**Use stubs by default. Use mocks only when verifying that a side effect occurred.**

### Creating Stubs

```php
$repo = $this->createStub(UserRepository::class);
$repo->method('find')->willReturn(new User(name: 'Alice'));

$service = new UserService($repo);
$result = $service->getUser(1);

$this->assertSame('Alice', $result->name);
```

Shorthand for multiple methods:

```php
$repo = $this->createConfiguredStub(UserRepository::class, [
    'find'   => new User(name: 'Alice'),
    'exists' => true,
]);
```

### Creating Mocks

```php
$logger = $this->createMock(Logger::class);
$logger->expects($this->once())
    ->method('error')
    ->with($this->stringContains('payment failed'));

$service = new PaymentService($logger);
$service->process($invalidPayment);
```

### Return Value Configuration

```php
$stub->method('fetch')->willReturn('value');              // Fixed value
$stub->method('fetch')->willReturn('a', 'b', 'c');       // Consecutive values
$stub->method('fetch')->willReturnArgument(0);            // Return first arg
$stub->method('fetch')->willReturnSelf();                 // Fluent interface
$stub->method('fetch')->willReturnCallback(fn ($id) => "item-{$id}");
$stub->method('fetch')->willThrowException(new RuntimeException('fail'));
$stub->method('fetch')->willReturnMap([
    ['key1', 'value1'],
    ['key2', 'value2'],
]);
```

### Mocking Rules

- **Mock at boundaries.** Mock external services, databases, filesystems, clocks — not internal functions.
- **Don't mock what you own** when a fake or in-memory implementation is available.
- **Prefer dependency injection** over complex mock setup. Pass collaborators as constructor parameters, stub in tests.
- **Never mock the thing you're testing.** If you need to mock part of the SUT, the SUT has too many responsibilities —
  split it.
- **Favour interfaces over classes** for test doubles — fewer limitations, better design.
- **Do not call `expects()` on stubs** — deprecated in 11, error in 12.

See `${CLAUDE_SKILL_DIR}/references/mocking.md` for MockBuilder, intersection types, invocation matchers, and PHP 8.4
property hooks.

## Attributes

PHPUnit 11 uses PHP 8 attributes exclusively. All attributes are in the `PHPUnit\Framework\Attributes` namespace.

### Test Metadata

| Attribute                                         | Purpose                           |
| ------------------------------------------------- | --------------------------------- |
| `#[Test]`                                         | Mark non-`test*` method as a test |
| `#[DataProvider('method')]`                       | Connect a data provider           |
| `#[DataProviderExternal(Class::class, 'method')]` | External data provider            |
| `#[TestWith([args])]`                             | Inline data provider              |
| `#[TestDox('description')]`                       | Custom TestDox description        |
| `#[Depends('testMethod')]`                        | Declare test dependency           |
| `#[Group('name')]`                                | Assign to group                   |
| `#[Ticket('PROJ-123')]`                           | Link to issue tracker             |

### Skip / Conditional

| Attribute                                               | Purpose                           |
| ------------------------------------------------------- | --------------------------------- |
| `#[RequiresPhp('>= 8.4')]`                              | Skip if PHP version doesn't match |
| `#[RequiresPhpExtension('pdo_pgsql')]`                  | Skip if extension missing         |
| `#[RequiresOperatingSystemFamily('Linux')]`             | Skip on other OS                  |
| `#[RequiresFunction('sodium_crypto_sign')]`             | Skip if function missing          |
| `#[RequiresMethod(PDO::class, 'sqliteCreateFunction')]` | Skip if method missing            |

### Coverage

| Attribute                                     | Purpose                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `#[CoversClass(ClassName::class)]`            | Test covers this class                           |
| `#[CoversFunction('functionName')]`           | Test covers this function                        |
| `#[CoversMethod(ClassName::class, 'method')]` | Test covers this method                          |
| `#[CoversNothing]`                            | Test contributes no coverage (integration tests) |
| `#[UsesClass(ClassName::class)]`              | Allowed but not covered dependency               |
| `#[UsesFunction('functionName')]`             | Allowed but not covered function                 |

### Fixture

| Attribute                         | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `#[Before]`                       | Run method before each test (alternative to setUp)   |
| `#[After]`                        | Run method after each test (alternative to tearDown) |
| `#[BeforeClass]`                  | Run static method before first test                  |
| `#[AfterClass]`                   | Run static method after last test                    |
| `#[BackupGlobals(true)]`          | Backup/restore globals for this test                 |
| `#[BackupStaticProperties(true)]` | Backup/restore static properties                     |

### Test Behavior

| Attribute                             | Purpose                             |
| ------------------------------------- | ----------------------------------- |
| `#[DoesNotPerformAssertions]`         | Suppress risky test warning         |
| `#[RunInSeparateProcess]`             | Isolate in separate PHP process     |
| `#[RunTestsInSeparateProcesses]`      | All tests in class run isolated     |
| `#[Small]` / `#[Medium]` / `#[Large]` | Time limit enforcement (1s/10s/60s) |

## Test Organization

### Directory Structure

```
tests/
├── Unit/                     # Fast, isolated, no I/O
│   ├── Service/
│   │   └── PaymentServiceTest.php
│   └── Model/
│       └── UserTest.php
├── Integration/              # Real dependencies, slower
│   └── Repository/
│       └── UserRepositoryTest.php
└── bootstrap.php             # Autoloader for tests
```

- **Mirror source directory structure** under `tests/Unit/` and `tests/Integration/`.
- **Unit tests** — no database, no filesystem, no network. Mock all boundaries.
- **Integration tests** — real dependencies. Mark with `#[CoversNothing]` to avoid polluting coverage metrics.

### Test Suites

Define in `phpunit.xml` for selective execution:

```xml
<testsuites>
    <testsuite name="unit">
        <directory>tests/Unit</directory>
    </testsuite>
    <testsuite name="integration">
        <directory>tests/Integration</directory>
    </testsuite>
</testsuites>
```

Run subsets: `phpunit --testsuite unit`, `phpunit --group slow`.

## Configuration

### Recommended phpunit.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/11.5/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
         cacheDirectory=".phpunit.cache"
         executionOrder="depends,random"
         beStrictAboutTestsThatDoNotTestAnything="true"
         beStrictAboutOutputDuringTests="true"
         failOnWarning="true"
         failOnRisky="true"
         failOnDeprecation="true"
         failOnNotice="true">
    <testsuites>
        <testsuite name="unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="integration">
            <directory>tests/Integration</directory>
        </testsuite>
    </testsuites>
    <source restrictDeprecations="true"
            restrictNotices="true"
            restrictWarnings="true">
        <include>
            <directory suffix=".php">src</directory>
        </include>
    </source>
</phpunit>
```

### Key Configuration Choices

- **`executionOrder="depends,random"`** — randomize test order to catch hidden dependencies while respecting explicit
  `#[Depends]`.
- **`beStrictAboutTestsThatDoNotTestAnything="true"`** — flag tests without assertions as risky.
- **`failOnDeprecation="true"`** — catch deprecations from your code early.
- **`<source>` with `restrictDeprecations`** — only surface issues from your code, not vendor dependencies.
- **`cacheDirectory`** — add `.phpunit.cache` to `.gitignore`.

### Code Coverage

Requires PCOV or Xdebug extension:

```bash
phpunit --coverage-html build/coverage --coverage-clover build/clover.xml
```

Use `#[CoversClass]` and `#[UsesClass]` attributes to target coverage precisely. With
`beStrictAboutCoverageMetadata="true"`, tests without coverage attributes are risky.

See `${CLAUDE_SKILL_DIR}/references/configuration.md` for the full XML reference, coverage report types, and execution
order options.

## Application

When **writing** tests: apply all conventions silently — don't narrate each rule being followed. Match the project's
existing test style. If an existing codebase contradicts a convention, follow the codebase and flag the divergence once.

When **reviewing** tests: cite the specific issue and show the fix inline. Don't lecture — state what's wrong and how to
fix it.

```
Bad:  "According to PHPUnit best practices, you should use createStub
       instead of createMock when you don't need expectations..."
Good: "createMock → createStub (no expects() call, stub is sufficient)"
```

## Integration

The **php** skill governs language choices; this skill governs PHPUnit testing decisions. The **coding** skill governs
workflow (discovery, planning, verification).

**Test behavior, not implementation. When in doubt, mock less.**
