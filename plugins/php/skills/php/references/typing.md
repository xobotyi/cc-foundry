# PHP Type System

PHP uses a nominal type system with behavioral subtyping checked at compile time and
type verification at runtime. PHP 8.5+ provides a rich type declaration system covering
parameters, return types, properties, and class constants.

## Strict Typing

By default, PHP coerces values to the expected scalar type. Enable strict mode per-file
with `declare(strict_types=1)` at the top of the file. In strict mode, only exact type
matches are accepted (exception: `int` passes `float` checks).

Strict typing applies to calls made *from within* the declaring file — the caller's
`strict_types` setting governs coercion behavior, not the callee's.

```php
<?php

declare(strict_types=1);

function add(int $a, int $b): int
{
    return $a + $b;
}

add(1, 2);     // OK
add(1.5, 2.5); // TypeError
```

## Scalar Types

Use short forms: `bool`, `int`, `float`, `string`. Long forms (`boolean`, `integer`,
`double`) are treated as class names and will cause errors.

## Union Types (8.0+)

Multiple types joined with `|`: `int|string`, `Foo|Bar|null`.

- `null` must be last in a union: `string|int|null`
- Cannot combine `true` and `false` — use `bool`
- Cannot combine `object` with class types
- Cannot combine `iterable` with `array` or `Traversable`

## Intersection Types (8.1+)

Class types joined with `&`: `Countable&Traversable`. Only class/interface types allowed
(no scalars, no `self`/`parent`/`static`).

## DNF Types (8.2+)

Disjunctive Normal Form — union of intersections in parentheses:

```php
function process(array|(ArrayAccess&Traversable) $input): void {}
```

Each intersection group must be parenthesized. The overall structure is ORed unions of
ANDed intersections.

## Nullable Types

- `?T` is syntactic sugar for `T|null`
- Prefer `?T` for single-type-plus-null; use full union syntax for multi-type nullables:
  `int|string|null`

## Standalone Types

- `null` — standalone since 8.2
- `true`, `false` — standalone singleton types since 8.2
- `void` — return-only, function returns nothing
- `never` — return-only (8.1+), function never returns (throws or exits)
- `mixed` — equivalent to `object|resource|array|string|float|int|bool|null`
- `static` — return-only, returns instance of the called class (8.0+)
- `self`, `parent` — relative class types

## Typed Properties (7.4+)

All property types except `callable` are supported. Typed properties must be initialized
before access or an `Error` is thrown.

```php
class User
{
    public int $id;
    public ?string $name;
    public string $email = '';
}
```

## Typed Class Constants (8.3+)

```php
class Config
{
    public const int MAX_RETRIES = 3;
    public const string DEFAULT_LOCALE = 'en';
}

interface HasVersion
{
    public const string VERSION = '1.0';
}
```

## Variance Rules

- **Parameter types** are contravariant — a child class can widen (accept more general types)
- **Return types** are covariant — a child class can narrow (return more specific types)
- `mixed` return type can be narrowed to any type in a subclass

## Type Juggling Pitfalls

- `0 == ""` is `false` as of PHP 8.0 (was `true` before)
- `0 == "foo"` is `false` as of PHP 8.0
- String-to-number comparison uses numeric comparison only if *both* are numeric strings
- Use `===` and `!==` for strict comparison (no coercion)
- `is_numeric()` returns `true` for numeric strings including hex and scientific notation

## callable Type

- Valid as parameter type, NOT as property type
- Cannot specify the callable's signature in the type declaration
- For strict callable typing, use `Closure` type or interface with `__invoke()`
