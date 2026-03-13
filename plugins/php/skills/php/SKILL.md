---
name: php
description: >-
  PHP language conventions, modern idioms, and type system. Invoke whenever task involves any
  interaction with PHP code — writing, reviewing, refactoring, debugging, or understanding
  PHP projects.
---

# PHP

**Strict types, explicit contracts, no magic. If a class needs a docblock to explain what its properties do, the
properties are named wrong.**

PHP 8.5+ is the baseline. Use modern syntax unconditionally — union types, enums, readonly classes, property hooks,
named arguments, `match`, pipe operator. No backward compatibility with older PHP versions unless the project explicitly
requires it.

Every PHP file starts with `declare(strict_types=1)`.

## References

| Topic        | Reference                                       | Contents                                                                                                  |
| ------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Type system  | `${CLAUDE_SKILL_DIR}/references/typing.md`      | Union/intersection/DNF types, nullable patterns, typed properties and constants, coercion rules, variance |
| OOP patterns | `${CLAUDE_SKILL_DIR}/references/oop.md`         | Interfaces, traits, readonly, property hooks, enums, constructor promotion, lazy objects, magic methods   |
| Concurrency  | `${CLAUDE_SKILL_DIR}/references/concurrency.md` | Fiber API, generator coroutines, comparison table, async library guidance                                 |
| Packaging    | `${CLAUDE_SKILL_DIR}/references/packaging.md`   | composer.json templates, version constraints, project layouts, namespace conventions                      |

## Naming

| Entity                             | Style               | Examples                              |
| ---------------------------------- | ------------------- | ------------------------------------- |
| Classes, interfaces, traits, enums | PascalCase          | `UserService`, `Renderable`, `Status` |
| Methods, functions                 | camelCase           | `findById`, `getFullName`             |
| Properties, variables              | camelCase           | `$userName`, `$isActive`              |
| Constants (class and global)       | UPPER_SNAKE_CASE    | `MAX_RETRIES`, `DEFAULT_LOCALE`       |
| Namespaces                         | PascalCase segments | `App\Http\Controller`                 |
| Enum cases                         | PascalCase          | `Status::Active`, `Suit::Hearts`      |

- **Descriptive names.** `$userCount` not `$n`. Short names (`$i`, `$k`, `$v`) only in tiny scopes (loops, array
  operations).
- **No redundant context.** `$car->make` not `$car->carMake`.
- **Boolean names:** `is`/`has`/`can`/`should` prefix: `$isValid`, `$hasAccess`.
- **Abbreviations as words.** `HttpClient` not `HTTPClient`, `JsonParser` not `JSONParser`. Treat abbreviations and
  acronyms as regular words — uppercase first letter only (PER-CS).
- **No underscore prefix** for protected/private visibility. Visibility modifiers exist for that.

## Type Declarations

PHP 8.5+ provides a complete type system. Use it everywhere.

### Core Rules

- **Type all public API boundaries** — function parameters, return types, class properties, class constants.
  Internal/private code benefits from types too.
- **`declare(strict_types=1)`** in every file. No exceptions.
- **Short type names:** `bool`, `int`, `float`, `string`. Never `boolean`, `integer`, `double`.
- **Union types with `|`:** `string|int`, `Foo|null`. Prefer `?T` for single-type nullable.
- **Intersection types with `&`:** `Countable&Traversable`. Class/interface types only.
- **DNF types:** `array|(ArrayAccess&Traversable)` — union of intersections in parentheses.
- **`void` return:** annotate on functions that return nothing.
- **`never` return:** functions that always throw or exit.
- **Avoid `mixed`** — it disables type safety. Use `object` when you mean "any object." Use `mixed` only at true interop
  boundaries with untyped code.
- **`null` last in unions:** `string|int|null`, not `null|string|int`.

### Typed Properties

- Every class property gets a type declaration.
- Typed properties must be initialized before access — use constructor promotion, default values, or constructor
  assignment.
- `callable` cannot be used as a property type. Use `Closure` instead.

### Typed Constants (8.3+)

```php
class Config
{
    public const int MAX_RETRIES = 3;
    public const string DEFAULT_LOCALE = 'en';
    protected const float TAX_RATE = 0.21;
}
```

- Type all class constants. Interface constants benefit especially — they enforce the contract at compile time.

### Variance

- **Parameters are contravariant** — child class can accept wider types.
- **Return types are covariant** — child class can return narrower types.
- `mixed` return can be narrowed to any type in a subclass.

See `${CLAUDE_SKILL_DIR}/references/typing.md` for the complete type system reference.

## Enumerations

- **Use enums for categorical constants.** Never bare strings or ints as pseudo-enums.
- **Backed enums** (`string` or `int`) when the value must interoperate with external systems (JSON, database, API).
- **`from()` throws on invalid value; `tryFrom()` returns `null`.** Choose based on whether invalid input is a caller
  error or expected.
- **Enums can implement interfaces** and define methods. Use this for behavior tied to the enum's domain.
- **Enums cannot have state** (no properties), cannot be extended, cannot be `new`'d.
- **Dynamic access:** `Status::{$name}` (8.3+) for variable-based case resolution.

```php
enum Status: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Suspended = 'suspended';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Inactive => 'Inactive',
            self::Suspended => 'Suspended',
        };
    }
}
```

## Classes

### Properties and Visibility

- **Explicit visibility on everything** — properties, methods, constants.
- **Constructor promotion** for data-carrying classes:
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
- **Readonly properties** (8.1+) for immutable state. Must have a type declaration.
- **Readonly classes** (8.2+) — all properties implicitly readonly, no dynamic properties.
- **Asymmetric visibility** (8.4+) — `public protected(set)` for publicly readable, internally writable properties.
- **Property hooks** (8.4+) — `get`/`set` logic on properties. Use instead of trivial getter/setter methods.
  Incompatible with `readonly`.

### Inheritance and Composition

- **Composition over inheritance.** Use inheritance only for true "is-a" relationships.
- **Interfaces for contracts.** All interface methods are public. As of 8.4, interfaces can declare property
  requirements.
- **Abstract classes** when you need shared implementation alongside a contract.
- **Traits for horizontal reuse.** Never use traits as a substitute for interfaces. One `use` statement per trait, each
  on its own line.
- **`#[Override]`** (8.3+) on every method that overrides a parent or implements an interface method. Catches signature
  drift at compile time.
- **`super()` equivalent:** always use `parent::method()`. Never hardcode grandparent class names.

### Magic Methods

- **Avoid property overloading** (`__get`, `__set`) in new code. Typed properties with hooks are strictly better.
- **`__toString()`** — define when string conversion has meaningful semantics.
- **`__invoke()`** — for single-method objects that act as callables.
- **`__serialize()` / `__unserialize()`** — prefer over `__sleep()` / `__wakeup()`.

### Object Patterns

- **Value objects** — `readonly class` with constructor promotion. Immutable by default.
- **DTOs** — readonly classes with public properties. No behavior.
- **Service classes** — constructor injection for dependencies, no public state.
- **Lazy objects** (8.4+) — defer initialization via `ReflectionClass::newLazyGhost()`.

## Functions

- **Early return.** Guard clauses first, happy path flat. Reduce nesting.
- **One function, one job.** If the name contains "and", split it.
- **Type all parameters and return types** on public functions.
- **Named arguments** for functions with boolean flags or many optional parameters:
  `createUser(name: 'John', admin: true)`.
- **`match` over `switch`** — `match` is an expression, uses strict comparison, and does not fall through.
- **Pipe operator** (8.5+) for functional chaining:
  ```php
  $result = $input
      |> trim(...)
      |> strtolower(...)
      |> ucfirst(...);
  ```
- **First-class callables** with `...` syntax: `array_map(strlen(...), $strings)`.
- **Arrow functions** for short closures: `fn($x) => $x * 2`. Arrow functions capture by value, not by reference.
- **Closures** for multi-statement callbacks. Use `use` to capture outer variables. Prefer `static function` /
  `static fn` when `$this` is not needed.
- **Closures in constants** (8.5+) — static closures and first-class callables are valid in constant expressions,
  default values, and attributes.

## Error Handling

- **Be specific.** Catch the narrowest exception type: `catch (InvalidArgumentException)` not `catch (Exception)`.
- **Never bare `catch (\Throwable)` at arbitrary depths.** Use at application boundaries only (controllers, CLI entry
  points, queue workers).
- **`throw` is an expression** (8.0+): `$value ?? throw new InvalidArgumentException()`.
- **Chain exceptions.** `throw new AppException('context', previous: $e)` preserves the original cause.
- **Custom exception hierarchy:**
  ```php
  class AppException extends \RuntimeException {}
  class NotFoundException extends AppException {}
  class ValidationException extends AppException {}
  ```
- **Prefer `\RuntimeException` subtree** for application errors. `\LogicException` subtree for programming errors (wrong
  arguments, unimplemented methods).
- **Error strings:** lowercase, no trailing punctuation. They compose in chains: `"user not found: invalid ID format"`.
- **`#[Deprecated]`** attribute (8.4+) on functions, methods, and constants to emit `E_USER_DEPRECATED` when called.
- **`#[NoDiscard]`** attribute (8.5+) on functions whose return value must be consumed. Use `(void)` cast to
  intentionally suppress.
- **`finally`** for unconditional cleanup. But prefer RAII-style patterns (destructors, resource wrappers) when
  possible.

## Strings

- **Double-quoted interpolation** for simple variables: `"Hello, {$name}"`.
- **`sprintf()`** for complex formatting: `sprintf('Item %d: %s', $id, $name)`.
- **Heredoc** for multiline strings. Nowdoc (`<<<'EOT'`) when no interpolation needed.
- **`str_contains()`, `str_starts_with()`, `str_ends_with()`** (8.0+) — never `strpos` with `=== false` for substring
  checks.
- **`mb_trim()`, `mb_ltrim()`, `mb_rtrim()`** (8.4+) for multibyte-safe trimming.
- **`mb_ucfirst()`, `mb_lcfirst()`** (8.4+) for multibyte-safe case conversion.
- **`"".join()` equivalent:** `implode(', ', $parts)` for building strings from arrays.

## Arrays

- **Short syntax:** `$arr = [1, 2, 3]`. Never `array()`.
- **`array_map()`, `array_filter()`, `array_reduce()`** for functional transforms.
- **`array_find()`, `array_find_key()`** (8.4+) — find first element matching a callback.
- **`array_any()`, `array_all()`** (8.4+) — existence/universal checks.
- **`array_first()`, `array_last()`** (8.5+) — get first/last value without resetting the internal pointer.
- **Spread operator** for merging: `$merged = [...$defaults, ...$overrides]`.
- **Trailing commas** on multi-line arrays (last element gets a comma).
- **Destructuring:** `[$first, $second] = $array` or `['key' => $value] = $assoc`.

## Match Expression

```php
$result = match ($status) {
    Status::Active => 'active',
    Status::Inactive, Status::Suspended => 'inactive',
    default => throw new \UnexpectedValueException("Unknown status: {$status->value}"),
};
```

- **`match` is an expression** — it returns a value. Use instead of `switch`.
- **Strict comparison** (`===`) — no type coercion.
- **No fallthrough** — each arm is isolated.
- **Multiple conditions per arm** with commas.
- **Exhaustiveness** — always include `default` unless provably exhaustive. Unmatched value throws
  `UnhandledMatchError`.

## Closures and Callables

- **First-class callable syntax** (8.1+): `strlen(...)`, `$obj->method(...)`, `ClassName::method(...)`.
- **Arrow functions** (`fn`) for single-expression closures — auto-captures by value.
- **Static closures** (`static fn`, `static function`) when `$this` is not needed — saves memory, prevents accidental
  binding.
- **`Closure::bind()`** and `Closure::fromCallable()` for advanced callable manipulation.
- **Type hint callables as `Closure`** in property types (not `callable`).

## Packaging and Toolchain

### Composer

- **`composer.json` is the single source of truth** for project metadata, dependencies, autoloading, and scripts.
- **Caret `^` constraints** for dependencies: `"vendor/package": "^2.0"`.
- **Lock file:** commit for applications, skip for libraries.
- **PSR-4 autoloading:** map namespace prefixes to directories.
- **Separate `autoload-dev`** for test namespaces.

### Project Structure

```
my-project/
├── composer.json
├── composer.lock
├── src/
│   └── ...            (PSR-4: App\)
├── tests/
│   ├── Unit/
│   ├── Integration/
│   └── bootstrap.php
├── config/
├── public/
│   └── index.php
└── var/
    ├── cache/
    └── log/
```

- **`src/`** — application code, one class per file, PSR-4 mapped.
- **`tests/`** — mirrors `src/` structure with `Unit/` and `Integration/` separation.
- **`public/`** — web root, single entry point (`index.php`).
- **`var/`** — generated files (cache, logs). Git-ignored.
- **`vendor/`** — Composer dependencies. Git-ignored.

### File Header

```php
<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Psr\Log\LoggerInterface;
```

Order: `<?php` tag, blank line, `declare(strict_types=1)`, blank line, namespace, blank line, `use` imports (classes,
then functions, then constants), blank line, code. No leading backslash on imports.

See `${CLAUDE_SKILL_DIR}/references/packaging.md` for composer.json templates and PSR-4 mapping.

## Formatting (PER-CS)

PER Coding Style is the baseline. These are conventions, not tool configuration.

- **4-space indentation.** No tabs.
- **Opening braces on their own line** for classes, interfaces, traits, enums, methods.
- **Opening braces on the same line** for control structures (`if`, `for`, `while`, etc.).
- **One statement per line.** No multi-statement lines.
- **Soft line limit:** 120 characters. Prefer 80 for readability.
- **Trailing commas** on multi-line argument lists, arrays, `match` arms, `use` lists.
- **No trailing commas** on single-line constructs.
- **Visibility on everything** — properties, methods, constants.
- **Modifier order:** `abstract`/`final`, visibility, `static`, `readonly`.
- **`new Foo()`** — always use parentheses when instantiating (even without arguments), unless immediately chaining:
  `new Foo()->method()`.
- **Compound types:** no spaces around `|` and `&`. Parentheses for DNF without internal spaces.
- **Empty exception classes** on one line: `class NotFoundException extends AppException {}`

## Application

When **writing** PHP code: apply all conventions silently — don't narrate each rule. If an existing codebase contradicts
a convention, follow the codebase and flag the divergence once.

When **reviewing** PHP code: cite the specific violation and show the fix inline. Don't lecture — state what's wrong and
how to fix it.

```
Bad:  "According to PHP best practices, you should use strict_types
       declaration at the top of every file..."
Good: "Missing declare(strict_types=1)."
```

## Code Navigation — LSP Required

An Intelephense LSP server is configured for `.php` and `.phtml` files. **Always use LSP tools for code navigation
instead of Grep or Glob.** LSP understands PHP's namespace system, type inference, scope rules, and Composer autoload
boundaries — text search does not.

### Tool Routing

| Task                                            | LSP Operation        | Why LSP over text search                            |
| ----------------------------------------------- | -------------------- | --------------------------------------------------- |
| Find where a function/class is defined          | `goToDefinition`     | Resolves `use` statements, aliases, namespace paths |
| Find all usages of a symbol                     | `findReferences`     | Scope-aware, no false positives from string matches |
| Get type signature or docs                      | `hover`              | Instant type info without reading source files      |
| List all symbols in a file                      | `documentSymbol`     | Structured output — classes, methods, constants     |
| Find a symbol by name across project            | `workspaceSymbol`    | Searches all namespaces and Composer dependencies   |
| Find concrete classes implementing an interface | `goToImplementation` | Knows the type hierarchy                            |
| Find what calls a function                      | `incomingCalls`      | Precise call graph across namespace boundaries      |
| Find what a function calls                      | `outgoingCalls`      | Structured dependency map                           |

**Grep/Glob remain appropriate for:** text in comments, string literals, log messages, TODO markers, config values, env
vars, file name patterns, URLs, error message text — anything that isn't a PHP identifier.

When spawning subagents for PHP codebase exploration, instruct them to use LSP tools. Subagents have access to the same
LSP server.

## Integration

The **coding** skill governs workflow (discovery, planning, verification); this skill governs PHP implementation
choices. The **phpunit** skill governs testing conventions — both are active simultaneously when writing PHP tests.

**Strict types everywhere. Types on everything. If PHP can check it at compile time, make it do so.**
