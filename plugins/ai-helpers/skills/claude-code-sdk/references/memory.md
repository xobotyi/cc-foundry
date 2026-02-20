# Memory Management Reference

Claude Code persists instructions across sessions using two mechanisms:

- **CLAUDE.md files**: Markdown files you write with instructions, rules, and preferences
- **Auto memory**: Notes Claude writes for itself based on what it discovers during sessions

Both load into context at session start. More specific instructions take precedence over broader ones.

## Memory Hierarchy

| Memory Type            | Location                                           | Purpose                                | Shared With                      |
|------------------------|----------------------------------------------------|----------------------------------------|----------------------------------|
| Managed policy         | System paths (see below)                           | Organization-wide instructions         | All users in organization        |
| Project memory         | `./CLAUDE.md` or `./.claude/CLAUDE.md`             | Team-shared project instructions       | Team via source control          |
| Project rules          | `./.claude/rules/*.md`                             | Modular topic-specific instructions    | Team via source control          |
| User memory            | `~/.claude/CLAUDE.md`                              | Personal preferences for all projects  | Just you (all projects)          |
| Project memory (local) | `./CLAUDE.local.md`                                | Personal project-specific preferences  | Just you (current project)       |
| Auto memory            | `~/.claude/projects/<project>/memory/`             | Claude's automatic notes and learnings | Just you (per project)           |

**Managed policy paths:**

- macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`
- Linux: `/etc/claude-code/CLAUDE.md`
- Windows: `C:\Program Files\ClaudeCode\CLAUDE.md`

**Loading behavior:**

- CLAUDE.md files in parent directories (up to cwd) are loaded in full at launch
- CLAUDE.md files in child directories load on demand when Claude reads files in those subtrees
- `CLAUDE.local.md` is automatically added to `.gitignore`

## Auto Memory

Claude automatically saves learnings, patterns, and insights as it works. Unlike CLAUDE.md
(instructions you write for Claude), auto memory contains notes Claude writes for itself.

**Storage:** `~/.claude/projects/<project>/memory/` — derived from git repository root,
so all subdirectories share one memory directory. Git worktrees get separate directories.
Outside a git repo, the working directory is used instead.

**Structure:**

```
~/.claude/projects/<project>/memory/
├── MEMORY.md          # Index file, first 200 lines loaded into every session
├── debugging.md       # Topic files loaded on demand
├── patterns.md
└── ...
```

**Behavior:**

- First 200 lines of `MEMORY.md` injected into system prompt at session start
- Content beyond 200 lines not loaded automatically — move detailed notes to topic files
- Topic files read on demand via standard file tools (not loaded at startup)
- Claude reads and writes memory files during sessions

**Control:**

```bash
export CLAUDE_CODE_DISABLE_AUTO_MEMORY=1  # Force off
export CLAUDE_CODE_DISABLE_AUTO_MEMORY=0  # Force on (opt in during rollout)
```

Manage via `/memory` command or tell Claude directly: "remember that we use pnpm".

## Import Syntax

CLAUDE.md files can import additional files using `@path/to/import`:

```markdown
See @README for project overview and @package.json for available npm commands.

# Additional Instructions
- git workflow @docs/git-instructions.md
- Personal overrides @~/.claude/my-project-instructions.md
```

**Rules:**

- Both relative and absolute paths allowed; relative paths resolve relative to the importing file
- Home directory paths (`~/.claude/...`) work — useful for sharing instructions across worktrees
- Imports not evaluated inside code spans/blocks
- Recursive imports supported (max 5 hops)
- First encounter of external imports triggers one-time approval dialog per project; once
  declined, imports remain disabled for that project
- Run `/memory` to see all loaded memory files

## Memory Lookup

Claude Code reads memories recursively:

1. Starting in cwd, recurses up to (but not including) root `/`
2. Reads any `CLAUDE.md` or `CLAUDE.local.md` found along the way
3. Discovers nested CLAUDE.md in subtrees when reading files in those directories

### Load from Additional Directories

The `--add-dir` flag gives access to additional directories. To also load memory files from
those directories:

```bash
CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../shared-config
```

## Commands

| Command   | Action                                              |
|-----------|-----------------------------------------------------|
| `/memory` | Open any memory file in system editor; see loaded files |
| `/init`   | Bootstrap a CLAUDE.md for the current project       |

## Modular Rules with `.claude/rules/`

Organize instructions into multiple focused files:

```
your-project/
├── .claude/
│   ├── CLAUDE.md           # Main project instructions
│   └── rules/
│       ├── code-style.md
│       ├── testing.md
│       └── security.md
```

All `.md` files in `.claude/rules/` loaded as project memory (same priority as
`.claude/CLAUDE.md`). Files are discovered recursively; subdirectories are supported.

### Path-Specific Rules

Scope rules to specific files using YAML frontmatter:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All API endpoints must include input validation
- Use the standard error response format
```

Rules without `paths` field apply to all files.

### Glob Patterns

| Pattern                | Matches                                |
|------------------------|----------------------------------------|
| `**/*.ts`              | All TypeScript files in any directory  |
| `src/**/*`             | All files under `src/`                 |
| `*.md`                 | Markdown files in project root         |
| `src/components/*.tsx` | React components in specific directory |

Multiple patterns and brace expansion:

```yaml
---
paths:
  - "src/**/*.{ts,tsx}"
  - "{src,lib}/**/*.ts"
  - "tests/**/*.test.ts"
---
```

### Symlinks

Share common rules across projects:

```bash
ln -s ~/shared-claude-rules .claude/rules/shared
ln -s ~/company-standards/security.md .claude/rules/security.md
```

Circular symlinks handled gracefully.

### User-Level Rules

Personal rules in `~/.claude/rules/` apply to all projects. Loaded before project rules
(project rules have higher priority).

## Organization-Level Management

Deploy centrally managed CLAUDE.md via configuration management (MDM, Group Policy, Ansible)
to the managed policy location.

## Best Practices

- **Be specific**: "Use 2-space indentation" not "Format code properly"
- **Use structure**: Bullet points grouped under descriptive headings
- **Review periodically**: Update as project evolves
- **Keep rules focused**: Each file should cover one topic
- **Use descriptive filenames**: Filename should indicate content
- **Use conditional rules sparingly**: Only add `paths` when rules truly apply to specific
  file types
- **Organize with subdirectories**: Group related rules (e.g., `frontend/`, `backend/`)
