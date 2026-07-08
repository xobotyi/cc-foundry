---
name: pest
description: >-
  Pest testing framework conventions and practices. Invoke whenever task involves any
  interaction with Pest — writing function-style tests (test/it/describe), the expect()
  expectation API, datasets, hooks, architecture/mutation/type-coverage/browser testing,
  Pest.php configuration, or running the pest CLI.
---

# Pest

**Tests are functions, not classes. Write the expectation, not the ceremony — `expect($x)->toBe($y)`, and let the
description say what the code does.**

Pest is a testing framework built on the PHPUnit engine: closures instead of test-case methods, an `expect()`
expectation API instead of `$this->assert*`, and first-class architecture, mutation, type-coverage, and browser testing.
`$this` inside a test closure is a PHPUnit `TestCase`, so the full PHPUnit assertion and test-double API stays
available. All patterns target Pest 4 on PHP 8.5+ (it runs on the PHPUnit 12 engine; its own floor is PHP 8.3).

This skill governs Pest-specific decisions. It does **not** restate universal testing philosophy (test behavior not
implementation, arrange-act-assert, isolation, mock at boundaries), the PHPUnit assertion/double API, coverage
attributes, or `phpunit.xml` internals — those live in the **`phpunit`** skill and apply unchanged here.

## References

- **Full expectation catalog + modifiers, higher-order & custom expectations** →
  [`${CLAUDE_SKILL_DIR}/references/expectations.md`] — every `expect()` method by category,
  `not`/`and`/`each`/`sequence`, `expect()->extend()`/`intercept()`/`pipe()`
- **Architecture testing — `arch()` rules and presets** → [`${CLAUDE_SKILL_DIR}/references/architecture.md`] — all arch
  expectations, `php`/`security`/`laravel`/`strict` presets, modifiers, wildcards
- **Mutation, type coverage, snapshot, stress, browser testing** →
  [`${CLAUDE_SKILL_DIR}/references/advanced-features.md`] — opt-in modes, their plugins, drivers, and CLI flags
- **Pest.php configuration + full CLI flag catalog + PHPUnit migration** →
  [`${CLAUDE_SKILL_DIR}/references/configuration.md`] — `pest()->extend/use/in/group`, global hooks, every run flag,
  Drift

## Test Structure

Install with `composer require pestphp/pest --dev --with-all-dependencies` (remove `phpunit/phpunit` first). Pest's
`--init` scaffolds `tests/Unit/` and `tests/Feature/`, a base `tests/TestCase.php`, and `tests/Pest.php`. Files are
suffixed `*Test.php`.

### test() / it() / describe()

- **`test('description', fn)`** — the base form. Describe the behavior:
  `test('returns empty collection when no results')`.
- **`it('description', fn)`** — same as `test()` but prefixes the output with "it", reading as a sentence:
  `it('rejects an expired token')`. Pick one convention per file/suite and keep it consistent.
- **`describe('group', fn)`** — groups related tests; hooks declared inside it scope to that block. Nest for sub-groups.

```php
it('sums two integers', function () {
    expect(sum(1, 2))->toBe(3);
});

describe('sum', function () {
    it('adds integers', fn () => expect(sum(1, 2))->toBe(3));
    it('adds floats', fn () => expect(sum(1.5, 2.5))->toBe(4.0));
});
```

- **One concept per test.** Multiple expectations are fine when they verify one behavior; split independent behaviors.
- **No test classes.** Don't write `extends TestCase` in a Pest suite — that is the `phpunit` skill's paradigm.
- Helper logic becomes a plain function (in the test file, `tests/Helpers.php`, or `tests/Helpers/`), not a protected
  method. Call `test()` inside a helper to reach the instance otherwise available as `$this`.

## Expectations

`expect($value)` opens a chain; chain expectations directly, invert with `not`, switch values with `and()`.

```php
expect($user->name)->toBe('Nuno')
    ->and($user->roles)->toBeArray()->toHaveCount(2)
    ->and($user->isActive())->toBeTrue();
```

- **Prefer `toBe()` (strict `===`) over `toEqual()` (loose `==`).** `toBe()` catches type bugs; on objects it asserts
  the same instance. Use `toEqual()` only to compare two distinct objects/arrays by value.
- **Prefer the `expect()` API over `$this->assert*`.** PHPUnit assertions remain valid (`$this->assertSame(3, $result)`)
  and are the escape hatch for assertions Pest has no expectation for.
- Common expectations: `toBe`, `toBeTrue`/`toBeFalse`, `toBeNull`, `toBeInstanceOf`, `toBeArray`, `toHaveCount`,
  `toContain`, `toHaveKey`, `toMatchArray`, `toBeGreaterThan`, `toThrow`. Full catalog → expectations reference.
- `expect([...])->each->toBeInt()` applies an expectation to every element; `->sequence(...)` checks elements
  positionally.
- Repeated expectation logic → a custom expectation via `expect()->extend('toBeWithinRange', fn ($min, $max) => ...)` in
  `Pest.php`. See the expectations reference.
- `dd()`, `ddWhen()`, and `ray()` are debugging modifiers — never leave them in committed tests.

## Hooks

- **`beforeEach(fn)`** — runs before every test in the file; the place to build the SUT and assign `$this->property`
  shared across the file's tests.
- **`afterEach(fn)`** — runs after every test; only needed to release external resources.
- **`beforeAll(fn)` / `afterAll(fn)`** — run once per file. `$this` is **not** available in either (no instance exists).
- `$this` inside test and `beforeEach`/`afterEach` closures is the bound `TestCase` — properties set in `beforeEach`
  persist into the test.
- Hooks declared inside a `describe()` block scope to that block. Suite-wide hooks go in `Pest.php` (configuration
  reference).
- Per-test cleanup: chain `->after(fn)` onto a single test.

```php
beforeEach(function () {
    $this->repository = new UserRepository();
});

it('creates a user', function () {
    expect($this->repository->create())->toBeInstanceOf(User::class);
});
```

## Datasets

Datasets are Pest's data providers — run one test across many inputs with `->with()`.

```php
it('validates emails', function (string $email) {
    expect($email)->toContain('@');
})->with([
    'gmail'  => 'enunomaduro@gmail.com',
    'laravel' => 'taylor@laravel.com',
]);
```

- **Use named (keyed) datasets** — keys produce readable failure descriptions. `:dataset` in the description
  interpolates the key at that position.
- Multiple arguments: provide an array of argument arrays; closure parameters must be typed.
- **Shared datasets:** `dataset('emails', [...])` in `tests/Datasets/` (or a scoped `Datasets.php`), referenced by name:
  `->with('emails')`. Associative-array datasets map by parameter name regardless of order.
- **Lazy datasets:** pass a closure or generator to `->with()` (`->with(fn (): array => range(1, 99))`) to build large
  or computed datasets at run time.
- **Bound datasets:** wrap values in closures (`fn () => User::factory()->create()`) to resolve them after
  `beforeEach()` — required when a value depends on test setup (e.g. a seeded model). The bound parameter must be fully
  typed.
- Stack `->with(...)->with(...)` to combine datasets as a cartesian product. `->repeat(n)` re-runs a test n times.
- `->with()` on a `describe()` block (or `beforeEach()->with([...])` inside it) feeds the dataset to every test in the
  block.

## Exceptions

Attach exception expectations to the test, or assert on a closure with `toThrow()`:

```php
it('rejects division by zero', function () {
    Calculator::divide(1, 0);
})->throws(DivisionByZeroError::class, 'cannot divide by zero');

it('does not throw on valid input', function () {
    Calculator::divide(10, 2);
})->throwsNoExceptions();
```

- **`->throws($class)` / `->throws($class, 'message')` / `->throws('message')`** — message match is a substring.
- **`->throwsIf($cond, ...)` / `->throwsUnless($cond, ...)`** — conditional expectation.
- **`->throwsNoExceptions()`** — assert the body runs clean (gives the test a real assertion).
- **`expect(fn () => ...)->toThrow(...)`** — inline form when you need it mid-chain.
- **`->fails()` / `->fails('message')`** — assert the test itself fails (message is a substring). Fail explicitly from
  inside with `$this->fail('reason')`.

## Filtering, Skipping, Focus

- **`->skip()` / `->skip('reason')` / `->skip($condition, 'reason')`** — skip a test; pass a closure for the condition
  to defer evaluation to after `beforeEach`. Environment/OS/PHP variants: `skipOnCi()`, `skipLocally()`,
  `skipOnWindows()`, `skipOnMac()`, `skipOnLinux()`, `onlyOnLinux()`, `skipOnPhp('>=8.5')`. `beforeEach()->skip()` skips
  the whole file.
- **`->todo()`** — placeholder for a planned test.
- **`->group('integration')`** — tag a test/describe/file; run with `--group`. Assign whole directories to groups in
  `Pest.php`.
- **`->only()`** — focus a single test (or `pest()->only()` for a whole file) during development. Remove before
  committing; CI should run with `--ci` to neutralize stray focus.
- **`->depends('parent', ...)`** — run only after the named test(s) pass; parent return values arrive as arguments in
  dependency order. Reference `it()` tests by their full `"it ..."` description.
- **`->flaky()` / `->flaky(tries: 5)`** — auto-retry a test that fails for external reasons (default 3 tries); does not
  retry skipped tests or expected exceptions.

## Mocking

Pest has no mocking library of its own — use **Mockery** (recommended) or PHPUnit's built-in test doubles via `$this`.

```bash
composer require mockery/mockery --dev
```

```php
it('does not call the API on a dry run', function () {
    $client = Mockery::mock(PaymentClient::class);
    $client->shouldReceive('post')->never();

    (new BookRepository($client))->buy(dryRun: true);
});
```

- `Mockery::mock(Class::class)` then `->shouldReceive('method')` with `->with(...)`, `->andReturn(...)`,
  `->andThrow(...)`, and count expectations (`->once()`, `->times(3)`, `->atLeast()->times(n)`).
- **Stub vs mock, mock-at-boundaries, don't-mock-what-you-own** — the doctrine lives in the **`phpunit`** skill's
  mocking section. Apply it here; default to stubbing returns and only verify interactions when the side effect is the
  behavior under test.

## Higher-Order Testing

When a test body is a single chain on `$this` or one lazy `expect()`, drop the closure:

```php
it('returns 200 on the homepage')->get('/')->assertStatus(200);

it('stores the name')
    ->expect(fn () => User::create(['name' => 'Nuno'])->name)
    ->toBe('Nuno');
```

Pass a closure to `expect()` for lazy evaluation (the value is built at run time); `->defer(fn () => ...)` runs the
closure at test time and chains assertions on its result. Hooks can be higher-order too
(`beforeEach()->withoutMiddleware()`), and dataset values are passed into `expect()`/`defer()` closures. Use this style
only when it reads clearer than an explicit closure — don't contort a multi-step test to fit it.

## Architecture Testing

`arch()` asserts structural rules over namespaces without imperative test code. Add a few to any project:

```php
arch('no debug helpers')->expect('App')->not->toUse(['dd', 'dump', 'die']);
arch('value objects are final')->expect('App\ValueObjects')->toBeFinal()->toBeReadonly();
arch()->preset()->php();
arch()->preset()->security();
```

Presets (`php`, `security`, `laravel`, `strict`) bundle common rules. Full expectation and modifier catalog →
architecture reference.

## Advanced Modes

Opt-in testing modes — reach for the advanced-features reference when a task uses one:

- **Mutation testing** — `covers(Class::class)` + `--mutate` scores whether tests actually catch behavior changes (needs
  Xdebug/PCOV).
- **Type coverage** — `--type-coverage` measures type-declaration completeness (`pest-plugin-type-coverage`).
- **Browser testing** — `visit('/')->click(...)->assertSee(...)` drives a real browser (`pest-plugin-browser` +
  Playwright).
- **Snapshot testing** — `expect($output)->toMatchSnapshot()` for large, stable structural output.
- **Stress testing** — `stress()` / `pest stress <url>` load-tests via k6 (`pest-plugin-stressless`).

## Running Tests

```bash
./vendor/bin/pest                        # whole suite
./vendor/bin/pest tests/Unit/SumTest.php # one file
./vendor/bin/pest --filter "sums"        # by description/filename/dataset
./vendor/bin/pest --group integration    # by group
./vendor/bin/pest --parallel             # across CPU cores (tests must be isolated)
./vendor/bin/pest --coverage --min=90    # coverage with threshold (needs Xdebug/PCOV)
./vendor/bin/pest --dirty                # only Git-changed tests
./vendor/bin/pest --bail                 # stop on first failure
./vendor/bin/pest --retry                # failed tests first
```

Full flag catalog → configuration reference.

## Application

When **writing** tests: apply all conventions silently — don't narrate each rule. Match the project's existing Pest
style (`test` vs `it`, file layout, dataset conventions). If an existing codebase contradicts a convention, follow the
codebase and flag the divergence once.

When **reviewing** tests: cite the specific issue and show the fix inline. Don't lecture — state what's wrong and how to
fix it.

```
Bad:  "Pest best practices recommend the expectation API over PHPUnit assertions because it reads more fluently..."
Good: "$this->assertSame(3, $x) → expect($x)->toBe(3)"
```

## Integration

- **Which testing skill applies:** if the project uses Pest (a `tests/Pest.php` exists, `pestphp/pest` is in
  `composer.json`, tests are function-style), this skill governs. If tests are PHPUnit class-based (`extends TestCase`),
  the `phpunit` skill governs. Don't mix paradigms within one suite; to convert, use Drift (configuration reference).
- The **`php`** skill governs language choices (types, naming, OOP) — including the base `TestCase` and any helpers.
- The **`the-coder`** skill governs workflow (discovery, planning, verification).

**Tests are functions. Prefer `expect()` over assertions, `toBe()` over `toEqual()`, and a named dataset over a copied
test. When in doubt, mock less.**
