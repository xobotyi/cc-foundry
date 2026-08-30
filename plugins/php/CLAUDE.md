# php Plugin

PHP language discipline: conventions, modern idioms, type system, OOP patterns, testing practices, and LSP-powered code
intelligence via Intelephense.

## Skills

- **`php`** — the whole PHP language surface: naming, type declarations, enums, OOP, closures, error handling, PER-CS
  formatting, Composer packaging, and LSP navigation routing
- **`phpunit`** — PHPUnit 11+ conventions, and the home of shared testing doctrine for this plugin
- **`pest`** — Pest 4 conventions, as a layer over `phpunit`

## LSP Integration

- **LSP routing rules live in the `php` skill.** This plugin ships the server config (`.lsp.json`, Intelephense, `.php`
  and `.phtml`), so it owns the LSP-versus-Grep routing

## Skill Dependencies

- **Testing doctrine has one home — `phpunit`.** `pest` owns Pest's functional API and Pest-only features (`expect()`,
  datasets, architecture/mutation/type-coverage/browser testing, `Pest.php`) and defers shared testing philosophy, the
  PHPUnit assertion/double API, coverage attributes, and `phpunit.xml` internals to `phpunit`
- **Which testing skill governs a project:** a `Pest.php`, `pestphp/pest` in `composer.json`, or function-style tests →
  `pest`; class-based tests (`extends TestCase`) → `phpunit`

## Plugin Scope

- All three skills assume `the-coder` for language-agnostic coding discipline (discovery, planning, verification)
- Framework-specific conventions (Laravel, Symfony) are out of scope — the skills are framework-agnostic by design

## Conventions

- PHP 8.5+ is the baseline for all three skills
- No static analysis tool opinions (PHPStan/Psalm) — projects choose their own
- No code style tool opinions (PHP-CS-Fixer/PHPCS) — PSR conventions inline
