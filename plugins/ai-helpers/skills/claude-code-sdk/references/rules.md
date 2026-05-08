# Rules

Rules are modular markdown files in `.claude/rules/` that extend project memory beyond a single `CLAUDE.md`. Unlike
skills (which load on demand) and CLAUDE.md (a single file per scope), rules are a first-class memory primitive: many
small files, each covering one topic, optionally scoped to file patterns via the `paths:` frontmatter field.

Rules and skills share the same `paths:` mechanic — same field, same syntax, same glob semantics. The shared field is
documented end-to-end here and cross-referenced from [`skills.md`](skills.md).

## Locations and Scope

Rules live in two well-known directories. Both are discovered at session start.

| Scope        | Location                | Purpose                                  | Loaded for       |
| :----------- | :---------------------- | :--------------------------------------- | :--------------- |
| **Project**  | `.claude/rules/*.md`    | Team-shared topical instructions         | All team members |
| **Personal** | `~/.claude/rules/*.md`  | Personal preferences across all projects | Just you         |
| **Added**    | `<dir>/.claude/rules/*` | Loaded only when the env var below is on | All team / you   |

User-level rules load **before** project rules, so project rules take precedence when guidance conflicts. Within a
single scope, ordering between sibling rule files is not guaranteed — write each rule to be self-contained.

`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` opt-in extends discovery to `.claude/rules/*.md` inside any directory
passed via `--add-dir`, alongside `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md`.

## Discovery

All `.md` files inside `.claude/rules/` are discovered **recursively**. Subdirectories are supported and encouraged for
organization:

```text
your-project/
└── .claude/
    ├── CLAUDE.md
    └── rules/
        ├── code-style.md
        ├── testing.md
        ├── security.md
        ├── frontend/
        │   ├── react.md
        │   └── css.md
        └── backend/
            ├── api-design.md
            └── database.md
```

Symlinks are followed (with cycle detection), so a single shared rule directory can be linked into many projects:

```bash
ln -s ~/shared-claude-rules .claude/rules/shared
ln -s ~/company-standards/security.md .claude/rules/security.md
```

## Loading Modes

A rule loads in one of two modes depending on whether its frontmatter declares a `paths:` field.

### Mode 1 — Unconditional (no `paths:` frontmatter)

Loaded into context at session start. Same priority as `.claude/CLAUDE.md`. Applies to every turn regardless of which
files are touched. Use this for rules that should always be in scope.

```markdown
# Code Style

- Tabs are 4 spaces.
- Functions named `verb_noun`.
- Errors returned, never thrown.
```

No frontmatter required. The file is loaded verbatim and concatenated with `CLAUDE.md` in the launch-time instruction
block.

### Mode 2 — Conditional (`paths:` frontmatter present)

Not loaded at launch. Lazily injected when Claude reads or writes a file matching one of the listed glob patterns. Use
this to scope domain-specific guidance (e.g. API conventions, test patterns) so it costs no context until relevant.

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All API endpoints must include input validation.
- Use the standard error response format.
- Include OpenAPI documentation comments.
```

Trigger semantics: a path-scoped rule fires when Claude **reads files matching the pattern**, not on every tool use.
Once injected, the rule stays in context for the rest of the session.

## `paths:` Field Syntax

Accepts a comma-separated string **or** a YAML list of globs. Both forms have shipped since well before v2.1.84; the
v2.1.84 release explicitly added the YAML-list form to both rules and skills frontmatter.

```yaml
# YAML list (preferred for multi-pattern)
---
paths:
  - "src/**/*.{ts,tsx}"
  - "lib/**/*.ts"
  - "tests/**/*.test.ts"
---
```

```yaml
# Comma-separated string (concise for single-line)
---
paths: "src/**/*.ts, tests/**/*.test.ts"
---
```

Brace expansion is supported in glob patterns to match multiple extensions in one entry.

| Pattern                | Matches                                  |
| :--------------------- | :--------------------------------------- |
| `**/*.ts`              | All TypeScript files in any directory    |
| `src/**/*`             | All files under `src/`                   |
| `*.md`                 | Markdown files in the project root only  |
| `src/components/*.tsx` | React components in a specific directory |
| `src/**/*.{ts,tsx}`    | TS or TSX anywhere under `src/`          |

The same syntax applies to the [`paths:` field on skills](skills.md#paths-and-conditional-activation). Treat them as one
shared mechanic with two attachment points.

## Frontmatter Reference

Rules support a minimal frontmatter — only `paths:` is meaningful today. All other fields are ignored.

```yaml
---
paths:
  - "src/**/*.ts"
---
```

| Field   | Required | Description                                                                                |
| :------ | :------- | :----------------------------------------------------------------------------------------- |
| `paths` | No       | Comma-separated string or YAML list of globs. Switches the rule into conditional-load mode |

Omitting `paths:` (or the entire frontmatter block) loads the rule unconditionally at launch.

## Rules vs CLAUDE.md vs Skills

| Mechanism       | Loaded when             | Scope      | Use for                                          |
| :-------------- | :---------------------- | :--------- | :----------------------------------------------- |
| `CLAUDE.md`     | Session start (always)  | Whole tree | Project-wide conventions, build/test commands    |
| Rule (no paths) | Session start (always)  | Whole tree | Same as CLAUDE.md, split into one topic per file |
| Rule (paths)    | When matching file read | File globs | Domain rules that only matter for some files     |
| Skill           | Auto-match or manual    | Per-task   | Reusable procedures, reference content on demand |

Rules and CLAUDE.md are advisory context — Claude reads them but compliance is best-effort. For guaranteed execution,
use [hooks](hooks.md). For task-specific procedures that should not always be in context, use [skills](skills.md).

## InstructionsLoaded Hook

The `InstructionsLoaded` hook event fires every time a rule or `CLAUDE.md` file enters context. Use it for audit
logging, compliance tracking, or debugging which rules actually loaded for a given session.

### Matcher Values

The matcher runs against the `load_reason` field of the hook input.

| Matcher            | Fires when                                                                  |
| :----------------- | :-------------------------------------------------------------------------- |
| `session_start`    | Files loaded at session start (CLAUDE.md, rules without `paths:`)           |
| `nested_traversal` | Lazy load when Claude accesses a subdirectory containing a nested CLAUDE.md |
| `path_glob_match`  | Lazy load when a rule with `paths:` frontmatter matches a touched file      |
| `include`          | File pulled in via `@path` import directive in another instruction file     |
| `compact`          | File re-loaded after a compaction event                                     |

Pipe-delimited combinations work: `"matcher": "path_glob_match|nested_traversal"` fires only for the two lazy-load
reasons.

### Supported Hook Types

`type: "command"` and `type: "mcp_tool"` only. Prompt and agent hook types are **not** supported for
`InstructionsLoaded`.

### Blocking

`InstructionsLoaded` cannot block. It runs asynchronously for observability. Returning `decision: "block"` or exit-code
2 is ignored. Use the event for audit logging, compliance tracking, or debugging — never for enforcement.

### Input Schema

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/me/proj/.claude/projects/.../transcript.jsonl",
  "cwd": "/Users/me/proj",
  "hook_event_name": "InstructionsLoaded",
  "file_path": "/Users/me/proj/.claude/rules/api.md",
  "memory_type": "Project",
  "load_reason": "path_glob_match",
  "globs": ["src/api/**/*.ts"],
  "trigger_file_path": "/Users/me/proj/src/api/handlers/users.ts"
}
```

| Field               | Type   | Description                                                                                  |
| :------------------ | :----- | :------------------------------------------------------------------------------------------- |
| `file_path`         | string | Absolute path to the instruction file that was loaded                                        |
| `memory_type`       | string | Scope of the file: `"User"`, `"Project"`, `"Local"`, or `"Managed"`                          |
| `load_reason`       | string | One of `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`          |
| `globs`             | array  | Glob patterns from the file's `paths:` frontmatter. Present only for `path_glob_match` loads |
| `trigger_file_path` | string | Path to the file whose access triggered this load. Present for lazy loads                    |
| `parent_file_path`  | string | Path to the parent instruction file that included this one. Present for `include` loads      |

Plus the common fields: `session_id`, `transcript_path`, `cwd`, `hook_event_name`.

### Use Cases

- **Debug rule loading** — log every `InstructionsLoaded` event to verify path-scoped rules fire on the expected files.
- **Audit instruction provenance** — record which managed/project/user files contribute to each session for compliance
  reviews.
- **Detect missing rules** — flag a session where a rule expected by `paths:` never loaded (no matching files touched).

## Sharing Rules Across Projects

Three patterns:

1. **Symlink a shared directory** — `ln -s ~/shared-claude-rules .claude/rules/shared`. Updates propagate automatically.
2. **Symlink individual files** — `ln -s ~/company-standards/security.md .claude/rules/security.md`. Granular sharing.
3. **User-level rules** — drop the rule into `~/.claude/rules/` to apply it to every project on the machine without
   touching individual repos.

User-level rules load before project rules. Project rules win on conflict.

## Excluding Rules

In monorepos, `claudeMdExcludes` (set in any settings layer) skips specific rule paths via absolute-path globs:

```json
{
  "claudeMdExcludes": ["/home/user/monorepo/other-team/.claude/rules/**"]
}
```

Patterns merge across settings layers. Managed-policy CLAUDE.md and rules cannot be excluded.

## Troubleshooting

- **Rule not loading at launch** — check that no `paths:` field is set. With `paths:`, rules are lazy-loaded.
- **Path-scoped rule never fires** — verify glob syntax against an actual file path Claude reads. Use
  `InstructionsLoaded` with `path_glob_match` matcher to log every match.
- **Rule loaded but ignored** — rules are advisory. Make instructions concrete and verifiable (e.g. "use 2-space
  indentation" not "format code well"). For guaranteed enforcement, route the rule into a hook.
- **Print mode (`claude -p`) skips rules** — fixed in v2.1.69. Earlier versions did not load conditional rules in
  headless mode.
