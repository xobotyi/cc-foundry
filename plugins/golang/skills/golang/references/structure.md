# Go Project Structure

Package design, import conventions, and managing breaking changes.

## Key Principles

### `internal/` for Encapsulation

Code in `internal/` cannot be imported by external modules. Use aggressively:
- All server logic belongs in `internal/`
- Supporting packages not part of your public API
- Refactor freely without breaking external consumers

### `cmd/` for Commands

Use `cmd/` when a repo has both importable packages and commands:
- Each subdirectory under `cmd/` declares `package main`
- Install with `go install github.com/user/mod/cmd/tool@latest`

### Don't Overstructure

Start flat. Add directories only when:
- A package needs internal helpers (`internal/`)
- Multiple commands exist (`cmd/`)
- Sub-packages serve distinct, importable purposes

## Package Design

### Naming

- **Lowercase, no underscores**: `userstore`, not `user_store`
- **Singular**: `user`, not `users`
- **By purpose**: `auth`, `cache`, `handler`
- **Never**: `util`, `common`, `misc`, `helpers`, `types`, `models`

### Avoid Stuttering

The package name is part of every qualified reference:

```go
// Bad — reads as "http.HTTPClient"
package http
type HTTPClient struct{}

// Good — reads as "http.Client"
package http
type Client struct{}
```

## Imports

### Group Ordering

Two groups separated by blank line:
1. Standard library
2. Everything else

```go
import (
    "context"
    "fmt"
    "net/http"

    "github.com/org/repo/internal/auth"
    "go.uber.org/zap"
)
```

### Aliasing

Alias only to avoid conflicts. Prefer renaming the more local import:

```go
import (
    "runtime/trace"

    nettrace "golang.net/x/trace"
)
```

### Blank Imports

`import _ "pkg"` only in `main` packages or tests:

```go
// main.go — register database driver
import _ "github.com/lib/pq"
```

### Dot Imports

Use only in test files to resolve circular dependencies:

```go
package foo_test

import (
    "bar/testutil" // imports "foo"
    . "foo"        // pretend to be in package foo
)
```

## Function Organization

Within a file, order by:
1. Types, constants, variables
2. Constructor (`New...`)
3. Exported methods (grouped by receiver)
4. Unexported methods (grouped by receiver)
5. Utility functions

Order functions by rough call order — readers going top-to-bottom should encounter
callers before callees.

## File Organization

- One file per major type (for large types)
- Test file adjacent: `foo.go` → `foo_test.go`
- Keep related code together — don't scatter a feature across files
- `doc.go` for package-level documentation if needed

## Backward-Incompatible Changes

When breaking backward compatibility, follow a staged workflow:

1. **Add new code** without touching the old (e.g., new method alongside existing one)
2. **Migrate callers** from old to new
3. **Remove old code** when no use cases remain

Each step should be a separate commit. Never combine breaking changes with new
functionality — reviewers and `git bisect` need clean boundaries.

For versioned packages, use directory-based versioning:

```
lib/auth/v1/  # original version
lib/auth/v2/  # breaking changes
```

Both versions coexist until all consumers migrate to v2.
