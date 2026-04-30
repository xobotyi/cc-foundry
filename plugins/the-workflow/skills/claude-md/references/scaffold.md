# CLAUDE.md Scaffold and Section Ordering

## Canonical Section Order

Models follow a U-shaped attention curve: beginning and end are followed most reliably. This ordering exploits that
pattern — project identity anchors the top, critical constraints and verification anchor the bottom.

### 1. Project Identity (Prose — Top 10-15%)

Brief prose introduction: what the project is, why it exists, what Claude's role is. This is the one place where
explaining _why_ earns its tokens — understanding project intent helps the model make correct judgment calls on edge
cases where rules don't cover the situation.

```markdown
# my-project

A real-time event processing pipeline for payment fraud detection. Processes ~2M events/day
through a rules engine with sub-100ms p99 latency requirement.
```

### 2. Structure Map

Directory tree or bullet list showing key directories, module boundaries, and entry points. Not every file — just enough
to orient Claude when navigating the codebase.

```markdown
## Structure

\`\`\`
my-project/
├── cmd/              # CLI entrypoints
├── internal/
│   ├── engine/       # Rules engine core
│   ├── pipeline/     # Event processing pipeline
│   └── store/        # Persistence layer (Postgres + Redis)
├── api/              # gRPC service definitions
└── deploy/           # Kubernetes manifests
\`\`\`
```

### 3. Stack and Tooling

Frameworks, test runners, package managers, build tools, CI system. Bullet list. Only include what Claude needs to know
to produce correct commands and code — skip obvious defaults.

```markdown
## Stack

- Go 1.24, module-based
- gRPC with buf for proto management
- Postgres 17 + pgx driver (no ORM)
- Redis 7 for hot state cache
- Testify for assertions, `go test ./...` for all tests
- `buf generate` for proto codegen, `make lint` for golangci-lint
```

### 4. Conventions (Bullets — Middle 70-80%)

Coding rules organized by topic. Each convention must be specific enough that Claude can verify compliance. Group by
concern — don't mix testing rules with naming rules.

```markdown
## Conventions

**Naming:**
- Package names are singular: `store`, not `stores`
- Interface names don't use `I` prefix: `EventProcessor`, not `IEventProcessor`
- Test files use `_test.go` suffix (standard), test helpers go in `testutil/`

**Error handling:**
- Wrap errors with `fmt.Errorf("context: %w", err)` — always add context
- Never `_ = someFunc()` — handle or explicitly document why it's safe to ignore
- Domain errors are typed: `var ErrNotFound = errors.New("not found")`

**Database:**
- All queries use parameterized arguments — no string concatenation
- Migrations in `store/migrations/`, sequential numbering, always reversible
```

### 5. Verification Workflow

Commands to run before committing. Exact command names — not "ensure quality" but the literal commands.

```markdown
## Verification

Run before committing:
- `make lint` — golangci-lint with project config
- `go test ./...` — all unit tests
- `make integration` — integration tests (requires local Postgres + Redis)
- `buf lint` — proto file validation
```

### 6. Critical Constraints (Bottom — Reinforcement Zone)

"Never" / "always" rules. Things Claude would get wrong without being told. Place at the bottom to exploit recency bias.
If a constraint is critical enough, state it both in the relevant conventions section AND here.

```markdown
## Critical Constraints

- Never modify `internal/engine/rules.go` without updating `engine_test.go` — the rules engine
  has 100% branch coverage and regressions are caught by CI
- Always run `buf generate` after changing `.proto` files — generated code is committed
- Redis keys use `fraud:` prefix — never write keys without it (shared cluster)
- Latency budget: no single operation may exceed 50ms — profile before adding IO calls
```

## Creation Workflow

When creating a CLAUDE.md from scratch:

1. **Detect project signals.** Read `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `Makefile`, `Dockerfile`,
   CI configs, and similar. These reveal the stack, test runner, build tools, and project structure.

2. **Map the directory structure.** Run `find` or `ls -R` to identify key directories. Focus on module boundaries and
   entry points, not every file.

3. **Identify non-obvious conventions.** Look at existing code patterns that differ from language defaults — naming
   styles, error handling patterns, import conventions. Check linter configs (`.eslintrc`, `golangci.yml`,
   `.prettierrc`) for enforced rules.

4. **Draft the skeleton.** Follow the canonical section order above. Start minimal — 50-100 lines covering identity,
   structure, stack, and basic conventions.

5. **Apply the deletion test immediately.** Before delivering, remove every instruction where Claude's default behavior
   is already correct. Don't include "use meaningful variable names" or "write tests for new code" — Claude does these
   without being told.

6. **Iterate from usage.** A CLAUDE.md created from static analysis is a starting point. The real improvements come from
   observing where Claude gets things wrong during actual work — those failures reveal the non-obvious conventions that
   need documenting.

## Monorepo Scaffold

For monorepos, the root CLAUDE.md provides project-wide orientation and shared conventions. Package-specific details go
in either:

- **Nested CLAUDE.md** (`packages/api/CLAUDE.md`) — always loads when Claude works in that subtree. Good for team-owned
  conventions colocated with code. No conditional loading.
- **`.claude/rules/`** with glob-scoped frontmatter — loads on-demand when Claude reads matching files. Centralized at
  project root. Good for cross-cutting conventions scoped by file type.

```markdown
# my-monorepo

Monorepo for the Payments platform. Three packages share common conventions
defined here; package-specific rules live in each package's CLAUDE.md.

## Structure

\`\`\`
my-monorepo/
├── packages/
│   ├── api/           # REST API (Express + TypeScript)
│   ├── worker/        # Queue consumer (Node.js)
│   └── shared/        # Shared types and utilities
├── .claude/
│   └── rules/
│       ├── api.md     # paths: ["packages/api/**/*"] — API-specific conventions
│       └── worker.md  # paths: ["packages/worker/**/*"] — worker-specific conventions
└── CLAUDE.md          # This file — shared conventions
\`\`\`

## Shared Conventions

- TypeScript strict mode, no `any` without `// eslint-disable-next-line` + justification
- All packages use Vitest: `pnpm --filter <package> test`
- Shared types live in `packages/shared/` — never duplicate type definitions across packages

[Package-specific conventions in each package's CLAUDE.md]
```

The root file should NOT restate conventions from nested CLAUDE.md files. State shared rules once at root; state
package-specific rules once in the package. If both say something about the same topic, Claude gets contradictory
signals.
