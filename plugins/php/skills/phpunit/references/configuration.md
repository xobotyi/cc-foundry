# Configuration Reference

PHPUnit is configured via `phpunit.xml` (or `phpunit.xml.dist` for version-controlled defaults). The XML schema is
version-specific: `https://schema.phpunit.de/11.5/phpunit.xsd`.

## Minimal Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/11.5/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
         cacheDirectory=".phpunit.cache">
    <testsuites>
        <testsuite name="unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="integration">
            <directory>tests/Integration</directory>
        </testsuite>
    </testsuites>
    <source>
        <include>
            <directory suffix=".php">src</directory>
        </include>
    </source>
</phpunit>
```

## Key `<phpunit>` Attributes

| Attribute                                 | Default   | Purpose                                                 |
| ----------------------------------------- | --------- | ------------------------------------------------------- |
| `bootstrap`                               | —         | Autoloader script path                                  |
| `colors`                                  | `false`   | Colored output                                          |
| `cacheDirectory`                          | —         | Cache dir for test results and coverage analysis        |
| `cacheResult`                             | `true`    | Cache test results for defect/duration ordering         |
| `executionOrder`                          | `default` | Test order: `default`, `random`, `depends,random`, etc. |
| `stopOnDefect`                            | `false`   | Stop on first error/failure/warning/risky               |
| `stopOnFailure`                           | `false`   | Stop on first failure                                   |
| `failOnWarning`                           | `false`   | Treat warnings as CI failures                           |
| `failOnRisky`                             | `false`   | Treat risky tests as CI failures                        |
| `failOnDeprecation`                       | `false`   | Treat deprecations as CI failures                       |
| `failOnNotice`                            | `false`   | Treat notices as CI failures                            |
| `beStrictAboutTestsThatDoNotTestAnything` | `true`    | Mark assertionless tests risky                          |
| `beStrictAboutOutputDuringTests`          | `false`   | Mark tests with output risky                            |
| `beStrictAboutCoverageMetadata`           | `false`   | Mark tests without coverage attrs risky                 |
| `processIsolation`                        | `false`   | Run each test in separate PHP process                   |
| `backupGlobals`                           | `false`   | Backup/restore global variables per test                |
| `backupStaticProperties`                  | `false`   | Backup/restore static properties per test               |

## `<testsuites>` Element

Define named test suites for selective execution (`--testsuite unit`):

```xml
<testsuites>
    <testsuite name="unit">
        <directory>tests/Unit</directory>
    </testsuite>
    <testsuite name="integration">
        <directory>tests/Integration</directory>
        <exclude>tests/Integration/Legacy</exclude>
    </testsuite>
</testsuites>
```

Discovery: files matching `*Test.php` in specified directories.

## `<source>` Element (PHPUnit 11+)

**Replaces** the old `<coverage><include>` filter. Controls both code coverage filtering and deprecation/notice/warning
source attribution.

```xml
<source restrictDeprecations="true"
        restrictNotices="true"
        restrictWarnings="true">
    <include>
        <directory suffix=".php">src</directory>
    </include>
    <exclude>
        <directory suffix=".php">src/Migrations</directory>
        <file>src/Kernel.php</file>
    </exclude>
</source>
```

- `restrictDeprecations="true"` — only report deprecations from your source code
- `restrictNotices="true"` — only report notices from your source code
- `restrictWarnings="true"` — only report warnings from your source code

**Migration from PHPUnit 10:** move `<include>`/`<exclude>` from `<coverage>` to `<source>`. `<coverage>` filter is
deprecated in 11, removed in 12.

## `<coverage>` Element

Controls code coverage report generation (not filtering — use `<source>` for that):

```xml
<coverage cacheDirectory=".phpunit.cache/coverage"
          includeUncoveredFiles="true">
    <report>
        <html outputDirectory="build/coverage"/>
        <clover outputFile="build/logs/clover.xml"/>
        <text outputFile="php://stdout"/>
    </report>
</coverage>
```

Report types: `html`, `clover`, `cobertura`, `crap4j`, `text`, `php`.

## `<php>` Element

Set PHP ini values and environment variables for the test run:

```xml
<php>
    <ini name="memory_limit" value="-1"/>
    <ini name="error_reporting" value="-1"/>
    <env name="APP_ENV" value="test"/>
    <env name="DB_DATABASE" value="testing" force="true"/>
    <var name="FIXTURE_DIR" value="tests/fixtures"/>
</php>
```

## `<extensions>` Element

Register PHPUnit extensions:

```xml
<extensions>
    <bootstrap class="Vendor\Extension\Bootstrap">
        <parameter name="key" value="value"/>
    </bootstrap>
</extensions>
```

## `<groups>` Element

Include or exclude test groups:

```xml
<groups>
    <include>
        <group>unit</group>
    </include>
    <exclude>
        <group>slow</group>
    </exclude>
</groups>
```

## Test Execution Order

Configure via `executionOrder` attribute:

- `default` — declaration order
- `random` — random order (detects hidden dependencies)
- `depends,random` — respect `#[Depends]`, randomize the rest
- `depends,defects` — defects first, then by dependency
- `depends,duration` — fastest first, then by dependency

## Recommended Strict Configuration

```xml
<phpunit
    beStrictAboutTestsThatDoNotTestAnything="true"
    beStrictAboutOutputDuringTests="true"
    beStrictAboutCoverageMetadata="true"
    failOnWarning="true"
    failOnRisky="true"
    failOnDeprecation="true"
    failOnNotice="true">
```
