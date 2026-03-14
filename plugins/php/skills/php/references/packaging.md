# PHP Packaging and Project Structure

## Composer

Composer is the standard dependency manager for PHP. The `composer.json` file is the single source of truth for project
metadata, dependencies, and autoloading.

### composer.json Essentials

```json
{
    "name": "vendor/package",
    "description": "Package description",
    "type": "project",
    "license": "MIT",
    "require": {
        "php": ">=8.5",
        "vendor/dependency": "^2.0"
    },
    "require-dev": {
        "phpunit/phpunit": "^11.0"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    },
    "autoload-dev": {
        "psr-4": {
            "App\\Tests\\": "tests/"
        }
    }
}
```

### Key Fields

- **name** — `vendor/package` format, lowercase, hyphens for word separation
- **type** — `library` (default), `project`, `metapackage`, `composer-plugin`
- **require** — production dependencies with version constraints
- **require-dev** — development-only dependencies (testing, linting, analysis)
- **autoload** — PSR-4 namespace-to-directory mappings
- **autoload-dev** — development-only autoload mappings
- **scripts** — custom commands (`"test": "phpunit"`, `"lint": "php-cs-fixer fix"`)
- **config** — `sort-packages: true`, `optimize-autoloader: true`

### Version Constraints

- **`^2.0`** — compatible with 2.x (>=2.0, <3.0) — preferred for most dependencies
- **`~2.1`** — next significant release (>=2.1, <2.2 for patch, or >=2.1, <3.0 for minor)
- **`>=2.0 <3.0`** — explicit range
- **`2.0.*`** — wildcard
- **`dev-main`** — branch reference (use only in root package)

Prefer `^` (caret) for dependencies — it allows minor and patch updates while preventing breaking changes.

### Commands

- **`composer install`** — install from lock file (CI, production)
- **`composer update`** — update dependencies, regenerate lock file (development)
- **`composer require vendor/package`** — add dependency
- **`composer require --dev vendor/package`** — add dev dependency
- **`composer dump-autoload -o`** — regenerate optimized autoloader
- **`composer run-script test`** — run defined script

### Lock File

- `composer.lock` MUST be committed for applications/projects
- `composer.lock` SHOULD NOT be committed for libraries
- `composer install` reads the lock file for reproducible builds
- `composer update` regenerates the lock file

## PSR-4 Autoloading

The standard autoloading mechanism. Maps namespace prefixes to base directories.

```
Fully Qualified Class Name:  App\Http\Controller\UserController
Namespace Prefix:            App\
Base Directory:              src/
Resulting File Path:         src/Http/Controller/UserController.php
```

Rules:

- Namespace separators map to directory separators
- Filename must match class name exactly (case-sensitive)
- One class per file
- File extension is `.php`

## Project Layout

### Application

```
my-project/
├── composer.json
├── composer.lock
├── src/
│   ├── Controller/
│   ├── Service/
│   ├── Repository/
│   ├── Entity/
│   └── Exception/
├── tests/
│   ├── Unit/
│   ├── Integration/
│   └── bootstrap.php
├── config/
├── public/
│   └── index.php
├── var/
│   ├── cache/
│   └── log/
└── vendor/
```

### Library

```
my-library/
├── composer.json
├── src/
│   └── MyLibrary/
│       ├── Client.php
│       ├── Exception/
│       └── ...
├── tests/
│   └── ...
└── vendor/
```

## File Header Order (PER-CS)

Every PHP file follows this structure:

1. Opening `<?php` tag (own line)
2. File-level docblock (optional)
3. `declare(strict_types=1);`
4. Namespace declaration
5. Class-based `use` imports
6. Function-based `use` imports
7. Constant-based `use` imports
8. Code

Each block separated by a single blank line. Import statements must be fully qualified (no leading backslash).

```php
<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Psr\Log\LoggerInterface;

class UserService
{
    // ...
}
```

## Namespace Conventions

- Vendor namespace as top level: `Vendor\Package\...`
- One class per file, class name matches filename
- Directory structure mirrors namespace structure
- Use compound `use` statements sparingly — max 2 sub-namespace levels in groups
- Never `use` with a leading backslash — imports are always fully qualified

## Scripts and Automation

Define common tasks in `composer.json` scripts:

```json
{
    "scripts": {
        "test": "phpunit",
        "test:coverage": "phpunit --coverage-html var/coverage",
        "lint": "php-cs-fixer fix --dry-run --diff",
        "lint:fix": "php-cs-fixer fix",
        "analyse": "phpstan analyse"
    }
}
```

Run with `composer run-script test` or shorthand `composer test`.
