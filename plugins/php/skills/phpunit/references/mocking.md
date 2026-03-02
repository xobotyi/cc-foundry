# Test Doubles Reference

PHPUnit distinguishes **stubs** (control return values) from **mocks** (verify interactions).
Use `createStub()` for stubs. Use `createMock()` for mocks with expectations.

## Creation Methods

### `createStub(string $type): Stub`

Returns a stub for an interface or extendable class. All methods return auto-generated values
matching their return type. Configure return values with `willReturn()` etc.

**Do not call `expects()` on stubs** — triggers deprecation in PHPUnit 11, error in 12.

```php
$stub = $this->createStub(Repository::class);
$stub->method('find')->willReturn(new Entity(id: 1));
```

### `createConfiguredStub(string $type, array $config): Stub`

Convenience wrapper — configures multiple methods at once:

```php
$stub = $this->createConfiguredStub(Cache::class, [
    'get' => 'cached-value',
    'has' => true,
]);
```

### `createMock(string $type): MockObject`

Returns a mock object. Same defaults as `createStub()` but supports `expects()` for
invocation verification.

```php
$mock = $this->createMock(Logger::class);
$mock->expects($this->once())
    ->method('log')
    ->with('error', $this->stringContains('failed'));
```

### `createConfiguredMock(string $type, array $config): MockObject`

Like `createConfiguredStub()` but returns a mock that supports expectations.

### `createStubForIntersectionOfInterfaces(array $interfaces): Stub`

Creates a stub satisfying an intersection type `A&B`:

```php
$stub = $this->createStubForIntersectionOfInterfaces([Readable::class, Countable::class]);
```

### `createMockForIntersectionOfInterfaces(array $interfaces): MockObject`

Same as above but returns a mock with expectation support.

## Return Value Configuration

Chain after `->method('methodName')`:

| Method | Behavior |
|--------|----------|
| `willReturn($v1, $v2, ...)` | Returns values in sequence; last value repeats |
| `willReturnArgument(int $index)` | Returns the nth argument unchanged |
| `willReturnSelf()` | Returns the stub/mock itself (fluent interfaces) |
| `willReturnCallback(callable $cb)` | Delegates to callback |
| `willReturnMap(array $map)` | Maps `[arg1, arg2, ..., returnValue]` arrays |
| `willThrowException(Throwable $e)` | Throws exception |

### Consecutive returns

```php
$stub->method('fetch')->willReturn('first', 'second', 'third');
// Call 1 → 'first', Call 2 → 'second', Call 3+ → 'third'
```

## Invocation Matchers (Mocks Only)

Use with `$mock->expects($matcher)`:

| Matcher | Matches when |
|---------|-------------|
| `$this->any()` | Zero or more calls |
| `$this->never()` | Never called |
| `$this->once()` | Exactly one call |
| `$this->atLeastOnce()` | One or more calls |
| `$this->exactly(int $n)` | Exactly n calls |
| `$this->atMost(int $n)` | At most n calls |

## Argument Constraints

Chain `->with(...)` after `->method()`:

```php
$mock->expects($this->once())
    ->method('save')
    ->with(
        $this->isInstanceOf(User::class),
        $this->greaterThan(0),
    );
```

Any `PHPUnit\Framework\Constraint\Constraint` works as a `with()` argument. Use
`$this->callback(fn ($arg) => ...)` for custom matching.

**`withConsecutive()` was removed in PHPUnit 10.** For consecutive argument verification,
use `willReturnCallback()` with manual tracking or multiple `expects()` calls.

## MockBuilder (Advanced)

Use when `createStub()`/`createMock()` defaults don't suffice:

```php
$mock = $this->getMockBuilder(Service::class)
    ->onlyMethods(['process'])        // Only double these methods
    ->disableOriginalConstructor()     // Skip constructor
    ->getMock();
```

Key MockBuilder methods (non-deprecated in PHPUnit 11):
- `onlyMethods(array $methods)` — specify which methods to double
- `setConstructorArgs(array $args)` — pass constructor arguments
- `disableOriginalConstructor()` / `enableOriginalConstructor()`
- `disableOriginalClone()` / `enableOriginalClone()`
- `setMockClassName(string $name)` — custom class name for the double
- `disableAutoReturnValueGeneration()` — require explicit return config
- `getMock()` — terminal call, returns the configured mock

**Deprecated in PHPUnit 11 (removed in 12):**
- `addMethods()` — use interfaces or `onlyMethods()` instead
- `getMockForAbstractClass()` — test concrete classes instead
- `getMockForTrait()` — test classes using the trait instead
- `enableArgumentCloning()` / `disableArgumentCloning()`
- `allowMockingUnknownTypes()` / `disallowMockingUnknownTypes()`
- `enableProxyingToOriginalMethods()` / `setProxyTarget()`

## Limitations

- `final`, `private`, and `static` methods cannot be doubled
- `enum` types are `final` and cannot be doubled
- Favour doubling **interfaces** over classes — better design, fewer limitations
- Mock objects **cannot be created in data provider methods**

## PHP 8.4 Property Hooks

For interfaces with get/set-hooked properties:

```php
use PHPUnit\Framework\MockObject\Runtime\PropertyHook;

$stub->method(PropertyHook::get('name'))->willReturn('value');
```
