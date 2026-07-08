# Expectation API

Full catalog of Pest's `expect()` expectations and modifiers, higher-order expectations, and custom expectation
authoring. The SKILL.md covers the working set; this is the lookup reference.

`expect($value)` opens a chain. Chain expectations directly — each returns the expectation so checks accumulate on the
same value. Prepend `not` to invert the next expectation; use `and($newValue)` to switch the value under test.

```php
expect($value)
    ->toBeInt()
    ->toBe(3)
    ->not->toBeString()
    ->and($name)->toBe('Nuno');
```

## Equality and Identity

- **`toBe($expected)`** — strict `===`: same type and value; for objects, the same instance. Preferred default.
- **`toEqual($expected)`** — loose `==`: same value, type coercion allowed. Use only when type-laxity is intended.
- **`toEqualCanonicalizing($expected)`** — equal ignoring element order.
- **`toEqualWithDelta($expected, float $delta)`** — absolute difference below `$delta` (float comparison).
- **`toBeIn(array $values)`** — value is one of `$values`.
- **`toBeBetween($min, $max)`** — between two values; works with `int`, `float`, `DateTime`.

## Boolean and Null

- **`toBeTrue()` / `toBeFalse()`** — strictly `true` / `false`.
- **`toBeTruthy()` / `toBeFalsy()`** — loosely truthy / falsy.
- **`toBeNull()`** — is `null`.
- **`toBeEmpty()`** — empty (`''`, `[]`, `null`, etc.).

## Type Checks

- **`toBeArray()` / `toBeBool()` / `toBeInt()` / `toBeFloat()` / `toBeString()` / `toBeObject()`** — native type checks.
- **`toBeCallable()` / `toBeIterable()` / `toBeResource()` / `toBeScalar()` / `toBeNumeric()`** — broader type checks.
- **`toBeInstanceOf($class)`** — instance of `$class`.
- **`toBeInfinite()` / `toBeNan()`** — `INF` / `NaN`.

## Numeric Comparison

- **`toBeGreaterThan($n)` / `toBeGreaterThanOrEqual($n)`**
- **`toBeLessThan($n)` / `toBeLessThanOrEqual($n)`**
- **`toBeDigits()`** — string/int contains only digits.

## Strings

- **`toStartWith($prefix)` / `toEndWith($suffix)`** — prefix / suffix match.
- **`toContain(...$needles)`** — all needles present (works on strings and arrays).
- **`toMatch($regex)`** — matches a regular expression.
- **`toBeJson()` / `toBeUrl()` / `toBeUuid()`** — format validity.
- **`toBeUppercase()` / `toBeLowercase()` / `toBeAlpha()` / `toBeAlphaNumeric()`** — character-class checks.
- **`toBeSnakeCase()` / `toBeKebabCase()` / `toBeCamelCase()` / `toBeStudlyCase()`** — naming-convention checks.

## Arrays and Iterables

- **`toHaveCount(int $count)`** — element count.
- **`toHaveLength(int $n)`** — string length or element count.
- **`toHaveSameSize(iterable $other)`** — same size as another iterable.
- **`toContain(...$needles)`** — strict membership; **`toContainEqual(...$needles)`** — loose membership.
- **`toContainOnlyInstancesOf($class)`** — every element is an instance of `$class`.
- **`toHaveKey('key')` / `toHaveKeys(['a', 'b'])`** — key presence; supports dot notation (`'user.name'`) and an
  optional value (`toHaveKey('name', 'Nuno')`).
- **`toMatchArray($subset)`** — array contains the given key/value subset.
- **`toHaveSnakeCaseKeys()` / `toHaveKebabCaseKeys()` / `toHaveCamelCaseKeys()` / `toHaveStudlyCaseKeys()`** — key
  naming.

## Objects

- **`toHaveProperty('name')`** — property exists; optional second arg checks its value.
- **`toHaveProperties(['name', 'email'])`** — multiple properties (or associative array for name+value).
- **`toMatchObject($subset)`** — object's properties contain the given subset.

## Filesystem

- **`toBeFile()` / `toBeDirectory()`** — path exists as file / directory.
- **`toBeReadableFile()` / `toBeReadableDirectory()`** — exists and readable.
- **`toBeWritableFile()` / `toBeWritableDirectory()`** — exists and writable.

## Exceptions

- **`toThrow($class)` / `toThrow('message')` / `toThrow($class, 'message')` / `toThrow(new Exception('message'))`** —
  the closure under expectation throws. Requires a closure value: `expect(fn () => $obj->boom())->toThrow(...)`.

For test-level exception expectations (`->throws()`, `->throwsNoExceptions()`), see SKILL.md — those attach to the test,
not to `expect()`.

## PHPUnit Constraints

- **`toMatchConstraint(Constraint $c)`** — bridges any PHPUnit constraint into the expectation API, e.g.
  `expect(true)->toMatchConstraint(new IsTrue())`.

## Modifiers

- **`not`** — inverts the next expectation: `expect(10)->not->toBeGreaterThan(100)`.
- **`and($value)`** — switch the value under test to continue a single chain.
- **`each`** — apply the following expectation to every item: `expect([1, 2, 3])->each->toBeInt()`. Closure form:
  `expect([1, 2, 3])->each(fn ($n) => $n->toBeLessThan(4))`.
- **`sequence(...)`** — positional expectations per element, by closure or by direct value:
  `expect([1, 2, 3])->sequence(fn ($n) => $n->toBe(1), ...)` or `expect(['a', 'b'])->sequence('a', 'b')`.
- **`json()`** — decode a JSON string into an array, then continue expectations on it.
- **`match($subject, [$key => closure|value])`** — run the branch whose key matches `$subject`.
- **`when($condition, $callback)` / `unless($condition, $callback)`** — conditionally run a callback in the chain.
- **`dd()` / `ddWhen($cond)` / `ddUnless($cond)`** — dump the current value and halt (debugging only — never commit).
- **`ray()`** — debug the current value via myray.app (debugging only — never commit).

## Higher-Order Expectations

Chain property access and method calls directly onto `expect()`; Pest resolves them against the value, including array
keys.

```php
expect($user)
    ->name->toBe('Nuno')
    ->surname->toBe('Maduro')
    ->addTitle('Mr.')->toBe('Mr. Nuno Maduro');

expect(['name' => 'Nuno', 'projects' => ['Pest', 'OpenAI']])
    ->name->toBe('Nuno')
    ->projects->toHaveCount(2)->each->toBeString();
```

**`scoped(fn ($x) => ...)`** locks the chain to a nested level — useful for child relations:

```php
expect($user)
    ->name->toBe('Nuno')
    ->address()->scoped(fn ($address) => $address
        ->city->toBe('Lisbon')
        ->country->toBe('Portugal'));
```

## Custom Expectations

Define reusable expectations in `tests/Pest.php` (or a dedicated `tests/Expectations.php`). Access the value under test
via `$this->value`; `return $this` to keep the chain composable.

```php
expect()->extend('toBeWithinRange', function (int $min, int $max) {
    return $this->toBeGreaterThanOrEqual($min)->toBeLessThanOrEqual($max);
});

expect(100)->toBeInt()->toBeWithinRange(90, 110);
```

Trigger a failure inside a custom expectation with `test()->fail('reason')`.

- **`intercept($name, $type, $closure)`** — fully replace a built-in expectation when the value matches `$type` (a class
  string or a closure predicate). E.g. make `toBe()` compare Eloquent models by `id`.
- **`pipe($name, fn (Closure $next, ...$args) => ...)`** — wrap a built-in expectation, conditionally short-circuiting
  or calling `$next()` to fall through to the original. Useful for normalizing dynamic data before `toMatchSnapshot`.
