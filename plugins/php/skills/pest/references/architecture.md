# Architecture Testing

`arch()` expresses architectural rules as expectations over namespaces, classes, and functions — keeping the codebase
structurally consistent without writing imperative tests. The SKILL.md covers the entry point and presets; this is the
full catalog of expectations and modifiers.

```php
arch()
    ->expect('App')
    ->toUseStrictTypes()
    ->not->toUse(['die', 'dd', 'dump']);

arch('models are final readonly')
    ->expect('App\Models')
    ->toBeClasses()
    ->toExtend('Illuminate\Database\Eloquent\Model')
    ->toOnlyBeUsedIn('App\Repositories')
    ->ignoring('App\Models\User');
```

`expect()` takes a relative namespace, a fully-qualified namespace, an array, or a function name. The optional string to
`arch('description')` names the rule in output. Rules live in any test file (commonly `tests/Arch/` or `tests/Unit`).

## File-Type Expectations

- **`toBeClasses()` / `toBeInterfaces()` / `toBeTraits()` / `toBeEnums()`** — every file in the namespace is of that
  kind.
- **`toBeIntBackedEnums()` / `toBeStringBackedEnums()`** — enum backing type.
- **`toBeAbstract()` / `toBeFinal()` / `toBeReadonly()`** — class modifiers (commonly paired with the `classes()`
  modifier).
- **`toBeInvokable()`** — classes define `__invoke()`.
- **`toBeCasedCorrectly()`** — class name matches file/directory casing (PSR-4 compliance).

## Inheritance and Interfaces

- **`toExtend($class)` / `toExtendNothing()`** — extends the given class / extends nothing.
- **`toImplement($interface)` / `toImplementNothing()` / `toOnlyImplement($interface)`** — interface implementation
  rules.
- **`toHaveConstructor()` / `toHaveDestructor()`** — defines `__construct` / `__destruct`.

## Dependency Direction

- **`toUse($dep)` / `toUseNothing()` / `toOnlyUse($dep)`** — what the namespace may depend on. Combine with `not` to
  forbid: `->not->toUse('Illuminate\Http')`.
- **`toBeUsed()` / `toBeUsedIn($ns)` / `toOnlyBeUsedIn($ns)`** — who may depend on the namespace. Forbid global helpers
  with `arch()->expect(['dd', 'dump'])->not->toBeUsed()`.
- **`toUseStrictTypes()`** — every file declares `strict_types=1`.
- **`toUseStrictEquality()`** — uses `===` rather than `==`.

## Traits

- **`toUseTrait($trait)` / `toUseTraits([...])`** — namespace uses the given trait(s).

## Methods and Documentation

- **`toHaveMethod('m')` / `toHaveMethods(['a', 'b'])`** — class has the method(s).
- **`toHavePublicMethods()` / `toHaveProtectedMethods()` / `toHavePrivateMethods()`** — usually with `not` to forbid a
  visibility class. The `...Besides([...])` variants whitelist exceptions:
  `->not->toHavePublicMethodsBesides(['charge', 'refund'])`.
- **`toHaveMethodsDocumented()` / `toHavePropertiesDocumented()`** — docblock presence.

## Naming and Structure

- **`toHavePrefix('Helper')` / `toHaveSuffix('Controller')`** — file naming conventions.
- **`toHaveAttribute($attributeClass)`** — class carries the given PHP attribute.
- **`toHaveLineCountLessThan($n)`** — file size ceiling.
- **`toHaveFileSystemPermissions('0644')`** — file permission check (usually with `not` to forbid `0777`).
- **`toHaveSuspiciousCharacters()`** — detects deceptive Unicode characters (requires the `intl` extension).

## Presets

`arch()->preset()->NAME()` applies a curated bundle of rules. Chain `->ignoring(...)` to exempt entries.

- **`php()`** — forbids `die`/`var_dump`/etc. and deprecated functions. Framework-agnostic. Requires `intl`.
- **`security()`** — forbids `eval`, `md5`, and other risky calls. Framework-agnostic.
- **`laravel()`** — enforces Laravel structural conventions (controller method/suffix rules, etc.).
- **`strict()`** — strict types everywhere, all classes final, and more.
- **`relaxed()`** — the inverse of `strict()`.
- **`custom('name', closure)`** — register a reusable preset (in `Pest.php`) returning an array of expectations; the
  closure receives the app's PSR-4 namespaces. Invoke via `arch()->preset()->name()`.

```php
arch()->preset()->php();
arch()->preset()->security()->ignoring('md5');
```

## Wildcards

Since Pest 3.8, `expect()` accepts `*` segments to match multiple namespaces:

```php
arch()->expect('App\*\Traits')->toBeTraits();      // App\Models\Traits, App\Services\Traits, ...
arch()->expect('App\*\*\Traits')->toBeTraits();    // App\A\B\Traits, ...
```

## Modifiers

- **`ignoring($targets)`** — exclude namespaces/classes/functions from the rule.
- **`classes()` / `enums()` / `interfaces()` / `traits()` / `abstracts()`** — restrict the expectation to one file kind.
- **`extending($class)` / `implementing($interface)` / `using($trait)`** — restrict to files matching that relationship.

Define what counts as a "dependency" globally in `Pest.php` to ignore framework namespaces:

```php
// tests/Pest.php
pest()->beforeEach(function () {
    $this->arch()->ignore(['Illuminate'])->ignoreGlobalFunctions();
});
```
