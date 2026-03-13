# PHP OOP Patterns

## Interfaces

All interface methods must be public. Interfaces share a namespace with classes, traits, and enums.

- Interfaces can extend multiple interfaces: `interface C extends A, B {}`
- As of 8.4, interfaces can declare property requirements with `get`/`set` hooks
- Interface constants exist and are overridable since 8.1
- Avoid constructors in interfaces — they reduce flexibility and are not enforced by inheritance rules

```php
interface Renderable
{
    public function render(): string;
}

// PHP 8.4+ interface property
interface HasName
{
    public string $name { get; }
}
```

## Abstract Classes

Use abstract classes when you need shared implementation alongside interface contracts.

```php
abstract class Repository
{
    abstract protected function findById(int $id): ?Entity;

    public function findOrFail(int $id): Entity
    {
        return $this->findById($id)
            ?? throw new NotFoundException("Entity {$id} not found");
    }
}
```

## Traits

Traits provide horizontal code reuse. They cannot be instantiated directly.

- Each trait `use` statement goes on its own line
- Conflict resolution: `A::method insteadof B` and `B::method as aliasedMethod`
- The `final` modifier can be applied when using a trait method (8.3+)
- Traits can declare abstract methods, constants, and properties

Prefer interfaces over traits for defining contracts. Use traits for implementation sharing that does not fit a class
hierarchy.

## Readonly Properties (8.1+)

```php
class Money
{
    public function __construct(
        public readonly float $amount,
        public readonly string $currency,
    ) {}
}
```

- Must have a type declaration (`mixed` if truly unconstrained)
- No default values allowed (use constants for that)
- Can only be initialized once, from the declaring scope
- Static readonly properties are not supported
- As of 8.3, readonly properties can be reinitialized during `__clone()`
- As of 8.4, readonly properties are implicitly `protected(set)` (was `private(set)`)

## Readonly Classes (8.2+)

All declared properties of a `readonly` class are implicitly readonly. Dynamic properties are forbidden.

```php
readonly class Point
{
    public function __construct(
        public float $x,
        public float $y,
    ) {}
}
```

## Property Hooks (8.4+)

Attach `get` and `set` logic directly to properties, replacing manual getter/setter boilerplate.

```php
class Temperature
{
    public float $celsius {
        get => ($this->fahrenheit - 32) * 5 / 9;
        set => $this->fahrenheit = $value * 9 / 5 + 32;
    }

    public function __construct(
        private float $fahrenheit,
    ) {}
}
```

- **Virtual properties** have hooks but no backing storage
- **Backed properties** have hooks plus a backing value (`$this->propertyName`)
- Property hooks are incompatible with `readonly` — use asymmetric visibility instead
- Set hooks receive value via `$value` parameter
- Interface properties can require `get`, `set`, or both

## Asymmetric Visibility (8.4+)

Separate read and write visibility for properties:

```php
class User
{
    public protected(set) string $name;
    public private(set) int $loginCount = 0;

    public function __construct(string $name)
    {
        $this->name = $name;
    }

    public function incrementLoginCount(): void
    {
        $this->loginCount++;
    }
}
```

- Get-visibility must not be narrower than set-visibility
- Combines with property hooks
- Options: `private(set)`, `protected(set)`, `public(set)`
- Static properties support asymmetric visibility as of 8.5

## Lazy Objects (8.4+)

Defer object initialization until first property/method access:

```php
$reflector = new ReflectionClass(HeavyService::class);
$proxy = $reflector->newLazyGhost(function (HeavyService $ghost): void {
    $ghost->__construct(expensiveDataFetch());
});
// $proxy is now a HeavyService — initialization runs on first access
```

Two strategies: `newLazyGhost()` (initializer fills the object in place) and `newLazyProxy()` (initializer returns a
fully initialized instance).

## Constructor Promotion

```php
class User
{
    public function __construct(
        public readonly string $name,
        private string $email,
        protected int $age = 0,
    ) {}
}
```

- Visibility modifier on constructor parameter promotes it to a property
- Works with `readonly`, typed properties, default values
- Trailing comma after last promoted parameter on multi-line constructors

## Clone

PHP 8.5 makes `clone` a function and supports property reassignment during cloning:

```php
$updated = clone($original, ['name' => 'New Name']);
```

This is especially useful for readonly/value objects where properties cannot normally be reassigned after
initialization.

## Enumerations (8.1+)

Enums are special classes with a fixed set of possible values.

### Pure Enums

```php
enum Suit
{
    case Hearts;
    case Diamonds;
    case Clubs;
    case Spades;
}
```

### Backed Enums

```php
enum Status: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Suspended = 'suspended';
}

// Instantiate from value
$status = Status::from('active');        // Status::Active
$status = Status::tryFrom('unknown');    // null
```

- Backed by `string` or `int` only
- `from()` throws `ValueError` on invalid value; `tryFrom()` returns `null`
- Enums can implement interfaces, use traits, define methods and constants
- Enums cannot be instantiated with `new`, extended, or have state (properties)
- Dynamic member access: `Status::{$name}` (8.3+)
- `cases()` returns array of all cases
- Enum constants can have attributes (8.5+)

## Magic Methods

- `__construct()` / `__destruct()` — lifecycle
- `__get()` / `__set()` / `__isset()` / `__unset()` — property overloading
- `__call()` / `__callStatic()` — method overloading
- `__toString()` — string conversion
- `__invoke()` — calling object as function
- `__clone()` — clone customization
- `__serialize()` / `__unserialize()` — custom serialization (prefer over `__sleep`/`__wakeup`)
- `__debugInfo()` — customize `var_dump()` output

## The #[Override] Attribute (8.3+)

Marks a method (or property in 8.5+) as intentionally overriding a parent/interface member. Compilation fails if no
parent declaration exists.

```php
class Child extends Parent
{
    #[\Override]
    public function process(): void
    {
        // ...
    }
}
```
