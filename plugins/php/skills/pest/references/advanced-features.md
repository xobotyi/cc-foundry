# Advanced Testing Modes

Pest's specialized testing modes beyond unit/feature tests. Each is opt-in; several require a plugin or coverage driver.
The SKILL.md names these one-liners — this reference holds the working detail for when a task actually uses one.

## Mutation Testing

Introduces small changes ("mutations") into source and re-runs the covering tests. If a mutation survives (tests still
pass), the tests don't actually assert that behavior. Requires **Xdebug 3.0+** or **PCOV**.

Scope what a test covers with `covers()` or `mutates()` at the top of the file, then run `--mutate`:

```php
covers(TodoController::class); // or mutates(TodoController::class);

it('lists todos', function () {
    Todo::factory()->create(['name' => 'Buy milk']);
    $this->getJson('/todos')->assertStatus(200)->assertJson([['name' => 'Buy milk']]);
});
```

```bash
./vendor/bin/pest --mutate --parallel
```

`covers()` and `mutates()` behave identically for mutations; `covers()` additionally filters the coverage report to the
referenced code. Output reports each mutation as `tested` or `untested` plus a score; 100% means every mutation was
caught. Untested mutations mean missing assertions or edge cases.

- **`--mutate --min=40`** — fail if the mutation score is below the threshold.
- **`--mutate --covered-only`** — only mutate lines already covered by tests.
- **`--mutate --everything`** — mutate all classes, bypassing `covers()` (resource-intensive; pair with
  `--covered-only --parallel`).
- **`--mutate --class=App\Models` / `--ignore=App\Http\Requests`** — scope or exclude classes.
- **`--mutate --bail` / `--stop-on-untested` / `--stop-on-uncovered`** — stop early on the first problem.
- **`--mutate --retry`** — run previously untested/uncovered mutations first, stop on first failure.
- **`--mutate --id=<hash>`** — re-run a single mutation (pass the same options as the original run).
- **`--mutate --profile`** — report the ten slowest mutations.
- **`--mutate --min=<n> --ignore-min-score-on-zero-mutations`** — don't fail the threshold when nothing was mutated.
- **`--mutate --clear-cache` / `--no-cache`** — control the mutation cache.
- **`@pest-mutate-ignore`** — line comment or docblock annotation to exclude code (e.g. validation-rule arrays, model
  `$guarded`/`$hidden` properties) from mutation.

## Type Coverage

Measures the percentage of code carrying type declarations — no tests required, static analysis only. Install the
plugin:

```bash
composer require pestphp/pest-plugin-type-coverage --dev
./vendor/bin/pest --type-coverage
```

Untyped spots are reported by line and kind (`rt31` = missing return type on line 31, `pa31` = missing parameter type).

- **`--type-coverage --min=100`** — enforce a threshold.
- **`--type-coverage --compact`** — show only files below 100%.
- **`--type-coverage --type-coverage-json=report.json`** — write a report file.
- **`@pest-ignore-type`** — annotation to skip a specific line.

## Snapshot Testing

Compares a value against a stored snapshot, failing when output changes unexpectedly. Snapshots live in
`tests/.pest/snapshots`; the first run creates them.

```php
it('renders the contact page', function () {
    expect($this->get('/contact'))->toMatchSnapshot();
});
```

- **`--update-snapshots`** — regenerate snapshots after intentional output changes.
- For dynamic data (CSRF tokens, timestamps), normalize it with an expectation pipe before comparison:
  `expect()->pipe('toMatchSnapshot', fn (Closure $next) => /* mutate $this->value */ $next())`.

Snapshots make assertions opaque — prefer explicit expectations for behavior you can name. Reserve snapshots for large,
stable, structural output (rendered HTML, serialized payloads).

## Stress Testing (Stressless)

Load-tests a URL via the k6 engine. Install the plugin (the k6 binary downloads on first use):

```bash
composer require pestphp/pest-plugin-stressless --dev
```

**Command form** — quick, no assertions, prints a summary:

```bash
./vendor/bin/pest stress example.com --duration=5 --concurrency=5
# HTTP method options: --get --head --options[=payload] --patch[=payload] --put[=payload] --post=payload --delete
```

**Function form** — `stress()` returns a result you assert against with the expectation API, so performance regressions
fail CI:

```php
use function Pest\Stressless\stress;

it('has a fast response time', function () {
    $result = stress('example.com')->concurrently(requests: 2)->for(5)->seconds(); // default: 1 request, 10s

    expect($result->requests()->duration()->med())->toBeLessThan(100); // ms
});
```

- HTTP verbs mirror the CLI (`->get()`, `->post([...])`, `->put()`, ...); `->headers([...])` sets request headers;
  `->dd()` / `->dump()` / `->verbosely()` inspect the result.
- Result metrics: `requests()->count()` / `->rate()`, `requests()->failed()->count()` / `->rate()`, and duration stats
  (`med()`/`min()`/`max()`/`p90()`/`p95()`) on `requests()->duration()` and on the `ttfb()`, `dnsLookup()`,
  `tlsHandshaking()`, `download()`, `upload()` segments; transfer volume via `download()`/`upload()` `->data()->count()`
  / `->rate()`; run facts via `testRun()->concurrency()` / `->duration()`.

Concurrency is the number of constantly-maintained concurrent requests until the duration elapses — keep it modest to
avoid tripping rate limits or firewalls.

## Browser Testing (Pest 4)

Drives a real browser via Playwright. Install the plugin and Playwright:

```bash
composer require pestphp/pest-plugin-browser --dev
npm install playwright@latest
npx playwright install
```

Add `tests/Browser/Screenshots` to `.gitignore`. `visit($url)` returns a page you interact with and assert on fluently:

```php
it('signs in the user', function () {
    $page = visit('/');

    $page->click('Sign In')
        ->assertUrlIs('/login')
        ->fill('email', 'nuno@laravel.com')
        ->fill('password', 'password')
        ->click('Submit')
        ->assertSee('Dashboard');
});
```

- **Element selectors** — text (`'Login'`), CSS (`.btn-primary`, `#submit`), or the `@name` data-test attribute
  shorthand.
- **Navigation** — `navigate('/about')` keeps the browser context; pass an array to `visit(['/', '/about'])` to drive
  multiple pages and destructure the result.
- **Browsers / devices** — `--browser firefox|safari` on the CLI, or `pest()->browser()->inFirefox()` in `Pest.php`;
  `visit('/')->on()->mobile()` or device presets like `->on()->iPhone14Pro()`.
- **Context** — `->inDarkMode()`, `->geolocation($lat, $lng)`, `->from()->losAngeles()`, `->withLocale('fr-FR')`,
  `->withTimezone('America/New_York')`, `->withUserAgent('Googlebot')`, `->withHost('sub.localhost')`.
- **Interactions** — `click`, `fill`, `type` / `typeSlowly`, `append`, `clear`, `keys` (supports `{Control}`-style
  shortcuts), `withKeyDown`, `select`, `radio`, `check` / `uncheck`, `attach` (file upload), `press` /
  `pressAndWaitFor`, `drag`, `hover`, `submit`, `withinFrame`, `resize`, `script`, `wait` / `waitForKey`; read values
  with `text`, `attribute`, `value`, `content`, `url`.
- **Smoke assertions** — `assertNoSmoke()`, `assertNoJavaScriptErrors()`, `assertNoConsoleLogs()`,
  `assertNoAccessibilityIssues()` catch regressions without naming specific content.
- **Content assertions** — `assertSee` / `assertDontSee`, `assertSeeIn` / `assertDontSeeIn`, `assertSeeAnythingIn` /
  `assertSeeNothingIn`, `assertSeeLink` / `assertDontSeeLink`, `assertCount`, `assertTitle` / `assertTitleContains`,
  `assertSourceHas` / `assertSourceMissing`, `assertScript`.
- **Element-state assertions** — `assertVisible` / `assertPresent` / `assertNotPresent` / `assertMissing`,
  `assertEnabled` / `assertDisabled`, `assertButtonEnabled` / `assertButtonDisabled`, `assertChecked` /
  `assertNotChecked` / `assertIndeterminate`, `assertRadioSelected` / `assertRadioNotSelected`, `assertSelected` /
  `assertNotSelected`, `assertValue` / `assertValueIsNot`, `assertAttribute` / `assertAttributeMissing` /
  `assertAttributeContains` / `assertAttributeDoesntContain`, `assertAriaAttribute`, `assertDataAttribute`.
- **URL assertions** — `assertUrlIs`, `assertSchemeIs(Not)`, `assertHostIs(Not)`, `assertPortIs(Not)`,
  `assertPathIs(Not)` / `assertPathBeginsWith` / `assertPathEndsWith` / `assertPathContains`, `assertQueryStringHas` /
  `assertQueryStringMissing`, `assertFragmentIs` / `assertFragmentIsNot` / `assertFragmentBeginsWith`.
- **Screenshots** — `assertScreenshotMatches()` for visual regression; `screenshot()` / `screenshotElement('#el')` for
  debugging captures.
- **Timeouts** — default 5s; set `pest()->browser()->timeout(10000)` in `Pest.php`. Run with `--parallel` for speed,
  `--debug` for a headed, pause-on-failure run.
