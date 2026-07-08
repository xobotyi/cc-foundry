# Configuration & CLI

`Pest.php` configuration depth, the full CLI flag catalog, parallel/sharding options, and PHPUnit migration. The
SKILL.md covers the working set of `pest()` calls and run commands; this is the lookup reference.

Pest is built on the PHPUnit engine, so `phpunit.xml` configures the runner exactly as for PHPUnit — test suites, strict
settings, the `<source>` element, and coverage. See the **`phpunit`** skill for `phpunit.xml` structure and strict-mode
settings; this reference covers only Pest's own `Pest.php` layer.

## Pest.php

`tests/Pest.php` is auto-loaded before tests. Its primary job is binding a base `TestCase` to directories so `$this`
resolves to the right class inside test closures (it defaults to `PHPUnit\Framework\TestCase`).

```php
// Bind a TestCase to a directory tree
pest()->extend(Tests\TestCase::class)->in('Feature');

// Glob patterns are supported
pest()->extend(Tests\TestCase::class)->in('Feature/*Job*.php');

// Attach traits (Laravel example) and assign a group, scoped to a directory
pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->group('integration')
    ->in('Feature');
```

- **`extend($class)`** — base test case for matched files. Any `public`/`protected` method on it is callable as
  `$this->method()` inside test closures.
- **`use($trait, ...)`** — mix traits into matched files.
- **`in($pattern, ...)`** — directories/globs the binding applies to. Omit `in()` to apply within the current file only.
- **`group($name, ...)`** — tag matched files for `--group` filtering.

### Global Hooks

Any hook (`beforeEach`/`afterEach`/`beforeAll`/`afterAll`) can be declared in `Pest.php` to run across files. Hooks
chained after `extend(...)->in(...)` are scoped to that binding; bare `pest()->beforeEach(...)` applies suite-wide.
`Pest.php` `before*` hooks run before per-file hooks; `after*` hooks run after them.

```php
pest()->beforeEach(function () {
    // runs before every test in the suite
});

pest()->extend(TestCase::class)->beforeEach(function () {
    // runs before each test in Feature
})->in('Feature');
```

### Custom Expectations, Helpers, Presets

- Custom expectations — `expect()->extend(...)` (also valid in a dedicated `tests/Expectations.php`). See the
  expectations reference.
- Custom helpers — plain functions in `tests/Pest.php`, `tests/Helpers.php`, or a `tests/Helpers/` directory (all
  auto-loaded). Call `test()` inside a helper to reach the test instance otherwise available as `$this`.
- Custom arch presets — `pest()->presets()->custom('name', fn () => [ /* expectations */ ])`.
- Default printer — `pest()->printer()->compact()` to always use compact output.
- Browser defaults — `pest()->browser()->inFirefox()`, `->timeout(10000)`, etc. (see advanced-features reference).

## CLI Reference

Run with `./vendor/bin/pest`. The complete option set (Pest layers its own options over PHPUnit's):

### Selection & Filtering

- **`<path>`** — run a single file or directory: `./vendor/bin/pest tests/Unit/SumTest.php`.
- **`--filter <pattern>`** — run tests matching a regex over the description, filename, dataset, etc.
- **`--exclude-filter <pattern>`** — inverse of `--filter`.
- **`--group <name>` / `--exclude-group <name>`** — repeatable; run/skip tests in a group.
- **`--testsuite <name>` / `--exclude-testsuite <name>`** — by `phpunit.xml` suite.
- **`--covers <name>` / `--uses <name>`** — only tests intending to cover/use the target.
- **`--requires-php-extension <name>`** — only tests requiring the given PHP extension.
- **`--dirty`** — only tests with uncommitted Git changes (PHPUnit-syntax tests always count as dirty).
- **`--flaky`** — list tests marked `flaky()`.
- **`--todos`** / **`--notes`** / **`--issue <n>`** / **`--pr <n>`** — list tests by metadata.
- **`--list-suites` / `--list-groups` / `--list-tests` / `--list-test-files` / `--list-tests-xml <file>`** — enumerate
  without running.

### Execution Order & Stopping

- **`--bail`** — stop on the first non-passing test.
- **`--retry`** — run previously failed tests first; stop on first error/failure.
- **`--ci`** — ignore `->only()` focus and run the whole suite (use in CI).
- **`--order-by <order>`** — `default|defects|depends|duration|random|reverse|size` (and `no-depends`).
- **`--random-order-seed <n>`** — reproduce a random order.
- **`--stop-on-failure|-error|-defect|-warning|-risky|-deprecation|-notice|-skipped|-incomplete`** — granular stop
  conditions.

### Strictness & Failure Signaling

- **`--fail-on-warning|-risky|-deprecation|-phpunit-deprecation|-notice|-skipped|-incomplete|-empty-test-suite`** —
  escalate the named condition to a failing exit code.
- **`--strict-coverage` / `--strict-global-state` / `--disallow-test-output`** — strict-mode toggles.
- **`--dont-report-useless-tests`** — silence "this test performs no assertions" reporting.
- **`--enforce-time-limit` / `--default-time-limit <sec>`** — per-test time limits.
- **`--globals-backup` / `--static-backup`** — snapshot/restore `$GLOBALS` and static properties around each test.
- **`--cache-result` / `--do-not-cache-result`** — control the result cache that powers `--retry` and
  `--order-by defects`.

### Performance

- **`--parallel`** — run across processes (one per CPU core); **`--processes=<n>`** sets the count. Parallel tests must
  be isolated — no shared DB state, no order dependence, mind race conditions.
- **`--profile`** — report the ten slowest tests.
- **`--compact`** — print only failures (slightly faster I/O).
- **`--shard=<i>/<n>`** — run shard `i` of `n` in CI. With a committed `tests/.pest/shards.json` (generated by
  **`--update-shards`**), Pest balances shards by recorded execution time rather than file count.

### Coverage (requires Xdebug 3.0+ or PCOV)

With Xdebug, the `XDEBUG_MODE` environment variable must be `coverage`.

- **`--coverage`** — text report to stdout.
- **`--coverage --min=<pct>`** / **`--coverage --exactly=<pct>`** — enforce a threshold.
- **`--coverage --only-covered`** — hide 0%-coverage files.
- **`--coverage-html <dir>` / `--coverage-clover <file>` / `--coverage-cobertura <file>` / `--coverage-xml <dir>`** —
  report formats; also `crap4j`, `php`, `text`.
- **`--only-summary-for-coverage-text` / `--show-uncovered-for-coverage-text`** — text-report verbosity.
- **`--path-coverage`** — add path coverage to line coverage.
- **`--coverage-filter <dir>`** — include a directory in reporting; **`--no-coverage`** — ignore configured coverage;
  **`--warm-coverage-cache`** — pre-warm the static-analysis cache.
- Source code can opt out with `@codeCoverageIgnoreStart` / `@codeCoverageIgnoreEnd`; **`--disable-coverage-ignore`** —
  ignore those annotations.

### Reporting

- **`--testdox`** — human-readable per-test output; **`--testdox-summary`** repeats failures at the end;
  **`--testdox-html|-text <file>`** to log it.
- **`--log-junit <file>` / `--log-teamcity <file>` / `--teamcity`** — machine-readable logs / live TeamCity output.
- **`--log-events-text <file>` / `--log-events-verbose-text <file>`** — stream runner events; **`--no-logging`** —
  ignore logging configured in `phpunit.xml`.
- **`--display-<incomplete|skipped|deprecations|phpunit-deprecations|errors|notices|warnings>`** — show details for the
  named condition; **`--reverse-list`** — print defects in reverse order.
- **`--colors <never|auto|always>`**, **`--columns <n|max>`**, **`--stderr`**, **`--no-progress`**, **`--no-results`**,
  **`--no-output`**, **`--debug`**.

### Configuration & Init

- **`--init`** — scaffold `Pest.php` and config.
- **`-c|--configuration <file>` / `--no-configuration`** — point at / ignore `phpunit.xml`.
- **`--bootstrap <file>`**, **`--cache-directory <dir>`**, **`--test-directory <dir>`**, **`--test-suffix <list>`**
  (default `Test.php,.phpt`).
- **`--update-snapshots`** — regenerate snapshot files.
- **`-d <key[=value]>`** — set a `php.ini` value; **`--include-path <paths>`** — prepend PHP's `include_path`.
- **`--extension <class>` / `--no-extensions`** — register / skip PHPUnit test-runner extensions.
- **`--generate-configuration` / `--migrate-configuration`** — create / modernize `phpunit.xml`.
- **`--generate-baseline <file>` / `--use-baseline <file>` / `--ignore-baseline`** — record known issues
  (deprecations/notices/warnings) and suppress them on later runs.

Mutation and type-coverage flags (`--mutate`, `--type-coverage`) are documented in the advanced-features reference.

## Migrating from PHPUnit

Pest runs on the PHPUnit engine, so existing PHPUnit tests run unchanged after installing Pest. To convert class-based
tests to Pest's functional style automatically:

```bash
composer require pestphp/pest-plugin-drift --dev
./vendor/bin/pest --drift            # whole suite
./vendor/bin/pest --drift tests/Helpers   # one directory
```

Drift rewrites `extends TestCase` classes into `test()`/`it()` closures and converts `$this->assert*` to `expect()`.
Most tests convert cleanly; review the output and hand-finish anything Drift leaves with PHPUnit-style assertions.
