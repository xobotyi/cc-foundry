# Data Providers Reference

Data providers supply arguments to test methods. Each dataset runs the test once with those
arguments, producing independent test results.

## Declaration Rules

- **Must be `public static`** — non-static providers are removed in PHPUnit 11
- **Must not start with `test`** — PHPUnit treats `test*` methods as test methods
- **Return type:** `array`, `Iterator`, `Generator`, or any `iterable`
- **Each iteration yields an array** of arguments matching the test method parameters
- Connect to test methods via `#[DataProvider('methodName')]` attribute
- `@dataProvider` annotation is deprecated in PHPUnit 11, removed in 12

## Basic Pattern (Array)

```php
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class MathTest extends TestCase
{
    #[DataProvider('additionCases')]
    public function testAdd(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function additionCases(): array
    {
        return [
            [0, 0, 0],
            [1, 2, 3],
            [-1, 1, 0],
        ];
    }
}
```

## Named Datasets

Use string keys for readable failure output:

```php
public static function additionCases(): array
{
    return [
        'zeros'         => [0, 0, 0],
        'positive sum'  => [1, 2, 3],
        'cancel out'    => [-1, 1, 0],
    ];
}
```

Failure output: `testAdd with data set "cancel out" (-1, 1, 0)`.

## Generator / Yield Providers

For large datasets or lazy generation:

```php
public static function largeCases(): Generator
{
    yield 'small input' => [1, 1, 2];
    yield 'boundary'    => [PHP_INT_MAX, 0, PHP_INT_MAX];

    foreach (range(1, 100) as $i) {
        yield "generated #{$i}" => [$i, $i, $i * 2];
    }
}
```

## External Providers

Use `#[DataProviderExternal]` for providers in a separate class:

```php
use PHPUnit\Framework\Attributes\DataProviderExternal;

#[DataProviderExternal(MathDataSets::class, 'additionCases')]
public function testAdd(int $a, int $b, int $expected): void
{
    $this->assertSame($expected, $a + $b);
}
```

The external class method must be `public static`.

## Multiple Providers

Stack multiple attributes — datasets from all providers are combined:

```php
#[DataProvider('positiveNumbers')]
#[DataProvider('negativeNumbers')]
public function testAbsoluteValue(int $input, int $expected): void
{
    $this->assertSame($expected, abs($input));
}
```

## Inline Data with `#[TestWith]`

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

## Constraints and Gotchas

- **All providers execute before any test runs** — including providers for filtered-out tests.
  Keep providers lightweight.
- **No mock objects in providers** — mock creation requires the test framework to be
  initialized, which hasn't happened during provider execution
- **Data should be scalar/immutable** — providers should return scalars, value objects, or
  stubs. Never create service objects or complex graphs in providers.
- **Empty providers** are forbidden in PHPUnit 11 — an `InvalidDataProviderException` is
  thrown if a provider returns no data
- **Duplicate named keys** trigger `InvalidDataProviderException`
- **No code coverage** is collected during provider execution

## TestDox Integration

Use parameter names as placeholders in `#[TestDox]`:

```php
#[DataProvider('additionCases')]
#[TestDox('Adding $a to $b results in $expected')]
public function testAdd(int $a, int $b, int $expected): void
{
    $this->assertSame($expected, $a + $b);
}
```

`$_dataName` holds the dataset key name.
