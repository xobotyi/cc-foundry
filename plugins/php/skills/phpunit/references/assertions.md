# Assertions Reference

PHPUnit assertions are declared static on `PHPUnit\Framework\Assert`, inherited by `TestCase`.
Invoke as `$this->assertX()`, `self::assertX()`, or the global wrapper `assertX()`.

## Identity (Strict `===`)

- `assertSame(mixed $expected, mixed $actual[, string $message])` — type + value match;
  for objects, checks same reference
- `assertNotSame(mixed $expected, mixed $actual[, string $message])`

## Equality (Loose `==`)

- `assertEquals(mixed $expected, mixed $actual[, string $message])`
- `assertNotEquals(mixed $expected, mixed $actual[, string $message])`
- `assertEqualsCanonicalizing(...)` — ignores element order in arrays
- `assertEqualsIgnoringCase(...)` — case-insensitive string comparison
- `assertEqualsWithDelta(float $expected, float $actual, float $delta[, string $message])`
  — floating-point tolerance
- `assertObjectEquals(object $expected, object $actual, string $method[, string $message])`
  — calls `$actual->$method($expected)`, asserts it returns `true`

## Boolean

- `assertTrue(bool $condition[, string $message])`
- `assertNotTrue(...)` / `assertFalse(...)` / `assertNotFalse(...)`

## Null

- `assertNull(mixed $value[, string $message])`
- `assertNotNull(mixed $value[, string $message])`

## Type

- `assertInstanceOf(string $expected, mixed $actual[, string $message])`
- `assertNotInstanceOf(string $expected, mixed $actual[, string $message])`

## Comparison

- `assertGreaterThan(mixed $expected, mixed $actual[, string $message])`
- `assertGreaterThanOrEqual(...)` / `assertLessThan(...)` / `assertLessThanOrEqual(...)`

## String

- `assertStringStartsWith(string $prefix, string $string[, string $message])`
- `assertStringEndsWith(string $suffix, string $string[, string $message])`
- `assertStringContainsString(string $needle, string $haystack[, string $message])`
- `assertStringContainsStringIgnoringCase(...)`
- `assertStringNotContainsString(...)` / `assertStringNotContainsStringIgnoringCase(...)`
- `assertMatchesRegularExpression(string $pattern, string $string[, string $message])`
- `assertDoesNotMatchRegularExpression(...)`
- `assertStringMatchesFormat(string $format, string $string[, string $message])`
  — format placeholders: `%e` (dir sep), `%s` (string), `%S` (optional string),
  `%a` (anything), `%w` (whitespace), `%i` (integer), `%d` (unsigned int),
  `%x` (hex), `%f` (float), `%c` (single char)
- `assertStringEqualsFile(string $expectedFile, string $actualString[, string $message])`

## Array / Iterable

- `assertArrayHasKey(int|string $key, array|ArrayAccess $array[, string $message])`
- `assertArrayNotHasKey(...)`
- `assertContains(mixed $needle, iterable $haystack[, string $message])` — strict comparison
- `assertNotContains(...)`
- `assertContainsOnly(string $type, iterable $haystack[, ?bool $isNativeType, string $message])`
- `assertContainsOnlyInstancesOf(string $className, iterable $haystack[, string $message])`
- `assertCount(int $expectedCount, Countable|iterable $haystack[, string $message])`
- `assertNotCount(...)`
- `assertSameSize(Countable|iterable $expected, Countable|iterable $actual[, string $message])`
- `assertEmpty(mixed $actual[, string $message])` / `assertNotEmpty(...)`
- `assertArrayIsIdenticalToArrayOnlyConsideringListOfKeys(array $expected, array $actual,
  array $keysToBeConsidered[, string $message])` — compare arrays considering only
  specified keys
- `assertArrayIsIdenticalToArrayIgnoringListOfKeys(array $expected, array $actual,
  array $keysToBeIgnored[, string $message])` — compare arrays ignoring specified keys
- `assertArrayIsEqualToArrayOnlyConsideringListOfKeys(...)`
- `assertArrayIsEqualToArrayIgnoringListOfKeys(...)`

## Object

- `assertObjectHasProperty(string $propertyName, object $object[, string $message])`
- `assertObjectNotHasProperty(...)`

## File

- `assertFileExists(string $filename[, string $message])`
- `assertFileDoesNotExist(...)`
- `assertFileEquals(string $expected, string $actual[, string $message])`
- `assertFileNotEquals(...)`
- `assertFileIsReadable(...)` / `assertFileIsWritable(...)`
- `assertDirectoryExists(...)` / `assertDirectoryDoesNotExist(...)`

## JSON

- `assertJson(string $actualJson[, string $message])` — valid JSON
- `assertJsonStringEqualsJsonString(string $expectedJson, string $actualJson[, string $message])`
- `assertJsonStringEqualsJsonFile(string $expectedFile, string $actualJson[, string $message])`
- `assertJsonFileEqualsJsonFile(string $expectedFile, string $actualFile[, string $message])`

## XML

- `assertXmlStringEqualsXmlString(...)` / `assertXmlStringEqualsXmlFile(...)`
- `assertXmlFileEqualsXmlFile(...)`

## Exception Expectations

Called **before** the code that should throw:

- `$this->expectException(string $className)` — expects exception of given class
- `$this->expectExceptionMessage(string $message)` — message contains substring
- `$this->expectExceptionMessageMatches(string $regex)` — message matches regex
- `$this->expectExceptionCode(int|string $code)` — exception code matches
- `$this->expectExceptionObject(Throwable $exception)` — matches class + message + code

## Error / Warning / Deprecation Expectations

- `$this->expectUserDeprecationMessage(string $message)` — expects `E_USER_DEPRECATED`
- `$this->expectUserDeprecationMessageMatches(string $regex)`

## Constraint System

`assertThat(mixed $value, Constraint $constraint[, string $message])` accepts any
`PHPUnit\Framework\Constraint\Constraint`. Use for custom assertions:

```php
$this->assertThat($value, $this->logicalAnd(
    $this->greaterThan(5),
    $this->lessThan(10),
));
```

Logical combinators: `logicalAnd(...)`, `logicalOr(...)`, `logicalNot(Constraint)`,
`logicalXor(...)`.

Built-in constraints: `isTrue()`, `isFalse()`, `isNull()`, `isEmpty()`, `isInstanceOf()`,
`equalTo()`, `identicalTo()`, `greaterThan()`, `lessThan()`, `matchesRegularExpression()`,
`stringContains()`, `arrayHasKey()`, `containsIdentical()`, `callback(callable)`.
